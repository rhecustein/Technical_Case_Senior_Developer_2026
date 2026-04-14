# Warehouse Management System
**Technical Case — Senior Developer, PT Multi Power Aditama**
Dibuat oleh **Bintang Wijaya**

---

Sistem manajemen gudang berbasis web yang terintegrasi dengan Odoo 17 sebagai sumber data master. Frontend dibangun dengan Next.js 14, backend dengan NestJS, dan semua service berjalan di atas Docker Compose.

Odoo bertindak sebagai *single source of truth* — data produk asalnya dari sana. Sistem ini menyediakan dashboard untuk operasional sehari-hari: CRUD produk, bulk update via CSV, dan sinkronisasi dua arah ke/dari Odoo.

## Prasyarat

- Docker >= 24.0 dan Docker Compose plugin
- Git

## Cara Menjalankan

```bash
git clone <repository-url>
cd warehouse-system-multi-power

cp .env.example .env
# Edit .env jika diperlukan — default sudah bisa langsung jalan

docker compose up --build -d
```

Tunggu sekitar 2–3 menit sampai semua container healthy. Kemudian akses:

- **Aplikasi** → http://localhost:3000
- **API / Swagger** → http://localhost:3001/api/docs
- **Odoo** → http://localhost:8069

Login aplikasi: `admin` / `admin123`  
Login Odoo: `admin` / `admin`

## Setup Odoo (Pertama Kali)

Saat pertama kali jalan, Odoo belum punya database. Buka http://localhost:8069 lalu buat database baru dengan nama `odoo`. Setelah masuk, pergi ke menu **Apps**, aktifkan developer mode dari Settings, lalu cari dan install modul **Custom Inventory API**.

Setelah modul terpasang, fitur sync produk antara sistem ini dan Odoo sudah siap digunakan.

## Stack

- **Frontend** — Next.js 14, TypeScript, Tailwind CSS
- **Backend** — NestJS, TypeScript, TypeORM
- **Database** — PostgreSQL 15 (dua instance: app & Odoo)
- **ERP** — Odoo 17 dengan custom module Python
- **Infrastructure** — Docker Compose

## API Singkat

Semua endpoint butuh Bearer token JWT kecuali login. Dokumentasi lengkap ada di Swagger.

```
POST /api/auth/login
GET  /api/products?page=1&pageSize=20&search=
POST /api/products
PUT  /api/products/:id
DELETE /api/products/:id
POST /api/products/bulk-update
POST /api/sync/pull
POST /api/sync/push
GET  /api/sync/logs
```

## Struktur Proyek

```
warehouse-system-multi-power/
├── frontend/          # Next.js 14
├── backend/           # NestJS
├── odoo/
│   ├── addons/custom_inventory/   # Custom Odoo module
│   └── config/odoo.conf
├── docs/ERD.md
├── DOCUMENTATION.md   # Dokumentasi lengkap + jurnal development
├── SETUP_VPS.md       # Panduan deploy ke VPS
└── docker-compose.yml
```

Untuk panduan deploy ke VPS, lihat [SETUP_VPS.md](./SETUP_VPS.md).  
Untuk dokumentasi teknis lengkap dan jurnal development 3 hari, lihat [DOCUMENTATION.md](./DOCUMENTATION.md).
