import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  classes: { id: string; name: string }[];
}
export function ScheduleEditor({ open, onOpenChange, editing, saving, value, onChange, onSave, teachers, subjects, classes }: Props) {
  const update = <K extends keyof ScheduleForm>(key: K, next: ScheduleForm[K]) => onChange({ ...value, [key]: next });
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
          <DialogDescription>Tentukan kelas, mata pelajaran, guru, dan waktu mengajar.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!saving) onSave(); }}>
          <fieldset disabled={saving} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Kelas *</Label><Select value={value.class_id} onValueChange={(v) => update("class_id", v)}><SelectTrigger aria-label="Kelas"><SelectValue placeholder="Pilih kelas" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Hari *</Label><Select value={String(value.day_of_week)} onValueChange={(v) => update("day_of_week", Number(v))}><SelectTrigger aria-label="Hari"><SelectValue /></SelectTrigger><SelectContent>{SCHEDULE_DAYS.map((day, i) => <SelectItem key={day} value={String(i)}>{day}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Mata pelajaran *</Label><Select value={value.subject_id} onValueChange={(v) => update("subject_id", v)}><SelectTrigger aria-label="Mata pelajaran"><SelectValue placeholder="Pilih mapel" /></SelectTrigger><SelectContent>{subjects.filter((item) => item.is_active || item.id === value.subject_id).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{!item.is_active && " (nonaktif)"}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Guru *</Label><Select value={value.teacher_id} onValueChange={(v) => update("teacher_id", v)}><SelectTrigger aria-label="Guru"><SelectValue placeholder="Pilih guru" /></SelectTrigger><SelectContent>{teachers.map((item) => <SelectItem key={item.user_id} value={item.user_id}>{item.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="schedule-start">Jam mulai *</Label><Input id="schedule-start" type="time" required value={value.start_time} onChange={(e) => update("start_time", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="schedule-end">Jam selesai *</Label><Input id="schedule-end" type="time" required value={value.end_time} onChange={(e) => update("end_time", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="schedule-room">Ruangan</Label><Input id="schedule-room" placeholder="Contoh: R. 201 atau Lab IPA" value={value.room} onChange={(e) => update("room", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="schedule-note">Catatan</Label><Textarea id="schedule-note" rows={2} placeholder="Catatan tambahan (opsional)" value={value.notes} onChange={(e) => update("notes", e.target.value)} /></div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Simpan perubahan" : "Tambah jadwal"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
