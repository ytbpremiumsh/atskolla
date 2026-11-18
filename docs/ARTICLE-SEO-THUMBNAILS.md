# Thumbnail dan pembaruan artikel — 18 November 2026

- Enam ilustrasi editorial asli, satu per artikel, pada `public/images/articles/`. Format WebP 1200×675, dioptimalkan untuk kartu dan sampul. Dibuat dengan image generation bawaan, lalu dioptimalkan untuk website. Brief: ilustrasi flat 2D navy/indigo, latar biru muda/krem, aksen mint; tanpa teks/logo; objek sesuai absensi, tagihan SPP, pembayaran ponsel, surat izin, jadwal, atau perlindungan data siswa.
- Daftar artikel menampilkan thumbnail; detail artikel menampilkan sampul dengan alt deskriptif. Ukuran gambar ditetapkan agar layout stabil; gambar kartu lazy-loaded, sampul utama diprioritaskan.
- Judul dan deskripsi ditulis ulang sesuai topik. Konten mendapat pengantar langsung, subjudul yang lebih jelas, pertanyaan umum, serta tautan ke kelima artikel lain. Tidak menambahkan pengulangan kata kunci atau statistik rekaan.
- Metadata HTML statis dan fallback React memuat gambar sosial dan Article JSON-LD dengan image/dateModified. Canonical tetap memakai URL artikel lama agar tautan yang sudah dibagikan tidak berubah. max-image-preview:large mengizinkan pratinjau besar; tidak menjamin tampilan atau peringkat tertentu.
- Banner pilihan iklan kustom dan tombol footer terkait dihapus sesuai permintaan. Pengungkapan cookie Google tetap pada Kebijakan Privasi. Skrip tidak mencatat izin otomatis atau menyimpan nilai persetujuan. Pesan privasi yang diperlukan dikelola melalui akun Google AdSense Privacy & messaging; perubahan ini tidak mengatur akun AdSense atau menggantikan CMP yang diwajibkan Google.
- AdSense tetap dibatasi ke artikel publik, tidak ke login, dashboard, portal wali, atau pembayaran.

Jalankan `npm run build` agar HTML statis dan aset terbaru ikut diterapkan. Pemeriksaan hasil deploy dan tampilan desktop/ponsel masih diperlukan. Tidak menggunakan kredit Lovable.
