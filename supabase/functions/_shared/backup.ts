// Application-data export only: Auth users, schema, Storage bytes and secrets in
// other schemas require the provider's disaster-recovery backup as well.
export type BackupTable = { table_name: string; key_columns: string[]; dependencies: string[] };
export async function backupManifest(client: any): Promise<BackupTable[]> {
  const {data,error}=await client.rpc('backup_table_manifest');
  if(error) throw new Error(`Manifest backup tidak tersedia: ${error.message}`);
  if(!Array.isArray(data)||!data.length) throw new Error('Manifest backup kosong');
  for(const t of data) if(!t.key_columns?.length) throw new Error(`Tabel ${t.table_name} tidak memiliki primary key; backup dibatalkan agar tidak menghasilkan salinan tidak lengkap`);
  return data;
}
export function restoreOrder(manifest: BackupTable[], names: string[]): BackupTable[] {
  const lookup=new Map(manifest.map(t=>[t.table_name,t]));
  for(const name of names) if(!lookup.has(name)) throw new Error(`Tabel tidak diizinkan: ${name}`);
  const ordered:BackupTable[]=[];const visited=new Set<string>();const visiting=new Set<string>();const selected=new Set(names);
  const visit=(name:string)=>{if(visited.has(name))return;if(visiting.has(name))throw new Error(`Dependensi siklik pada ${name}; gunakan pemulihan database penyedia`);visiting.add(name);const t=lookup.get(name)!;for(const d of t.dependencies)if(selected.has(d))visit(d);visiting.delete(name);visited.add(name);ordered.push(t);};
  names.forEach(visit);return ordered;
}
export async function exportTable(client:any, table:BackupTable) {
  const rows:any[]=[];const size=500;
  for(let offset=0;;offset+=size){let q=client.from(table.table_name).select('*');for(const key of table.key_columns)q=q.order(key,{ascending:true});const {data,error}=await q.range(offset,offset+size-1);if(error)throw new Error(`${table.table_name}: ${error.message}`);if(!Array.isArray(data))throw new Error(`${table.table_name}: respons tidak valid`);rows.push(...data);if(data.length<size)return rows;}
}
export async function exportApplicationData(client:any) {
  const manifest=await backupManifest(client);const backup:Record<string,any[]>={};const stats:Record<string,number>={};
  for(const t of manifest){backup[t.table_name]=await exportTable(client,t);stats[t.table_name]=backup[t.table_name].length;}
  const meta={version:3,complete:true,scope:'public_application_data',consistent_snapshot:false,exported_at:new Date().toISOString(),tables:manifest.length,total_rows:Object.values(stats).reduce((a,b)=>a+b,0),stats,manifest,errors:{},excluded:['auth schema','storage object bytes','schema/DDL','transient sessions and OTP']};
  return {backup,meta};
}
