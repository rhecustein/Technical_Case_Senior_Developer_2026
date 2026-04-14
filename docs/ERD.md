# ERD — Database In-House

Sistem ini menggunakan dua database PostgreSQL yang terpisah: satu untuk Odoo, satu untuk aplikasi in-house. Yang didokumentasikan di sini adalah database aplikasi in-house.

## Tabel

### products

Tabel utama penyimpanan data produk. Field `odoo_product_id` adalah referensi ke `product.template.id` di Odoo — bukan foreign key sesungguhnya karena berada di sistem berbeda.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | Primary key, auto-generated |
| part_number | VARCHAR(255) | Unik, wajib diisi, diindex |
| product_name | VARCHAR(255) | Wajib diisi |
| brand | VARCHAR(255) | Opsional |
| sales_price | DECIMAL(15,2) | Default 0 |
| cost_price | DECIMAL(15,2) | Default 0 |
| uom | ENUM | PCS / BOX / DOZEN, default PCS |
| description | TEXT | Opsional |
| odoo_product_id | INTEGER | ID produk di Odoo, diisi setelah sync pertama |
| last_synced_at | TIMESTAMP | Kapan terakhir kali disync dengan Odoo |
| created_at | TIMESTAMP | — |
| updated_at | TIMESTAMP | — |

### users

Hanya menyimpan akun login aplikasi. Odoo punya manajemen user-nya sendiri yang terpisah.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| username | VARCHAR(255) | Unik |
| password_hash | VARCHAR(255) | bcrypt hash |
| created_at | TIMESTAMP | — |
| updated_at | TIMESTAMP | — |

### sync_logs

Audit trail setiap operasi sinkronisasi. Setiap kali pull atau push dijalankan, satu baris baru dibuat di sini — berhasil atau tidak.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| direction | ENUM | PULL atau PUSH |
| status | ENUM | SUCCESS / PARTIAL / FAILED |
| records_total | INTEGER | Total record yang diproses |
| records_success | INTEGER | Yang berhasil |
| records_failed | INTEGER | Yang gagal |
| error_details | JSONB | Array `{ item, error }` per item yang gagal |
| started_at | TIMESTAMP | Waktu mulai |
| finished_at | TIMESTAMP | Waktu selesai (null kalau masih berjalan) |
| created_at | TIMESTAMP | — |

## Pemetaan Field ke Odoo

Data yang sama disimpan dengan nama field berbeda di dua sistem. Ini tabel konversinya:

| Field In-House | Field Odoo | Model Odoo |
|----------------|------------|------------|
| part_number | x_part_number | product.template |
| product_name | name | product.template |
| brand | x_brand | product.template |
| sales_price | list_price | product.template |
| cost_price | standard_price | product.template |
| uom | uom_id (nama) | product.template → uom.uom |
| description | description | product.template |
| odoo_product_id | id | product.template |

Field `x_part_number` dan `x_brand` adalah field kustom yang ditambahkan oleh modul `custom_inventory`. Field lainnya adalah bawaan Odoo yang sudah ada.
