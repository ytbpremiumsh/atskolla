import { Copy, CreditCard, GraduationCap, Hash, Phone, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
type Identity = { student_id?: string; nisn?: string; class?: string; card_number?: string | null; parent_name?: string; parent_phone?: string };
export function StudentIdentitySummary({ student, className }: { student: Identity; className?: string }) {
  const card = String(student.card_number ?? "").replace(/\s/g, "");
  const fields = [
    { label: "NIS", value: student.student_id, icon: Hash },
    ...(student.nisn ? [{ label: "NISN", value: student.nisn, icon: Hash }] : []),
    { label: "Kelas", value: student.class, icon: GraduationCap },
    { label: "Wali murid", value: student.parent_name, icon: Users },
    { label: "WhatsApp wali", value: student.parent_phone, icon: Phone },
  ];
  return <section style={{ containerType: "inline-size", containerName: "student-identity" }} aria-label="Ringkasan identitas siswa" className={cn("relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.055] via-card to-card p-3 sm:p-4", className)}>
    <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full border-[18px] border-primary/[0.035]" />
    <dl className="student-identity-grid relative grid grid-cols-2 gap-3">
      <div className="col-span-2 flex items-center gap-3 rounded-xl border border-primary/15 bg-card/90 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nomor kartu</dt><dd className="mt-1 select-text break-words font-mono text-sm font-bold tracking-wide text-foreground">{card ? card.replace(/(.{4})(?=.)/g, "$1 ") : "Belum tersedia"}</dd></div>
        {card && <button type="button" aria-label="Salin nomor kartu" title="Salin nomor kartu" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={async () => { try { await navigator.clipboard.writeText(card); toast.success("Nomor kartu berhasil disalin"); } catch { toast.error("Nomor kartu belum dapat disalin. Pilih teks nomor kartu untuk menyalinnya secara manual."); } }}><Copy className="h-3.5 w-3.5" aria-hidden="true" /></button>}
      </div>
      {fields.map((field) => <div key={field.label} className="flex min-w-0 items-start gap-2 px-1 py-2">
        <field.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
        <div className="min-w-0"><dt className="text-[10px] font-medium text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words text-xs font-semibold leading-relaxed text-foreground">{field.value || "Belum diisi"}</dd></div>
      </div>)}
    </dl>
  </section>;
}
