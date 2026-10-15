import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { buildDokuSignature, buildDokuOrderNumber, verifyDokuWebhook, checkDokuOrder, dokuStatus, isDokuPaid } from '../functions/_shared/doku.ts';

const cfg = { clientId: 'MCH-test', secretKey: 'test-secret', baseUrl: 'https://api-sandbox.doku.com' };
const body = JSON.stringify({ order: { invoice_number: 'SPP-test', amount: 4000 }, transaction: { status: 'SUCCESS' } });
const rid = '6ce5787b-4d70-4ace-af40-8632eec8b7f2';
const ts = '2026-10-15T23:10:09Z';
const signed = (target: string, raw = body) => {
  const digest = createHash('sha256').update(raw).digest('base64');
  return 'HMACSHA256=' + createHmac('sha256', cfg.secretKey).update(
    `Client-Id:${cfg.clientId}\nRequest-Id:${rid}\nRequest-Timestamp:${ts}\nRequest-Target:${target}\nDigest:${digest}`,
  ).digest('base64');
};
const request = (target: string, signature: string, overrides = {}) => new Request('https://internal/doku-webhook', {
  method: 'POST', headers: { 'Client-Id': cfg.clientId, 'Request-Id': rid, 'Request-Timestamp': ts, Signature: signature, ...overrides },
});

test('external notification signature survives Supabase path rewriting', () => {
  assert.equal(verifyDokuWebhook(request('', signed('/functions/v1/doku-webhook')), body, cfg), true);
  assert.equal(verifyDokuWebhook(request('', signed('/doku-webhook')), body, cfg), true);
});

test('reject forged, truncated, tampered, wrong merchant and unconfigured notifications', () => {
  const r = request('', signed('/functions/v1/doku-webhook'));
  assert.equal(verifyDokuWebhook(r, body.replace('4000', '1'), cfg), false);
  assert.equal(verifyDokuWebhook(request('', 'HMACSHA256=x'), body, cfg), false);
  assert.equal(verifyDokuWebhook(request('', signed('/functions/v1/doku-webhook'), { 'Client-Id': 'another-merchant' }), body, cfg), false);
  assert.equal(verifyDokuWebhook(r, body, { ...cfg, secretKey: '' }), false);
  assert.equal(verifyDokuWebhook(new Request('https://internal/evil', r), body, cfg), false);
  assert.equal(verifyDokuWebhook(request('', signed('/evil')), body, cfg), false);
});

test('GET status is signed without a Digest component or header', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api-sandbox.doku.com/orders/v1/status/SPP-test');
    assert.equal(options?.method, 'GET');
    const h = new Headers(options?.headers);
    assert.equal(h.has('digest'), false);
    const expected = 'HMACSHA256=' + createHmac('sha256', cfg.secretKey).update(
      `Client-Id:${cfg.clientId}\nRequest-Id:${h.get('request-id')}\nRequest-Timestamp:${h.get('request-timestamp')}\nRequest-Target:/orders/v1/status/SPP-test`,
    ).digest('base64');
    assert.equal(h.get('signature'), expected);
    return Response.json({ order: { invoice_number: 'SPP-test' }, transaction: { status: 'SUCCESS' } });
  };
  try { assert.equal((await checkDokuOrder(cfg, 'SPP-test')).ok, true); }
  finally { globalThis.fetch = oldFetch; }
});

test('POST includes raw body digest; payment status comes from transaction.status', () => {
  assert.equal(buildDokuSignature({ ...cfg, requestId: rid, requestTimestamp: ts, requestTarget: '/doku-webhook', body }).signature, signed('/doku-webhook'));
  assert.equal(dokuStatus({ order: { status: 'PENDING' }, transaction: { status: 'SUCCESS' } }), 'SUCCESS');
  assert.equal(dokuStatus({ response: { transaction: { status: 'SUCCESS' } } }), 'SUCCESS');
  for (const s of ['PENDING','FAILED','EXPIRED','REFUNDED','',undefined]) assert.equal(isDokuPaid(s), false);
});

test('regenerated order identifiers fit DOKU limits and remain unique', () => {
  const base = 'Tagihan/202607/NIS-001/' + 'daftar-ulang-'.repeat(12);
  const orders = new Set(Array.from({ length: 1000 }, () => buildDokuOrderNumber(base)));
  assert.equal(orders.size, 1000);
  for (const order of orders) assert.match(order, /^[A-Za-z0-9-]{1,64}$/);
});
