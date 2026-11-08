import { CheckCircle2, Circle } from "lucide-react";
export function GatewaySetupStatus({
  configured,
  connected,
  enabled,
  platform = false,
  method = "mpwa",
}: {
  configured: boolean;
  connected: boolean;
  enabled: boolean;
  platform?: boolean;
  method?: string;
}) {
  const steps = [
    {
      title: "1. Konfigurasi gateway",
      body: configured
        ? "Data konfigurasi tersedia. Pastikan perubahan sudah disimpan."
        : "Isi dan simpan konfigurasi gateway yang digunakan.",
      done: configured,
    },
    {
      title:
        method === "mpwa" ? "2. Hubungkan perangkat" : "2. Periksa layanan",
      body:
        method !== "mpwa"
          ? "Gunakan pemeriksaan koneksi gateway dan tinjau riwayat pengiriman."
          : connected
            ? "Perangkat tercatat terhubung."
            : "Untuk MPWA, tampilkan QR lalu tautkan perangkat melalui WhatsApp.",
      done: connected,
    },
    {
      title: "3. Periksa pengiriman",
      body: "Periksa riwayat dan penerimaan pesan sebelum dipakai rutin. Status tersambung bukan bukti pesan diterima.",
      done: false,
    },
  ];
  return (
    <section
      aria-label="Tahapan WhatsApp"
      className="rounded-2xl border bg-card p-4"
    >
      <h3 className="text-sm font-semibold">
        Tahapan aktivasi WhatsApp {platform ? "platform" : "sekolah"}
      </h3>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.title} className="rounded-xl bg-secondary/50 p-3">
            <p className="flex items-start gap-2 text-xs font-semibold">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {s.title}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        {enabled
          ? "Notifikasi diizinkan. Pengiriman tetap memerlukan gateway yang berfungsi dan nomor tujuan yang benar."
          : "Notifikasi sekolah sedang dinonaktifkan. Aktifkan setelah konfigurasi siap."}
      </p>
    </section>
  );
}
