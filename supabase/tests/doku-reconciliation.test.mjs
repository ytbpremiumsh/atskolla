import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const migration = await readFile(new URL('../migrations/20261016000000_doku_payment_reconciliation.sql', import.meta.url), 'utf8');
// Real PostgreSQL/PLpgSQL, isolated in memory. Only network delivery and cron are mocked.
async function database() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    CREATE TABLE public.schools(id uuid PRIMARY KEY,installment_enabled boolean DEFAULT true);
    CREATE TABLE public.spp_invoices(id uuid PRIMARY KEY,school_id uuid,invoice_number text,total_amount integer,
      amount integer,bill_type text DEFAULT 'tagihan',allow_installment boolean DEFAULT true,
      status text DEFAULT 'pending',paid_at timestamptz,payment_method text,mayar_invoice_id text,
      service_fee integer,payment_channel text,installment_paid_amount bigint DEFAULT 0,net_amount integer);
    CREATE TABLE public.spp_installments(id uuid PRIMARY KEY,invoice_id uuid REFERENCES public.spp_invoices(id),
      school_id uuid,gateway text,mayar_invoice_id text,amount bigint,status text DEFAULT 'pending',paid_at timestamptz);
    CREATE TABLE public.payment_transactions(id uuid PRIMARY KEY,school_id uuid,amount integer,
      service_fee integer,payment_channel text,payment_method text,status text DEFAULT 'pending',
      paid_at timestamptz,mayar_transaction_id text,created_at timestamptz DEFAULT now());
    CREATE TABLE public.spp_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),school_id uuid,invoice_id uuid,
      event_type text,status text,payload jsonb,message text,created_at timestamptz DEFAULT now());
    CREATE TABLE public.notifications(id uuid DEFAULT gen_random_uuid(),school_id uuid,title text,message text,type text);
    CREATE TABLE public.platform_settings(key text PRIMARY KEY,value text);
    CREATE SCHEMA net;
    CREATE TABLE net.test_requests(id bigserial PRIMARY KEY,url text,headers jsonb);
    CREATE TABLE net._http_response(id bigint PRIMARY KEY,status_code integer,timed_out boolean DEFAULT false,error_msg text,content text);
    CREATE FUNCTION net.http_get(url text,params jsonb DEFAULT '{}',headers jsonb DEFAULT '{}',timeout_milliseconds integer DEFAULT 5000)
      RETURNS bigint LANGUAGE sql AS $$INSERT INTO net.test_requests(url,headers) VALUES(url,headers) RETURNING id$$;
    CREATE SCHEMA cron;
    CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
  `);
  // Use the repository's actual installment validation + balance triggers.
  const installments = await readFile(new URL('../migrations/20260708145903_31c6d523-9086-4551-8370-04da403795f1.sql', import.meta.url), 'utf8');
  await db.exec(installments.slice(installments.indexOf('CREATE OR REPLACE FUNCTION public.trg_validate_installment()')));
  await db.exec(migration);
  return db;
}

async function checkout(db, { invoice = randomUUID(), school = randomUUID(), order = 'SPP-test-old', bill = 1000, fee = 3000, installment = null } = {}) {
  await db.query(`INSERT INTO schools(id) VALUES($1) ON CONFLICT DO NOTHING`, [school]);
  await db.query(`INSERT INTO spp_invoices(id,school_id,invoice_number,total_amount,mayar_invoice_id)
    VALUES($1,$2,'SPP/test', $3, $4) ON CONFLICT DO NOTHING`, [invoice,school,bill,order]);
  if (installment) {
    await db.query(`INSERT INTO spp_installments(id,invoice_id,school_id,gateway,mayar_invoice_id,amount)
      VALUES($1,$2,$3,'doku',$4,$5)`, [installment,invoice,school,order,bill]);
  } else {
    await db.query(`INSERT INTO spp_logs(school_id,invoice_id,event_type,status,payload) VALUES($1,$2,'create_invoice_doku','ok',$3)`,
      [school,invoice,{ response: { order: { invoice_number: order } } }]);
  }
  const txn = randomUUID();
  await db.query(`INSERT INTO payment_transactions(id,school_id,amount,service_fee,payment_method,mayar_transaction_id)
    VALUES($1,$2,$3,$4,$5,$6)`,[txn,school,bill+fee,fee,installment?'spp_installment':'spp',order]);
  return { invoice,school,order,txn,installment,amount:bill+fee };
}
const payload = (c, extras = {}) => ({ order: { invoice_number:c.order, amount:c.amount },transaction:{ status:'SUCCESS',type:'SALE',date:'2026-01-01T00:00:00Z' },...extras });
const settle = (db,c,p=payload(c)) => db.query('SELECT settle_verified_doku_payment($1,$2) AS result',[c.order,p]);

test('old checkout remains mapped after regeneration; settlement is atomic and idempotent', async () => {
  const db = await database();
  try {
    const old = await checkout(db);
    const newer = await checkout(db,{invoice:old.invoice,school:old.school,order:'SPP-test-new',fee:5000});
    await db.query('UPDATE spp_invoices SET mayar_invoice_id=$1,service_fee=5000 WHERE id=$2',[newer.order,old.invoice]);
    // Rebuild from historical creation logs rather than the invoice's latest order.
    await db.exec('DELETE FROM doku_payment_attempts');
    await db.exec(migration);
    const before = (await db.query('SELECT count(*)::int n FROM doku_payment_attempts')).rows[0].n;
    assert.equal(before,2);
    assert.equal((await settle(db,old)).rows[0].result.marked_paid,true);
    await settle(db,old);
    const invoice = (await db.query('SELECT * FROM spp_invoices WHERE id=$1',[old.invoice])).rows[0];
    assert.equal(invoice.status,'paid'); assert.equal(invoice.mayar_invoice_id,old.order); assert.equal(invoice.service_fee,3000);
    assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,1);
    assert.equal((await db.query("SELECT count(*)::int n FROM spp_logs WHERE event_type='doku_verified_settlement'")).rows[0].n,1);
    // A second real payment is recorded for review, never credited twice to the bill.
    assert.equal((await settle(db,newer)).rows[0].result.review,true);
    assert.equal((await db.query('SELECT state FROM doku_payment_attempts WHERE order_number=$1',[newer.order])).rows[0].state,'review');
    assert.equal((await db.query('SELECT mayar_invoice_id FROM spp_invoices WHERE id=$1',[old.invoice])).rows[0].mayar_invoice_id,old.order);
  } finally { await db.close(); }
});

test('forged success, amount changes, authorization-only and cross-school mappings cannot settle a bill', async () => {
  const db = await database();
  try {
    const c=await checkout(db);
    for (const p of [
      payload(c,{order:{invoice_number:'another-order',amount:c.amount}}),
      payload(c,{order:{invoice_number:c.order,amount:c.amount-1}}),
      payload(c,{transaction:{status:'PENDING'}}),
      payload(c,{transaction:{status:'SUCCESS',type:'AUTHORIZE'}}),
    ]) await assert.rejects(settle(db,c,p));
    await db.query('UPDATE payment_transactions SET school_id=$1 WHERE id=$2',[randomUUID(),c.txn]);
    await assert.rejects(settle(db,c),/local transaction mismatch/);
    assert.equal((await db.query('SELECT status FROM spp_invoices')).rows[0].status,'pending');
    assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,0);
    assert.equal((await db.query("SELECT has_function_privilege('anon','public.settle_verified_doku_payment(text,jsonb)','EXECUTE') ok")).rows[0].ok,false);
    assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.doku_payment_attempts','UPDATE') ok")).rows[0].ok,false);
  } finally { await db.close(); }
});

test('installment is validated once and existing trigger recalculates invoice balance', async () => {
  const db=await database();
  try {
    const c=await checkout(db,{bill:5000,installment:randomUUID()});
    await settle(db,c); await settle(db,c);
    const i=(await db.query('SELECT status,installment_paid_amount FROM spp_invoices')).rows[0];
    assert.equal(i.status,'paid'); assert.equal(i.installment_paid_amount,5000);
    assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,1);
  } finally { await db.close(); }
});

test('worker signs GET correctly and recovers paid transactions without any webhook or open browser', async () => {
  const db=await database();
  try {
    const c=await checkout(db);
    await db.exec("INSERT INTO platform_settings VALUES ('doku_client_id','MCH-test'),('doku_secret_key','test-secret'),('doku_env','sandbox')");
    assert.equal((await db.query('SELECT reconcile_doku_payments(20) result')).rows[0].result.queued,1);
    const request=(await db.query('SELECT * FROM net.test_requests')).rows[0];
    assert.equal(request.url,'https://api-sandbox.doku.com/orders/v1/status/'+c.order);
    assert.equal(request.headers.Digest,undefined);
    const h=request.headers;
    assert.equal(h.Signature,'HMACSHA256='+createHmac('sha256','test-secret').update(
      `Client-Id:MCH-test\nRequest-Id:${h['Request-Id']}\nRequest-Timestamp:${h['Request-Timestamp']}\nRequest-Target:/orders/v1/status/${c.order}`,
    ).digest('base64'));
    await db.query('INSERT INTO net._http_response(id,status_code,content) VALUES($1,200,$2)',[request.id,JSON.stringify(payload(c))]);
    assert.equal((await db.query('SELECT reconcile_doku_payments(20) result')).rows[0].result.processed,1);
    assert.equal((await db.query('SELECT status FROM spp_invoices')).rows[0].status,'paid');
    assert.equal((await db.query('SELECT reconcile_doku_payments(20) result')).rows[0].result.processed,0);
  } finally { await db.close(); }
});

test('network errors retry; malformed SUCCESS amounts roll back every settlement write', async () => {
  const db=await database();
  try {
    const c=await checkout(db);
    await db.exec("INSERT INTO platform_settings VALUES ('doku_client_id','MCH-test'),('doku_secret_key','test-secret')");
    await db.query('SELECT reconcile_doku_payments(20)');
    const request=(await db.query('SELECT request_id FROM doku_payment_attempts')).rows[0].request_id;
    await db.query('INSERT INTO net._http_response(id,status_code,content) VALUES($1,200,$2)',[request,JSON.stringify(payload(c,{order:{invoice_number:c.order,amount:1}}))]);
    await db.query('SELECT reconcile_doku_payments(20)');
    const a=(await db.query('SELECT * FROM doku_payment_attempts')).rows[0];
    assert.equal(a.state,'pending'); assert.equal(a.request_id,null); assert.match(a.last_error,/amount mismatch/);
    assert.equal((await db.query('SELECT status FROM spp_invoices')).rows[0].status,'pending');
    assert.equal((await db.query('SELECT status FROM payment_transactions')).rows[0].status,'pending');
    assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,0);
    await db.exec("UPDATE doku_payment_attempts SET next_check_at=now()-interval '1 minute'");
    await db.query('SELECT reconcile_doku_payments(20)');
    const next=(await db.query('SELECT request_id FROM doku_payment_attempts')).rows[0].request_id;
    await db.query('INSERT INTO net._http_response(id,status_code,error_msg) VALUES($1,503,$2)',[next,'temporarily unavailable']);
    await db.query('SELECT reconcile_doku_payments(20)');
    assert.match((await db.query('SELECT last_error FROM doku_payment_attempts')).rows[0].last_error,/HTTP 503/);
  } finally { await db.close(); }
});
