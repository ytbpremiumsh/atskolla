# Deployment hybrid ATSkolla: hanya subdomain sekolah di VPS

Status: panduan dan tooling siap; menjalankan workflow tidak mengubah DNS, server,
atau konfigurasi Lovable. Langkah server harus dilakukan oleh pemilik VPS.

| Alamat / layanan | Lokasi |
| --- | --- |
| atskolla.com dan www.atskolla.com | Lovable, pertahankan konfigurasi sekarang |
| {slug-sekolah}.atskolla.com | VPS aaPanel |
| Database, Auth, Storage, Edge Functions | Lovable Cloud yang sekarang |
| atskollagateway.my.id | Instalasi gateway sekarang; jangan diubah |

GitHub menyimpan sumber dan membangun frontend. Semua sekolah memakai satu build;
TenantProvider memilih sekolah berdasarkan hostname. Tidak perlu clone per sekolah.
Subdomain yang belum terdaftar tidak membuat sekolah baru secara otomatis.

## 1. Ambil tooling di VPS

Prasyarat: Python 3.8+, Git, Nginx aaPanel yang sudah terpasang, akses terminal root.
Jangan memasang ulang Nginx di server aaPanel. Cadangkan konfigurasi Nginx dan
catat DNS saat ini sebelum mengubah situs sekolah.

```bash
mkdir -p /opt/atskolla-schools
cd /opt/atskolla-schools
git clone https://github.com/ytbpremiumsh/atskolla.git source
```

Jika repository privat, gunakan autentikasi Git melalui credential manager atau
SSH key read-only. Jangan menaruh token pada URL clone, chat, atau repository.
Tooling lokal tidak diperbarui otomatis; pembaruan otomatis berikut hanya frontend.

**Jangan gunakan `update.sh` lama** untuk konfigurasi hybrid: skrip itu menargetkan
folder domain utama. Semua skrip di sini khusus `/www/wwwroot/atskolla-schools`.

## 2. Unduh build dari GitHub

Di GitHub buka Actions → **Build school frontend for VPS** → run main yang sukses.
Workflow otomatis berjalan setelah perubahan frontend atau deployment di main.
Jika paket kedaluwarsa, jalankan workflow kembali melalui **Run workflow**.
Build memakai konfigurasi frontend publik `.env` yang sudah ada, sehingga terhubung
ke backend yang sama; jangan masukkan service-role key ke variabel VITE_.

Buat fine-grained GitHub token khusus repository ini dengan **Actions: read** dan
**Contents: read**. Simpan langsung di terminal VPS, bukan di percakapan:

```bash
install -d -m 700 /etc/atskolla-schools
read -r -s -p 'GitHub read-only token: ' ATSKOLLA_READ_TOKEN
printf '\n'
printf '%s' "$ATSKOLLA_READ_TOKEN" > /etc/atskolla-schools/github-token
unset ATSKOLLA_READ_TOKEN
chmod 600 /etc/atskolla-schools/github-token
python3 /opt/atskolla-schools/source/deploy/schools/update.py
```

Pastikan muncul `Rilis sekolah aktif: ...`. Skrip memeriksa sumber workflow, commit,
checksum dan path arsip sebelum mengalihkan symlink `current`. Build gagal, paket
kedaluwarsa atau unduhan gagal tidak mengganti frontend aktif. Token tidak diteruskan
ke URL penyimpanan artifact. Paket unduhan tidak menjalankan skrip dari ZIP.

## 3. Buat website sekolah terpisah di aaPanel

1. Tambahkan situs khusus wildcard `*.atskolla.com`, root
   `/www/wwwroot/atskolla-schools/current`, tipe **static**, tanpa database/PHP.
   Jika formulir aaPanel menolak wildcard, buat nama satu sekolah terlebih dahulu,
   lalu ubah `server_name` pada konfigurasi situs tersebut menjadi wildcard.
2. Terapkan isi `nginx-schools.conf` **pada situs sekolah baru saja**. Jangan tempel
   ke konfigurasi global, situs utama atau gateway. Pertahankan blok SSL yang akan
   dibuat aaPanel pada situs sekolah tersebut.
3. Periksa `nginx -t` menggunakan executable Nginx milik aaPanel, lalu reload dari
   panel hanya bila valid. Jangan hentikan atau pasang ulang layanan.
4. Uji HTTP sebelum DNS, mengganti IP_VPS dengan IP publik yang benar:

```bash
curl -I --resolve smanegeri1.atskolla.com:80:IP_VPS http://smanegeri1.atskolla.com/admin
```

Harus mengembalikan halaman aplikasi, bukan `File not found`. Route `/admin` memakai
fallback `index.html`. `/assets/` memakai shared-assets agar tab lama tetap bekerja
setelah pembaruan. Root dan www ditolak oleh konfigurasi sekolah.

## 4. SSL dan DNS Cloudflare

- Terbitkan sertifikat `*.atskolla.com` melalui validasi **DNS-01** di aaPanel.
  Wildcard tidak dapat divalidasi memakai HTTP-01. Jangan membagikan token DNS.
- Aktifkan HTTPS pada situs sekolah, pastikan jalur `/assets/` dan fallback SPA dari
  contoh konfigurasi tetap ada pada blok HTTPS. Uji lagi `nginx -t` lalu reload.
- Pertahankan record `@` dan `www` yang menuju Lovable.
- Tambahkan/ubah record **A `*` → IP VPS**. Periksa record sekolah eksplisit seperti
  `smanegeri1`: record eksplisit mengalahkan wildcard, jadi record lama yang keliru
  perlu disesuaikan. Jangan menghapus record mail, API, verifikasi atau layanan lain.
- Jika ada wildcard AAAA, pastikan IPv6 menuju VPS yang sama atau hapus hanya record
  wildcard AAAA yang sudah tidak dipakai.
- Jika proxy Cloudflare aktif, gunakan **Full (strict)** setelah SSL origin valid.
  Jangan gunakan Flexible. Jangan mengubah kebijakan SSL global tanpa memeriksa
  layanan lain pada zona; gunakan pengaturan per-host bila diperlukan.
- Uji login sekolah, refresh `/admin`, pemilihan tenant, dan satu asset. Periksa root,
  www, dan gateway tetap berfungsi. Uji login lintas host secara terpisah: session
  browser pada domain lain tidak otomatis ikut berpindah.

Konfigurasi DNS/SSL ini yang membuat sekolah baru otomatis dapat memakai subdomain;
menyimpan nama subdomain di database saja belum menghubungkan domain ke hosting.

## 5. Pembaruan otomatis, rollback, dan kapasitas

Setelah install dan uji berhasil, tambahkan baris berikut melalui `crontab -e` root:

```cron
*/5 * * * * /usr/bin/python3 /opt/atskolla-schools/source/deploy/schools/update.py >> /var/log/atskolla-schools-update.log 2>&1
```

Perubahan frontend main dibangun di GitHub, lalu diambil VPS setelah build sukses.
Tidak perlu Node/npm pada VPS dan tidak ada SSH secret VPS di GitHub Actions.
Ini tidak menerapkan migrasi database atau Edge Functions.

```bash
# Kembalikan versi sebelumnya dan jeda pembaruan otomatis:
python3 /opt/atskolla-schools/source/deploy/schools/install_release.py rollback
# Lanjutkan pembaruan otomatis setelah masalah selesai:
python3 /opt/atskolla-schools/source/deploy/schools/update.py --resume
```

Rilis dan asset lama sengaja disimpan agar rollback/tab lama tetap bekerja. Pantau
ruang disk dan rotasikan log. Pembersihan dilakukan terencana, jangan menghapus target
current/previous atau asset yang masih dipakai pengguna. Token read-only perlu diganti
saat kedaluwarsa. Tidak ada migrasi database, biaya Lovable AI atau perubahan gateway
oleh skrip deployment ini.
