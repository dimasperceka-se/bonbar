# Deploy Guide — Bon Barang Lapas

Single-port deployment on Linux + Node.js (systemd or pm2). Aplikasi dengar di port **9091**.

## 0. Prerequisites di server

```bash
node --version    # >= 20 (24 disarankan)
pnpm --version    # >= 9
psql --version    # PostgreSQL 14+
git --version
```

Kalau pnpm belum ada:
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 1. Buat database PostgreSQL

Login ke postgres lalu buat DB + user khusus (ganti password sesuai kebutuhan):

```bash
sudo -u postgres psql <<'SQL'
CREATE USER bonbar WITH PASSWORD 'ganti-password-aman';
CREATE DATABASE bonbarang OWNER bonbar;
GRANT ALL PRIVILEGES ON DATABASE bonbarang TO bonbar;
SQL
```

## 2. Clone repo

```bash
sudo mkdir -p /opt/bonbar
sudo chown $USER:$USER /opt/bonbar
git clone https://github.com/dimasperceka-se/bonbar.git /opt/bonbar
cd /opt/bonbar
```

## 3. Konfigurasi `.env`

```bash
cp .env.example .env
nano .env
```

Isi minimal:
```
DATABASE_URL=postgres://bonbar:ganti-password-aman@localhost:5432/bonbarang
JWT_SECRET=$(openssl rand -hex 32)    # generate sekali, lalu paste
PORT=9091
BASE_PATH=/
# OPENAI_API_KEY=sk-...               # opsional, hanya untuk fitur AI parse
```

## 4. Install + build + seed

```bash
pnpm install
pnpm --filter @workspace/db run push      # apply schema
pnpm --filter @workspace/db run seed      # demo users + items (admin/admin123, dst)
pnpm --filter @workspace/bon-barang run build
pnpm --filter @workspace/api-server run build
```

Test manual sekali:
```bash
pnpm --filter @workspace/api-server run start
# buka browser ke http://server-ip:9091/
# stop dengan Ctrl+C kalau sudah ok
```

## 5a. Jalankan sebagai systemd service

Buat file unit:
```bash
sudo tee /etc/systemd/system/bonbar.service > /dev/null <<'UNIT'
[Unit]
Description=Bon Barang Lapas (API + frontend)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=YOUR_LINUX_USER
WorkingDirectory=/opt/bonbar/artifacts/api-server
EnvironmentFile=/opt/bonbar/.env
ExecStart=/usr/bin/env node --enable-source-maps ./dist/index.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

# Ganti YOUR_LINUX_USER dulu:
sudo sed -i "s/YOUR_LINUX_USER/$USER/" /etc/systemd/system/bonbar.service

sudo systemctl daemon-reload
sudo systemctl enable --now bonbar
sudo systemctl status bonbar
sudo journalctl -u bonbar -f       # tail log
```

## 5b. Alternatif: jalankan dengan pm2

```bash
sudo npm i -g pm2

cd /opt/bonbar/artifacts/api-server
pm2 start dist/index.mjs --name bonbar --update-env
pm2 save
pm2 startup       # jalankan baris yang di-print untuk auto-start saat boot
pm2 logs bonbar
```

`.env` di-load otomatis oleh script start (`node --env-file-if-exists=../../.env`).

## 6. Reverse proxy (opsional)

Untuk pasang di domain + HTTPS, taruh nginx di depan port 9091:

```nginx
server {
  listen 80;
  server_name bonbar.example.com;

  location / {
    proxy_pass http://127.0.0.1:9091;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Pasang sertifikat dengan certbot:
```bash
sudo certbot --nginx -d bonbar.example.com
```

## 7. Update / redeploy setelah ada commit baru

```bash
cd /opt/bonbar
git pull
pnpm install
pnpm --filter @workspace/db run push           # hanya kalau ada migrasi schema
pnpm --filter @workspace/bon-barang run build
pnpm --filter @workspace/api-server run build

# systemd:
sudo systemctl restart bonbar

# atau pm2:
pm2 restart bonbar --update-env
```

## Troubleshooting

- **Port 9091 sudah dipakai**: `sudo lsof -i :9091` untuk lihat process-nya, atau ganti `PORT` di `.env` ke nilai lain (misal 9092) lalu restart service.
- **`DATABASE_URL must be set`**: pastikan `EnvironmentFile=/opt/bonbar/.env` di unit systemd benar, atau (untuk pm2) `.env` ada di `/opt/bonbar/.env`.
- **`Frontend bundle not found — API-only mode`**: belum di-build. Jalankan `pnpm --filter @workspace/bon-barang run build`.
- **404 saat refresh `/requests/123`**: pastikan API server yang serve, bukan reverse proxy ke direktori statik. SPA fallback ada di `artifacts/api-server/src/app.ts`.
