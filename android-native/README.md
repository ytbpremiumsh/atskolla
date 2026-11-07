# ATSkolla Parent — Android native 2.8

Layar layanan ditulis dengan Java dan widget Android. Hanya checkout penyedia pembayaran
yang ditampilkan melalui WebView terisolasi. Generator PDF resmi web dijalankan lokal,
tanpa navigasi jarak jauh atau JavaScript bridge.
ID aplikasi `com.atskolla.parent`, versionCode 38, Android 8.0+ (minSdk 26), target/compile API 36.

## Fitur

- Login kartu siswa dan OTP WhatsApp, sesi terenkripsi Android Keystore, pilihan beberapa anak.
- Beranda dengan ringkasan kehadiran dan pengumuman, absensi dengan filter tanggal,
  jadwal, pengumuman, nilai, kalender tahunan, wali kelas dan sekolah, pesan dua arah.
- Izin/sakit beserta lampiran JPG/PNG/WebP/PDF maksimal 5 MB dan riwayat persetujuan.
- SPP dan tagihan, cicilan dan riwayatnya, metode QRIS/VA/retail dari konfigurasi server,
  PDF rincian tagihan/bukti pembayaran, pemeriksaan status ketika kembali dari pembayaran.
- Kartu pelajar native dengan QR, salin nomor, dan ekspor PNG.
- Hapus cache perangkat dan logout. Penghapusan akun sekolah diminta melalui wali kelas/admin;
  jalur permintaan langsung tersedia di /penghapusan-akun dan menu Akun.
  Permintaan diproses pengelola bersama sekolah, bukan menghapus catatan siswa otomatis.

Pembayaran dibuka di PaymentActivity internal, bukan browser eksternal. Hanya navigasi HTTPS
pada domain penyedia yang didukung. Akses file/content, mixed content, jendela tambahan, dan
JavaScript bridge dinonaktifkan; kesalahan TLS dibatalkan. Callback/teks sukses pada halaman
bukan bukti pembayaran. API server menentukan sukses, dengan invoice/ID cicilan yang tepat.
Layar menutup setelah verifikasi; cicilan tidak mengubah keseluruhan invoice menjadi lunas.
Kecocokan seluruh metode gateway tetap harus diuji pada sandbox pemilik sebelum rilis publik.

Invoice APK memakai `src/lib/sppInvoicePDF.ts` dan formatter yang sama dengan portal web,
dibundel pada setiap build. Data tagihan dimuat ulang sebelum ekspor. Renderer lokal tidak
menerima token sesi, tidak memiliki bridge JavaScript, dan memblokir jaringan/navigasi.
Logo sekolah diambil melalui HTTPS dengan batas ukuran sebelum pembuatan PDF.

Notifikasi absensi dan pembayaran memeriksa semua siswa yang diotorisasi oleh akun wali,
bukan hanya siswa yang sedang dipilih. Daftar keluarga diperbarui dari server. Notifikasi
pembayaran mencantumkan nama siswa, tagihan dan waktu WIB; peristiwa lama/duplikat diabaikan.
Pemeriksaan sekitar 30 detik saat ParentActivity terlihat, dan minimal 15 menit atau lebih
saat di latar belakang. Ini belum FCM/push instan; konfigurasi Firebase/pengirim belum tersedia.
Pengumuman dan beranda juga disegarkan saat aplikasi terlihat; pesan tidak ditandai dibaca
di latar belakang.

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
# Dari root repository:
npm ci --ignore-scripts
node android-native/scripts/build-invoice.mjs
cd android-native
gradle :app:assembleDebug :app:assembleRelease :app:bundleRelease :app:lintRelease
```

Workflow `.github/workflows/android-native.yml` membangun APK debug, APK release unsigned,
AAB release unsigned, mapping R8, dan utilitas resmi signing. Job emulator Android 16 memeriksa
13 layar native, modal, checkout pending/sukses/cicilan, generator PDF web di Android,
notifikasi tiga siswa, pemulihan sesi, serta startup login dengan fixture sintetis src/debug.
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

Lihat [catatan rilis dan verifikasi operasional](../docs/OPERATIONS-RELEASE.md) untuk urutan deployment dan batasan pengujian.

## Desain 2.2

Warna #5B6CF9, panel gradasi dan pola titik mengikuti portal web. Login memiliki
pilihan kartu/WhatsApp, panel pengantar tanpa ilustrasi orang, validasi input,
dan hitung mundur kirim ulang OTP. Beranda memuat identitas ananda, nomor kartu,
pintasan delapan layanan dan kartu digital. Foto siswa dan logo sekolah diambil
dari data API yang sama; fallback inisial/logo ATSkolla dipakai ketika kosong.
Gambar dibatasi 3 MB, dikecilkan saat decode, disimpan hanya di cache memori 6 MB,
dan dibuang saat keluar. Tidak ada SDK gambar/analitik tambahan.

Kartu pelajar memakai desain portrait web, identitas, foto, logo, nomor kartu,
QR dengan quiet zone, perbesar QR, salin nomor, ekspor QR dan kartu PNG 1080 px.
Lampiran buku tabungan dan cabang rekening berada di portal bendahara dan
Super Admin; data rekening sekolah tidak dibuka ke aplikasi orang tua.

## Desain 2.3 sesuai referensi mobile

Tombol tidak lagi memakai StateListAnimator/elevation Android: ripple tetap ada,
namun shadow kotak bawaan dihilangkan. Navigasi pill dengan tombol layanan di tengah,
header sekolah dan logo, kartu beranda indigo, pintasan izin/riwayat/pengumuman,
ringkasan tagihan dari API dan filter statistik hari ini/7/30 hari. Statistik
menghitung tanggal unik berdasarkan catatan datang, tidak menggandakan datang/pulang.

Tagihan memiliki total merah/hijau, badge status, nominal besar, kartu pastel sesuai
status, tombol orange untuk link kedaluwarsa, serta akses cicilan/PDF yang tetap ada.
Hanya data server yang menentukan status lunas. Jadwal dikelompokkan menurut hari,
diurutkan per jam, dengan header indigo dan warna tiap mata pelajaran. Status sedang
berlangsung memakai waktu Asia/Jakarta (WIB), sesuai dasar waktu aplikasi saat ini.
Izin/sakit menampilkan formulir dan riwayat pada satu halaman; draft alasan dipertahankan
saat data disegarkan, dan tombol kirim menunggu lampiran selesai diunggah.

## Desain dan sesi 2.4

Splash berlogo menuju login atau dashboard berdasarkan sesi tersimpan. Tombol kembali
dari beranda memindahkan aplikasi ke latar belakang. Sesi/kode kartu disimpan dengan
Android Keystore dan commit atomik, bukan memori proses. Login kartu dapat memulihkan
sesi kedaluwarsa secara otomatis selama kartu masih valid. Login OTP tanpa kartu
tersimpan tetap tunduk pada masa sesi server. Logout menghapus kredensial, data
tersimpan, dan notifikasi; hapus cache tidak menghapus kredensial.

Notifikasi Android Datang/Pulang mendeteksi data hadir berdasarkan attendance_type,
tidak dibatasi metode QR/NFC/wajah/manual. Hanya siswa dalam akun dan akses API yang
sah diproses. Pemeriksaan 30 detik saat aplikasi tampak dan JobScheduler persisten
15 menit atau lebih di latar belakang. Ini bukan FCM/push instan: belum ada proyek
Firebase/konfigurasi pengirim di lingkungan ini. Android dapat menunda saat hemat
baterai, offline, atau menghentikan job setelah force-stop sampai aplikasi dibuka.
Notifikasi diaktifkan setelah izin pengguna, memiliki kanal khusus, menyamarkan detail
ketika terkunci, dan membuka riwayat siswa/tanggal yang sesuai. Riwayat sebelum aktivasi
tidak diumumkan ulang. Identitas peristiwa tanggal/waktu/arah disimpan terenkripsi untuk
mencegah notifikasi ganda, termasuk bila metode dikoreksi.

Pengujian debug menggunakan API fixture tanpa jaringan: Keystore/cache/renewal/logout,
dua notifikasi Android, metode absensi, deduplikasi, job persisten, dan dua restart
proses yang tetap menuju dashboard. Seluruh fixture dan activity uji tidak ada di release.

## Antarmuka 2.6

Dialog native memakai CardModal bersama: sudut membulat, ikon indigo, jarak tombol,
konten bergulir dan animasi masuk/keluar singkat. Pemilih siswa memiliki pencarian, foto/
inisial, kelas dan penanda aktif; header identitas memakai kartu tersendiri. QR menggunakan
modul rounded dan tiga finder indigo seperti web, dengan uji decode identitas tiap siswa.

## Pembayaran dan tagihan 2.7

Pembayaran baru dan tombol Lanjutkan pembayaran pada riwayat cicilan memakai activity internal
yang sama; transisi fade tanpa slide. Kartu tagihan lebih ringkas, dengan tindakan sekunder
berdampingan. Picker mengambil label, deskripsi, logo dan default channel dari
`src/lib/paymentChannels.ts`; fee dinamis dari payment_config, QRIS memakai rumus web.
Tagihan baru dideteksi dari perbedaan ID terhadap daftar awal, tanpa mengumumkan semua
tagihan lama pada pemeriksaan pertama. Deteksi tetap berkala sampai FCM dikonfigurasi.

## PDF, login dan scroll 2.8

PDF dibuka dalam preview PdfRenderer native sebelum diunduh. Android 10+ menyimpan PDF
langsung ke Download/ATSkolla melalui MediaStore tanpa izin penyimpanan luas. Android 8–9
memakai pemilih lokasi setelah tombol Download ditekan; sumber dokumen disimpan privat
sehingga tidak bergantung pada byte array Activity yang bisa hilang saat proses dibuat ulang.
Tidak ada toast persiapan PDF. Error renderer web ditangani tanpa menutup proses aplikasi.
Login kartu memilih siswa dengan nomor kartu yang dimasukkan sekali setelah autentikasi,
tanpa memfilter daftar saudara untuk notifikasi. Pilihan manual berikutnya tetap disimpan.
Refresh data ditunda selama drag/fling, auto-refresh tidak membangun ulang halaman saat
pengguna membaca bagian bawah. Pola titik kartu memakai shader tile, bukan ratusan
perintah gambar lingkaran berulang. FCM tetap memerlukan konfigurasi proyek/pengirim.

## Version 2.9.0

Native installment choice dialog matches the web flow: valid-payment progress, pending amount, server-calculated remaining balance, full/partial mode cards, formatted nominal, quick amounts, and transaction history. Both full remaining balance and partial amounts use the installment endpoint to avoid charging the original invoice total again. Minimum Rp10,000 and server remaining limits match the web; active pending links open the existing in-app checkout. No external browser, backend schema or Lovable AI changes. Emulator checks exercise quick amounts, boundaries, paid invoices, pending locks and expiry.

## Version 2.10.0

Invoice preview reuses private PDF files keyed by invoice data, school metadata and app version. It avoids the redundant spp_list call; school metadata is fetched once per student/session. The exact web generator remains bundled. Scripts stream from assets, logo fetches are bounded/downsampled and base64 PDF output travels in 32KB chunks. Preview bitmaps are capped at 960px and no longer recycled while RenderThread may still use them. Renderer failure/timeouts return to the app. School-themed native 2D scenes animate the splash and login, respect disabled system animations, pause offscreen and react to taps. Privacy no longer exposes cache/account/data deletion buttons; logout and the privacy policy remain.
