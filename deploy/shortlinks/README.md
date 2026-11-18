# Perbaikan redirect dari VPS tanpa Lovable

Error ini terjadi saat fungsi `resolve_shortlink` belum tersedia atau schema API belum memuatnya. Perbaikan tidak memerlukan editor/kredit Lovable. Database tetap harus aktif: skrip ini tidak memindahkan hosting database atau menjadikan redirect kebal terhadap database yang berhenti.

1. Pastikan PostgreSQL client (`psql`) tersedia pada VPS.
2. Atur `DATABASE_URL` lewat konfigurasi rahasia server menggunakan koneksi pemilik database ATSkolla yang benar. Jangan menaruhnya di variabel VITE, repo, atau frontend. Jika memakai pooler, gunakan koneksi yang mendukung transaksi/perintah SQL ini.
3. Jalankan `python3 deploy/shortlinks/repair.py` dari checkout repo di VPS.
4. Skrip memeriksa tabel tujuan, membuat/memperbarui resolver, memuat ulang schema PostgREST, lalu menguji izin peran `anon`. Tidak mengubah isi tautan, tidak menonaktifkan RLS, dan tidak membuka pembacaan seluruh tabel.
5. Periksa shortlink aktif dari browser tanpa login, tautan nonaktif, serta tujuan internal/eksternal. Pemeriksaan fungsi tanpa kode hanya memverifikasi akses, bukan isi tujuan riil.

Fungsi ini sengaja menjadi lookup publik satu kode aktif dengan SECURITY DEFINER karena seluruh daftar shortlink tetap privat. Hak PUBLIC dicabut; hanya anon/authenticated dapat memanggil. Pemilik database yang menjalankan harus dipercaya. Jangan menjalankan pada database sekolah lain.

Saat ini akses koneksi pemilik database produksi tidak tersedia pada sesi perbaikan, sehingga eksekusi produksi belum dilakukan. Jika database masih di Lovable Cloud dan berhenti karena saldo, fungsi tersebut juga tidak akan tersedia. Untuk menghapus ketergantungan hosting sepenuhnya diperlukan pemindahan penyimpanan shortlink beserta sinkronisasi CMS; hal itu belum dilakukan oleh skrip ini.

## Mode mandiri: SQLite pada VPS (tidak memakai backend Lovable untuk redirect)

`server.py` melayani tujuan tautan dari SQLite lokal. Tidak memanggil Supabase/Lovable. Tidak ada biaya layanan luar untuk pencarian tautan; VPS tetap perlu hidup. Login dashboard sekolah dan fitur lain tetap memakai sistem sebelumnya.

1. **Sebelum menyalakan layanan baru**, buka CMS → Shortlink dan klik **Ekspor untuk VPS**. Periksa isi file dan simpan salinan cadangan. Jika database lama belum dapat dibaca, pulihkan koneksi/fungsi dengan `repair.py` terlebih dahulu atau gunakan salinan data yang sah; kode tujuan lama tidak dapat ditebak dari pesan error.
2. Pasang Python 3 pada VPS. Salin `server.py` ke `/opt/atskolla-shortlinks/server.py`. Buat direktori `/var/lib/atskolla-shortlinks` milik pengguna layanan (contoh `www-data`), mode 0700. Simpan data di luar web root.
3. Buat `/etc/atskolla-shortlinks.env` (root pemilik, mode 0600) berisi `SHORTLINK_DB=/var/lib/atskolla-shortlinks/links.sqlite3` dan `SHORTLINK_ADMIN_TOKEN=` diikuti kunci acak minimal 32 karakter. Buat kunci lokal, jangan taruh pada GitHub, bundle Vite atau chat.
4. Impor **sebelum** endpoint dipublikasikan: jalankan `server.py --import-json /lokasi-privat/atskolla-shortlinks.json` sebagai pengguna layanan dengan `SHORTLINK_DB` diatur. Pengulangan impor tidak menimpa kode yang sudah ada. Semua baris diimpor dalam satu transaksi. Data tidak boleh disimpan di folder public.
5. Pasang `atskolla-shortlinks.service`, sesuaikan pengguna layanan dengan VPS, lalu enable/start melalui systemd. Sertakan `nginx.conf` dalam server block utama, jalankan `nginx -t`, lalu reload jika valid. Jangan mengganti konfigurasi domain lainnya.
6. Terapkan build website terbaru. `/kode` dan `/s/kode` mencari ke `/shortlink-api/resolve` terlebih dahulu. Setelah layanan tersedia, kode yang tidak ada/nonaktif tidak diteruskan ke database lama, sehingga tautan yang telah dinonaktifkan tidak hidup kembali. Bila layanan belum dipasang, aplikasi masih mencoba resolver lama.
7. Di CMS, masukkan kunci pengelola VPS lalu Hubungkan. Kunci hanya berada pada sessionStorage tab browser, tidak dibundel. Buat/edit/nonaktif/hapus tersimpan di SQLite. Jumlah klik tersedia; mode VPS tidak menyimpan rincian perangkat/referer pengunjung. Jangan membagikan kunci ke petugas yang tidak berwenang; rotasi melalui env dan restart bila perlu.
8. Uji tautan aktif, nonaktif, kode hilang, perubahan target, dan hapus. Cadangkan SQLite dengan fasilitas backup SQLite; jangan menyalin file utama saat ada penulisan tanpa memperhitungkan WAL. Jaga endpoint HTTPS dan jangan membuka port 8788 ke publik.

Validasi lokal: `python3 -m unittest discover -s deploy/shortlinks -p 'test_server.py'`. Pemasangan VPS dan impor data belum dilakukan melalui perubahan kode ini. Endpoint baru belum aktif sampai tahapan di atas diselesaikan.
