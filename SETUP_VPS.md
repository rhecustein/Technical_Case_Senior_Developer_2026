# Panduan Deploy ke VPS

Panduan ini mengasumsikan VPS berjalan di Ubuntu 22.04 atau Debian 12. Sebelum mulai, pastikan sudah bisa SSH ke server.

## 1. Install Docker

```bash
sudo apt update && sudo apt upgrade -y

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

sudo apt install -y docker-compose-plugin git

# Verifikasi
docker --version
docker compose version
```

## 2. Clone dan Konfigurasi

```bash
git clone <REPO_URL> warehouse-system
cd warehouse-system

cp .env.example .env
nano .env
```

Yang **wajib** diubah di `.env` sebelum build:

```env
# Ganti YOUR_VPS_IP dengan IP publik VPS atau domain
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:3001/api
NEXT_PUBLIC_ODOO_URL=http://YOUR_VPS_IP:8069

# Ganti semua password default
APP_DB_PASSWORD=isi-password-kuat
ODOO_DB_PASSWORD=isi-password-kuat
ODOO_PASSWORD=password-admin-odoo
JWT_SECRET=string-random-panjang-minimal-32-karakter
```

> `NEXT_PUBLIC_API_URL` dan `NEXT_PUBLIC_ODOO_URL` di-bake ke dalam bundle Next.js saat build, bukan saat runtime. Jadi harus diisi dengan benar **sebelum** menjalankan `docker compose up --build`, bukan setelahnya.

## 3. Build dan Jalankan

```bash
docker compose up --build -d
```

Build pertama kali butuh waktu lebih lama karena harus download image Odoo dan build Next.js. Biasanya 5–10 menit tergantung koneksi VPS.

Pantau prosesnya:

```bash
docker compose ps       # cek status semua container
docker compose logs -f  # lihat log realtime
```

Semua container harus berstatus `running`. Container `odoo_db` dan `app_db` akan menunjukkan `healthy` setelah health check berhasil.

## 4. Setup Odoo (Sekali Saja)

Buka `http://YOUR_VPS_IP:8069` di browser. Akan muncul halaman pembuatan database.

Isi form dengan:
- **Master Password** — lihat nilai `admin_passwd` di `odoo/config/odoo.conf`
- **Database Name** — harus sama dengan `ODOO_DB_NAME` di `.env` (default: `odoo`)
- **Email & Password** — ini akan jadi kredensial admin Odoo kamu

Setelah database terbuat dan masuk ke Odoo:

1. Buka **Settings → General Settings**, scroll ke bawah, klik **Activate the developer mode**
2. Buka menu **Apps** → klik **Update Apps List**
3. Cari **Custom Inventory API** → Install

Setelah modul terpasang, sistem siap digunakan.

## 5. Verifikasi

Buka di browser dan pastikan semua bisa diakses:

- `http://YOUR_VPS_IP:3000` — aplikasi frontend, login dengan `admin` / `admin123`
- `http://YOUR_VPS_IP:3001/api/docs` — Swagger UI
- `http://YOUR_VPS_IP:8069` — Odoo

## 6. Firewall

Kalau VPS menggunakan UFW:

```bash
sudo ufw allow 22/tcp    # SSH — jangan sampai terkunci
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # Backend
sudo ufw allow 8069/tcp  # Odoo
sudo ufw enable
```

## 7. Nginx (Opsional)

Kalau ingin menggunakan domain dan port 80 alih-alih port langsung:

```bash
sudo apt install -y nginx
```

Buat file konfigurasi di `/etc/nginx/sites-available/warehouse`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name odoo.yourdomain.com;

    location / {
        proxy_pass http://localhost:8069;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/warehouse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Jika sudah pakai Nginx dengan domain, update `.env` lalu rebuild frontend:

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_ODOO_URL=https://odoo.yourdomain.com
```

```bash
docker compose up --build -d frontend
```

## Perintah yang Sering Dipakai

```bash
# Lihat status semua container
docker compose ps

# Log per service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f odoo

# Restart service tertentu
docker compose restart backend

# Update setelah pull kode baru
git pull
docker compose up --build -d

# Stop semua
docker compose down

# Stop dan hapus semua data (hati-hati, tidak bisa di-undo)
docker compose down -v
```
