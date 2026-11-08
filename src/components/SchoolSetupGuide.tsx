import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  RefreshCw,
  School,
  Info,
} from "lucide-react";
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
  const [expanded, setExpanded] = useState(true);
  const steps = data ? setupSteps(data, admin) : [];
  const measured = steps.filter((s) => s.allowed && !s.optional);
  const complete = measured.filter((s) => s.done === true).length;
  const next = measured.find((s) => s.done !== true);
  return (
    <section
      aria-label="Persiapan sekolah"
      className="overflow-hidden rounded-2xl border border-primary/20 bg-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 bg-primary/5 p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <School className="h-5 w-5 text-primary" />
            Persiapan sekolah
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ikuti langkah berikut sebelum digunakan bersama guru dan wali murid.
          </p>
        </div>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onRefresh}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          Periksa ulang
        </Button>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {!schoolAvailable ? (
          <p role="alert" className="text-sm">
            Akun belum terhubung ke sekolah. Hubungi Admin Sekolah.
          </p>
        ) : pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            Memeriksa data persiapan sekolah…
          </p>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">
            Status belum dapat dimuat. Klik Periksa ulang.
          </p>
        ) : (
          <>
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span>
                  {complete} dari {measured.length} langkah memiliki data
                  persiapan
                </span>
                <button
                  className="font-semibold text-primary"
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Ringkas" : "Lihat langkah"}
                </button>
              </div>
              <div
                role="progressbar"
                aria-label="Progres persiapan sekolah"
                aria-valuenow={complete}
                aria-valuemin={0}
                aria-valuemax={measured.length}
                className="h-2 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${measured.length ? (complete / measured.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            {next && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                <div>
                  <p className="text-xs font-semibold text-primary">
                    LANGKAH BERIKUTNYA
                  </p>
                  <p className="mt-1 text-sm font-semibold">{next.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {next.done === null
                      ? "Status belum terkonfirmasi. Buka menu untuk memeriksa datanya."
                      : next.body}
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link to={next.url}>
                    Lanjutkan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
            {expanded && (
              <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {steps.map((s, i) => (
                  <li
                    key={s.id}
                    className="rounded-xl border bg-background p-3"
                  >
                    <div className="flex items-start gap-2">
                      {s.done === true ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <h3 className="text-sm font-semibold">
                          {i + 1}. {s.title}
                        </h3>
                        <p className="mt-1 text-[11px] font-medium text-primary">
                          {!s.allowed
                            ? (s.id === "bank" ? "Dikelola Admin/Bendahara" : "Dikelola Admin Sekolah")
                            : s.done === true
                              ? "Data tersedia"
                              : s.done === null
                                ? "Belum terkonfirmasi"
                                : "Perlu ditindaklanjuti"}
                          {s.optional && " · Jika digunakan"}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {s.body}
                        </p>
                        {s.allowed && (
                          <Link
                            to={s.url}
                            className="mt-2 inline-block text-xs font-semibold text-primary underline underline-offset-4"
                          >
                            Buka {s.title.toLowerCase()}
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {!!data?.students && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div>
              <p className="text-sm font-semibold">
                Bagikan akses wali murid setelah data diperiksa
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Wali masuk melalui nomor kartu siswa atau WhatsApp yang
                didaftarkan sekolah. Jangan bagikan akun Admin.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/login`,
                  );
                  toast.success("Alamat Portal Wali Murid disalin");
                } catch {
                  toast.error(
                    "Gunakan alamat website sekolah, lalu buka /login.",
                  );
                }
              }}
            >
              Salin link wali murid
            </Button>
          </div>
        )}
        <div className="flex gap-2 rounded-xl bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Data tersedia belum berarti seluruh alur telah diuji. Tinjau{" "}
            <Link
              className="font-semibold text-primary underline"
              to="/holidays"
            >
              jam absensi dan hari libur
            </Link>
            , lalu gunakan{" "}
            <Link
              className="font-semibold text-primary underline"
              to="/panduan"
            >
              panduan wali murid
            </Link>{" "}
            untuk membagikan akses. Pembayaran online memerlukan konfigurasi
            penyedia yang sesuai.
          </div>
        </div>
      </div>
    </section>
  );
}
