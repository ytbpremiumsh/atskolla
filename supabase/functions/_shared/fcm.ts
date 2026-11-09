const PROJECT = "atskolla-parent";
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const encodedJson = (value: unknown) => encode(new TextEncoder().encode(JSON.stringify(value)));
let cached: { value: string; expires: number } | null = null;
export async function firebaseAccessToken(raw: string): Promise<string> {
  if (cached && cached.expires > Date.now() + 120000) return cached.value;
  const account = JSON.parse(raw);
  if (account.type !== "service_account" || account.project_id !== PROJECT || !account.client_email || !account.private_key) throw new Error("FCM_CREDENTIAL_CONFIGURATION");
  const pem = String(account.private_key).replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)), {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
  const now = Math.floor(Date.now()/1000);
  const unsigned = encodedJson({alg:"RS256",typ:"JWT"})+"."+encodedJson({iss:account.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600});
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:unsigned+"."+encode(new Uint8Array(signature))}),signal:AbortSignal.timeout(15000)});
  const result = await response.json();if (!response.ok || !result.access_token) throw new Error("FCM_AUTHENTICATION_FAILED");
  cached={value:result.access_token,expires:Date.now()+Number(result.expires_in||3600)*1000};return cached.value;
}
export async function sessionFingerprint(token:string):Promise<string>{const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));return Array.from(new Uint8Array(hash), b=>b.toString(16).padStart(2,"0")).join("");}
export async function fcmMessage(delivery: any) {
  if (!["attendance","invoice_new"].includes(delivery.kind)) throw new Error("INVALID_PUSH_KIND");
  const data = {kind:delivery.kind,student_id:String(delivery.student_id),event_key:String(delivery.event_key),session_fingerprint:await sessionFingerprint(delivery.session_token),payload:JSON.stringify(delivery.payload)};
  if (new TextEncoder().encode(JSON.stringify(data)).length>3500) throw new Error("PUSH_PAYLOAD_TOO_LARGE");
  return {message:{token:delivery.fcm_token,data,android:{priority:"HIGH",ttl:"86400s",restricted_package_name:"com.atskolla.parent"}}};
}
export async function sendFcm(delivery:any,accessToken:string):Promise<{ok:boolean;code:string;invalidToken:boolean}>{
  const response=await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`,{method:"POST",headers:{"Authorization":`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify(await fcmMessage(delivery)),signal:AbortSignal.timeout(15000)});
  const result=await response.json();const detail=result?.error?.details?.find((item:any)=>item?.errorCode)?.errorCode;
  return {ok:response.ok&&typeof result?.name==="string",code:response.ok?"SENT":String(detail||result?.error?.status||response.status),invalidToken:detail==="UNREGISTERED"};
}
