import {it,expect,vi} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import {buildTenantUrl,buildTenantSubdomainUrl,parseTenantPath,getTenantBasename,TenantProvider,useTenant} from "./tenant";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:"school",name:"Sekolah Contoh",slug:"smanegeri1",logo:null},error:null})})})})}}));
it("builds working school paths instead of promising unconfigured subdomains",()=>{
 expect(buildTenantUrl("smanegeri1","/admin")).toContain("/t/smanegeri1/admin");
 expect(parseTenantPath('/t/smanegeri1/admin')).toBe('smanegeri1');expect(getTenantBasename('/t/smanegeri1/admin')).toBe('/t/smanegeri1');
 expect(buildTenantSubdomainUrl('smanegeri1','/admin')).toBe('https://smanegeri1.atskolla.com/admin');
 expect(()=>buildTenantUrl('www','/admin')).toThrow();expect(()=>buildTenantUrl('../wrong','/admin')).toThrow();
});
it("resolves the school on a path URL and never redirects to an unconfigured hostname",async()=>{
 history.replaceState(null,'','/t/smanegeri1/admin');
 const Consumer=()=>{const t=useTenant();return <p>{t.school?.name||'Loading'}</p>};render(<TenantProvider><Consumer/></TenantProvider>);
 await waitFor(()=>expect(screen.getByText('Sekolah Contoh')).toBeInTheDocument());expect(location.pathname).toBe('/t/smanegeri1/admin');history.replaceState(null,'','/');
});
