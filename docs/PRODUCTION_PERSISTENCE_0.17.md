# CIMS Production Persistence Architecture v0.17.0

## 1. Tujuan

Versi 0.17.0 memindahkan workflow inti dari penyimpanan proses ke PostgreSQL melalui repository dual-mode. Mode `MEMORY` hanya untuk demonstrasi lokal. Mode `POSTGRES` menjadi baseline SIT dan produksi.

## 2. Modul PostgreSQL native

- hearing dan assignment lintas instansi
- permohonan persidangan elektronik
- judicial determination dengan versioning
- schedule proposal, resource, conflict, dan single active schedule
- official notice, delivery attempt, acknowledgment, dan evidence
- identity verification, room inspection, readiness, dan technical test
- virtual session dan room provisioning
- hearing runtime dan immutable control event
- peserta, single-use token, participant session, attendance, dan konsultasi privat
- technical, cyber, dan force-majeure incident
- tamper-evident audit chain
- provider webhook event
- durable video-provider operation idempotency
- reconciliation run dan field-level mismatch
- transactional outbox dan dead letter

## 3. Batas transaksi

Setiap operasi yang mengubah state bisnis memakai satu koneksi PostgreSQL dan satu transaksi. `PgPoolService.transactionAs()` menetapkan konteks RLS melalui `set_config(..., true)` pada koneksi yang sama. Repository tidak boleh memulai query lanjutan melalui pool global ketika operasi sedang berjalan di dalam transaksi.

Operasi yang membutuhkan serialisasi menggunakan advisory transaction lock, row lock, unique partial index, atau kombinasi ketiganya. Contoh:

- satu judicial determination current per hearing
- satu active schedule per hearing
- approval jadwal dan perubahan runtime
- urutan audit event per object
- konsumsi single-use participant token

## 4. Optimistic concurrency

Entitas mutable memiliki `row_version`. Client mengirim `expected_row_version` ketika memperbarui proposal, notice, readiness, virtual session, atau runtime. Update yang tidak menemukan versi yang diharapkan menghasilkan `409 OPTIMISTIC_CONCURRENCY_CONFLICT`.

## 5. Row-level security

RLS memakai transaction-local settings:

- `cims.organization_ids`
- `cims.hearing_assignments`
- `cims.is_system_admin`

API tetap melakukan RBAC dan ABAC pada application layer. RLS adalah lapisan pertahanan tambahan. User database aplikasi produksi tidak boleh menjadi pemilik tabel dan tidak boleh mempunyai `BYPASSRLS`.

## 6. Transactional outbox

Perubahan state dan event integrasi ditulis dalam transaksi yang sama. Worker mengklaim event memakai `FOR UPDATE SKIP LOCKED`, sehingga beberapa worker dapat berjalan tanpa memproses baris yang sama. Event gagal memperoleh exponential backoff dan berpindah ke `DEAD_LETTER` setelah batas percobaan.

Event yang didukung:

- `OFFICIAL_NOTICE_DELIVERY_REQUESTED`
- `VIRTUAL_SESSION_PROVISION_REQUESTED`
- `OFFICIAL_RECONCILIATION_REQUESTED`

API pod menjalankan `OUTBOX_WORKER_ENABLED=false`. Worker pod terpisah menjalankan `OUTBOX_WORKER_ENABLED=true`.

## 7. Audit dan evidence

Audit event disimpan append-only dengan:

- object type dan object ID
- sequence
- actor dan organisasi
- correlation ID
- payload
- previous hash
- event hash HMAC-SHA-256
- occurred time

Database trigger menolak update dan delete. Endpoint audit memverifikasi hash chain sebelum evidence diekspor.

## 8. Integrasi eksternal

### Notification gateway

Gateway menerima pemberitahuan dari outbox worker. Evidence yang disimpan hanya berisi referensi provider, receipt hash, status HTTP, dan tujuan yang dimasking.

### Video provider

Provisioning dilakukan asinkron. CIMS menyimpan provider session reference dan room reference. Secret host, passcode, dan participant URL tidak boleh masuk audit payload.

### Official case system

Reconciliation worker mengambil snapshot sumber resmi dan membandingkan field dengan snapshot CIMS. Hasil diklasifikasikan menjadi `MATCHED`, `MISMATCH`, `MISSING_IN_CIMS`, atau `MISSING_IN_SOURCE`.

## 9. Secret loading

Service menerima nilai langsung atau file-mounted secret melalui pola `<NAME>_FILE`. Secret berikut harus berasal dari secret manager:

- `DATABASE_URL`
- `TOKEN_PEPPER`
- `FIELD_ENCRYPTION_KEY`
- `AUDIT_HASH_KEY`
- `WEBHOOK_SHARED_SECRET`
- gateway API keys

## 10. Kriteria produksi

Status source code v0.17.0 tidak otomatis berarti production ready. Production memerlukan migrasi teruji pada PostgreSQL target, application role non-owner, PITR, KMS, OIDC SIT, gateway resmi, Zoom sandbox, external penetration test, load test, DR rehearsal, dan UAT operasional lintas instansi.


## 11. Batas layanan Zoom

Layanan Zoom berbasis TypeScript menerapkan payload sesi dan ruangan provider-neutral yang sama dengan worker CIMS. Pembuatan sesi mewajibkan idempotency key. Ketika PostgreSQL tersedia, layanan menyimpan hash permintaan dan referensi provider yang berhasil ke dalam `video_provider_operations`. Layanan tidak mengembalikan host start URL, token OAuth, passcode, atau participant join URL melalui respons provisioning biasa.

Ruang `MAIN` dan `WAITING` direpresentasikan sebagai kemampuan native meeting. Ruang `DEFENDANT`, `WITNESS`, dan `CONSULTATION` merupakan referensi kontrol logis sampai mekanisme kontrol ruang langsung yang didukung dan disetujui tersedia. Adapter menyatakan tindakan langsung yang tidak didukung sebagai kemampuan manual, bukan mencatatnya sebagai keberhasilan otomatis.

## 12. Risiko sisa operasi terdistribusi

Operation ledger mencegah duplikasi akibat permintaan bersamaan dan pengulangan normal. Kegagalan proses setelah Zoom menerima pembuatan meeting tetapi sebelum database mencatat keberhasilan masih dapat menimbulkan hasil yang tidak pasti. Prosedur produksi wajib merekonsiliasi operasi yang tidak pasti sebelum melakukan pengulangan dengan menggunakan hearing reference, operation key, dan inventaris meeting provider. Risiko sisa ini wajib diuji pada SIT sandbox.

## 13. Pemisahan peran database

Template `database/admin/roles-and-grants.template.sql` memisahkan hak schema owner, migration, API, worker, Zoom provider, dan auditor. Runtime role tidak boleh menjadi pemilik tabel atau memiliki `BYPASSRLS`. Pemberian hak harus diverifikasi melalui negative access test sebelum traffic aplikasi diaktifkan.
