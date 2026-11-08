import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { SCHEDULE_DAYS, type ScheduleForm } from "@/lib/classSchedule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  saving: boolean;
  value: ScheduleForm;
  onChange: (value: ScheduleForm) => void;
  onSave: () => void;
  teachers: { user_id: string; full_name: string }[];
  subjects: { id: string; name: string; is_active: boolean }[];
  onCreateSubject?: (name: string) => Promise<string | null>;
  classes: { id: string; name: string }[];
}
export function ScheduleEditor({ open, onOpenChange, editing, saving, value, onChange, onSave, teachers, subjects, classes, onCreateSubject }: Props) {
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const selectStyle = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const update = <K extends keyof ScheduleForm>(key: K, next: ScheduleForm[K]) => onChange({ ...value, [key]: next });
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving && !creating) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
          <DialogDescription>Tentukan kelas, mata pelajaran, guru, dan waktu mengajar.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!saving && !creating) onSave(); }}>
          <fieldset disabled={saving || creating} className="space-y-4">
            {!classes.length && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Belum ada kelas. <Link to="/classes" className="underline">Tambahkan kelas terlebih dahulu</Link>, lalu kembali ke jadwal.</p>}
            {onCreateSubject && <div className="rounded-xl border bg-primary/5 p-3 space-y-2"><Label htmlFor="new-schedule-subject">Mapel belum tersedia? Tambahkan di sini</Label><div className="flex gap-2"><Input id="new-schedule-subject" placeholder="Nama mata pelajaran baru" value={newSubject} onChange={e=>setNewSubject(e.target.value)}/><Button type="button" variant="outline" disabled={!newSubject.trim() || creating} onClick={async()=>{setCreating(true);try{const id=await onCreateSubject(newSubject);if(id){update("subject_id",id);setNewSubject("")}}finally{setCreating(false)}}}>{creating ? "Menyimpan…" : "Tambah mapel"}</Button></div></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Kelas *</Label><select required aria-label="Kelas" className={selectStyle} value={value.class_id} onChange={e=>update("class_id",e.target.value)}><option value="">Pilih kelas</option>{classes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Hari *</Label><select required aria-label="Hari" className={selectStyle} value={value.day_of_week} onChange={e=>update("day_of_week",Number(e.target.value))}>{SCHEDULE_DAYS.map((day,i)=><option key={day} value={i}>{day}</option>)}</select></div>
            </div>
            <div className="space-y-1.5"><Label>Mata pelajaran *</Label><select required aria-label="Mata pelajaran" className={selectStyle} value={value.subject_id} onChange={e=>update("subject_id",e.target.value)}><option value="">Pilih mapel</option>{subjects.filter(item=>item.is_active || item.id===value.subject_id).map(item=><option key={item.id} value={item.id}>{item.name}{!item.is_active && " (nonaktif)"}</option>)}</select></div>
            <div className="space-y-1.5"><Label>Guru *</Label><select required aria-label="Guru" className={selectStyle} value={value.teacher_id} onChange={e=>update("teacher_id",e.target.value)}><option value="">Pilih guru</option>{teachers.map(item=><option key={item.user_id} value={item.user_id}>{item.full_name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="schedule-start">Jam mulai *</Label><Input id="schedule-start" type="time" required value={value.start_time} onChange={(e) => update("start_time", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="schedule-end">Jam selesai *</Label><Input id="schedule-end" type="time" required value={value.end_time} onChange={(e) => update("end_time", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="schedule-room">Ruangan</Label><Input id="schedule-room" placeholder="Contoh: R. 201 atau Lab IPA" value={value.room} onChange={(e) => update("room", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="schedule-note">Catatan</Label><Textarea id="schedule-note" rows={2} placeholder="Catatan tambahan (opsional)" value={value.notes} onChange={(e) => update("notes", e.target.value)} /></div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={saving || creating || !classes.length || !subjects.length || !teachers.length}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Simpan perubahan" : "Tambah jadwal"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
