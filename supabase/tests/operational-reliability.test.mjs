import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {backupManifest,exportTable,restoreOrder} from '../functions/_shared/backup.ts';
const migration=await fs.readFile(new URL('../migrations/20261107033501_operational_reliability.sql',import.meta.url),'utf8');
test('finance aggregate covers all history, split, zero net, partial and school boundaries',async()=>{
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA cron;
 CREATE TYPE public.app_role AS ENUM('super_admin','principal','school_admin','bendahara');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT $1=auth.uid() AND $2='principal'::public.app_role$$;
 CREATE FUNCTION public.get_user_school_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '00000000-0000-0000-0000-000000000001'::uuid$$;
 CREATE TABLE schools(id uuid PRIMARY KEY,timezone text);
 CREATE TABLE spp_invoices(id int PRIMARY KEY,school_id uuid,status text,settlement_id uuid,doku_split boolean,payment_method text,total_amount int,net_amount int,installment_paid_amount bigint,due_date date,paid_at timestamptz);
 CREATE TABLE cash_book_entries(id int PRIMARY KEY,school_id uuid,entry_date date,direction text,amount int);
 CREATE TABLE bendahara_settings(id int PRIMARY KEY,school_id uuid,withdraw_fee_default int);
 CREATE TABLE teacher_attendance_logs(id int PRIMARY KEY,school_id uuid,date date,status text,attendance_type text);
 CREATE TABLE attendance_logs(id int PRIMARY KEY,school_id uuid,student_id uuid,date date,status text,attendance_type text);
 CREATE TABLE doku_payment_attempts(order_number text PRIMARY KEY,state text,next_check_at timestamptz);
 CREATE TABLE wa_message_logs(id int PRIMARY KEY,status text,created_at timestamptz);
 CREATE TABLE platform_settings(key text PRIMARY KEY,value text);
 CREATE TABLE cron.job(jobid int,jobname text,active boolean); CREATE TABLE cron.job_run_details(jobid int,start_time timestamptz,status text);
 INSERT INTO schools VALUES('00000000-0000-0000-0000-000000000001','Asia/Jakarta');
 INSERT INTO cash_book_entries SELECT g,'00000000-0000-0000-0000-000000000001',current_date,'in',10 FROM generate_series(1,2501) g;
 INSERT INTO spp_invoices VALUES
 (1,'00000000-0000-0000-0000-000000000001','paid',null,true,'doku',10000,10000,0,current_date,now()),
 (2,'00000000-0000-0000-0000-000000000001','paid',null,false,'doku',10000,0,0,current_date,now()),
 (3,'00000000-0000-0000-0000-000000000001','partial',null,true,'doku',10000,null,4000,current_date-1,null),
 (4,'00000000-0000-0000-0000-000000000002','paid',null,false,'doku',999999,999999,0,current_date,now());
 `);
 await db.exec(migration);
 await assert.rejects(db.query(`select principal_finance_summary('00000000-0000-0000-0000-000000000001')`),/Akses laporan ditolak/);
 await db.query(`select set_config('test.uid','00000000-0000-0000-0000-000000000099',false)`);
 const {rows}=await db.query(`select principal_finance_summary('00000000-0000-0000-0000-000000000001') as summary`);
 assert.deepEqual(rows[0].summary.finance,{totalTagihan:30000,totalPembayaran:24000,tunggakan:6000,saldoKas:25010,danaPending:0,splitAllocated:14000});
 assert.equal(rows[0].summary.monthly.length,6);
 await assert.rejects(db.query(`select principal_finance_summary('00000000-0000-0000-0000-000000000002')`),/Akses laporan ditolak/);
 await assert.rejects(db.query('select operations_health()'),/Super admin diperlukan/);
 await db.close();
});
test('backup reads beyond former row limits and rejects failed pages',async()=>{
 let pages=0; const client={from(){return {select(){return this},order(){return this},async range(from,to){pages++;return {data:from<10500?Array.from({length:Math.min(500,10500-from)},(_,j)=>({id:from+j})):[],error:null}}}}};
 const rows=await exportTable(client,{table_name:'spp_installments',key_columns:['id']});assert.equal(rows.length,10500);assert.equal(pages,22);
 const broken={from(){return{select(){return this},order(){return this},async range(){return{data:[],error:{message:'network failure'}}}}}};
 await assert.rejects(exportTable(broken,{table_name:'doku_payment_attempts',key_columns:['order_number']}),/network failure/);
 await assert.rejects(backupManifest({rpc:async()=>({data:[],error:{message:'migration missing'}})}),/migration missing/);
});
test('restore follows FK dependencies and forbids arbitrary or cyclic tables',()=>{
 const manifest=[{table_name:'invoice',key_columns:['id'],dependencies:['school']},{table_name:'school',key_columns:['id'],dependencies:[]}];
 assert.deepEqual(restoreOrder(manifest,['invoice','school']).map(x=>x.table_name),['school','invoice']);
 assert.throws(()=>restoreOrder(manifest,['parent_sessions']),/tidak diizinkan/);
 assert.throws(()=>restoreOrder([{table_name:'a',dependencies:['b']},{table_name:'b',dependencies:['a']}],['a','b']),/siklik/);
});
