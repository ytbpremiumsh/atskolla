# ATSkolla Parent — Android native 2.4

Android UI ditulis dengan Java dan widget Android. Tidak ada WebView, HTML, React,
JavaScript bridge, atau mesin browser tertanam. Logo ATSkolla memakai aset asli.
ID aplikasi `com.atskolla.parent`, versionCode 34, Android 8.0+ (minSdk 26), target/compile API 36.

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

Pembayaran memakai ACTION_VIEW ke halaman HTTPS gateway pada browser perangkat, bukan WebView.
Login, data siswa, navigasi dan seluruh layar layanan tetap native. Status lunas tidak disimpulkan
berdasarkan redirect browser; hanya dari API server. Notifikasi pengumuman dapat diaktifkan pengguna melalui pemeriksaan berkala Android
(minimal 15 menit, dapat tertunda oleh pengaturan baterai/jaringan). Ini bukan push instan.
Pengumuman dan beranda juga disegarkan saat aplikasi terlihat; pesan tidak ditandai dibaca di latar belakang.

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

Lihat [catatan rilis dan verifikasi operasional](../docs/OPERATIONS-RELEASE.md) untuk urutan deployment dan batasan pengujian.

## Desain 2.2

Warna #5B6CF9, panel gradasi dan pola titik mengikuti portal web. Login memiliki
pilihan kartu/WhatsApp, ilustrasi asli web yang dikompresi lokal, validasi input,
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
