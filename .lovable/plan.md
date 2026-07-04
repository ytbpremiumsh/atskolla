
# Auto-Subdomain untuk Sekolah Baru (VPS Wildcard)

## Ringkasan Situasi

Infrastruktur inti **sudah 70% ada** di project. Yang tersisa hanya beberapa penyempurnaan supaya flow-nya fully otomatis dan sesuai keinginan Anda.

## Yang Sudah Ada (Tidak Perlu Dibuat Ulang)

- Kolom `schools.slug` unik + validasi regex + trigger auto-generate (`schools_autoslug`) + proteksi rename (`schools_protect_slug`).
- Daftar subdomain terlarang (`is_reserved_slug`): www, admin, api, super, landing, dll — sekolah tidak bisa pakai kata sistem.
- `src/lib/tenant.tsx` — otomatis baca `hostname` browser, resolve slug ke sekolah, tampilkan `TenantNotFound` jika subdomain tidak terdaftar.
- `TenantProvider` sudah di-mount di `App.tsx`, tab title berubah otomatis per sekolah.
- Dokumen `VPS_WILDCARD_SETUP.md` sudah lengkap (Nginx + Certbot DNS-01 wildcard SSL).
- Register sudah menampilkan URL subdomain setelah sukses.

## Yang Akan Dibangun

### 1. Register — Pilih Subdomain Sendiri (real-time check)

Tambah 1 field baru pada form register: **"Alamat Website Sekolah Anda"**.

```text
[  smpn1jakarta  ] .absenpintar.online     ✓ Tersedia
```

- Auto-slugify input (spasi → `-`, lowercase, buang karakter aneh).
- Debounce 400ms → cek `schools` table apakah slug dipakai.
- Status inline: `Mengecek…` / `✓ Tersedia` / `✗ Sudah dipakai` / `✗ Tidak diperbolehkan (kata sistem)`.
- Suffix domain (`.absenpintar.online`) diambil dari `window.location.hostname` sekarang — jadi otomatis ikut domain tempat file di-install. Kalau install di `sekolahku.id`, tampilan jadi `[  slug  ].sekolahku.id`.
- Tombol Daftar disable sampai slug valid & tersedia.

### 2. Edge Function `create-user` — Terima `desired_slug`

- Terima parameter baru `desired_slug` dari Register.
- Validasi: regex `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`, cek `is_reserved_slug`, cek unik.
- Kalau kosong → fallback ke `schools_autoslug` trigger (dari nama sekolah).
- Kalau dipilih user tapi bentrok saat race condition → tolak dengan error jelas.
- Response `school_slug` tetap dipakai untuk toast sukses.

### 3. Root Domain Dinamis (menyesuaikan tempat install)

- Ubah toast di Register: hilangkan hardcode `.atskolla.com`, ganti pakai `window.location.hostname` (ambil last-2-parts otomatis).
- `tenant.tsx` — `VITE_ROOT_HOSTS` sudah env-driven, tapi tambah fallback: kalau env kosong, treat `window.location.hostname` sekarang sebagai root host.
- Semua tempat lain yang hardcode "atskolla.com" atau "absenpintar.online" (misal `TenantNotFound`, footer, dsb) → refactor pakai helper `getRootDomain()` baru.

### 4. Enforce Subdomain-Only Access (Wajib Pindah)

Karena sekolah lama harus pindah ke subdomain:

- Di **root domain** (`absenpintar.online` tanpa subdomain):
  - `/login` → tidak boleh langsung. Redirect ke landing dengan modal **"Cari Sekolah Anda"** — input nama/NPSN → hasil pencarian → klik → auto-redirect ke `slug.absenpintar.online/login`.
  - `/register` → tetap boleh (untuk sekolah baru).
  - `/dashboard` dan route sekolah lainnya → redirect ke landing.
- Di **subdomain sekolah** (`slug.absenpintar.online`): akses normal seperti sekarang.
- Reuse edge fn `forgot-password` yang sudah ada untuk lookup by email, atau buat query publik `schools` (select `slug,name,npsn` where LIKE).

### 5. Super Admin — Rename Subdomain

- Di `SchoolEditDialog`, tambah field **Subdomain** dengan warning: *"Mengubah subdomain akan memutus semua bookmark & QR sekolah lama."*
- Trigger `schools_protect_slug` sudah memastikan hanya super_admin yang bisa rename → langsung jalan.

### 6. Dokumentasi VPS (Sudah Ada, Verifikasi)

`VPS_WILDCARD_SETUP.md` sudah cover:
- DNS wildcard `*.absenpintar.online` → IP VPS
- Nginx config wildcard vhost
- Certbot DNS-01 Cloudflare untuk wildcard SSL (auto-renew)
- Deploy Vite build ke `/var/www/atskolla/dist`

Tidak perlu diubah — tinggal ikuti panduannya. Backend Supabase tetap di Lovable Cloud, VPS hanya hosting static frontend.

## Detail Teknis

**File yang diubah:**
- `src/pages/Register.tsx` — tambah field slug + availability checker
- `supabase/functions/create-user/index.ts` — accept `desired_slug`, validasi
- `src/lib/tenant.tsx` — helper `getRootDomain()`, fallback dinamis
- `src/App.tsx` — guard route: root domain vs subdomain (redirect logic)
- `src/pages/Login.tsx` — kalau di root, redirect ke landing + tampilkan lookup sekolah
- `src/pages/LandingPage.tsx` — tambah section "Sudah punya akun? Cari sekolah Anda"
- `src/components/super-admin/SchoolEditDialog.tsx` — field subdomain

**Migration:** tidak perlu — semua kolom & trigger DB sudah ada.

**Env baru (opsional):** `VITE_ROOT_HOSTS` di VPS berisi domain produksi Anda.

## Flow Akhir untuk Sekolah Baru

```text
1. SMP N 1 buka absenpintar.online
2. Klik "Daftar Gratis"
3. Isi form: nama sekolah "SMP Negeri 1 Jakarta"
   → sistem suggest slug "smpn1-jakarta"
   → user boleh edit jadi "smpn1jkt"
   → real-time check: ✓ Tersedia
4. Submit → backend create school + slug
5. Toast: "Login di smpn1jkt.absenpintar.online"
6. Klik link → langsung masuk portal sekolah dengan branding sendiri
   (tanpa perlu setup DNS/config apapun di sisi Anda)
```

## Yang TIDAK Termasuk Rencana Ini

- Custom domain per sekolah (misal `absensi.smpn1jkt.sch.id`) — itu topik terpisah, sudah ada halaman `CustomDomain.tsx` sebagai add-on.
- Migrasi otomatis data sekolah lama — cukup satu-satu login ulang di subdomain baru; data DB tidak bergerak.
