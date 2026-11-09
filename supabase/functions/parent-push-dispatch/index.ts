import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { firebaseAccessToken, sendFcm } from "../_shared/fcm.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!serviceKey||req.headers.get("Authorization")!==`Bearer ${serviceKey}`)return json({error:"UNAUTHORIZED"},401);
 const credential=Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
 if(!credential)return json({error:"FCM_NOT_CONFIGURED"},503);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey);
 let sent=0,failed=0;
 try{
  const accessToken=await firebaseAccessToken(credential);
  const enabled=await db.rpc("enable_parent_push_delivery");if(enabled.error)throw new Error("PUSH_SCHEMA_NOT_READY");
  const started=Date.now();
  for(let batch=0;batch<4&&Date.now()-started<45000;batch++){
   const {data,error}=await db.rpc("claim_parent_push_batch",{batch_size:100});if(error)throw new Error("PUSH_QUEUE_UNAVAILABLE");
   const rows=data||[];if(!rows.length)break;
   let cursor=0;
   await Promise.all(Array.from({length:Math.min(8,rows.length)},async()=>{while(cursor<rows.length){const row=rows[cursor++];let result;
    try{result=await sendFcm(row,accessToken);}catch{result={ok:false,code:"DELIVERY_RETRY",invalidToken:false};}
    const dead=result.invalidToken||row.attempt>=6;
    const update=result.ok?{status:"sent",delivered_at:new Date().toISOString(),lease_until:null,last_error:null}:{status:dead?"dead":"pending",lease_until:null,last_error:result.code,next_attempt_at:new Date(Date.now()+Math.min(3600000,30000*2**row.attempt)).toISOString()};
    const saved=await db.from("parent_push_deliveries").update(update).eq("event_id",row.event_id).eq("device_id",row.device_id).eq("attempts",row.attempt).eq("status","sending");
    if(saved.error)continue;
    if(result.invalidToken)await db.from("parent_push_devices").update({disabled_at:new Date().toISOString()}).eq("id",row.device_id).eq("fcm_token",row.fcm_token);
    if(result.ok)sent++;else failed++;
   }}));
  }
  return json({ok:true,sent,failed});
 }catch{return json({error:"PUSH_DISPATCH_UNAVAILABLE",sent,failed},503);}
});
