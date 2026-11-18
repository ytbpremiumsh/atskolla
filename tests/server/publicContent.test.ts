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
   expect(html).not.toContain('id="root"');
   const image=dom.window.document.querySelector<HTMLImageElement>('.pc-cover img');
   expect(image?.getAttribute('src')).toBe(a.image);expect(image?.alt).toBe(a.imageAlt);
   expect(image?.getAttribute('width')).toBe('1200');expect(image?.getAttribute('height')).toBe('675');
   expect(dom.window.document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://www.atskolla.com'+a.image);
   const schema=JSON.parse(dom.window.document.querySelector('script[type="application/ld+json"]')!.textContent!);
   expect(schema.image).toContain('https://www.atskolla.com'+a.image);expect(schema.dateModified).toBe(a.modifiedAt);
   expect(dom.window.document.querySelector('.pc-intro')?.textContent).toBe(a.introduction);
   expect(dom.window.document.querySelector('.pc-questions')?.textContent).toContain(a.questions[0].question);
   expect(html).not.toContain('data-advertising-settings');dom.window.close();
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
 it("artikel memuat satu skrip tanpa banner kustom dan tanpa menyimpan izin",()=>{
  const dom=adPage('https://www.atskolla.com/artikel/panduan');
  dom.window.eval(adSource);
  expect(dom.window.document.querySelector('#advertising-choice')).toBeNull();
  expect(dom.window.localStorage.length).toBe(0);
  expect(dom.window.document.querySelectorAll('#atskolla-adsense')).toHaveLength(1);
  expect(dom.window.document.querySelector<HTMLScriptElement>('#atskolla-adsense')?.src).toContain('client=ca-pub-0516573569377801');dom.window.close();
 });
 it("index aplikasi memakai meta verifikasi, bukan skrip iklan global",async()=>{
  const html=await readFile(join(process.cwd(),'index.html'),'utf8');expect(html).toContain('google-adsense-account');expect(html).not.toContain('adsbygoogle.js');
 });
});

describe("thumbnail dan SEO artikel",()=>{
 it("setiap artikel memiliki gambar unik, alt deskriptif, pengantar dan jawaban praktis",async()=>{
  expect(new Set(articles.map(a=>a.image)).size).toBe(6);
  for(const a of articles){
   const file=await readFile(join(process.cwd(),'public',a.image));expect(file.length).toBeGreaterThan(1000);
   const dom=new JSDOM(renderArticle(a));const doc=dom.window.document;
   const image=doc.querySelector<HTMLImageElement>('.pc-cover img');
   expect(image?.getAttribute('alt')).toBe(a.imageAlt);expect(image?.getAttribute('width')).toBe('1200');
   expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://www.atskolla.com'+a.image);
   const schema=JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!);
   expect(schema.image).toContain('https://www.atskolla.com'+a.image);expect(schema.dateModified).toBe(a.modifiedAt);
   expect(doc.querySelector('.pc-intro')?.textContent).toBe(a.introduction);
   expect(doc.querySelector('.pc-questions')?.textContent).toContain(a.questions[0].answer);
   expect(doc.querySelectorAll('h1')).toHaveLength(1);expect(doc.querySelector('[data-advertising-settings]')).toBeNull();
   dom.window.close();
  }
 });
 it("kartu gambar mempunyai ukuran tetap dan pemuatan lazy",()=>{
  const dom=new JSDOM(renderHub());const images=dom.window.document.querySelectorAll('.pc-thumb img');expect(images).toHaveLength(6);
  images.forEach(img=>{expect(img.getAttribute('width')).toBe('1200');expect(img.getAttribute('height')).toBe('675');expect(img.getAttribute('loading')).toBe('lazy');});dom.window.close();
 });
});

describe("aset thumbnail",()=>{
 it("setiap artikel menggunakan aset WebP lokal yang berbeda",async()=>{
  expect(new Set(articles.map(a=>a.image)).size).toBe(6);
  for(const a of articles){const bytes=await readFile(join(process.cwd(),'public',a.image));expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');expect(bytes.length).toBeLessThan(180000);}
 });
});
