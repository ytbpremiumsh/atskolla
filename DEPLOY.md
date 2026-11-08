> **Deployment hybrid:** domain utama tetap di Lovable dan hanya subdomain sekolah di VPS. Ikuti [panduan khusus sekolah](deploy/schools/README.md). Jangan gunakan konfigurasi yang memindahkan domain utama atau `update.sh` lama untuk skema ini.

# Self-Hosting ATSkolla di VPS

Panduan singkat untuk deploy ATSkolla di server pribadi (VPS Linux) dengan auto-update dari GitHub menggunakan `update.sh`.

> **Catatan penting:** Script ini hanya men-deploy **frontend** (Vite SPA). Backend — database, edge functions, cron `auto-mark-alfa`, dll — tetap berjalan otomatis di **Lovable Cloud** dan tidak perlu di-deploy ulang.

---

## 1. Prasyarat VPS

- Ubuntu/Debian 20.04+ (atau distro Linux lain)
- Node.js 20+ atau Bun
- Git
- (Opsional) PM2 / Nginx / Docker untuk serve aplikasi

Install Bun (rekomendasi, sesuai project):
```bash
curl -fsSL https://bun.sh/install | bash
```

Install PM2 (opsional, untuk auto-restart):
```bash
npm install -g pm2 serve
```

---

## 2. Clone Repository (sekali saja)

```bash
cd /var/www
git clone https://github.com/USERNAME/REPO_NAME.git atskolla
cd atskolla
chmod +x update.sh
```

> Pastikan repo Lovable sudah connected ke GitHub via **Connectors → GitHub**.

---

## 3. Setup Environment Variables

Buat file `.env` di root project (TIDAK di-commit ke GitHub):

```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://bohuglednqirnaearrkj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHVnbGVkbnFpcm5hZWFycmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODE0NTYsImV4cCI6MjA4ODU1NzQ1Nn0.oK5vxz2mh7o4S22u1bsO8lFxDgT4f9PpPkQmMyZ1Ji8
VITE_SUPABASE_PROJECT_ID=bohuglednqirnaearrkj
EOF
```

---

## 4. Build Pertama Kali

```bash
./update.sh
```

Hasil build ada di folder `dist/`.

---

## 5. Serve Aplikasi (pilih salah satu)

### Opsi A — PM2 + `serve` (paling simpel)

```bash
pm2 start serve --name atskolla -- -s dist -l 3000
pm2 save
pm2 startup     # ikuti instruksi yang muncul agar auto-start saat reboot
```

`update.sh` akan otomatis menjalankan `pm2 reload atskolla` setelah build.

### Opsi B — Nginx (serve static dist/)

`/etc/nginx/sites-available/atskolla`:
```nginx
server {
    listen 80;
    server_name absenpintar.online www.absenpintar.online;

    root /var/www/atskolla/dist;
    index index.html;

    # SPA fallback — semua route diarahkan ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Aktifkan:
```bash
sudo ln -s /etc/nginx/sites-available/atskolla /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`update.sh` akan otomatis `nginx -t && reload` setelah build.

### Opsi C — Docker Compose

Buat `docker-compose.yml`, lalu `update.sh` akan menjalankan `docker compose up -d --build` otomatis.

---

## 6. Auto-Update via Cron

Edit crontab:
```bash
crontab -e
```

Tambahkan (cek update tiap 10 menit):
```
*/10 * * * * cd /var/www/atskolla && ./update.sh >> update.log 2>&1
```

Atau tiap jam:
```
0 * * * * cd /var/www/atskolla && ./update.sh >> update.log 2>&1
```

Lihat log:
```bash
tail -f /var/www/atskolla/update.log
```

---

## 7. Cara Kerja Full Auto

```
[Edit di Lovable]
      ↓ (auto-push ~1 menit)
[GitHub Repo]
      ↓ (cron tiap 10 menit di VPS)
[update.sh: pull → install → build → reload]
      ↓
[VPS serve versi terbaru]
```

Anda **tidak perlu menyentuh VPS lagi** setelah setup awal. Semua perubahan dari Lovable akan otomatis live di server Anda dalam <15 menit.

---

## 8. Manual Run

Kalau mau update tanpa nunggu cron:
```bash
cd /var/www/atskolla && ./update.sh
```

Script ini idempotent — aman dijalankan berkali-kali. Kalau tidak ada commit baru, langsung exit.

---

## 9. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Permission denied` saat run script | `chmod +x update.sh` |
| `git pull` gagal — auth error | Setup SSH key / GitHub PAT untuk repo private |
| Build gagal `out of memory` | VPS minimal 2GB RAM, atau swap on |
| Update jalan tapi UI tidak berubah | Hard refresh browser (Ctrl+Shift+R) — cache |
| PM2 tidak detect process | `pm2 list` cek nama process sesuai (`atskolla`) |
