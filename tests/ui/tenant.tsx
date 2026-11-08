import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Link,Routes,Route} from 'react-router-dom';
import {TenantProvider,useTenant,getTenantBasename,buildTenantUrl} from '../../src/lib/tenant';import '../../src/index.css';
history.replaceState(null,'','/t/smanegeri1/admin');
function Page(){const t=useTenant();return <main className="p-6"><h1>{t.school?.name||'Memuat sekolah'}</h1><Routes><Route path="/admin" element={<p>Login petugas sekolah</p>}/><Route path="/login" element={<p>Login wali murid</p>}/></Routes><Link to="/login">Portal wali murid</Link><p>{buildTenantUrl('smanegeri1','/admin')}</p></main>}
createRoot(document.getElementById('root')!).render(<BrowserRouter basename={getTenantBasename()}><TenantProvider><Page/></TenantProvider></BrowserRouter>);
