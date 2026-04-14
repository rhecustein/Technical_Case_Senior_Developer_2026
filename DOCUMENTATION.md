# Dokumentasi Teknis — Warehouse Management System
**Technical Case Senior Developer, PT Multi Power Aditama**
Dibuat oleh Bintang Wijaya

---

## Gambaran Proyek

Proyek ini adalah sistem manajemen gudang yang terintegrasi dengan Odoo 17. Sistem dibangun dalam tiga lapisan: frontend Next.js 14 untuk dashboard operasional, backend NestJS sebagai API layer, dan Odoo 17 sebagai sumber data master produk.

Filosofi dasarnya sederhana — Odoo adalah sumber kebenaran untuk semua data produk. Sistem in-house ini tidak mencoba menggantikan Odoo, melainkan memperluas kemampuannya: menyediakan antarmuka yang lebih cepat untuk operasional sehari-hari, bulk update via CSV, dan sinkronisasi dua arah yang bisa dipantau.

Semua service berjalan dalam satu Docker network, di-orchestrate dengan Docker Compose.

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                         │
│                                                             │
│   ┌─────────────┐    HTTP     ┌─────────────┐              │
│   │  Next.js 14 │ ──────────► │   NestJS    │              │
│   │   :3000     │             │   :3001     │              │
│   └─────────────┘             └──────┬──────┘              │
│                                      │                      │
│                            ┌─────────┴──────────┐          │
│                            │                    │          │
│                         TypeORM             JSON-RPC        │
│                            │                    │          │
│                    ┌───────▼──────┐    ┌────────▼───────┐  │
│                    │  PostgreSQL  │    │   Odoo 17      │  │
│                    │  (App DB)    │    │   :8069        │  │
│                    │  :5434       │    └────────┬───────┘  │
│                    └──────────────┘             │          │
│                                        ┌────────▼───────┐  │
│                                        │  PostgreSQL    │  │
│                                        │  (Odoo DB)     │  │
│                                        └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Satu hal yang cukup penting dari desain ini adalah **local-first write** — setiap kali user menyimpan produk, data ditulis ke database lokal dulu, baru kemudian di-push ke Odoo secara asinkronus. Ini membuat UI tetap responsif tanpa harus menunggu latency Odoo.

---

## Tech Stack

Backend menggunakan NestJS 10 dengan TypeORM 0.3 dan PostgreSQL 15. Frontend menggunakan Next.js 14 dengan App Router, Tailwind CSS 3, dan TypeScript strict mode. Odoo 17 diintegrasikan via JSON-RPC dengan custom Python module. Seluruh infrastruktur di-containerize dengan Docker Compose.

Tidak ada library state management eksternal di frontend — semuanya pakai React hooks biasa ditambah localStorage untuk persistensi setting auto sync.

---

## Fitur-Fitur

### Login

Halaman login punya dua panel: kiri branding perusahaan (hijau #13664E), kanan form login. Default kredensial sudah diisi otomatis di field supaya mudah saat testing.

Keamanan yang diimplementasikan: password di-hash dengan bcrypt (cost factor 10), rate limit 5 percobaan per 15 menit untuk mencegah brute force, dan pesan error dibuat identik antara "username tidak ada" dan "password salah" untuk menghindari user enumeration.

### Dashboard

Halaman pertama setelah login. Menampilkan empat angka penting: total produk, status sync terakhir, jumlah produk berhasil disync, dan jumlah error. Di bawahnya ada tabel riwayat 5 sync terakhir.

Data di dashboard sengaja dibuat minimal — hanya cukup untuk memberi gambaran cepat tanpa harus masuk ke halaman detail.

### Manajemen Produk (`/products`)

Ini halaman paling padat fiturnya. Ada tabel produk dengan kolom Part Number, Nama, Brand, Harga Jual, Harga Beli, UOM, dan Last Synced. Semua operasi CRUD bisa dilakukan dari sini via modal tanpa berpindah halaman.

Fitur tambahan yang ada di halaman ini:
- Search dengan debounce 400ms, mencari di partNumber, nama, dan brand sekaligus
- Export CSV dari produk yang sedang ditampilkan
- Auto Sync dengan interval yang bisa dikonfigurasi, mode pull/push/both, dan countdown timer yang muncul di header
- Empat stats card di atas tabel: total produk, hasil pencarian, sudah sync ke Odoo, belum sync

### Detail Produk (`/products/[id]`)

Halaman read-only untuk melihat semua field produk termasuk status sinkronisasi dengan Odoo. Ada tombol edit yang membuka modal tanpa berpindah halaman.

### Bulk Update (`/bulk-update`)

Khusus untuk update massal. Ada dua mode input:

**CSV** — user paste atau drag-and-drop file CSV dengan format `part_number, product_name, brand, sales_price, cost_price, uom, description`. Sistem memvalidasi setiap baris sebelum submit, dan menampilkan error per baris kalau ada yang tidak valid.

**Inline** — input langsung dalam tabel, cocok untuk update beberapa item tanpa perlu buat file CSV. Bisa tambah atau hapus baris secara dinamis.

Keduanya mengembalikan summary: berapa yang berhasil, berapa yang gagal, dan detail error per item. Kegagalan satu item tidak memblok item lain.

### Sinkronisasi Odoo (`/sync`)

Halaman khusus untuk manajemen sync. Ada dua tombol utama: Pull dari Odoo (ambil semua produk Odoo ke database lokal) dan Push ke Odoo (kirim semua produk lokal ke Odoo).

Di bawahnya ada tabel riwayat sync lengkap dengan direction, status, total record, berapa yang berhasil, berapa yang gagal, waktu mulai/selesai, dan durasi. Status PARTIAL muncul kalau ada sebagian yang gagal tapi sebagian berhasil — ini sengaja dibedakan dari FAILED supaya user tahu ada yang perlu diperhatikan tapi operasi tidak sepenuhnya gagal.

---

## Backend — Endpoint API

Semua endpoint butuh Bearer JWT token kecuali `/auth/login` dan `/health`. Swagger tersedia di `/api/docs`.

**Auth**
```
POST /auth/login
```

**Produk**
```
GET    /products            list + pagination + search + sort
GET    /products/:id        detail
POST   /products            buat baru
PUT    /products/:id        update
DELETE /products/:id        hapus
POST   /products/bulk-update
```

Semua list endpoint menggunakan `page` (1-indexed) dan `pageSize` — konsisten di seluruh codebase, tidak ada yang pakai `limit`.

**Sync**
```
POST /sync/pull    tarik dari Odoo
POST /sync/push    kirim ke Odoo
GET  /sync/logs    riwayat sync
```

**Response pull/push:**
```json
{
  "direction": "PULL",
  "status": "SUCCESS",
  "recordsTotal": 150,
  "recordsSuccess": 148,
  "recordsFailed": 2,
  "errors": [
    { "item": "MP-001", "error": "Duplicate part number" }
  ]
}
```

---

## Odoo Integration

Komunikasi ke Odoo menggunakan JSON-RPC. Session di-cache 30 menit — tidak ada re-autentikasi per request. Kalau session expired di tengah operasi, client akan otomatis re-auth dan retry sekali sebelum throw error.

### Custom Module `custom_inventory`

Module ini menambahkan dua field kustom ke `product.template` bawaan Odoo:

- `x_part_number` — kode unik produk, required, diindex
- `x_brand` — merek/produsen, opsional, diindex

Selain field, module ini juga menambahkan method-method di model untuk dipakai oleh backend NestJS: `get_products()`, `create_from_api()`, `update_from_api()`, `bulk_update()`.

### Logika Upsert saat Push

Ini bagian yang cukup krusial untuk menghindari duplikat di Odoo:

```
Untuk setiap produk lokal:
  Kalau sudah punya odooProductId → write() langsung ke Odoo
  Kalau belum punya → cari dulu di Odoo berdasarkan x_part_number
    Kalau ketemu → write() ke ID yang ditemukan, simpan ID-nya lokal
    Kalau tidak ketemu → create() baru di Odoo, simpan ID-nya lokal
```

Tanpa logika ini, setiap push akan terus membuat produk baru di Odoo padahal produknya sudah ada.

### Pemetaan Field

| In-House | Odoo | Catatan |
|----------|------|---------|
| partNumber | x_part_number | Field kustom |
| productName | name | Field bawaan |
| brand | x_brand | Field kustom |
| salesPrice | list_price | Field bawaan |
| costPrice | standard_price | Field bawaan |
| uom | uom_id | Many2One ke `uom.uom` |
| description | description | Field bawaan |

---

## Database

Dua database PostgreSQL yang terpisah. Satu untuk Odoo (dikelola Odoo sendiri), satu untuk aplikasi.

Tabel aplikasi: `users`, `products`, `sync_logs`. Detail skema ada di [docs/ERD.md](./docs/ERD.md).

Yang perlu dicatat: `odoo_product_id` di tabel `products` bukan foreign key sesungguhnya — itu hanya menyimpan ID dari sistem Odoo yang berbeda. Kolom ini kosong untuk produk yang belum pernah disync.

---

## Jurnal Development 3 Hari

### Hari 1 — Setup dan Perencanaan

Hari pertama dihabiskan untuk membaca brief, memetakan requirement, dan menyiapkan semua fondasi sebelum menyentuh kode fitur.

Keputusan arsitektur yang paling penting dibuat di hari ini: **local-first write**. Daripada membuat user menunggu response Odoo setiap kali simpan produk, data ditulis ke database lokal dulu. Sync ke Odoo berjalan setelahnya secara asinkronus. Ini membuat UX jauh lebih responsif, terutama kalau Odoo sedang lambat.

Pagi: setup `docker-compose.yml` dengan 5 service, konfigurasi health check antar service, dan pastikan semua container bisa saling berkomunikasi dalam satu network.

Sore: fokus ke modul Odoo. Ini bagian paling berisiko karena Odoo punya ekosistemnya sendiri. Dibuat dari awal: `__manifest__.py`, field kustom di `product.template`, method CRUD, dan normalisasi UOM (karena nama UOM di Odoo bisa berbeda-beda tergantung konfigurasi).

Tantangan hari 1 adalah setup `admin_passwd` Odoo yang harus dalam format pbkdf2-sha512 — tidak bisa plaintext. Ini makan waktu karena dokumentasinya tidak terlalu jelas.

### Hari 2 — Development

Hari paling padat. Semua fitur dari backend hingga frontend dikerjakan dalam satu hari.

**Pagi — Backend NestJS:**

Dibuat empat module: `auth`, `products`, `sync`, dan `odoo-integration`. Odoo client dibuat dengan session caching dan upsert logic. Semua DTO didekorasi untuk Swagger. ValidationPipe global dipasang dengan whitelist dan forbidNonWhitelisted.

Yang lumayan tricky adalah upsert logic saat push ke Odoo. Tanpa pengecekan by `x_part_number`, setiap push akan terus membuat produk baru bahkan kalau produknya sudah ada di Odoo. Ini diselesaikan dengan search-first sebelum create.

**Siang — Frontend Next.js:**

Dikerjakan berurutan dari yang paling kritis: login → layout → dashboard → products → sync → bulk update → product detail.

Setiap halaman punya auth guard yang sama: cek token di localStorage, kalau tidak ada redirect ke login. Semua error ditampilkan via react-hot-toast supaya tidak perlu state tambahan untuk notifikasi.

Auto sync dibuat menggunakan `setInterval` dengan state ref untuk menghindari stale closure. Setting disimpan ke localStorage supaya tidak hilang saat refresh.

**Sore — Integrasi dan fixing:**

Beberapa bug ditemukan saat testing end-to-end:

- Field `uom` dari Odoo bisa berisi nama yang berbeda-beda ("Unit(s)", "pcs", dll) — dibuat normalisasi di method `_normalize_uom()`
- Response envelope tidak konsisten di beberapa endpoint — distandarkan
- CORS tidak dikonfigurasi di `main.ts` — ditambahkan

### Hari 3 — Deploy dan QA Production

Pagi diisi persiapan deploy. Ditemukan satu masalah kritis yang tidak terpikirkan sebelumnya: `NEXT_PUBLIC_*` di Next.js di-bake ke dalam bundle saat `npm run build`, bukan saat runtime. Jadi kalau nilai di `.env` masih `localhost` saat build, frontend yang di-deploy ke VPS tidak akan bisa reach backend.

Solusinya: tambah `ARG` di Dockerfile frontend, pass via `build.args` di docker-compose. Dengan begitu nilai dari `.env` terbaca saat proses build, bukan hanya saat container jalan.

```dockerfile
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
```

Setelah deploy berhasil, QA dilakukan untuk 12 skenario. Hasilnya semua pass setelah 3 bug production diperbaiki:

**Bug #1 — Frontend tidak bisa reach backend**
Gejala: network error di console browser meski backend jalan normal. Root cause: lupa set IP VPS di `.env` sebelum build. Fix: set `NEXT_PUBLIC_API_URL=http://<VPS_IP>:3001/api`, rebuild image frontend.

**Bug #2 — Odoo session expired di tengah sync batch besar**
Gejala: sync 200+ produk gagal di tengah jalan dengan error 401 dari Odoo. Root cause: cache TTL 30 menit habis saat operasi besar berlangsung. Fix: tambah retry logic — kalau response 401, clear cache, re-auth, dan retry sekali.

**Bug #3 — Kolom Duration di sync log tampil "NaN ms"**
Gejala: beberapa baris di tabel sync log menampilkan "NaN ms" di kolom duration. Root cause: `finishedAt` null untuk sync yang masih berjalan, kalkulasi durasi tidak handle null. Fix: null check sebelum kalkulasi, tampilkan "Berlangsung..." kalau `finishedAt` belum ada.

Setelah semua fix diterapkan dan diverifikasi, sistem berjalan stabil selama 2 jam monitoring tanpa error kritis di log.

---

## Menjalankan Secara Lokal (Tanpa Docker)

Kalau ingin development tanpa Docker, pastikan PostgreSQL sudah jalan di lokal dan Odoo bisa diakses.

```bash
# Backend
cd backend
npm install
cp .env.example .env  # edit sesuai koneksi lokal
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

## Testing

```bash
cd backend
npm run test        # unit test
npm run test:e2e    # end-to-end test
```
