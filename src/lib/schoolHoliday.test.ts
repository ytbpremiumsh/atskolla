import {beforeEach,describe,expect,it,vi} from "vitest";
import {fetchSchoolHolidayStatus,saveSchoolHolidaySettings} from "./schoolHoliday";
const mock=vi.hoisted(()=>({result:{data:null,error:null} as {data:unknown;error:unknown},school:{holiday_mode:false,holiday_mode_label:null,holiday_days:[0],timezone:"Asia/Jakarta"},date:""}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
 let writing=false;
 const builder={update:()=>{writing=true;return builder},select:()=>builder,eq:(key:string,value:string)=>{if(key==="date")mock.date=value;return builder},limit:()=>builder,single:()=>Promise.resolve(mock.result),maybeSingle:()=>Promise.resolve(writing?mock.result:{data:table==="schools"?mock.school:null,error:null})};return builder;
}}}));
beforeEach(()=>{mock.result={data:null,error:null};mock.school={holiday_mode:false,holiday_mode_label:null,holiday_days:[0],timezone:"Asia/Jakarta"};});
describe("holiday settings persistence",()=>{
 it("rejects updates that affect no visible school instead of reporting success",async()=>{
  mock.result={data:null,error:{code:"PGRST116",message:"0 rows"}};
  await expect(saveSchoolHolidaySettings("school",{holiday_mode:true})).rejects.toThrow("Admin Sekolah");
  mock.result={data:null,error:null};await expect(saveSchoolHolidaySettings("school",{holiday_days:[]})).rejects.toThrow("belum tersimpan");
 });
 it("returns confirmed state and surfaces network/server errors",async()=>{
  mock.result={data:{holiday_mode:true,holiday_days:[0],holiday_mode_label:"Libur"},error:null};
  await expect(saveSchoolHolidaySettings("school",{holiday_mode:true})).resolves.toMatchObject({holiday_mode:true});
  mock.result={data:null,error:{message:"Koneksi terputus"}};await expect(saveSchoolHolidaySettings("school",{holiday_mode:false})).rejects.toThrow("Koneksi terputus");
 });
 it("distinguishes weekly holidays from quick mode using the school's date",async()=>{
  // Still Saturday in UTC, already Sunday in Jakarta.
  const result=await fetchSchoolHolidayStatus("school",new Date("2026-11-07T18:00:00Z"));
  expect(mock.date).toBe("2026-11-08");expect(result).toMatchObject({isHoliday:true,mode:false});expect(result.reason).toContain("Minggu");
  mock.school.holiday_days=[];
  await expect(fetchSchoolHolidayStatus("school",new Date("2026-11-07T18:00:00Z"))).resolves.toMatchObject({isHoliday:false,mode:false});
 });
});
