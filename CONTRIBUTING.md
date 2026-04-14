# Panduan Kontribusi

## Prasyarat

- Docker >= 24.0 & Docker Compose >= 2.20
- Node.js >= 20 (untuk development backend/frontend lokal)
- Python >= 3.10 (untuk development Odoo addon)

---

## Struktur Proyek

```
warehouse-system-multi-power/
├── backend/          NestJS API (TypeScript, strict)
├── frontend/         Next.js 14 (TypeScript, App Router)
├── odoo/addons/      Modul Python kustom Odoo 17
├── docs/             ERD dan dokumentasi tambahan
├── docker-compose.yml
├── .env.example      Salin ke .env sebelum pertama kali jalan
├── ARCHITECTURE.md   Arsitektur sistem dengan diagram Mermaid
└── README.md         Quick start dan referensi API
```

---

## Menjalankan Secara Lokal (Full Stack)

```bash
# 1. Salin konfigurasi environment
cp .env.example .env

# 2. Jalankan semua service
docker-compose up --build -d

# 3. Cek semua container sudah healthy
docker-compose ps

# Service
# http://localhost:3000  — Next.js frontend
# http://localhost:3001/api/docs — Swagger UI
# http://localhost:8069  — Odoo 17
```

---

## Development Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev       # dev server dengan hot-reload di :3001
npm run test            # unit test (Jest)
npm run test:cov        # laporan coverage
npm run test:e2e        # end-to-end test
npm run lint            # ESLint
npm run build           # production build
```

### Standar Penulisan Kode

- **TypeScript strict mode** — tidak ada `any`; gunakan `unknown` dan persempit dengan type guard
- **Validasi DTO** — setiap input DTO harus menggunakan dekorator `class-validator`
- **Repository pattern** — semua query SQL masuk ke `*.repository.ts`; service menggunakan abstraksi repository
- **Dependency injection** — jangan pernah pakai `new Service()` di dalam class; selalu inject via constructor
- **Satu tanggung jawab** — setiap class mengerjakan satu hal; pisahkan logic ke service + repository + controller
- **JSDoc** — semua method `public` di service dan repository harus punya komentar JSDoc
- **NestJS Logger** — gunakan `new Logger(ClassName.name)` sebagai pengganti `console.log/error`

### Menambah Module Baru

1. Generate: `nest g module <name> && nest g service <name> && nest g controller <name>`
2. Buat `<name>.repository.ts` untuk query TypeORM
3. Tambahkan entity ke array entities di `database.config.ts`
4. Daftarkan module di `app.module.ts`
5. Tulis unit test di `<name>.service.spec.ts`

---

## Development Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev             # dev server di :3000 dengan hot reload
npm run build           # production build
npm run lint            # ESLint + TypeScript check
npx tsc --noEmit        # type-check saja
```

### Standar Penulisan Kode

- **TypeScript strict** — tidak ada `any`, tidak ada non-null assertion tanpa alasan yang jelas
- **Services** — semua pemanggilan API masuk ke `src/services/*.service.ts`; komponen memanggil service
- **Hooks** — logic stateful yang dipakai bersama diekstrak ke `src/hooks/`
- **Types** — semua tipe yang dipakai bersama masuk ke `src/types/`

---

## Development Odoo Addon

```bash
# Restart Odoo setelah perubahan Python
docker-compose restart odoo_app

# Lihat log Odoo
docker logs odoo_app -f

# Reinstall addon (setelah perubahan model)
# 1. Buka http://localhost:8069
# 2. Aktifkan developer mode (Settings → Activate Developer Mode)
# 3. Apps → cari Custom Inventory API → Upgrade
```

### Standar Penulisan Kode

- **Type hints** di setiap method: `def get_products(self, page: int, page_size: int) -> dict:`
- **Docstring** di setiap class dan method publik
- **Service layer** — business logic ada di `services/product_service.py`; controller hanya menangani HTTP
- **Method private** diawali underscore: `def _map_fields(self, data: dict) -> dict:`
- **Logging** — gunakan `_logger = logging.getLogger(__name__)` dan `_logger.info/warning/exception`

---

## Environment Variables

Semua variabel terdokumentasi di `.env.example`. Yang paling penting:

| Variabel | Keterangan |
|----------|------------|
| `ODOO_API_KEY` | Shared secret untuk autentikasi machine-to-machine NestJS → Odoo |
| `JWT_SECRET` | Secret untuk signing JWT token — **wajib diganti di production** |
| `APP_DB_PASSWORD` | Password PostgreSQL in-house |
| `ODOO_PASSWORD` | Password akun admin Odoo |

> **Jangan pernah commit `.env`** — sudah masuk `.gitignore`.

---

## Testing

```bash
# Unit test backend
cd backend && npm test

# Coverage backend
cd backend && npm run test:cov

# Type check frontend
cd frontend && npx tsc --noEmit
```

### Konvensi Penulisan Test

- Unit test diletakkan di samping file yang ditest: `products.service.spec.ts`
- Mock semua dependensi eksternal (TypeORM repos, Odoo client) — jangan hit DB sungguhan di unit test
- Setiap blok `describe` memetakan satu method; setiap `it` mendeskripsikan satu perilaku
- Target minimal: happy path + kasus error/edge case per method

---

## Alur Git

1. Branch dari `main`: `git checkout -b feat/nama-fitur`
2. Tulis kode + test
3. `npm test` harus lolos sebelum commit
4. Pesan commit: `feat: add bulk-update CSV import` / `fix: correct sync pagination loop`
5. Buka PR ke `main` dengan deskripsi jelas tentang apa yang diubah dan alasannya
