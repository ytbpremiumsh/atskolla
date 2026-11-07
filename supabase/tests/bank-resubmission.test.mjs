import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration=await fs.readFile(new URL('../migrations/20261107054746_bank_account_resubmission.sql',import.meta.url),'utf8');
const school='00000000-0000-0000-0000-000000000001',actor='00000000-0000-0000-0000-000000000002',account='00000000-0000-0000-0000-000000000003',other='00000000-0000-0000-0000-000000000004';
const book=school+'/'+actor+'/00000000-0000-0000-0000-000000000005.jpg';
async function setup(){const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN RETURN $1=auth.uid() AND $2=current_setting('test.role',true);END$$;
CREATE FUNCTION get_user_school_id(uuid) RETURNS uuid LANGUAGE plpgsql AS $$BEGIN RETURN nullif(current_setting('test.school',true),'')::uuid;END$$;
CREATE TABLE bendahara_bank_accounts(id uuid PRIMARY KEY,school_id uuid,bank_name text,bank_branch text,account_number text,account_holder text,bank_book_path text,notes text,responsible_user_id uuid,is_default boolean,is_active boolean,verification_status text,verified_at timestamptz,verified_by uuid,rejection_reason text,doku_bank_account_settlement_id text);
CREATE TABLE doku_registered_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bank_name text,account_number text,settlement_id text);
CREATE TABLE profiles(user_id uuid,school_id uuid);CREATE TABLE storage.objects(bucket_id text,name text);
INSERT INTO bendahara_bank_accounts VALUES('${account}','${school}','BRI',null,'123456789012345','Pemilik Lama',null,null,'${actor}',true,true,'rejected',now(),'${actor}','Data belum lengkap',null);
INSERT INTO profiles VALUES('${actor}','${school}');INSERT INTO storage.objects VALUES('bank-account-documents','${book}');
INSERT INTO doku_registered_accounts(bank_name,account_number,settlement_id) VALUES ('BRI','123456789012345','BNK-0308-123456789');
ALTER TABLE bendahara_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_rows ON bendahara_bank_accounts FOR ALL TO authenticated USING(school_id=get_user_school_id(auth.uid()) OR has_role(auth.uid(),'super_admin')) WITH CHECK(school_id=get_user_school_id(auth.uid()) OR has_role(auth.uid(),'super_admin'));
GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon;GRANT SELECT,UPDATE ON bendahara_bank_accounts TO authenticated;GRANT SELECT ON profiles,storage.objects TO authenticated;
`);await db.exec(migration);await db.exec(`CREATE TRIGGER bank_accounts_guard_verification BEFORE INSERT OR UPDATE ON bendahara_bank_accounts FOR EACH ROW EXECUTE FUNCTION bank_accounts_guard_verification();CREATE TRIGGER zz_bank_accounts_auto_verify BEFORE INSERT OR UPDATE ON bendahara_bank_accounts FOR EACH ROW EXECUTE FUNCTION bank_accounts_auto_verify();SELECT set_config('test.uid','${actor}',false),set_config('test.role','bendahara',false),set_config('test.school','${school}',false);SET ROLE authenticated;`);return db;}
const call=(branch='KCP Purwokerto',path=book,pj=actor)=>`SELECT resubmit_bank_account('${account}','BRI','${branch}','123456789012345','Pemilik Benar','${pj}','${path}',NULL) AS result`;
test('rejected primary account can be corrected repeatedly, retains identity and requires manual review',async()=>{const db=await setup();await db.query(call());let row=(await db.query('SELECT * FROM bendahara_bank_accounts')).rows[0];assert.equal(row.id,account);assert.equal(row.is_default,true);assert.equal(row.account_holder,'Pemilik Benar');assert.equal(row.bank_branch,'KCP Purwokerto');assert.equal(row.bank_book_path,book);assert.equal(row.verification_status,'pending');assert.equal(row.requires_review,true);assert.equal(row.rejection_reason,null);assert.equal(row.verified_at,null);
await assert.rejects(db.query(call()),/Hanya rekening ditolak/);
// A school client cannot clear the review flag and approve itself.
await db.exec(`UPDATE bendahara_bank_accounts SET verification_status='verified',requires_review=false`);row=(await db.query('SELECT * FROM bendahara_bank_accounts')).rows[0];assert.equal(row.verification_status,'pending');assert.equal(row.requires_review,true);
await db.exec(`SELECT set_config('test.role','super_admin',false);UPDATE bendahara_bank_accounts SET verification_status='rejected',rejection_reason='Foto kurang jelas';SELECT set_config('test.role','bendahara',false);`);await db.query(call('KCP Baru'));assert.equal((await db.query('SELECT bank_branch FROM bendahara_bank_accounts')).rows[0].bank_branch,'KCP Baru');
await db.exec(`SELECT set_config('test.role','super_admin',false);UPDATE bendahara_bank_accounts SET verification_status='verified',verified_by='${actor}';`);assert.equal((await db.query('SELECT requires_review FROM bendahara_bank_accounts')).rows[0].requires_review,false);await db.close();});
test('resubmission enforces school, staff, branch and uploaded evidence',async()=>{const db=await setup();await assert.rejects(db.query(call('')),/wajib diisi/);await assert.rejects(db.query(call('KCP',school+'/missing.jpg')),/Lampiran/);await assert.rejects(db.query(call('KCP',book,other)),/Penanggung jawab/);await db.exec(`SELECT set_config('test.school','${other}',false)`);await assert.rejects(db.query(call()),/tidak ditemukan/);await db.exec(`SELECT set_config('test.school','${school}',false),set_config('test.role','teacher',false)`);await assert.rejects(db.query(call()),/Hanya bendahara/);await db.exec('RESET ROLE;SET ROLE anon;');await assert.rejects(db.query(call()),/permission denied/);await db.close();});
