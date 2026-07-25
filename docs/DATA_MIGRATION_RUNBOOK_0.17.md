# Data Migration Runbook v0.17.0

## 1. Prinsip

CIMS tidak menyalin seluruh dokumen resmi menjadi sumber kebenaran baru. Migrasi memprioritaskan metadata koordinasi, official reference, hash, status kesiapan, acknowledgment, provider reference, dan audit evidence.

## 2. Tahapan

### Inventarisasi

- petakan tabel atau export MVP lama ke entitas v0.17.0
- klasifikasikan data pribadi, data terlindungi, secret, dan official record
- identifikasi duplicate hearing, jadwal aktif ganda, dan referensi kosong
- sepakati cut-off date dan owner setiap dataset

### Transformasi

- normalisasi organization dan hearing ID
- simpan nama serta email sensitif melalui field encryption
- ubah token lama menjadi revoked, jangan memigrasikan plaintext token
- buat official reference untuk dokumen yang tetap berada pada sistem resmi
- hitung hash untuk evidence yang dipertahankan
- konversi timestamp ke UTC dan simpan display timezone terpisah

### Load

1. organizations
2. hearings dan assignments
3. requests dan determinations
4. proposals, resources, conflicts, dan schedules
5. notices, recipients, attempts, dan acknowledgments
6. readiness, verification, inspection, dan tests
7. virtual session metadata
8. participant dan attendance metadata
9. incidents
10. audit evidence

Load dilakukan dalam batch idempotent dengan staging table, validation query, dan reconciliation report.

## 3. Validasi

- jumlah record sumber dan target
- jumlah hearing per instansi
- satu current determination per hearing
- satu active schedule per hearing
- acknowledgment wajib tidak hilang
- participant protected identity tetap dimasking
- UTC timestamp dan deadline konsisten
- audit chain baru valid
- reconciliation terhadap sumber resmi selesai

## 4. Cutover

- hentikan write pada MVP lama
- ambil delta terakhir
- jalankan final load dan reconciliation
- simpan export sumber serta checksum
- buka CIMS baru dalam read-only verification window
- aktifkan write setelah sign-off data owner

## 5. Rollback

Sebelum write production diaktifkan, rollback berarti mengembalikan traffic ke sistem lama. Setelah write aktif, tidak boleh menggabungkan perubahan secara manual tanpa reconciliation plan. Semua perubahan selama cutover harus memiliki journal dan owner.
