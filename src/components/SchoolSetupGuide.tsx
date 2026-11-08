import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  RefreshCw,
  School,
} from "lucide-react";
import { buildTenantUrl, parseSubdomain } from "@/lib/tenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
  admin,
  schoolAvailable = true,
  pending = false,
  error = false,
  busy = false,
  onRefresh,
}: {
  data?: SetupSnapshot;
  admin: boolean;
  schoolAvailable?: boolean;
  pending?: boolean;
  error?: boolean;
  busy?: boolean;
  onRefresh: () => void;
}) {
  const steps = data ? setupSteps(data, admin) : [];
  const measured = steps.filter((s) => s.allowed && !s.optional);
  const complete = measured.filter((s) => s.done === true).length;
  const next = measured.find((step) => step.done !== true);
  const labels: Record<string, string> = {
    identity: "Identitas", classes: "Kelas", students: "Siswa",
    team: "Tim", schedules: "Jadwal", whatsapp: "WhatsApp", bank: "Rekening", payments: "Bendahara",
  };
  const guides: Record<string, string> = {
    identity: "Lengkapi kontak dan zona waktu sekolah.",
    classes: "Tambahkan kelas sebelum mengisi siswa.",
    students: "Isi siswa, nomor kartu, dan WhatsApp wali.",
    team: "Tambahkan guru dan operator sesuai tugas.",
    schedules: "Atur mapel, guru, dan jam per kelas.",
    whatsapp: "Hubungkan perangkat untuk notifikasi wali.",
    payments: data?.treasurers ? "Bendahara tersedia; atur pembayaran SPP dan Tagihan." : "Tambahkan Bendahara untuk mengaktifkan pembayaran SPP dan Tagihan.",
    bank: "Ajukan rekening dan lengkapi ID DOKU.",
  };
  return (
    <section
      aria-label="Persiapan sekolah"
      className="min-w-0 overflow-hidden rounded-xl border border-primary/15 bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-primary/10 bg-primary/5 px-3 py-2">
        <p className="text-xs font-medium">
          Selesaikan tahapan persiapan terlebih dahulu sebelum menggunakan sistem.
        </p>
        {schoolAvailable && !pending && !error && next && (
          <Link to={next.url} className="rounded text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Lanjutkan: {labels[next.id] ?? next.title}
          </Link>
        )}
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
                <li key={step.id} className="w-40 shrink-0">
                  {step.allowed ? (
                    <Link to={step.url} title={description} aria-label={`${step.title}: ${description}`}
                      className={`${style} hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
                      {content}
                    </Link>
                  ) : (
                    <span title={description} aria-label={`${step.title}: ${description}`}
                      className={`${style} text-muted-foreground`}>{content}</span>
                  )}
                  <p className="px-2 pb-1 text-[11px] leading-relaxed text-muted-foreground">
                    {guides[step.id]}
                    {!step.allowed && <span className="block">Dikelola Admin Sekolah.</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!!data?.students && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs"
              title="Salin alamat portal wali murid"
              onClick={async () => {
                try {
                  const slug = parseSubdomain();
                  await navigator.clipboard.writeText(slug ? buildTenantUrl(slug, "/login") : `${window.location.origin}/login`);
                  toast.success("Alamat Portal Wali Murid disalin");
                } catch {
                  toast.error("Gunakan alamat website sekolah, lalu buka /login.");
                }
              }}>
              Link wali
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}
            aria-label="Periksa ulang" title="Periksa ulang" onClick={onRefresh}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </section>
  );
}
