# Persiapan konten publik ATSkolla

Tanggal perubahan: 18 November 2026.

## Lima pekerjaan

1. Kebijakan privasi menjelaskan cookie iklan Google, partner pihak ketiga, pilihan personalisasi, penyimpanan pilihan iklan, serta pemisahan data sekolah dari penayangan iklan.
2. Enam artikel asli ditulis dari awal, dengan contoh simulasi yang diberi penjelasan, langkah praktis, daftar pemeriksaan, dan bacaan terkait. Tidak memakai data siswa nyata, statistik penggunaan rekaan, kutipan panjang pihak lain, atau klaim pengalaman pelanggan.
3. Skrip AdSense global pada index aplikasi diganti meta verifikasi publisher. Pemuatan skrip iklan hanya ada di halaman artikel HTML publik pada atskolla.com/www.atskolla.com, setelah pengunjung mengizinkan. Dashboard, login, portal wali, pembayaran, halaman error, dan indeks artikel tidak memuat skrip iklan ini. Navigasi dari artikel ke aplikasi menggunakan tautan dokumen penuh agar skrip artikel tidak tertinggal di halaman akun. Tidak menambahkan unit iklan yang menyamar sebagai tombol.
4. Sitemap XML publik ditambahkan, robots.txt merujuknya, dan setiap artikel memiliki HTML lengkap, judul, deskripsi, canonical, serta Article JSON-LD. Artikel tetap terbaca tanpa JavaScript dan tanpa server database. Proses build menghasilkan direktori artikel beserta index.html; hosting harus melayani file statis tersebut sebelum fallback SPA.
5. FAQ, syarat penggunaan, halaman Tentang, serta kedua tema beranda diselaraskan: biaya tidak memakai angka lama yang berbeda per channel, bank mengikuti metode yang tersedia, cicilan dan pencairan dibedakan, ketentuan gratis menggunakan SPP Online dijelaskan, serta klaim statistik/sejarah/waktu pemasangan yang tidak terverifikasi diganti dengan informasi fitur. Ilustrasi dashboard diberi penanda ilustrasi.

## Artikel

- /artikel/cara-membuat-rekap-absensi-siswa
- /artikel/mengelola-tagihan-spp-dan-cicilan
- /artikel/panduan-wali-murid-membayar-tagihan-online
- /artikel/mengelola-izin-dan-sakit-siswa
- /artikel/menyusun-jadwal-pelajaran-mingguan
- /artikel/kebiasaan-menjaga-data-siswa

Penulis ditampilkan sebagai Tim ATSkolla. Tanggal publikasi sesuai tanggal penyiapan konten. Artikel berisi panduan operasional, bukan nasihat medis/hukum atau jaminan fitur tertentu tersedia untuk semua sekolah. Editor/pemilik situs perlu memeriksa isinya sebelum publikasi.

## Yang perlu dilakukan saat penerapan

- Jalankan `npm run build`, termasuk tahap `node scripts/build-public-content.mjs`.
- Perbarui website dan periksa /artikel, seluruh artikel, /ads.txt, /sitemap.xml, /robots.txt, dan /kebijakan-privasi. Pada VPS, aturan statis seperti `try_files $uri $uri/ /index.html` perlu dipertahankan. Jangan hanya menyalin index.html dan assets.
- Di AdSense, gunakan publisher ca-pub-0516573569377801 dan verifikasi kepemilikan memakai metode yang tersedia. Meta akun tersedia pada aplikasi dan HTML artikel. File ads.txt tetap sama.
- Pengaturan Auto ads, pengecualian halaman, pesan privasi, dan peninjauan situs dilakukan pada akun AdSense. Kode website tidak mengatur akun Google secara otomatis.
- Jika menayangkan iklan kepada pengunjung wilayah yang mensyaratkan CMP bersertifikat Google, siapkan pesan yang sesuai melalui AdSense Privacy & messaging atau CMP bersertifikat. Tombol Izinkan/Tolak pada website ini adalah pilihan pemuatan iklan sederhana, bukan pengganti CMP bersertifikat atau sertifikasi kepatuhan.
- Daftarkan sitemap di Google Search Console jika akses pemilik tersedia. Sitemap bukan syarat jaminan diterima AdSense.
- Tidak ada janji kelulusan, jumlah artikel minimum resmi, atau jaminan pendapatan iklan.

## Validasi

- Pengujian HTML artikel, canonical/JSON-LD, tautan, dan sitemap.
- Pengujian pembatasan iklan, penolakan yang tersimpan, izin yang memuat satu skrip, dan ketiadaan skrip global di aplikasi.
- Pemeriksaan TypeScript dan build produksi.
- Pengujian visual browser lokal dibatasi lingkungan eksekusi (Chromium gagal membuka socket). Pemeriksaan browser desktop/ponsel pada deployment pratinjau tetap diperlukan; jangan mengklaim sudah diperiksa di perangkat nyata.

## Referensi

- https://support.google.com/adsense/answer/1348695?hl=id
- https://support.google.com/adsense/answer/7299563?hl=id
- https://support.google.com/publisherpolicies/answer/11112688?hl=id
