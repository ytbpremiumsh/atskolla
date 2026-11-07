import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration=await fs.readFile(new URL('../migrations/20261107044522_verify_and_register_bank_account.sql',import.meta.url),'utf8');
const admin='00000000-0000-0000-0000-000000000099';
async function setup(){
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN RETURN $1=auth.uid() AND $2=current_setting('test.role',true);END$$;
 CREATE TABLE bendahara_bank_accounts(id uuid PRIMARY KEY,school_id uuid,bank_name text,account_number text,account_holder text,is_active boolean DEFAULT true,verification_status text DEFAULT 'pending',verified_at timestamptz,verified_by uuid,rejection_reason text,doku_bank_account_settlement_id text);
 CREATE TABLE doku_registered_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bank_name text NOT NULL,account_number text NOT NULL,account_holder text,settlement_id text,created_by uuid);
 ALTER TABLE bendahara_bank_accounts ENABLE ROW LEVEL SECURITY;ALTER TABLE doku_registered_accounts ENABLE ROW LEVEL SECURITY;
 CREATE POLICY sa_accounts ON bendahara_bank_accounts FOR ALL TO authenticated USING(has_role(auth.uid(),'super_admin')) WITH CHECK(has_role(auth.uid(),'super_admin'));
 CREATE POLICY sa_registry ON doku_registered_accounts FOR ALL TO authenticated USING(has_role(auth.uid(),'super_admin')) WITH CHECK(has_role(auth.uid(),'super_admin'));
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;GRANT SELECT,INSERT,UPDATE ON bendahara_bank_accounts,doku_registered_accounts TO authenticated;
 INSERT INTO bendahara_bank_accounts(id,bank_name,account_number,account_holder) VALUES ('00000000-0000-0000-0000-000000000001','BSI','1121 118180','Siswa Contoh');`);
 await db.exec(migration);
 await db.exec(`SELECT set_config('test.uid','${admin}',false),set_config('test.role','super_admin',false);SET ROLE authenticated;`);
 return db;
}
test('verification registers authoritative details atomically, repeats safely and enforces admin access',async()=>{
 const db=await setup();
 const call=`SELECT verify_and_register_bank_account('00000000-0000-0000-0000-000000000001') AS result`;
 const first=(await db.query(call)).rows[0].result;
 assert.equal(first.verification_status,'verified');assert.equal(first.settlement_id,null);
 assert.equal((await db.query(`SELECT verification_status,verified_by FROM bendahara_bank_accounts`)).rows[0].verified_by,admin);
 const entry=(await db.query('SELECT * FROM doku_registered_accounts')).rows[0];assert.equal(entry.account_number,'1121118180');assert.equal(entry.account_holder,'Siswa Contoh');
 assert.equal((await db.query(call)).rows[0].result.registry_id,first.registry_id);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM doku_registered_accounts')).rows[0].n,1);
 await assert.rejects(db.exec(`INSERT INTO doku_registered_accounts(bank_name,account_number) VALUES (' B S I ','1121-118180')`),/duplicate key/);
 await db.exec(`SELECT set_config('test.role','bendahara',false)`);
 await assert.rejects(db.query(call),/Hanya Super Admin/);
 await db.exec(`RESET ROLE;SET ROLE anon;`);
 await assert.rejects(db.query(call),/permission denied/);
 await db.close();
});
test('registry failure rolls back approval and does not affect another account',async()=>{
 const db=await setup();
 await db.exec(`RESET ROLE;CREATE FUNCTION fail_registry() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'registry unavailable';END$$;CREATE TRIGGER fail_registry BEFORE INSERT ON doku_registered_accounts FOR EACH ROW EXECUTE FUNCTION fail_registry();SET ROLE authenticated;`);
 await assert.rejects(db.query(`SELECT verify_and_register_bank_account('00000000-0000-0000-0000-000000000001')`),/registry unavailable/);
 assert.equal((await db.query('SELECT verification_status FROM bendahara_bank_accounts')).rows[0].verification_status,'pending');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM doku_registered_accounts')).rows[0].n,0);
 await db.close();
});
test('existing Settlement ID is preserved and rejected/inactive accounts cannot be approved',async()=>{
 const db=await setup();
 await db.exec(`INSERT INTO doku_registered_accounts(bank_name,account_number,account_holder,settlement_id) VALUES ('BSI','1121118180','Pemilik terdaftar','BNK-0308-123456789');UPDATE bendahara_bank_accounts SET doku_bank_account_settlement_id='BNK-0308-999999999';`);
 assert.equal((await db.query(`SELECT verify_and_register_bank_account('00000000-0000-0000-0000-000000000001') AS result`)).rows[0].result.settlement_id,'BNK-0308-123456789');
 await db.exec(`UPDATE bendahara_bank_accounts SET verification_status='rejected'`);
 await assert.rejects(db.query(`SELECT verify_and_register_bank_account('00000000-0000-0000-0000-000000000001')`),/Status pengajuan/);
 await db.exec(`UPDATE bendahara_bank_accounts SET verification_status='pending',is_active=false`);
 await assert.rejects(db.query(`SELECT verify_and_register_bank_account('00000000-0000-0000-0000-000000000001')`),/sudah nonaktif/);
 await db.close();
});
