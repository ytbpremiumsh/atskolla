import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  RefreshCw,
  School,
  Wallet,
  UserPlus,
  LogIn,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  const [bankGuideOpen, setBankGuideOpen] = useState(false);
  const needsTreasurer = data?.treasurers === 0;
  const treasurerKnown = typeof data?.treasurers === "number";
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
      : needsTreasurer
        ? "Tambahkan Bendahara terlebih dahulu, lalu masuk dengan akun Bendahara untuk mengajukan rekening."
        : "Masuk menggunakan akun Bendahara, lalu ajukan rekening dari Dasbor Bendahara.",
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
                  {step.allowed && step.id === "bank" ? (
                    <button type="button" onClick={() => setBankGuideOpen(true)}
                      title={description} aria-label={`${step.title}: ${description}`}
                      aria-current={next?.id === step.id ? "step" : undefined}
                      className={`${style} ${next?.id === step.id ? "bg-primary/10 text-primary" : ""} hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
                      {content}
                    </button>
                  ) : step.allowed ? (
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
            ) : next?.id === "bank" ? (
              <Button size="sm" className="h-8 px-3 text-xs" onClick={() => setBankGuideOpen(true)}>Lanjutkan: Rekening</Button>
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
            <Link to="/staff" className="shrink-0 rounded font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Tambah Bendahara
            </Link>
          )}
        </div>
      )}
      <Dialog open={bankGuideOpen} onOpenChange={setBankGuideOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto rounded-2xl border-primary/15 p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:p-1 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/20 [&>button]:focus:ring-white">
          <DialogHeader className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-600 via-primary to-violet-600 px-6 pb-6 pt-6 text-left text-white">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background-image:radial-gradient(white_0.75px,transparent_0.75px)] [background-size:12px_12px]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-10 -z-10 h-48 w-48 rounded-full border-[24px] border-white/10" />
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/15"><Wallet className="h-5 w-5" aria-hidden="true" /></span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">Panduan rekening sekolah</span>
            </div>
            <DialogTitle className="pr-3 text-xl font-bold leading-snug text-white">
              {!treasurerKnown ? "Periksa akun Bendahara" : needsTreasurer ? "Tambahkan Bendahara terlebih dahulu" : "Ajukan melalui akun Bendahara"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 bg-gradient-to-b from-primary/[0.035] to-card px-5 py-5 sm:px-6">
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Pengajuan rekening pencairan dilakukan melalui Dasbor Bendahara menggunakan akun dengan peran Bendahara.
            </DialogDescription>
            {!treasurerKnown ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Status akun Bendahara belum dapat dipastikan. Tutup panduan ini dan klik Periksa ulang.</p>
            ) : (
              <ol className="divide-y divide-primary/10">
                {[
                  ...(needsTreasurer ? [{ title: "Siapkan akun Bendahara", body: "Tambahkan akun Bendahara atau berikan peran Bendahara kepada guru/staf yang ditunjuk.", icon: UserPlus }] : []),
                  { title: "Masuk sebagai Bendahara", body: "Simpan pekerjaan Anda, lalu keluar dari akun Admin dan masuk menggunakan akun Bendahara.", icon: LogIn },
                  { title: "Ajukan rekening sekolah", body: "Buka Dasbor Bendahara, pilih menu rekening pencairan, lalu lengkapi data dan ajukan rekening sekolah.", icon: Landmark },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary">
                      <step.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{index + 1}</span>
                    </span>
                    <div className="min-w-0">
                      <h3 className="mb-1 text-sm font-semibold text-foreground">{step.title}</h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <DialogFooter className="gap-2 border-t border-primary/10 bg-primary/[0.035] px-5 py-4 sm:gap-2 sm:px-6">
            <Button variant={treasurerKnown && needsTreasurer && admin ? "outline" : "default"} className="h-9 rounded-xl px-5 text-sm shadow-none" onClick={() => setBankGuideOpen(false)}>Mengerti</Button>
            {treasurerKnown && needsTreasurer && admin && (
              <Button className="h-9 gap-2 rounded-xl px-4 text-sm shadow-none" asChild><Link to="/staff" onClick={() => setBankGuideOpen(false)}>Tambah Bendahara<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
