
# Plan: Auto Wildcard Subdomain `{slug}.atskolla.com` per Sekolah

Tujuan: Setiap sekolah baru otomatis punya `slug.atskolla.com` yang melayani **login ber-branding, monitoring publik, parent portal, dan seluruh app** dengan isolasi data berdasarkan subdomain.

---

## Bagian 1 — Yang harus disiapkan user (sekali setup di luar Lovable)

Ini **tidak bisa saya kerjakan** karena di luar Lovable, tapi wajib agar wildcard jalan:

1. **Beli/punya domain `atskolla.com`** dan arahkan nameserver ke **Cloudflare** (gratis).
2. Di Cloudflare DNS, tambahkan record:
   - `CNAME  *  →  absenpintar.lovable.app` (Proxied / orange cloud ON)
   - `CNAME  @  →  absenpintar.lovable.app` (Proxied)
3. Di Lovable → Project Settings → Domains:
   - Connect `atskolla.com` **dengan opsi "Domain uses Cloudflare proxy"** dicentang (CNAME verification).
   - Catatan: Lovable hanya verifikasi domain root. Wildcard `*` ditangani Cloudflare proxy yang melempar semua subdomain ke origin Lovable yang sama. SSL otomatis dari Cloudflare Universal SSL.
4. (Opsional tapi direkomendasikan) **Cloudflare Page Rule / Transform Rule** untuk meneruskan `Host` header asli ke origin sehingga app bisa baca subdomain.

Setelah ini sekali jadi, **semua sekolah baru otomatis** tanpa setup DNS tambahan.

---

## Bagian 2 — Yang saya kerjakan di codebase

### 2.1 Schema database
- Tambah kolom `schools.slug` (text, unique, lowercase, regex `^[a-z0-9-]+$`).
- Migration backfill slug untuk sekolah existing dari `name` (slugify).
- Trigger auto-generate slug saat insert sekolah baru jika kosong (handle collision: `smkcendikia`, `smkcendikia-2`, dst).
- Update edge function `create-user` agar generate & simpan slug saat school baru dibuat.

### 2.2 Tenant resolver (frontend)
- Buat `src/lib/tenant.ts`:
  - Parse `window.location.hostname` → ekstrak subdomain.
  - Kalau host = `atskolla.com` / `www.atskolla.com` / `*.lovable.app` / `localhost` → mode **landing** (tidak terikat sekolah).
  - Kalau subdomain ada → fetch `schools` by slug, simpan di React Context `TenantProvider`.
  - Kalau slug tidak ditemukan → halaman "Sekolah tidak ditemukan".
- `TenantProvider` membungkus `App.tsx`, expose `useTenant()` ke seluruh app.

### 2.3 Login & UI ber-branding per subdomain
- Halaman `Login.tsx`: jika `useTenant().school` ada, tampilkan logo + nama + warna sekolah, sembunyikan field "Pilih sekolah". Auto-scope login ke `school_id` sekolah tsb.
- Halaman publik (`PublicMonitoring`, `PublicAttendanceMonitoring`, `ParentLogin`) baca slug dari subdomain, bukan dari path/param.
- Root subdomain (`smkcendikia.atskolla.com/`) redirect ke `/login` sekolah tsb (bukan landing page ATSkolla).

### 2.4 Landing page
- `atskolla.com` (tanpa subdomain) tetap menampilkan landing marketing seperti sekarang.
- Form pendaftaran sekolah baru: setelah daftar, tampilkan "URL sekolah Anda: `smkcendikia.atskolla.com`" + tombol langsung kunjungi.

### 2.5 Super Admin
- Tambah kolom "Subdomain" di `SuperAdminSchools` dengan tombol edit slug (validasi unique + warning kalau diubah karena memutus link lama).

---

## Bagian 3 — Hal yang perlu diperhatikan / risiko

- **Supabase Auth cookie**: domain cookie harus di-scope ke `.atskolla.com` agar session valid lintas subdomain. Saat ini Supabase pakai localStorage (bukan cookie), jadi **session terisolasi per subdomain** — user yang login di `smkA.atskolla.com` tidak otomatis login di `smkB.atskolla.com`. Ini justru bagus untuk multi-tenant, tapi perlu dikomunikasikan.
- **Custom Domain Add-on** existing (per sekolah punya domain sendiri spt `absen.smkcendikia.sch.id`) tetap jalan paralel, tidak konflik.
- **Reserved slug**: `www`, `app`, `api`, `admin`, `super`, `affiliate`, `parent` harus diblokir agar tidak diambil sekolah.
- **SEO**: tiap subdomain butuh meta tag dinamis (judul = nama sekolah). Akan saya tambahkan via `react-helmet`-style update di tenant provider.

---

## Bagian 4 — Urutan implementasi (jika disetujui)

1. Migration: kolom `slug`, trigger, backfill, reserved-slug check.
2. `TenantProvider` + `useTenant()` + parser hostname.
3. Refactor `Login`, `PublicMonitoring`, `ParentLogin`, root route untuk pakai tenant.
4. Update `create-user` edge function & form registrasi landing untuk generate slug & tampilkan URL hasil.
5. Super Admin: kolom subdomain + edit.
6. Dokumentasi singkat di `DEPLOY.md` untuk setup Cloudflare wildcard (untuk user).

---

## Pertanyaan terakhir sebelum saya mulai

1. Apakah subdomain boleh **diubah** sekolah sendiri, atau **fix** (hanya Super Admin yang bisa ubah)?
2. Untuk sekolah existing yang sudah jalan: backfill slug otomatis dari nama, atau Super Admin set manual satu-satu?
3. Saat user buka `smkcendikia.atskolla.com` tanpa login → langsung `/login` sekolah tsb, atau ke halaman "monitoring publik" sekolah tsb?
