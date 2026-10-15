# Dokumentasi Integrasi Doku — ATSkolla

Ringkasan lengkap sistem pembayaran Doku (Checkout API) di ATSkolla, termasuk semua pembaruan.

---

## 1. Arsitektur

```
Wali Murid ──► /parent (Vite)
                  │
                  ▼
        parent-portal (edge fn)
                  │  action=create_spp_payment
                  ▼
        spp-doku  ──POST──►  Doku Checkout API
                                (/checkout/v1/payment)
                  ▲
                  │ (redirect setelah bayar)
        payment_url ◄──── Wali Murid ──► Halaman Doku
                                            │
                                            │  notifikasi async
                                            ▼
                              doku-webhook (edge fn)
                                            │
                                            ▼
                              spp_invoices.status = 'paid'
```

Dua jalur konfirmasi pembayaran:
1. **Webhook Doku** → `doku-webhook` (real-time, direkomendasikan).
2. **Polling manual** → tombol *Sync* di dashboard bendahara memanggil `spp-doku` dengan `action=sync_paid_invoices`.

---

## 2. Konfigurasi Awal (Super Admin)

Halaman **Super Admin → Payment Gateway** menyimpan nilai berikut ke tabel `platform_settings`:

| Key                     | Wajib | Contoh                | Keterangan                                       |
| ----------------------- | :---: | --------------------- | ------------------------------------------------ |
| `doku_client_id`        | ✅    | `MCH-0001-...`        | Client-Id dari Doku Dashboard                    |
| `doku_secret_key`       | ✅    | `SK-live-...`         | Secret Key HMAC                                  |
| `doku_env`              |       | `production`/`sandbox`| Default `production`                             |
| `doku_va_methods`       |       | `*` atau list         | Filter VA (lihat §4). `*` = semua VA aktif tampil |
| `doku_qris_methods`     |       | `*` atau list         | Filter QRIS / e-money                             |
| `doku_retail_methods`   |       | `*` atau list         | Filter minimarket                                 |
| `doku_webhook_verify`   |       | `true`/`false`        | Legacy; perbaikan Oktober mewajibkan verifikasi signature |
| `gateway_va`            |       | `doku` / `mayar`      | Gateway aktif untuk channel VA                    |
| `gateway_qris`          |       | `doku` / `mayar`      | Gateway aktif untuk channel QRIS                  |
| `gateway_retail`        |       | `doku` / `mayar`      | Gateway aktif untuk channel Retail                |

Fallback: jika key kosong di `platform_settings`, sistem baca environment variable `DOKU_CLIENT_ID` / `DOKU_SECRET_KEY`.

---

## 3. Webhook Doku (WAJIB didaftarkan)

Daftarkan URL berikut di **Doku Merchant Dashboard → Configuration → Notification URL**:

```
https://bohuglednqirnaearrkj.functions.supabase.co/doku-webhook
```

Behaviour:
- Verifikasi tanda tangan HMAC-SHA256 dengan skema Doku SNAP.
- Semua request dicatat ke `spp_logs` (`event_type = doku_webhook`).
- Jika status transaksi = `PAID` / `SUCCESS` / `SETTLED` / `COMPLETED` → invoice ditandai lunas, `payment_transactions` diupdate, log `doku_webhook_paid` dibuat.
- **Return 200 hanya setelah sukses diproses atau status non-paid yang diabaikan**; signature salah dibalas 403, kegagalan penyimpanan dibalas 503 agar bisa dicoba ulang.

Verifikasi signature wajib aktif. Jangan menonaktifkannya untuk memaksa invoice lunas. Pemeriksaan status independen memakai API DOKU yang ditandatangani akan memulihkan notifikasi yang gagal.

---

## 4. Kenapa Mandiri / bank tertentu tidak muncul?

**Penyebab paling umum**: filter `payment_method_types` di request `spp-doku` memblokir metode yang sebenarnya sudah aktif di Doku Dashboard.

### Solusi cepat (rekomendasi)

Set `platform_settings.doku_va_methods` = `*` — sistem tidak akan mengirim filter, sehingga **semua metode VA yang aktif di Doku Dashboard otomatis tampil** di halaman checkout.

```sql
-- Via UI Super Admin > Payment Gateway (input field)
-- ATAU langsung SQL:
UPDATE platform_settings SET value = '*' WHERE key = 'doku_va_methods';
```

Nilai valid untuk ketiga key filter:
- `*` atau `all` atau kosong-tapi-di-set → **tanpa filter** (semua metode aktif tampil).
- Daftar dipisah koma, contoh: `VIRTUAL_ACCOUNT_BCA,VIRTUAL_ACCOUNT_BANK_MANDIRI,VIRTUAL_ACCOUNT_MANDIRI` → hanya metode ini yang tampil.

### Kode payment_method Doku terbaru

| Bank / Metode              | Kode (payment_method_types)                 |
| -------------------------- | ------------------------------------------- |
| BCA VA                     | `VIRTUAL_ACCOUNT_BCA`                       |
| Mandiri VA (lama)          | `VIRTUAL_ACCOUNT_BANK_MANDIRI`              |
| Mandiri VA (kode baru)     | `VIRTUAL_ACCOUNT_MANDIRI`                   |
| BRI VA                     | `VIRTUAL_ACCOUNT_BRI`                       |
| BNI VA                     | `VIRTUAL_ACCOUNT_BNI`                       |
| BSI (dulu Syariah Mandiri) | `VIRTUAL_ACCOUNT_BANK_SYARIAH_INDONESIA`    |
| Syariah Mandiri (lama)     | `VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI`      |
| Permata VA                 | `VIRTUAL_ACCOUNT_BANK_PERMATA`              |
| CIMB VA                    | `VIRTUAL_ACCOUNT_BANK_CIMB`                 |
| Danamon VA                 | `VIRTUAL_ACCOUNT_BANK_DANAMON`              |
| DOKU VA                    | `VIRTUAL_ACCOUNT_DOKU`                      |
| QRIS                       | `QRIS`                                      |
| ShopeePay                  | `EMONEY_SHOPEEPAY`                          |
| OVO                        | `EMONEY_OVO`                                |
| DANA                       | `EMONEY_DANA`                               |
| Alfamart                   | `ONLINE_TO_OFFLINE_ALFA`                    |
| Indomaret                  | `PERURI_INDOMARET`                          |

> Doku kadang mengubah kode saat migrasi produk (contoh: Mandiri berpindah dari `VIRTUAL_ACCOUNT_BANK_MANDIRI` ke `VIRTUAL_ACCOUNT_MANDIRI`). Karena `payment_method_types` sekarang konfigurabel, admin bisa update daftar tanpa menunggu deploy.

---

## 5. Biaya Layanan (`service_fee`)

Ditambahkan ke `total_amount` invoice sebelum dikirim ke Doku:

| Channel | service_fee |
| ------- | ----------- |
| VA      | Rp 5.000    |
| QRIS    | Rp 5.000    |
| Retail  | Rp 8.000    |

Nilai tersimpan di kolom `spp_invoices.service_fee` dan `payment_transactions.service_fee`.

---

## 6. Actions `spp-doku`

| Action                    | Auth              | Fungsi                                                       |
| ------------------------- | ----------------- | ------------------------------------------------------------ |
| `parent_create_payment`   | `x-parent-token`  | Wali murid membuat/reuse link pembayaran                     |
| `create_payment_link`     | JWT sekolah       | Bendahara/admin membuat link untuk invoice tertentu          |
| `regenerate_payment_link` | JWT sekolah       | Paksa buat link baru (mis. ganti channel)                    |
| `test_connection`         | JWT super admin   | Ping ke `/checkout/v1/payment` untuk validasi credential     |
| `sync_paid_invoices`      | JWT sekolah       | Cek 50 invoice pending terakhir via `/orders/v1/status/{no}` |

Semua response **selalu HTTP 200** (frontend-safe); status detail ada di `success` boolean.

---

## 7. Config Edge Function

`supabase/config.toml` (auto-managed):
```toml
[functions.spp-doku]
verify_jwt = false

[functions.doku-webhook]
verify_jwt = false
```

Verifikasi JWT dilakukan manual di dalam kode via `supabaseAdmin.auth.getClaims(token)` (pola Lovable Cloud).

---

## 8. Signature HMAC (DOKU Non-SNAP / Jokul)

Request POST ke DOKU menyertakan header berikut. Untuk GET status, **hilangkan Digest dari header dan stringToSign**:

```
Client-Id: <clientId>
Request-Id: <uuid>
Request-Timestamp: 2026-07-05T12:34:56Z
Digest:    base64(SHA256(body))
Signature: HMACSHA256=<base64(HMAC-SHA256(stringToSign, secretKey))>
```

`stringToSign` (5 baris, dipisah `\n`):
```
Client-Id:<clientId>
Request-Id:<uuid>
Request-Timestamp:<ts>
Request-Target:<path>
Digest:<digest>
```

Webhook masuk memakai digest raw body. Signature diverifikasi untuk path eksternal `/functions/v1/doku-webhook` atau path legacy `/doku-webhook`, karena gateway Supabase dapat menulis ulang path. Client-Id harus cocok dengan merchant yang dikonfigurasi.

---

## 9. Changelog

### v1.2 (5 Jul 2026) — Perbaikan Mandiri & konfigurabilitas
- **`payment_method_types` kini konfigurabel** via `platform_settings.doku_va_methods` / `doku_qris_methods` / `doku_retail_methods`.
- Nilai `*` / `all` / kosong-tapi-di-set → **tanpa filter**, semua metode aktif di Doku Dashboard tampil (memperbaiki kasus Mandiri yang sudah diaktifkan tapi tidak muncul).
- Default fallback kini mencakup **`VIRTUAL_ACCOUNT_MANDIRI`** (kode Mandiri terbaru) + `VIRTUAL_ACCOUNT_BANK_SYARIAH_INDONESIA` (BSI) + `VIRTUAL_ACCOUNT_BANK_DANAMON`.

### v1.1 (5 Jul 2026) — Webhook & signature verification
- Edge function baru `doku-webhook` dengan verifikasi HMAC-SHA256.
- Toggle `doku_webhook_verify` untuk debugging saat setup.
- `spp-doku`: ekstraksi response lebih tahan variasi (`payment_url`, `token_id`).
- `config.toml`: `spp-doku` & `doku-webhook` di-set `verify_jwt = false` eksplisit.

### v1.0 (Juli 2026) — Peluncuran awal
- Integrasi Checkout API Doku (`/checkout/v1/payment`).
- 3 channel: VA, QRIS, Retail (fee per-channel).
- Reuse link pending (belum kadaluarsa & channel sama) untuk mencegah duplikat.
- Kolom `mayar_invoice_id` di-reuse untuk menyimpan Doku invoice number (schema-compat, tidak perlu migrasi).
- Polling `sync_paid_invoices` sebagai fallback.

---

## 10. Troubleshooting

| Gejala                                             | Cek                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Bank tertentu (mis. Mandiri) tidak muncul          | Set `doku_va_methods = *` di Super Admin > Payment Gateway              |
| Semua metode tidak muncul                          | Aktifkan metode di Doku Merchant Dashboard dulu                         |
| `Gagal buat pembayaran Doku: ...`                  | Lihat `spp_logs` (`event_type = create_invoice_doku`) untuk raw error   |
| Bayar sukses tapi invoice tidak lunas otomatis     | Cek notifikasi URL di Doku Dashboard, dan `spp_logs` `doku_webhook`     |
| Webhook selalu `sig_mismatch`                      | Pastikan key merchant dan path eksternal cocok; jangan nonaktifkan signature |
| `Doku Client-Id / Secret-Key belum dikonfigurasi`  | Isi via Super Admin > Payment Gateway                                   |
| Klik "Test Connection" gagal                       | Cek env (`doku_env`); sandbox vs production butuh credential berbeda    |


## 11. Pemulihan otomatis dan deployment perbaikan Oktober 2026

Status implementasi di repositori tidak berarti migrasi sudah diterapkan ke produksi.
Perubahan database produksi memerlukan persetujuan pemilik sebelum langkah berikut dijalankan.
Tidak perlu menjalankan AI/chat Lovable untuk langkah deployment ini.

1. Terapkan `supabase/migrations/20261016000000_doku_payment_reconciliation.sql` pada project
   `bohuglednqirnaearrkj`. Ekstensi `pgcrypto`, `pg_net`, dan `pg_cron` harus tersedia (sudah terdeteksi pada project).
   Migrasi menambah tabel referensi percobaan pembayaran, trigger registrasi, fungsi settlement atomik,
   backfill dari transaksi dan log pembuatan invoice, serta cron setiap menit.
2. Deploy fungsi `doku-webhook`, `spp-doku`, dan `parent-portal` beserta `_shared/doku.ts`
   memakai Supabase CLI/connector yang berwenang. Pertahankan `verify_jwt=false` pada tiga fungsi ini.
   Jangan deploy fungsi baru sebelum migrasi: fungsi baru memerlukan tabel dan RPC baru.
3. Jalankan `SELECT public.reconcile_doku_payments(20);` untuk mengantrekan pemeriksaan awal.
   Setelah respons API masuk, cron berikutnya memprosesnya. Jalur cadangan normal memerlukan sekitar
   1–2 menit, bisa lebih lama bila antrean besar atau DOKU mengalami gangguan.
4. Periksa `doku_payment_attempts`, `spp_logs` (`doku_verified_settlement`/`doku_reconcile_error`),
   `cron.job_run_details`, dan invoice yang bersangkutan. Cocokkan nominal serta referensi sebelum
   menyimpulkan lunas. Sumber kebenaran adalah respons DOKU yang terverifikasi, bukan redirect browser.

Semua referensi DOKU lama dipertahankan ketika tautan dibuat ulang. Pembayaran diverifikasi berdasarkan
nomor order, merchant, nominal total checkout termasuk biaya layanan, sekolah, dan invoice/cicilan.
Perubahan invoice dan ledger dilakukan dalam satu transaksi, dan notifikasi berulang tidak menggandakan
pencatatan. Pembayaran kedua untuk invoice yang sudah lunas ditandai untuk pemeriksaan bendahara;
tidak dilakukan pengembalian dana otomatis. Cicilan memakai trigger perhitungan saldo yang sudah ada.
Tabel dan RPC settlement hanya dapat ditulis/dipanggil oleh service role; browser tidak dapat mengubah status.

Cron membaca konfigurasi DOKU dari `platform_settings`; secret tidak dicetak atau disimpan ke log aplikasi.
Jalur otomatis ini khusus pembayaran DOKU. Mayar dan iPaymu tetap memakai implementasinya masing-masing.
Jangan menjanjikan bebas gangguan: transaksi yang nominalnya tidak cocok, berubah, atau terbayar ganda
harus masuk pemeriksaan, bukan dipaksa lunas.

Pengujian lokal terisolasi (tidak menyentuh database produksi):

```sh
npm ci --prefix supabase/tests
npm --prefix supabase/tests test
```

Pengujian menjalankan PostgreSQL/PLpgSQL melalui PGlite dengan jaringan DOKU dan cron tiruan,
serta verifikasi signature Node. Ini menguji settlement atomik, penolakan nominal/identitas salah,
referensi lama setelah regenerasi, idempotensi, cicilan, signature GET, dan pemulihan tanpa webhook.
Pengujian ini tidak menggantikan smoke test edge function yang sudah dideploy.

Untuk menghentikan worker saat investigasi: `SELECT cron.unschedule('doku-payment-reconciliation');`.
Ini menghentikan pemeriksaan berkala dan tidak menghapus data pembayaran. Jangan membatalkan invoice
atau menghapus ledger yang sudah dibayar saat rollback aplikasi.
