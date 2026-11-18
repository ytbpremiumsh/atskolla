import {afterEach,describe,expect,it,vi} from 'vitest';
import {resolveVpsShortlink,shortlinkVpsRequest,vpsShortlinksAvailable} from './shortlinkVps';
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});
describe('VPS shortlinks',()=>{
 it('membedakan kode nonaktif/hilang dari layanan yang belum terpasang',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'not_found'}),{status:404})));
  expect(await resolveVpsShortlink('mati')).toEqual({available:true});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>404</html>',{status:404})));
  expect(await resolveVpsShortlink('lama')).toEqual({available:false});
 });
 it('mengambil URL lokal tanpa Supabase',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({target_url:'https://example.com'})));
  vi.stubGlobal('fetch',fetcher);expect(await resolveVpsShortlink('kode')).toEqual({available:true,target_url:'https://example.com'});
  expect(fetcher.mock.calls[0][0]).toBe('/shortlink-api/resolve?code=kode');
 });
 it('tidak menganggap HTML fallback SPA sebagai layanan sehat',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>SPA</html>')));expect(await vpsShortlinksAvailable()).toBe(false);
 });
 it('mengirim kunci sesi hanya pada operasi pengelolaan',async()=>{
  sessionStorage.setItem('atskolla-shortlink-vps-key','test-token');const fetcher=vi.fn().mockResolvedValue(new Response('{"ok":true}'));vi.stubGlobal('fetch',fetcher);
  await shortlinkVpsRequest('/links',{method:'POST',body:'{}'});expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
 });
});
