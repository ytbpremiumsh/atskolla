import { describe, expect, it } from 'vitest';
import { mpwaAccepted, mpwaFailureMessage } from '../../supabase/functions/_shared/mpwaResponse';
import { whatsAppSendError } from './whatsAppSendResult';

describe('WhatsApp template delivery responses', () => {
  it('requires explicit acceptance instead of trusting HTTP 200 or empty JSON', () => {
    for (const value of [null, {}, {status: false}, {status: 'false'}, {success: false}, {status:true,success:false}]) expect(mpwaAccepted(value)).toBe(false);
    expect(mpwaAccepted({status:true})).toBe(true);
    expect(mpwaAccepted({success:true})).toBe(true);
  });
  it('explains the actual provider failure hidden behind the old generic error', () => {
    expect(whatsAppSendError({success:false,error:'mpwa error',details:[{ok:false,data:{status:false,msg:'Invali api_key or sender,please check again (2)'}}]})).toContain('nomor pengirim');
    expect(whatsAppSendError({success:true})).toBeNull();
    expect(whatsAppSendError({error:'Kredit WhatsApp tidak mencukupi.'})).toContain('Kredit');
    expect(whatsAppSendError({})).toContain('belum menerima');
  });
  it('does not expose raw credentials or upstream HTML', () => {
    expect(mpwaFailureMessage({msg:'Invalid api_key secret-example'})).not.toContain('secret-example');
    expect(mpwaFailureMessage({raw:'<html>private</html>'})).not.toContain('private');
    expect(mpwaFailureMessage({msg:'Device not connected'})).toContain('Sesi WhatsApp terputus');
  });
});
