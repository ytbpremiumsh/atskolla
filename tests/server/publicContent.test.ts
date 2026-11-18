import { afterAll, describe, expect, it } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { articles, renderArticle, renderHub, sitemap, publicPages, buildPublicContent } from "../../scripts/build-public-content.mjs";
const temp = await mkdtemp(join(tmpdir(),"atskolla-public-"));
afterAll(()=>rm(temp,{recursive:true,force:true}));
const adSource = await readFile(join(process.cwd(),"public/adsense-public.js"),"utf8");
function adPage(url:string,marker=true){
 const dom=new JSDOM(`<html><head>${marker?'<meta name="atskolla-public-article" content="true">':''}</head><body><button data-advertising-settings>Ubah pilihan iklan</button></body></html>`,{url,runScripts:"outside-only"});
 dom.window.eval(adSource);return dom;
}
describe("artikel publik dan sitemap",()=>{
 it("menghasilkan HTML artikel lengkap tanpa memerlukan JavaScript",async()=>{
  await buildPublicContent(temp);
  expect(articles).toHaveLength(6);
  for(const a of articles){
   const html=await readFile(join(temp,"artikel",a.slug,"index.html"),"utf8");
   const dom=new JSDOM(html);
   expect(dom.window.document.querySelector("h1")?.textContent).toBe(a.title);
   expect(dom.window.document.querySelectorAll(".pc-article section h2").length).toBeGreaterThanOrEqual(6);
   expect(dom.window.document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe('https://www.atskolla.com/artikel/'+a.slug);
   expect(JSON.parse(dom.window.document.querySelector('script[type="application/ld+json"]')!.textContent!)["@type"]).toBe("Article");
   expect(html).not.toContain('id="root"');dom.window.close();
  }
 });
 it("tautan artikel saling terhubung dan sitemap tidak memuat halaman pribadi",()=>{
  const hub=new JSDOM(renderHub());
  for(const a of articles){expect(hub.window.document.querySelector(`a[href="/artikel/${a.slug}"]`)).not.toBeNull();expect(sitemap()).toContain('/artikel/'+a.slug);}
  expect(publicPages.some(p=>/^\/(parent|bendahara|admin|login|dashboard|super-admin)(\/|$)/.test(p))).toBe(false);
  expect(renderHub()).not.toContain('data-advertising-settings');hub.window.close();
 });
});
describe("batas pemuatan iklan",()=>{
 it.each(['/admin','/parent','/bendahara/withdraw','/students/123','/artikel','/404'])("tidak memuat iklan atau pilihan iklan pada %s",path=>{
  const dom=adPage('https://www.atskolla.com'+path);
  expect(dom.window.document.querySelector('#advertising-choice')).toBeNull();expect(dom.window.document.querySelector('#atskolla-adsense')).toBeNull();dom.window.close();
 });
 it("tidak memuat iklan pada subdomain sekolah meskipun jalur artikel cocok",()=>{
  const dom=adPage('https://sekolah.atskolla.com/artikel/panduan');expect(dom.window.document.querySelector('#advertising-choice')).toBeNull();dom.window.close();
 });
 it("pilihan menolak tidak memuat skrip AdSense",()=>{
  const dom=adPage('https://www.atskolla.com/artikel/panduan');
  expect(dom.window.document.querySelector('#atskolla-adsense')).toBeNull();
  dom.window.document.querySelector<HTMLButtonElement>('#advertising-choice button')!.click();
  expect(dom.window.localStorage.getItem('atskolla-advertising-choice-v1')).toBe('deny');expect(dom.window.document.querySelector('#atskolla-adsense')).toBeNull();dom.window.close();
 });
 it("pilihan mengizinkan hanya memuat satu skrip dengan publisher yang benar",()=>{
  const dom=adPage('https://www.atskolla.com/artikel/panduan');
  dom.window.document.querySelectorAll<HTMLButtonElement>('#advertising-choice button')[1].click();
  dom.window.eval(adSource);
  const script=dom.window.document.querySelector<HTMLScriptElement>('#atskolla-adsense');
  expect(script?.src).toContain('client=ca-pub-0516573569377801');expect(script?.async).toBe(true);expect(dom.window.document.querySelectorAll('#atskolla-adsense')).toHaveLength(1);dom.window.close();
 });
 it("index aplikasi memakai meta verifikasi, bukan skrip iklan global",async()=>{
  const html=await readFile(join(process.cwd(),'index.html'),'utf8');expect(html).toContain('google-adsense-account');expect(html).not.toContain('adsbygoogle.js');
 });
});
