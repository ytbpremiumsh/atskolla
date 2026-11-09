# Notifikasi Android Parent 2.12.0

Firebase client: atskolla-parent; Android applicationId: com.atskolla.parent.

## Status

APK memakai Firebase Messaging dan tetap menyediakan pemeriksaan berkala sebagai cadangan. Migrasi antrean sudah diterapkan, tetapi pengiriman produksi belum diaktifkan. Fungsi server baru perlu diterapkan dan kredensial server belum tersedia. Belum ada pengujian penerimaan langsung pada telepon fisik.

## Aktivasi server

1. Terapkan fungsi parent-portal dan parent-push-dispatch beserta konfigurasi supabase/config.toml dari revisi ini. Penerapan sumber masih menunggu akses publikasi yang diizinkan.
2. Di Firebase project atskolla-parent, buka Project settings > Service accounts > Generate new private key. Simpan isi JSON langsung sebagai secret backend FCM_SERVICE_ACCOUNT_JSON. Jangan masukkan ke APK, Git, atau percakapan.
3. Pasang APK, masuk dan izinkan notifikasi. Pendaftaran perangkat memanggil register_push; worker mengaktifkan runtime setelah autentikasi Google berhasil.
4. Pastikan parent_push_runtime.enabled bernilai true dan last_dispatch_at baru. Pastikan cron atskolla-parent-push terpasang.
5. Uji pada perangkat fisik: absensi datang/pulang dan tagihan baru untuk masing-masing dari dua siswa dalam akun wali yang sama, termasuk saat aplikasi di latar belakang dan layar terkunci. Periksa antrean terkirim dan penerimaan aktual; status terkirim oleh FCM saja belum membuktikan notifikasi terlihat.

## Perilaku

- Penerima berasal dari nomor wali pada siswa dan sesi wali aktif dalam sekolah yang sama, bukan siswa yang sedang dipilih.
- Pengguna harus mengaktifkan notifikasi. Keluar akun atau mematikannya melepaskan ikatan perangkat.
- Token dan sesi disimpan melalui penyimpanan terenkripsi. Payload membawa sidik sesi, bukan token sesi mentah.
- Antrean memiliki kunci peristiwa unik, lease pengiriman, percobaan ulang terbatas dan pembersihan data lama. Jalur polling dan push memakai deduplikasi bersama.
- Hanya token yang ditolak FCM sebagai UNREGISTERED yang dinonaktifkan otomatis.
- Penghentian paksa aplikasi, pembatasan baterai, jaringan dan perangkat tanpa layanan Google dapat menghalangi atau menunda pengiriman. Tidak menjanjikan pengiriman instan dalam semua kondisi.

## Validasi

Uji web mencakup pembentukan payload FCM dan isolasi kredensial; uji native mencakup sidik sesi. Uji transaksi basis data yang dibatalkan mencakup dua siswa, dua perangkat, penolakan sesi kedaluwarsa/nomor lain, lease dan percobaan ulang. Build dan unit test tidak menggantikan pengujian FCM langsung.
