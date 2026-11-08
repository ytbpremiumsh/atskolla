import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TeachingSchedule from "./TeachingSchedule";

const mock=vi.hoisted(()=>({insert:vi.fn(),success:vi.fn(),error:vi.fn(),fail:false,roles:["staff"] as string[],subjects:[] as {id:string;name:string;is_active:boolean}[]}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:{id:"admin"},profile:{school_id:"school"},roles:mock.roles})}));
vi.mock("@/components/ui/sonner",()=>({toast:{success:mock.success,error:mock.error}}));
vi.mock("@/components/PageHeader",()=>({PageHeader:({title,actions}:{title:string;actions:React.ReactNode})=><header><h1>{title}</h1>{actions}</header>}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
 let operation="select",payload:unknown;
 const builder={select:()=>builder,eq:()=>builder,order:()=>builder,
 insert:(value:unknown)=>{operation="insert";payload=value;mock.insert(table,value);return builder},
 single:()=>builder,
 then:(resolve:(result:unknown)=>unknown)=>{
  if(operation==="insert")return Promise.resolve(resolve(mock.fail?{data:null,error:{message:"Ditolak oleh server"}}:table==="subjects"?{data:{id:"new-subject",name:(payload as {name:string}).name,is_active:true},error:null}:{data:(payload instanceof Array?payload:[payload]).map((_,i)=>({id:`new-${i}`})),error:null}));
  const data=table==="classes"?[{id:"a",name:"7A"}]:table==="profiles"?[{user_id:"t1",full_name:"Bu Guru"}]:table==="subjects"?mock.subjects:[];
  return Promise.resolve(resolve({data,error:null}));
 }};return builder;
}}}));
const open=()=>render(<MemoryRouter><TeachingSchedule view="class"/></MemoryRouter>);
beforeEach(()=>{cleanup();vi.clearAllMocks();mock.fail=false;mock.roles=["staff"];mock.subjects=[{id:"s1",name:"Matematika",is_active:true}];});

describe("schedule saves from the school page",()=>{
 it("keeps teacher-only accounts read-only while operators can manage schedules",async()=>{
  mock.roles=["teacher"];open();await screen.findByRole("heading",{name:"Jadwal 7A"});
  expect(screen.queryByRole("button",{name:"Tambah jadwal"})).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"Tambah massal"})).not.toBeInTheDocument();
 });
 it("opens the actual add form and persists one schedule",async()=>{
  open();fireEvent.click(await screen.findByRole("button",{name:"Tambah jadwal"}));
  const dialog=screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByRole("combobox",{name:"Mata pelajaran"}),{target:{value:"s1"}});
  fireEvent.change(within(dialog).getByRole("combobox",{name:"Guru"}),{target:{value:"t1"}});
  fireEvent.click(within(dialog).getByRole("button",{name:"Tambah jadwal"}));
  await waitFor(()=>expect(mock.insert).toHaveBeenCalledWith("teaching_schedules",expect.objectContaining({school_id:"school",class_id:"a",teacher_id:"t1",subject_id:"s1"})));
  await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
 });
 it("can create a missing subject inside the schedule form",async()=>{
  mock.subjects=[];open();fireEvent.click(await screen.findByRole("button",{name:"Tambah jadwal"}));
  fireEvent.change(screen.getByLabelText("Mapel belum tersedia? Tambahkan di sini"),{target:{value:"Bahasa Indonesia"}});
  fireEvent.click(screen.getByRole("button",{name:"Tambah mapel"}));
  await waitFor(()=>expect(screen.getByRole("combobox",{name:"Mata pelajaran"})).toHaveValue("new-subject"));
 });
 it("rejects conflicting batch rows before insert, then saves both adjacent lessons together",async()=>{
  open();fireEvent.click(await screen.findByRole("button",{name:"Tambah massal"}));
  fireEvent.change(screen.getByLabelText("Mapel baris 1"),{target:{value:"s1"}});fireEvent.change(screen.getByLabelText("Guru baris 1"),{target:{value:"t1"}});
  fireEvent.click(screen.getByRole("button",{name:"Duplikat baris 1"}));
  fireEvent.click(screen.getByRole("button",{name:"Simpan 2 jadwal"}));
  await waitFor(()=>expect(mock.error).toHaveBeenCalledWith(expect.stringContaining("Baris 2")));
  expect(mock.insert).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Mulai baris 2"),{target:{value:"08:00"}});fireEvent.change(screen.getByLabelText("Selesai baris 2"),{target:{value:"09:00"}});
  fireEvent.click(screen.getByRole("button",{name:"Simpan 2 jadwal"}));
  await waitFor(()=>expect(mock.insert).toHaveBeenCalledWith("teaching_schedules",expect.arrayContaining([expect.objectContaining({start_time:"07:00"}),expect.objectContaining({start_time:"08:00"})])));
  await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
 });
 it("retains batch data and displays server errors instead of success",async()=>{
  open();fireEvent.click(await screen.findByRole("button",{name:"Tambah massal"}));
  fireEvent.change(screen.getByLabelText("Mapel baris 1"),{target:{value:"s1"}});fireEvent.change(screen.getByLabelText("Guru baris 1"),{target:{value:"t1"}});mock.fail=true;
  fireEvent.click(screen.getByRole("button",{name:"Simpan 1 jadwal"}));
  await waitFor(()=>expect(mock.error).toHaveBeenCalledWith("Ditolak oleh server"));
  expect(screen.getByLabelText("Mapel baris 1")).toHaveValue("s1");expect(mock.success).not.toHaveBeenCalled();
 });
});
