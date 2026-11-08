import { MemoryRouter } from "react-router-dom";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import HolidayManagement from "./HolidayManagement";
const mock=vi.hoisted(()=>({roles:["staff"],saved:vi.fn(),school:{holiday_mode:false,holiday_mode_label:null as string|null,holiday_days:[0],timezone:"Asia/Jakarta"}}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({profile:{school_id:"school"},roles:mock.roles})}));
vi.mock("@/components/PageHeader",()=>({PageHeader:({title}:{title:string})=><h1>{title}</h1>}));
vi.mock("sonner",()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
 let patch:Partial<typeof mock.school>|null=null;
 const b={select:()=>b,eq:()=>b,limit:()=>b,update:(p:typeof patch)=>{patch=p;return b},
 single:async()=>{if(patch){mock.saved(patch);Object.assign(mock.school,patch)}return {data:table==="schools"?{...mock.school}:null,error:null}},
 maybeSingle:async()=>({data:table==="schools"?{...mock.school}:null,error:null})};return b;
}}}));
beforeEach(()=>{cleanup();vi.clearAllMocks();mock.roles=["staff"];mock.school={holiday_mode:false,holiday_mode_label:null,holiday_days:[0],timezone:"Asia/Jakarta"};});
describe("Operator holiday controls",()=>{
 it("shows the manual switch and saves on/off and weekly days for an operator",async()=>{
  render(<MemoryRouter><HolidayManagement/></MemoryRouter>);const toggle=screen.getByRole("switch",{name:"Mode libur cepat"});await waitFor(()=>expect(toggle).toBeEnabled());
  fireEvent.click(toggle);await waitFor(()=>expect(toggle).toBeChecked());expect(mock.saved).toHaveBeenCalledWith({holiday_mode:true,holiday_mode_label:"Hari Libur"});
  fireEvent.click(toggle);await waitFor(()=>expect(toggle).not.toBeChecked());expect(mock.saved).toHaveBeenCalledWith({holiday_mode:false,holiday_mode_label:null});
  fireEvent.click(screen.getByRole("button",{name:"Minggu"}));await waitFor(()=>expect(mock.saved).toHaveBeenCalledWith({holiday_days:[]}));
 });
 it("does not allow a teacher-only account to edit",async()=>{
  mock.roles=["teacher"];render(<MemoryRouter><HolidayManagement/></MemoryRouter>);await screen.findByText("Status absensi hari ini: Libur");
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();expect(screen.getByRole("button",{name:"Minggu"})).toBeDisabled();
 });
});
