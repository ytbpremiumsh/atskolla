#!/bin/bash
# Update ATSkolla di VPS — aman untuk server kecil (CPU/RAM terbatas).
set -euo pipefail

# --- KONFIGURASI ---
DOMAIN_NAME="atskolla.com"
REPO_URL="https://github.com/ytbpremiumsh/atskolla.git"
STAGING_DIR="/var/www/atskolla"
WEB_ROOT="/www/wwwroot/$DOMAIN_NAME"
LOCK_FILE="/tmp/atskolla-update.lock"
BUILD_TIMEOUT="20m"

# 1. Cegah update berjalan dobel (penyebab utama CPU 100% & mandek)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Update lain masih berjalan. Batal."; exit 1
fi

echo "--- Memulai Update ATSkolla ---"
cd "$STAGING_DIR"

# 2. Ambil kode terbaru
git remote set-url origin "$REPO_URL"
git fetch --all
git reset --hard origin/main
git clean -fd -e update.sh -e .env -e node_modules

# 3. Sesuaikan batas memori Node dengan RAM server (jangan melebihi RAM fisik)
TOTAL_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
HEAP_MB=$(( TOTAL_MB * 60 / 100 ))
[ "$HEAP_MB" -gt 4096 ] && HEAP_MB=4096
[ "$HEAP_MB" -lt 1024 ] && HEAP_MB=1024
echo "RAM: ${TOTAL_MB}MB | Swap: ${SWAP_MB}MB | Heap Node: ${HEAP_MB}MB"
if [ $(( TOTAL_MB + SWAP_MB )) -lt 3000 ]; then
  echo "PERINGATAN: RAM+swap < 3GB. Tambahkan swap 2GB agar build tidak macet:"
  echo "  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
fi

# 4. Install dependencies (prioritas rendah agar website tetap responsif)
export NODE_OPTIONS="--max-old-space-size=${HEAP_MB}"
export npm_config_audit=false npm_config_fund=false npm_config_progress=false
if [ -f package-lock.json ]; then
  nice -n 15 npm ci --legacy-peer-deps --no-audit --no-fund || nice -n 15 npm install --legacy-peer-deps --no-audit --no-fund
else
  nice -n 15 npm install --legacy-peer-deps --no-audit --no-fund
fi

# 5. Build ke folder sementara, dengan batas waktu agar tidak menggantung selamanya
rm -rf dist
if ! nice -n 15 timeout "$BUILD_TIMEOUT" npx vite build; then
  echo "ERROR: Build gagal / melebihi $BUILD_TIMEOUT. Website lama TETAP berjalan."
  exit 1
fi
[ -f dist/index.html ] || { echo "ERROR: dist/index.html tidak ada. Website lama tetap berjalan."; exit 1; }

# 6. Deploy tanpa downtime (tidak menghapus web root dulu)
mkdir -p "$WEB_ROOT"
if command -v rsync >/dev/null; then
  rsync -a dist/ "$WEB_ROOT/"                 # file baru masuk dulu
  rsync -a --delete dist/ "$WEB_ROOT/" --exclude '.user.ini'  # baru bersihkan file lama
else
  cp -r dist/* "$WEB_ROOT/"
fi
chown -R www:www "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
nginx -t && nginx -s reload

echo "   BERHASIL: Website sudah menggunakan versi terbaru!"
