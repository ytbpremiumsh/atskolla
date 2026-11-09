import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fcmMessage, sessionFingerprint, sendFcm, firebaseAccessToken } from '../../supabase/functions/_shared/fcm';
const event={kind:'invoice_new',student_id:'child-2',event_key:'invoice_new:bill-1',session_token:'test-parent-session',fcm_token:'test-device-token',payload:{id:'bill-1',status:'pending'}};
beforeEach(()=>vi.stubGlobal("AbortSignal",{timeout:()=>new AbortController().signal}));
afterEach(()=>vi.unstubAllGlobals());
describe('parent FCM transport',()=>{
 it('targets an authenticated installation and preserves the sibling routing id without exposing a session token',async()=>{
  vi.stubGlobal('crypto',webcrypto);const body=await fcmMessage(event);
  expect(body.message.token).toBe(event.fcm_token);expect(body.message.android.priority).toBe('HIGH');
  expect(body.message.data.student_id).toBe('child-2');expect(body.message.data.session_fingerprint).toHaveLength(64);
  expect(JSON.stringify(body)).not.toContain(event.session_token);expect(await sessionFingerprint('other')).not.toBe(body.message.data.session_fingerprint);
 });
 it('rejects unexpected events and oversized data before any send',async()=>{
  vi.stubGlobal('crypto',webcrypto);await expect(fcmMessage({...event,kind:'arbitrary'})).rejects.toThrow('INVALID_PUSH_KIND');
  await expect(fcmMessage({...event,payload:{text:'x'.repeat(4000)}})).rejects.toThrow('PUSH_PAYLOAD_TOO_LARGE');
 });
 it('disables only explicitly unregistered device tokens, not transient errors',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  const fetch=vi.fn().mockResolvedValueOnce({ok:false,status:404,json:async()=>({error:{details:[{errorCode:'UNREGISTERED'}]}})}).mockResolvedValueOnce({ok:false,status:503,json:async()=>({error:{status:'UNAVAILABLE'}})});vi.stubGlobal('fetch',fetch);
  expect((await sendFcm(event,'test-access')).invalidToken).toBe(true);expect((await sendFcm(event,'test-access')).invalidToken).toBe(false);
 });
 it('requires a server service account for the same Firebase project',async()=>{await expect(firebaseAccessToken('{"project_id":"other","type":"service_account"}')).rejects.toThrow('FCM_CREDENTIAL_CONFIGURATION');});
 it('ships only Android client configuration, not a private service account',()=>{
  const config=JSON.parse(readFileSync('android-native/app/google-services.json','utf8'));expect(config.project_info.project_id).toBe('atskolla-parent');expect(config.client[0].client_info.android_client_info.package_name).toBe('com.atskolla.parent');expect(config.private_key).toBeUndefined();
 });
});
