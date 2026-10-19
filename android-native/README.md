# ATSkolla Parent — Android native 2.0

Android UI ditulis dengan Java dan widget Android. Tidak ada WebView, HTML, React,
JavaScript bridge, atau mesin browser tertanam. Logo ATSkolla memakai aset asli.
ID aplikasi `com.atskolla.parent`, versionCode 30, Android 8.0+ (minSdk 26), target/compile API 36.

## Fitur

- Login kartu siswa dan OTP WhatsApp, sesi terenkripsi Android Keystore, pilihan beberapa anak.
- Beranda dengan ringkasan kehadiran dan pengumuman, absensi dengan filter tanggal,
  jadwal, pengumuman, nilai, kalender tahunan, wali kelas dan sekolah, pesan dua arah.
- Izin/sakit beserta lampiran JPG/PNG/WebP/PDF maksimal 5 MB dan riwayat persetujuan.
- SPP dan tagihan, cicilan dan riwayatnya, metode QRIS/VA/retail dari konfigurasi server,
  PDF rincian tagihan/bukti pembayaran, pemeriksaan status ketika kembali dari pembayaran.
- Kartu pelajar native dengan QR, salin nomor, dan ekspor PNG.
- Hapus cache perangkat dan logout. Penghapusan akun sekolah diminta melalui wali kelas/admin;
  tidak ada API penghapusan akun mandiri pada backend Parent yang sekarang.

Pembayaran memakai ACTION_VIEW ke halaman HTTPS gateway pada browser perangkat, bukan WebView.
Login, data siswa, navigasi dan seluruh layar layanan tetap native. Status lunas tidak disimpulkan
berdasarkan redirect browser; hanya dari API server. Push notification sistem belum tersedia pada
API Parent; pengumuman dan pesan tersedia dalam aplikasi dengan penyegaran manual.

## Ringan dan keamanan

Pemuatan per layar, pool jaringan 3 thread, cache terenkripsi yang langsung ditampilkan
lalu disegarkan, masa cache singkat 60 detik, dan penundaan pengambilan SPP sampai layar SPP
mengurangi pekerjaan awal. Kehadiran diringkas per hari, daftar panjang ditampilkan 40 item
bertahap. Refresh tidak membongkar seluruh fitur sekaligus. Kecepatan jaringan dan query backend
masih memengaruhi data baru; tidak ada klaim perbandingan kecepatan yang belum diukur.

Tidak ada service-role key di aplikasi. api.json hanya menyimpan public/anon key yang memang
tersedia pada web publik, untuk unggah lampiran lewat kebijakan Storage yang sudah ada.
Sesi dan cache memakai AES-GCM dengan kunci non-exportable Android Keystore; backup dinonaktifkan.
Tidak ada izin storage luas, kamera, lokasi atau kontak. Pemilih berkas memakai Storage Access
Framework. Semua request API lewat HTTPS; write tidak diulang otomatis. Logout menghapus cache
lokal dan mencoba mencabut sesi server. Backend API dan RLS tetap menjadi sumber otorisasi.

## Build dan verifikasi

JDK 17, Gradle 8.13, AGP 8.11.1, SDK 36. Dependency runtime tunggal ZXing Core 3.5.3 (QR).

```sh
gradle :app:assembleDebug :app:assembleRelease :app:bundleRelease :app:lintRelease
```

Workflow `.github/workflows/android-native.yml` membangun APK debug, APK release unsigned,
AAB release unsigned, mapping R8, dan utilitas resmi signing. Job emulator Android 16 memeriksa
13 layar native dengan fixture sintetis dari src/debug, serta startup login aplikasi.
Fixture/activity preview tidak dikemas pada APK/AAB release. Tes tidak mengirim OTP, pesan,
pengajuan izin, atau transaksi nyata. Alur berakun, upload dan pembayaran ujung-ke-ujung
masih perlu pengujian perangkat dengan akun pemilik dan sandbox gateway sebelum rilis publik.

## Google Play dan signing

AAB adalah format unggah Google Play, bukan berkas yang dipasang langsung. APK adalah installer
untuk perangkat. Gunakan key rilis/upload milik pemilik yang sama pada setiap pembaruan.
Keystore/password tidak boleh masuk GitHub atau artifact publik. Jika aplikasi pernah terbit
sebelumnya, gunakan key lama atau proses resmi reset upload key; key baru tidak menggantikannya.
Build debug WebView lama memakai key berbeda sehingga tidak bisa diperbarui langsung dengan
APK release native baru; migrasi ke key release dilakukan satu kali.

Sebelum upload ke Play Console: verifikasi identitas developer, daftarkan aplikasi,
aktifkan Play App Signing, lengkapi listing/screenshot, konten/rating, kategori target orang tua,
Data safety (termasuk data siswa, pesan dan lampiran), URL kebijakan privasi dan penghapusan akun
yang benar-benar aktif, serta kredensial pengujian yang sah untuk reviewer. Jalankan internal/
closed testing sesuai persyaratan akun. Target API 36 memenuhi persyaratan API saat implementasi,
tetapi bukan jaminan disetujui atau dipublikasikan Google. Tidak ada publikasi otomatis.

Kunci signing baru, bila dibuat untuk distribusi perdana, diserahkan secara privat kepada pemilik.
Simpan cadangan kunci di tempat aman; kehilangannya dapat mengganggu pembaruan.
