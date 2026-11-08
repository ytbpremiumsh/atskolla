import { useState } from "react";
import { Plus, Copy, Trash2, Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SCHEDULE_DAYS, type ScheduleForm } from "@/lib/classSchedule";

const emptySchedule = (classId = ""): ScheduleForm => ({ class_id: classId, teacher_id: "", subject_id: "", day_of_week: 0, start_time: "07:00", end_time: "08:00", room: "", notes: "" });
interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; saving: boolean;
  classes: {id:string;name:string}[]; teachers: {user_id:string;full_name:string}[];
  subjects: {id:string;name:string;is_active:boolean}[];
  onCreateSubject?: (name: string) => Promise<string | null>;
  onSave: (rows: ScheduleForm[]) => Promise<boolean>;
}
export function BulkScheduleEditor({open,onOpenChange,saving,classes,teachers,subjects,onSave,onCreateSubject}: Props) {
  const [newSubject,setNewSubject]=useState("");
  const [creating,setCreating]=useState(false);
  const [rows,setRows]=useState<ScheduleForm[]>([emptySchedule(classes[0]?.id)]);
  const update=(index:number,patch:Partial<ScheduleForm>)=>setRows(previous=>previous.map((row,i)=>i===index?{...row,...patch}:row));
  const selectClass="h-10 w-full min-w-28 rounded-lg border border-input bg-background px-2 text-sm";
  return <Dialog open={open} onOpenChange={next=>{if(!saving && !creating)onOpenChange(next)}}><DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-2xl">
    <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary"/>Tambah Jadwal Massal</DialogTitle><DialogDescription>Isi beberapa jadwal sekaligus, untuk satu atau beberapa kelas. Semua baris diperiksa sebelum disimpan bersamaan. Maksimal 100 baris.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!saving&&!creating&&await onSave(rows))setRows([emptySchedule(classes[0]?.id)])}}>
      <fieldset disabled={saving || creating} className="space-y-4 min-w-0">
        {!classes.length && <p role="alert" className="text-sm text-amber-700">Belum ada kelas. Tambahkan kelas melalui menu Data Kelas sebelum menyimpan jadwal.</p>}
        {onCreateSubject && <div className="flex flex-wrap gap-2 rounded-xl border bg-primary/5 p-3"><Input aria-label="Mapel baru untuk jadwal massal" className="max-w-sm" placeholder="Tambahkan mata pelajaran baru (opsional)" value={newSubject} onChange={e=>setNewSubject(e.target.value)}/><Button type="button" variant="outline" disabled={!newSubject.trim() || creating} onClick={async()=>{setCreating(true);try{const id=await onCreateSubject(newSubject);if(id)setNewSubject("")}finally{setCreating(false)}}}>Tambah mapel</Button></div>}
        <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-primary/5 text-left"><tr>{['No.','Kelas','Hari','Mata pelajaran','Guru','Mulai','Selesai','Ruangan','Aksi'].map(t=><th key={t} className="px-2 py-3 font-semibold">{t}</th>)}</tr></thead><tbody>
        {rows.map((row,i)=><tr key={i} className="border-t align-top"><td className="p-2 pt-5">{i+1}</td>
          <td className="p-2"><select required aria-label={`Kelas baris ${i+1}`} className={selectClass} value={row.class_id} onChange={e=>update(i,{class_id:e.target.value})}><option value="">Pilih kelas</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
          <td className="p-2"><select aria-label={`Hari baris ${i+1}`} className={selectClass} value={row.day_of_week} onChange={e=>update(i,{day_of_week:Number(e.target.value)})}>{SCHEDULE_DAYS.map((d,n)=><option key={d} value={n}>{d}</option>)}</select></td>
          <td className="p-2"><select required aria-label={`Mapel baris ${i+1}`} className={selectClass} value={row.subject_id} onChange={e=>update(i,{subject_id:e.target.value})}><option value="">Pilih mapel</option>{subjects.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
          <td className="p-2"><select required aria-label={`Guru baris ${i+1}`} className={selectClass} value={row.teacher_id} onChange={e=>update(i,{teacher_id:e.target.value})}><option value="">Pilih guru</option>{teachers.map(t=><option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}</select></td>
          <td className="p-2"><Input aria-label={`Mulai baris ${i+1}`} type="time" required value={row.start_time} onChange={e=>update(i,{start_time:e.target.value})}/></td>
          <td className="p-2"><Input aria-label={`Selesai baris ${i+1}`} type="time" required value={row.end_time} onChange={e=>update(i,{end_time:e.target.value})}/></td>
          <td className="p-2"><Input aria-label={`Ruangan baris ${i+1}`} className="min-w-28" value={row.room} onChange={e=>update(i,{room:e.target.value})}/></td>
          <td className="p-2"><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Duplikat baris ${i+1}`} disabled={rows.length>=100} onClick={()=>setRows([...rows,{...row}])}><Copy className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" aria-label={`Hapus baris ${i+1}`} disabled={rows.length===1} onClick={()=>setRows(rows.filter((_,n)=>n!==i))}><Trash2 className="h-4 w-4"/></Button></div></td></tr>)}
        </tbody></table></div>
        <Button type="button" variant="outline" disabled={rows.length>=100} onClick={()=>setRows([...rows,emptySchedule(rows.at(-1)?.class_id || classes[0]?.id)])}><Plus className="mr-2 h-4 w-4"/>Tambah baris</Button>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={saving} onClick={()=>onOpenChange(false)}>Batal</Button><Button disabled={saving || creating || !classes.length || !subjects.some(s=>s.is_active) || !teachers.length}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Simpan {rows.length} jadwal</Button></div>
    </form>
  </DialogContent></Dialog>;
}
