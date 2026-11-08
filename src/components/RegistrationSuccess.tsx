import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function RegistrationSuccess({
  loginUrl,
  schoolName,
}: {
  loginUrl: string;
  schoolName: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 p-5">
      <section className="w-full max-w-lg space-y-5 rounded-3xl border bg-card p-6 sm:p-8">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        <h1 className="text-2xl font-bold">Sekolah berhasil didaftarkan</h1>
        <p className="text-sm text-muted-foreground">
          {schoolName} sudah memiliki akun pengelola utama. Masuk menggunakan
          email dan password yang baru Anda buat.
        </p>
        <div className="rounded-xl bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary">
            ALAMAT LOGIN SEKOLAH
          </p>
          <a
            href={loginUrl}
            className="mt-2 block break-words text-sm font-semibold underline"
          >
            {loginUrl}
          </a>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  new URL(loginUrl, window.location.origin).href,
                );
                toast.success("Alamat login disalin");
              } catch {
                toast.error("Salin alamat login yang tampil di atas.");
              }
            }}
          >
            Salin alamat login
          </Button>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Masuk sebagai Admin Sekolah.</li>
          <li>2. Ikuti checklist Persiapan sekolah di dashboard.</li>
          <li>
            3. Tambahkan akun guru/operator, lalu bagikan akses wali murid
            setelah data siap.
          </li>
        </ol>
        <Button className="w-full" asChild>
          <a href={loginUrl}>Masuk dan siapkan sekolah</a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Jabatan saat mendaftar tidak mengubah peran akun pertama sebagai Admin
          Sekolah. Guru dan Operator menggunakan akun yang ditambahkan pengelola
          sekolah, bukan mendaftarkan sekolah baru.
        </p>
      </section>
    </main>
  );
}
