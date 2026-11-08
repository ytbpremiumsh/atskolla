# Alamat sekolah ATSkolla

Link sekolah yang langsung bekerja pada hosting yang sudah dipublikasikan:
`https://www.atskolla.com/t/{slug}/admin` untuk petugas dan
`https://www.atskolla.com/t/{slug}/login` untuk wali murid.
TenantProvider membaca slug dari path dan tidak memaksa pengalihan ke hostname yang belum aktif.

## Subdomain asli pada Lovable

Dokumentasi Lovable mengharuskan setiap subdomain ditambahkan dan dikonfigurasi secara individual:
https://docs.lovable.dev/features/custom-domain

1. Project → Settings → Domains → Connect domain.
2. Masukkan `{slug}.atskolla.com`.
3. Ikuti record DNS yang ditampilkan Lovable, bukan IP yang ditebak dari panduan lama.
4. Tunggu status Active dan sertifikat HTTPS tersedia.
5. Periksa pengaturan Primary domain. Jika primary aktif, domain lain dapat diarahkan ke primary dan identitas hostname sekolah hilang. Unset as primary membuat domain tersambung melayani proyek secara setara; pertimbangkan dampaknya terhadap domain pemasaran.
6. Uji `/admin`, refresh URL tersebut, login, dan pemisahan data antarsekolah.

Record wildcard Cloudflare `*` saja tidak menjamin origin hosting menerima semua hostname.
DNS, TLS, dan routing aplikasi harus semuanya benar. Panduan lama yang menjanjikan
cukup memverifikasi domain root untuk seluruh subdomain tidak dapat dijadikan jaminan.

## Otomatis untuk setiap sekolah baru

Gunakan origin/frontend yang menerima wildcard host dan wildcard TLS, misalnya VPS
sesuai `VPS_WILDCARD_SETUP.md`, atau reverse proxy yang dikonfigurasi dan diuji di Cloudflare.
Frontend dapat tetap dikembangkan di Lovable/GitHub; backend Lovable Cloud tidak perlu
ikut dipindahkan. Jangan arahkan wildcard ke VPS gateway WhatsApp tanpa menyiapkan
virtual host frontend ATSkolla yang terpisah.

Sampai konfigurasi infrastruktur itu selesai, bagikan link `/t/{slug}/...` yang stabil.
