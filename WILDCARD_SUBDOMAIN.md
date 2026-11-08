> **Deployment hybrid:** domain utama tetap di Lovable dan hanya subdomain sekolah di VPS. Ikuti [panduan khusus sekolah](deploy/schools/README.md). Jangan gunakan konfigurasi yang memindahkan domain utama atau `update.sh` lama untuk skema ini.

# Subdomain sekolah ATSkolla untuk VPS

Tautan utama sekolah menggunakan `https://{slug}.atskolla.com/admin` untuk petugas,
`https://{slug}.atskolla.com/login` untuk wali murid, dan `https://{slug}.atskolla.com/`
untuk halaman sekolah. Pendaftaran, pengaturan sekolah, dan tautan berbagi memakai format ini.

## Aktivasi sekali pada VPS

Ikuti `VPS_WILDCARD_SETUP.md`:

1. Siapkan virtual host frontend ATSkolla dengan `server_name atskolla.com *.atskolla.com`.
2. Arahkan DNS wildcard `*` ke origin VPS frontend. Jangan mengubah DNS situs gateway WhatsApp.
3. Pasang TLS yang mencakup `atskolla.com` dan `*.atskolla.com`.
4. Gunakan SPA fallback `try_files $uri $uri/ /index.html;` agar `/admin` dan `/login` dapat dibuka langsung.
5. Deploy frontend dari GitHub. Backend tetap dapat memakai Lovable Cloud.
6. Uji subdomain sekolah yang sudah terdaftar, refresh `/admin`, login wali, dan pemisahan sekolah.

Sesudah wildcard DNS, TLS, dan virtual host bekerja, sekolah baru tidak memerlukan
penambahan record DNS satu per satu. Menyimpan nama sekolah saja tidak mengaktifkan
infrastruktur tersebut.

Domain utama dan tautan pemasaran tetap `https://www.atskolla.com`.
Domain lama hanya dikenali untuk kompatibilitas; tautan baru tidak menggunakannya.
Rute `/t/{slug}/...` masih dapat membaca identitas sekolah untuk kompatibilitas link lama,
tetapi bukan format tautan utama yang dibagikan.

Pada hosting Lovable tanpa VPS/wildcard origin, setiap subdomain perlu dikonfigurasi
sesuai https://docs.lovable.dev/features/custom-domain.
