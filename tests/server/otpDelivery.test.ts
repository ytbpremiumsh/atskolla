import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendOtpMessage } from '../../supabase/functions/_shared/sendOtp';
vi.mock('../../supabase/functions/_shared/mpwaBase.ts',()=>({getMpwaBase:async()=> 'https://gateway.test'}));
afterEach(()=>vi.unstubAllGlobals());
describe('parent WhatsApp login delivery',()=>{
 it('uses the connected school device even when attendance notifications are disabled',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,text:async()=>JSON.stringify({status:true})});vi.stubGlobal('fetch',fetch);
  const admin={from:(table:string)=>{const builder:any={select:()=>builder,in:async()=>({data:[]}),eq:()=>builder,maybeSingle:async()=>({data:table==='school_integrations'?{is_active:false,gateway_type:'mpwa',mpwa_connected:true,mpwa_sender:'081234567890',mpwa_api_key:'test-key'}:null})};return builder;}};
  const result=await sendOtpMessage(admin,'081111111111','test OTP','school-1');
  expect(result.ok).toBe(true);expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({sender:'6281234567890',number:'6281111111111'});
 });
});
