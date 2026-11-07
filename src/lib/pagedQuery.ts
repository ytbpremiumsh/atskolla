/** Read every page in a deterministic order. Never return an incomplete successful total. */
export async function fetchAllPages<T = any>(makeQuery: () => any, key = 'id'): Promise<{data:T[];error:null}> {
  const rows:T[]=[]; const pageSize=500;
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await makeQuery().order(key,{ascending:true}).range(offset,offset+pageSize-1);
    if(error) throw error;
    if(!Array.isArray(data)) throw new Error('Respons data tidak valid');
    rows.push(...data);
    if(data.length<pageSize) return {data:rows,error:null};
  }
}
