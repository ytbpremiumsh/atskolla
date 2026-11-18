async function request(url:string,init:RequestInit={},timeout=4000){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
 try{return await fetch(url,{...init,signal:controller.signal});}finally{clearTimeout(timer);}
}
export const shortlinkApi='/shortlink-api';
export async function vpsShortlinksAvailable(){
 try{const r=await request(shortlinkApi+'/health',{cache:'no-store'},3000);if(!r.ok)return false;return (await r.json()).service==='atskolla-shortlinks';}catch{return false;}
}
export async function resolveVpsShortlink(code:string):Promise<{available:boolean;target_url?:string}>{
 try{const r=await request(shortlinkApi+'/resolve?code='+encodeURIComponent(code),{cache:'no-store'});
 if(r.status===404){const data=await r.json();return {available:data.error==='not_found'};}
 if(!r.ok)return {available:false};const data=await r.json();return typeof data.target_url==='string'?{available:true,target_url:data.target_url}:{available:false};
 }catch{return {available:false};}
}

// The separate VPS admin key is never bundled into client assets.
export async function shortlinkVpsRequest(path:string, init:RequestInit={}) {
 const key=sessionStorage.getItem('atskolla-shortlink-vps-key')||'';
 const r=await request(shortlinkApi+path,{...init,headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},cache:'no-store'},10000);
 if(!r.ok)throw new Error(r.status===401?'Masukkan kunci pengelola shortlink VPS.':'Shortlink belum berhasil disimpan. Periksa kode dan URL tujuan.');
 return r.json();
}
