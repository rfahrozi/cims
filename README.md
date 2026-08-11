# CIMS — Court Intelligence Management System

**Versi:** v1.0.0-RC1 · Release Candidate · Diperbarui: 8 Agustus 2026

Sistem Koordinasi Persidangan Pidana Elektronik Lintas Instansi Tingkat Banding (Pengadilan Tinggi, Kejaksaan Tinggi, dan Pemasyarakatan) yang mengedepankan **Compliance-First Architecture**. CIMS tidak menggantikan register resmi perkara (SIPP / e-Berpadu), melainkan bertindak sebagai **lapisan orkestrasi, notifikasi, readiness, monitoring, dan audit** untuk operasional sidang virtual tingkat banding.

Sistem ini didesain 100% mematuhi **SOP/CIMS/PPE/001/2026** dan selaras dengan SEMA No. 2 Tahun 2026.

---

## ⚖️ Prinsip Arsitektur

| Pilar                               | Deskripsi                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain-Driven Design**            | Semua aturan hukum dan gate alur kerja diisolasi di `packages/domain` — pure TypeScript, tanpa dependency framework, testable tanpa database         |
| **Hard Gates**                      | Ruang virtual **tidak bisa dibuat** sebelum Penetapan Hakim `APPROVED`, jadwal aktif, ACK pemberitahuan, dan checklist kesiapan 3 instansi terpenuhi |
| **Immutable Audit Trail**           | Setiap aksi dicatat dengan rantai HMAC (_blockchain-lite_) menggunakan `pg_advisory_xact_lock` — tidak dapat dimanipulasi                            |
| **Transactional Outbox**            | Semua pengiriman notifikasi dan provisioning ruang virtual melalui antrian database — resilien terhadap downtime sistem eksternal                    |
| **RBAC + ABAC**                     | Akses dibatasi per peran, per organisasi, dan per penugasan sidang — Panitera A tidak bisa melihat sidang B                                          |
| **Provider-Agnostic Video**         | Adapter pattern — bisa ganti Zoom ke WebEx tanpa merombak kode inti                                                                                  |
| **Field Encryption + Key Rotation** | AES-256-GCM dengan versioning kunci (V1→V2→V3) — rotasi kunci tanpa downtime, backward-compatible                                                    |

---

## ✅ Status Kesiapan Rilis v1.0.0 (5 Agustus 2026)

| Dimensi                        | Status              | Catatan                                                                              |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------ |
| Alur 7 langkah inti            | ✅ **100% Selesai** | Intake → Penetapan → Jadwal → Notifikasi → Kesiapan → Ruang Virtual → Kontrol Sidang |
| Putusan Banding (SOP 10.15)    | ✅ **Selesai**      | Same-day publication & 7-day transmission enforced by domain rules                   |
| Generate & Upload Penetapan    | ✅ **Selesai**      | SEMA No. 2/2026: HTML renderable penetapan + file upload PDF bertanda tangan         |
| Pejabat Penghubung (SOP 7 & 8) | ✅ **Selesai**      | Liaison Officer, delegasi, eskalasi                                                  |
| Mutasi Tahanan (SOP 10.14)     | ✅ **Selesai**      | Re-checklist otomatis di Rutan tujuan dan akses perpindahan tervalidasi              |
| Participant Privacy Masking    | ✅ **Selesai**      | Perlindungan identitas (Saksi Mahkota/Anak) otomatis dipisah per-instansi (SOP 10.9) |
| Notification Template          | ✅ **Selesai**      | 16 template default per jenis × channel, editable admin                              |
| Brevo Email Adapter            | ✅ **Aktif**        | Channel EMAIL via Brevo API; Sandbox HTTP Mode Ready                                 |
| Webhook Anti-Replay & HMAC     | ✅ **Aktif**        | Signature validation dan time-window verification untuk Video Provider webhooks      |
| SLA Config dari DB             | ✅ **Selesai**      | `sla_configs` table, configurable tanpa deploy                                       |
| Admin Console (`/admin`)       | ✅ **Selesai**      | Edit template & SLA inline, role SYSTEM_ADMIN                                        |
| Dashboard Per-Instansi         | ✅ **Selesai**      | Widget berbeda per Pengadilan / Kejaksaan / Rutan                                    |
| Docker Compose Production      | ✅ **Selesai**      | Split docker-compose lokal (dev) vs VPS (production port 4000-4002) + Nginx Ready    |
| API Metrics & Observability    | ✅ **Selesai**      | Prometheus metrics, latency tracking, SLA worker instrumentation                     |
| Production Gates / Security    | ✅ **Selesai**      | Environment validator terpusat, Strict OIDC Token, MFA Enforcement (ACR/AMR)         |
| DOCUMENTATION_PENDING State    | ✅ **Selesai**      | Flag dokumen tertunda pasca sidang                                                   |

---

## 📦 Struktur Monorepo

Proyek ini menggunakan **npm workspaces**.

```text
CIMS/
├── packages/
│   ├── domain/       # Aturan hukum, state machine, gates, error codes (Pure TS)
│   └── contracts/    # Zod schemas, OpenAPI definitions, tipe shared
├── apps/
│   ├── api/          # NestJS Backend, Postgres PG Pool, Event Emitter
│   └── web/          # React SPA, Vite, Tailwind, Shadcn UI
└── services/
    ├── zoom-provider/       # Microservice untuk Zoom API & Webhooks
    └── brevo-notification/  # Microservice untuk Email via Brevo API
```

## Production Secrets Management

Di lingkungan produksi, CIMS mendukung injeksi _secrets_ secara langsung melalui _Environment Variables_ (misalnya via AWS Secrets Manager atau HashiCorp Vault). Jika variabel lingkungan dengan nama _secret_ terdeteksi, CIMS akan memprioritaskannya dibanding berkas _Docker Secrets_ lokal. Ini memenuhi standar 12-factor app untuk keamanan dan skalabilitas.

## 🚀 Deployment (v1.0.0 Production)

Repositori ini siap dideploy menggunakan Docker Compose ke server VPS target (Nginx).

1. Pull repositori ini.
2. Salin template konfigurasi `.env` sesuai panduan rahasia produksi.
3. Eksekusi deployment VPS:

```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

4. Tambahkan _snippet_ routing `nginx.cims.conf.snippet` ke konfigurasi Nginx _host_.

## 🔄 Continuous Integration & Deployment (CI/CD)

CIMS mengadopsi standar DevOps modern untuk memastikan keandalan, keamanan, dan kualitas kode yang dirilis ke produksi. Pipeline ini diotomatisasi melalui **GitHub Actions**.

### 1. Security Audit & Quality (`.github/workflows/security-audit.yml`)

Berjalan secara otomatis pada setiap `push` atau `pull_request` ke `main`:

- **Dependency Audit:** Memeriksa kerentanan paket (NPM Audit) tingkat tinggi (High/Critical).
- **Secret Scan:** Menggunakan TruffleHog untuk mencegah kredensial, API Key, atau password yang bocor ke repository.
- **SAST (Static Application Security Testing):** Memanfaatkan GitHub CodeQL untuk mendeteksi celah keamanan di tingkat source code (JavaScript/TypeScript).

### 2. Production Deployment Pipeline (`.github/workflows/deployment-pipeline.yml`)

Berjalan otomatis saat _Release Tag_ (`v*.*.*`) dibuat:

- **Build & Test:** Mengeksekusi linter, strict typecheck, dan unit test.
- **Automated Deployment:** Menginjeksi _secrets_ dan mem-build image Docker untuk dikirim ke environment Production (VPS / AWS ECS).
- **Smoke Test:** Memverifikasi ketersediaan endpoint `/health/live` dan `/health/ready` sesaat setelah deployment.
- **Automated Rollback:** Jika Smoke Test gagal, pipeline akan otomatis memicu skrip pembatalan (revert) ke image Docker versi stabil sebelumnya.

### 3. End-to-End (E2E) Testing

Terdapat kerangka pengujian integrasi front-to-back menggunakan **Playwright** (`playwright.config.ts`). Tes E2E (seperti `e2e/hearing-intake.spec.ts`) dirancang untuk menyimulasikan interaksi nyata panitera/hakim di browser guna mencegah regresi pada _user flow_ lintas layanan.
