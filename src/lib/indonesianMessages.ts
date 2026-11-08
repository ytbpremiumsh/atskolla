/** Translate provider messages at the presentation boundary, without changing error codes. */
const rules: [RegExp, string][] = [
  [/password is known to be weak|easy to guess|weak_password|password.*(?:leaked|breached|pwned)/i, "Kata sandi terlalu lemah atau mudah ditebak. Silakan gunakan kata sandi lain yang lebih kuat."],
  [/new password should be different|same_password/i, "Kata sandi baru harus berbeda dari kata sandi sebelumnya."],
  [/password should (?:be|contain)|password.*at least|password.*too short/i, "Kata sandi belum memenuhi persyaratan. Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol."],
  [/invalid login credentials|invalid_credentials/i, "Email atau kata sandi salah. Silakan periksa kembali."],
  [/email not confirmed|email_not_confirmed/i, "Email belum diverifikasi. Silakan periksa kotak masuk Anda."],
  [/user already registered|email.*already.*(?:registered|exists)|email_exists/i, "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain."],
  [/invalid.*(?:otp|token)|(?:otp|token).*(?:expired|invalid)|otp_expired/i, "Kode verifikasi tidak valid atau sudah kedaluwarsa. Silakan minta kode baru."],
  [/too many requests|rate.?limit|over_.*rate_limit|security purposes.*request/i, "Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi."],
  [/failed to fetch|networkerror|network request failed|network error|load failed|fetch failed/i, "Koneksi bermasalah. Periksa jaringan Anda, lalu coba lagi."],
  [/timeout|timed out|gateway time-out/i, "Waktu tunggu habis. Silakan coba lagi beberapa saat."],
  [/invalid refresh token|refresh token.*not found|auth session missing|jwt.*(?:expired|invalid)|not authenticated/i, "Sesi Anda telah berakhir. Silakan masuk kembali."],
  [/permission denied|row.level security|not authorized|unauthorized|forbidden|insufficient_privilege/i, "Anda tidak memiliki izin untuk melakukan tindakan ini."],
  [/duplicate key|unique constraint/i, "Data tersebut sudah terdaftar. Periksa kembali data yang Anda masukkan."],
  [/foreign key constraint/i, "Data masih terhubung dengan data lain. Periksa data terkait terlebih dahulu."],
  [/violates.*(?:constraint|not.null)|null value in column/i, "Data belum lengkap atau tidak sesuai. Periksa kembali isian Anda."],
  [/edge function.*(?:non.2xx|failed)|functionshttperror|internal server error|service unavailable|bad gateway/i, "Layanan sedang mengalami gangguan. Silakan coba lagi beberapa saat."],
  [/invalid api response.*file not found/i, "Layanan WhatsApp tidak ditemukan. Periksa pengaturan alamat gateway."],
  [/file.*(?:too large|size.*exceed)|maximum.*file.*size/i, "Ukuran berkas terlalu besar. Pilih berkas yang lebih kecil."],
  [/unsupported.*(?:file|format|type)|invalid mime/i, "Format berkas tidak didukung. Pilih format yang diizinkan."],
  [/bucket not found|object not found|resource not found/i, "Berkas atau data yang diminta tidak ditemukan."],
  [/user not found/i, "Akun tidak ditemukan. Periksa kembali data akun Anda."],
  [/invalid.*email|email.*invalid/i, "Alamat email tidak valid. Periksa kembali penulisannya."],
  [/signup.*disabled|signups not allowed/i, "Pendaftaran akun sedang dinonaktifkan. Hubungi pengelola sekolah."],
];
const labels: Record<string, string> = {
  Loading: "Memuat", "Loading...": "Memuat…", "Loading…": "Memuat…",
  Success: "Berhasil", Error: "Terjadi kesalahan", Warning: "Perhatian",
  Submit: "Kirim", Cancel: "Batal", Save: "Simpan", Delete: "Hapus", Edit: "Ubah",
  Close: "Tutup", Search: "Cari", Next: "Berikutnya", Previous: "Sebelumnya",
  Back: "Kembali", Download: "Unduh", Upload: "Unggah", Refresh: "Muat ulang",
  "No data": "Belum ada data", "No results found.": "Tidak ada hasil ditemukan.",
  "Unknown error": "Terjadi kesalahan. Silakan coba lagi.",
  "Something went wrong": "Terjadi kesalahan. Silakan coba lagi.",
  Connected: "Terhubung", Disconnected: "Terputus", Pending: "Menunggu", Failed: "Gagal",
};
export function indonesianMessage(value: unknown): unknown {
  if (typeof value !== "string") return value;
  for (const [pattern, translation] of rules) if (pattern.test(value)) return translation;
  const exact = labels[value.trim()];
  if (exact) return exact;
  // Unknown provider failures should not expose raw English or database internals.
  if (/\b(?:could not|cannot|unable to|failed to|unexpected|invalid|not found|does not exist|must be|is required|please try|an error occurred|unknown error|request failed|operation failed)\b/i.test(value)) {
    return "Permintaan belum berhasil diproses. Periksa data Anda atau coba lagi beberapa saat.";
  }
  return value;
}
