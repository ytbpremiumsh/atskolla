# ATSkolla Digital

Buatkan sebuah Web Application SaaS modern dengan nama:

Smart School Pickup System

Aplikasi ini digunakan oleh sekolah TK dan SD untuk memonitor proses penjemputan siswa secara realtime menggunakan QR Code / Barcode scan serta mengirim notifikasi WhatsApp otomatis kepada orang tua.

Aplikasi harus memiliki desain modern, responsif, dan mudah digunakan oleh guru, petugas sekolah, dan admin.

Teknologi yang Digunakan

Frontend
React

UI Framework
TailwindCSS

Backend
Supabase

Database
PostgreSQL (Supabase)

Authentication
Supabase Auth

Realtime System
Supabase Realtime

QR / Barcode Scanner
HTML5 Camera Scanner

WhatsApp Notification
WhatsApp Gateway OneSender API

Aplikasi harus mobile friendly karena petugas sekolah akan banyak menggunakan smartphone.

Arsitektur SaaS (Multi Sekolah)

Sistem harus menggunakan Multi Tenant Architecture.

Artinya satu aplikasi dapat digunakan oleh banyak sekolah.

Setiap tabel database harus memiliki field:

school_id

Hal ini memastikan data antar sekolah tidak tercampur.

Role Pengguna

Super Admin
Admin utama platform SaaS.

Fungsi:

mengelola seluruh sekolah

melihat statistik seluruh sekolah

mengatur paket langganan

melihat penggunaan sistem

Admin Sekolah

Fungsi:

mengelola siswa

mengelola petugas

melihat laporan penjemputan

mengatur data sekolah

Petugas Penjemputan

Fungsi:

melakukan scan QR siswa

memproses penjemputan

Guru / Monitoring

Fungsi:

memonitor siswa yang sudah dijemput

memonitor siswa yang belum dijemput

Halaman Login

Halaman login berisi:

Email
Password

Gunakan Supabase Authentication.

Setelah login pengguna diarahkan ke dashboard sesuai role.

Dashboard Utama

Dashboard menampilkan statistik realtime.

Card statistik:

Total siswa hari ini
Jumlah siswa sudah dijemput
Jumlah siswa belum dijemput
Jumlah penjemputan hari ini

Tambahkan grafik aktivitas penjemputan.

Data harus update realtime menggunakan Supabase Realtime.

Halaman Monitoring Penjemputan

Halaman ini menampilkan dua panel utama.

Panel pertama:

Siswa Belum Dijemput

Panel kedua:

Siswa Sudah Dijemput

Card siswa menampilkan:

Foto siswa
Nama siswa
Kelas
Nama wali penjemput
Status penjemputan

Jika siswa sudah dijemput tampilkan:

Jam penjemputan
Petugas yang melakukan scan

Ketika scan berhasil, siswa otomatis berpindah dari kolom Belum Dijemput ke Sudah Dijemput secara realtime.

Halaman Scan QR Code

Halaman ini digunakan oleh petugas sekolah.

Fitur:

Scan QR Code menggunakan kamera HP atau laptop.

QR Code berisi:

student_id

Ketika QR berhasil di scan sistem melakukan proses berikut:

1 mencari data siswa
2 menampilkan informasi siswa
3 mengubah status menjadi SUDAH DIJEMPUT
4 mencatat waktu penjemputan
5 mencatat nama petugas scan
6 mengirim notifikasi WhatsApp ke orang tua

Tampilkan notifikasi besar di layar:

✅ Siswa Berhasil Dijemput

Tampilkan informasi:

Nama siswa
Kelas
Nama penjemput
Waktu penjemputan

Integrasi WhatsApp Gateway OneSender

Sistem harus terintegrasi dengan OneSender WhatsApp Gateway API.

Ketika siswa berhasil dijemput, sistem otomatis mengirim pesan WhatsApp ke nomor orang tua.

Nomor orang tua diambil dari field:

parent_phone

Format Pesan WhatsApp

Pesan otomatis yang dikirim:

Assalamu’alaikum.

Kami informasikan bahwa anak Anda telah dijemput dari sekolah.

Nama Siswa: {nama_siswa}
Kelas: {kelas}
Waktu Penjemputan: {waktu}

Jika ada pertanyaan silakan hubungi pihak sekolah.

Terima kasih.

Smart School Pickup System

Manajemen Data Siswa

Admin sekolah dapat:

Tambah siswa
Edit siswa
Hapus siswa

Data siswa:

Nama siswa
Foto siswa
Kelas
NIS / Student ID
QR Code ID
Nama wali penjemput
Nomor HP wali

Sistem otomatis membuat QR Code siswa yang dapat diunduh untuk dicetak menjadi kartu.

Halaman Detail Siswa

Halaman ini menampilkan informasi lengkap siswa.

Foto siswa
Nama siswa
Kelas
NIS
QR Code siswa
Nama wali
Nomor HP wali
Riwayat penjemputan

Halaman Riwayat Penjemputan

Menampilkan tabel:

Nama siswa
Kelas
Nama penjemput
Petugas scan
Waktu penjemputan

Filter:

Tanggal
Kelas
Siswa

Fitur tambahan:

Export Excel
Export CSV

Sistem QR Code Orang Tua

Setiap siswa mendapatkan kartu QR.

QR Code berisi:

student_id

Alur penjemputan:

1 orang tua datang ke sekolah
2 orang tua menunjukkan kartu QR
3 petugas melakukan scan
4 sistem memverifikasi siswa
5 status berubah menjadi SUDAH DIJEMPUT
6 sistem mencatat waktu penjemputan
7 sistem mengirim notifikasi WhatsApp ke orang tua

Sistem Keamanan

Saat QR Code di scan tampilkan:

Foto siswa
Nama siswa
Nama wali

Petugas harus menekan tombol konfirmasi sebelum status diubah.

Hal ini untuk mencegah kesalahan scan.

Sistem Realtime

Gunakan Supabase Realtime.

Ketika penjemputan terjadi:

Dashboard dan halaman monitoring langsung update tanpa refresh.

UI Design

Gunakan desain SaaS modern.

Komponen:

Sidebar navigation
Top navbar
Dashboard cards
Table modern
Modal form

Warna utama:

Primary
Indigo / Blue

Status warna:

Hijau
Sudah Dijemput

Merah
Belum Dijemput

Struktur Database

Tabel Schools

id
name
logo
address
created_at

Tabel Students

id
school_id
name
class
student_id
parent_name
parent_phone
photo_url
qr_code
created_at

Tabel Pickup Logs

id
school_id
student_id
pickup_time
pickup_by
status
created_at

Tabel Users

id
school_id
name
email
role
created_at

Sistem Langganan SaaS

Tambahkan halaman Subscription.

Admin sekolah dapat melihat paket langganan.

Paket Langganan

Paket Basic

Harga
Rp 99.000 per bulan

Fitur:

Monitoring penjemputan realtime
Scan QR Code
Manajemen siswa
Riwayat penjemputan
Maksimal 200 siswa

Paket School

Harga
Rp 199.000 per bulan

Fitur:

Semua fitur Basic
Unlimited siswa
Multi petugas scan
Export laporan Excel
Upload foto siswa

Paket Premium

Harga
Rp 399.000 per bulan

Fitur:

Semua fitur School
WhatsApp notifikasi ke orang tua
Multi cabang sekolah
Custom logo sekolah
Priority support
API Integration

Halaman Billing

Admin sekolah dapat:

melihat paket langganan
upgrade paket
melihat masa aktif langganan
melihat riwayat pembayaran

Tujuan Produk

Produk ini dibuat sebagai SaaS EdTech yang dapat dijual kepada:

TK
SD
PAUD
Daycare
Sekolah Internasional

Sistem harus scalable dan dapat melayani ratusan sekolah.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://absenpintar.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/be8d9619-1add-4ede-b66b-9c44088286b4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
