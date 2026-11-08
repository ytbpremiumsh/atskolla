import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  RefreshCw,
  School,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  fetchSchoolSetup,
  setupSteps,
  type SetupSnapshot,
} from "@/lib/schoolSetup";
export function SchoolSetupGuide() {
  const { profile, user, roles } = useAuth();
  const admin = roles.includes("school_admin") || roles.includes("super_admin");
  const allowed = admin || roles.includes("staff");
  const query = useQuery({
    queryKey: ["school-setup", profile?.school_id, user?.id, admin],
    queryFn: () => fetchSchoolSetup(profile!.school_id!, user!.id, admin),
    enabled: allowed && !!profile?.school_id && !!user?.id,
    staleTime: 15000,
  });
  if (!allowed) return null;
  return (
    <SchoolSetupPanel
      key={`${profile?.school_id}:${user?.id}`}
      dismissalKey={`atskolla:setup-complete:${profile?.school_id}:${user?.id}`}
      data={query.data}
      admin={admin}
      schoolAvailable={!!profile?.school_id}
      pending={query.isPending}
      error={query.isError}
      busy={query.isFetching}
      onRefresh={() => query.refetch()}
    />
  );
}
export function SchoolSetupPanel({
  data,
  dismissalKey,
  admin,
  schoolAvailable = true,
  pending = false,
  error = false,
  busy = false,
  onRefresh,
}: {
  data?: SetupSnapshot;
  dismissalKey?: string;
  admin: boolean;
  schoolAvailable?: boolean;
  pending?: boolean;
  error?: boolean;
  busy?: boolean;
  onRefresh: () => void;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return !!dismissalKey && localStorage.getItem(dismissalKey) === "true"; }
    catch { return false; }
  });
  const steps = data ? setupSteps(data, admin) : [];
  const measured = steps.filter((s) => s.allowed && !s.optional);
  const complete = measured.filter((s) => s.done === true).length;
  const bankSubmitted = !!data && ["pending", "verified", "linked"].includes(data.bank ?? "");
  const canFinish = !!data && measured.length > 0 && complete === measured.length && (!admin || bankSubmitted);
  const next = measured.find((step) => step.done !== true)
    ?? steps.find((step) => step.allowed && step.done !== true);
  const labels: Record<string, string> = {
    identity: "Identitas", classes: "Kelas", students: "Siswa",
    team: "Guru / Staff", schedules: "Jadwal", whatsapp: "WhatsApp", bank: "Rekening",
  };
  const guides: Record<string, string> = {
    identity: "Lengkapi kontak dan zona waktu sekolah.",
    classes: "Tambahkan kelas sebelum mengisi siswa.",
    students: "Isi siswa, nomor kartu, dan WhatsApp wali.",
    team: "Tambahkan guru dan staff sesuai tugas. Tambahkan Bendahara untuk mengaktifkan pembayaran SPP dan Tagihan.",
    schedules: "Atur mapel, guru, dan jam per kelas.",
    whatsapp: "Hubungkan perangkat untuk notifikasi wali.",
    bank: bankSubmitted
      ? "Rekening sudah diajukan. Verifikasi rekening diproses terpisah."
      : "Tambahkan rekening pencairan sekolah.",
  };
  if (dismissed) return null;
  return (
    <section
      aria-label="Persiapan sekolah"
      className="min-w-0 overflow-hidden rounded-xl border border-primary/15 bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-primary/10 bg-primary/5 px-3 py-2">
        <p className="text-xs font-medium">
          {canFinish ? "Tahapan persiapan selesai. Klik Selesai untuk menutup panduan ini." : "Selesaikan tahapan persiapan terlebih dahulu sebelum menggunakan sistem."}
        </p>

      </div>
      <div className="flex min-w-0 items-start gap-3 px-3 py-2">
        <div className="flex min-h-9 shrink-0 items-center gap-2 text-xs font-semibold">
          <School className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2>Persiapan</h2>
          {schoolAvailable && !pending && !error && (
            <span className="text-muted-foreground">{complete}/{measured.length}</span>
          )}
        </div>
        {!schoolAvailable ? (
          <p role="alert" className="text-xs">Akun belum terhubung ke sekolah.</p>
        ) : pending ? (
          <p role="status" className="text-xs text-muted-foreground">Memeriksa…</p>
        ) : error ? (
          <p role="alert" className="text-xs text-destructive">Gagal memuat. Periksa ulang.</p>
        ) : (
          <ol aria-label="Tahapan persiapan" className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
            {steps.map((step, index) => {
              const status = !step.allowed
                ? (step.id === "bank" ? "Dikelola Admin/Bendahara" : "Dikelola Admin Sekolah")
                : step.done === true ? "Data tersedia"
                : step.done === null ? "Belum terkonfirmasi" : "Belum lengkap";
              const description = `${status}${step.optional ? " · Opsional" : ""}. ${step.body}`;
              const content = (
                <>
                  {step.done === true ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span>{index + 1}. {labels[step.id] ?? step.title}</span>
                  {step.optional && <span className="text-muted-foreground">*</span>}
                </>
              );
              const style = "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium";
              return (
                <li key={step.id} className="shrink-0">
                  {step.allowed ? (
                    <Link to={step.url} title={description} aria-label={`${step.title}: ${description}`}
                      aria-current={next?.id === step.id ? "step" : undefined}
                      className={`${style} ${next?.id === step.id ? "bg-primary/10 text-primary" : ""} hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
                      {content}
                    </Link>
                  ) : (
                    <span title={description} aria-label={`${step.title}: ${description}`}
                      className={`${style} text-muted-foreground`}>{content}</span>
                  )}

                </li>
              );
            })}
          </ol>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {schoolAvailable && !pending && !error && (
            canFinish ? (
              <Button size="sm" className="h-8 px-3 text-xs" onClick={() => {
                try { if (dismissalKey) localStorage.setItem(dismissalKey, "true"); }
                catch { /* Still allow dismissing for this visit. */ }
                setDismissed(true);
                toast.success("Tahapan persiapan selesai.");
              }}>Selesai</Button>
            ) : next ? (
              <Button size="sm" className="h-8 px-3 text-xs" asChild>
                <Link to={next.url}>Lanjutkan: {labels[next.id] ?? next.title}</Link>
              </Button>
            ) : null
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}
            aria-label="Periksa ulang" title="Periksa ulang" onClick={onRefresh}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      {schoolAvailable && !pending && !error && next && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{labels[next.id] ?? next.title}: </span>
            {guides[next.id]}
          </p>
          {next.id === "team" && data?.treasurers === 0 && admin && (
            <Link to="/bendahara-manage" className="shrink-0 rounded font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Tambah Bendahara
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
