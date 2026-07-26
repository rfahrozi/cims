# CIMS Technical Design & Enhanced README

## Bagian A — Perancangan Teknis Aplikasi CIMS v1.0

### 1. Ringkasan Teknis

CIMS (Court Intelligence Management System) adalah aplikasi orkestrasi lintas instansi untuk koordinasi persidangan pidana elektronik. Sistem ini **bukan** register resmi perkara, melainkan lapisan koordinasi, notifikasi, readiness, monitoring, evidence, dan audit. Basis teknisnya mengikuti prinsip yang sudah dinyatakan pada README sumber: **Compliance-First Architecture**, **Domain-Driven Design**, **Hard Gates**, **Immutable Audit Trail**, **Transactional Outbox**, **RBAC/ABAC**, dan **Provider-Agnostic Video**.

Pada versi 1.0, tujuan teknisnya adalah memastikan alur inti berikut berjalan end-to-end dengan bukti yang dapat diaudit: referensi perkara → referensi penetapan → penjadwalan → notifikasi & acknowledgment → readiness & technical test → ruang sidang virtual → kontrol sidang → dokumentasi, incident, dan pelaporan.

### 2. Arsitektur Sistem

#### 2.1 Pola Arsitektur

Pola arsitektur yang direkomendasikan adalah **modular monolith dengan pendekatan hexagonal architecture**, disiapkan untuk evolusi ke service decomposition bila dibutuhkan.

Alasan pemilihan:

- kebutuhan domain dan audit sangat ketat, sehingga konsistensi transaksi lebih penting daripada pemecahan microservices terlalu dini,
- README sumber sudah menunjukkan monorepo dengan `apps/api`, `apps/web`, `services/zoom-provider`, dan `packages/domain`, yang cocok dengan modular monolith + isolated provider service,
- modular monolith memudahkan implementasi hard gate, state machine, audit chain, dan transactional outbox tanpa distributed consistency yang kompleks,
- integrasi eksternal seperti Zoom provider dapat dipisahkan sebagai service adapter sejak awal.

#### 2.2 Gaya Arsitektur yang Digunakan

- **Backend core**: Modular Monolith
- **Application boundary**: Hexagonal / Ports and Adapters
- **Integration style**: Event-driven internal + REST API external
- **Video provider**: Adapter service terpisah
- **Audit and notification reliability**: Transactional outbox + worker

#### 2.3 Komponen Utama Sistem

1. **Web Client** — antarmuka React untuk hakim, panitera, jaksa, petugas pemasyarakatan, advokat, admin, dan pejabat penghubung.
2. **API Application** — NestJS + Fastify sebagai entry point REST API, auth integration, orchestration, validation, workflow, dan policy enforcement.
3. **Domain Layer** — aturan bisnis inti seperti hard gate, conflict detection, readiness rule, state transition, SLA rule, dan audit integrity rule.
4. **Workflow & State Engine** — mengelola status proses perkara/sidang.
5. **Notification Service** — pengiriman notifikasi resmi, reminder, acknowledgment tracking, escalation, dan retry.
6. **Zoom Provider Service** — adapter untuk create/update/query meeting provider.
7. **Worker / Async Processor** — mengeksekusi outbox, scheduled jobs, SLA reminders, sync jobs, dan reporting jobs.
8. **PostgreSQL** — penyimpanan utama transaksi, workflow, audit metadata, document reference, configuration, dan KPI source.
9. **Redis** — caching, distributed lock, rate limiting, ephemeral session support, dan job coordination.
10. **Identity Provider** — OIDC/Keycloak untuk SSO, role mapping, dan federation.
11. **Observability Stack** — logging, metrics, tracing, dan security event monitoring.

#### 2.4 Diagram Arsitektur Tingkat Tinggi

flowchart TD
U1[Hakim]
U2[Panitera]
U3[Jaksa]
U4[Petugas Pemasyarakatan]
U5[Advokat]
U6[Admin]

U1 --> WEB[React Web App]
U2 --> WEB
U3 --> WEB
U4 --> WEB
U5 --> WEB
U6 --> WEB

WEB --> API[NestJS API Gateway / App]
API --> AUTH[Keycloak OIDC]
API --> DOMAIN[Domain & Policy Engine]
API --> WF[Workflow / State Engine]
API --> OUTBOX[Transactional Outbox]
API --> DB[(PostgreSQL 17)]
API --> REDIS[(Redis)]

OUTBOX --> WORKER[Async Worker]
WORKER --> NOTIF[Notification Adapter]
WORKER --> ZOOM[Zoom Provider Adapter]
WORKER --> REPORT[Reporting Jobs]

ZOOM --> ZAPI[Zoom API]
NOTIF --> CHAN[Email / WA / Official Gateway]

API --> OBS[Logs / Metrics / Traces]
WORKER --> OBS

#### 2.5 C4 Container View Sederhana

flowchart LR
subgraph Client
A[Web Browser]
end

subgraph Platform CIMS
B[Web App - React/Vite]
C[API App - NestJS/Fastify]
D[Worker]
E[Zoom Provider Service]
F[(PostgreSQL)]
G[(Redis)]
H[Object Storage / Document Ref Metadata]
end

subgraph External Systems
I[Keycloak / OIDC]
J[Zoom API]
K[Official Notification Gateway]
L[Official Court Systems]
end

A --> B
B --> C
C --> I
C --> F
C --> G
C --> H
C --> L
C --> D
D --> F
D --> G
D --> E
D --> K
E --> J

### 3. Pilihan Technology Stack

#### 3.1 Bahasa Pemrograman

- **Backend**: TypeScript
- **Frontend**: TypeScript
- **Infra scripting**: Bash + YAML + optional Node scripts

Alasan: README sumber sudah menetapkan Node.js v22, NestJS, Fastify, TypeScript, React, Vite. TypeScript memberi konsistensi domain model lintas backend dan frontend.

#### 3.2 Backend Framework

- **Node.js v22**
- **NestJS**
- **Fastify** sebagai HTTP adapter

Alasan:

- cocok untuk modular monolith,
- dependency injection dan module boundaries kuat,
- mudah mengimplementasikan guard, interceptor, policy enforcement, dan OpenAPI,
- Fastify memberi performa lebih baik daripada Express pada throughput tinggi.

#### 3.3 Frontend Framework

- **React**
- **Vite**
- **Tailwind CSS v4**
- **Radix UI**
- **shadcn/ui**
- State management: **TanStack Query + Zustand**

Alasan:

- sejalan dengan README sumber,
- cocok untuk dashboard per role,
- ergonomis untuk status-heavy workflow UI,
- TanStack Query efektif untuk data fetching dan cache server state.

#### 3.4 Database

- **PostgreSQL 17** sebagai database utama
- **Row-Level Security (RLS)** untuk pembatasan akses data per organisasi/perkara

Alasan:

- transaksi kuat,
- cocok untuk workflow, audit, dan relational consistency,
- mendukung JSONB bila ada metadata semi-terstruktur,
- RLS sesuai kebutuhan pembatasan hak akses per organisasi/perkara.

#### 3.5 Caching

- **Redis**

Penggunaan utama:

- cache lookup konfigurasi,
- cache daftar schedule/dashboard yang sering diakses,
- distributed locking untuk job scheduler,
- rate limiting,
- ephemeral token/session helper,
- idempotency key sementara.

#### 3.6 Message Queue / Broker

Pilihan yang direkomendasikan untuk v1.0:

- **Redis-backed queue** dengan **BullMQ** untuk MVP/v1.0 awal
- opsi scale-up berikutnya: **RabbitMQ** bila kebutuhan reliabilitas workflow asynchronous meningkat

Alasan:

- lebih sederhana untuk fase v1.0,
- cukup untuk outbox processor, reminders, retry notification, report generation, sync jobs,
- dapat dinaikkan ke broker terpisah bila beban dan kebutuhan isolation meningkat.

#### 3.7 Containerization & Orchestration

- **Docker** untuk local preproduction, test, staging, production packaging
- **Kubernetes** untuk staging/production

Alasan: README sumber sudah menunjukkan penggunaan Docker compose preproduction. Untuk v1.0 operasional, Kubernetes lebih cocok untuk rolling deployment, autoscaling, secrets, observability, dan workload separation.

#### 3.8 CI/CD Tools

- **GitHub Actions** atau **GitLab CI**

Rekomendasi praktis:

- jika repo berada di GitHub: GitHub Actions
- pipeline minimal: lint → typecheck → unit test → integration test → build → image scan → deploy staging → UAT gate → deploy production

#### 3.9 Cloud Provider

Rekomendasi netral:

- **AWS**, **GCP**, atau **Azure** dapat digunakan
- untuk konteks enterprise/public sector, desain sebaiknya **cloud-agnostic**

Rekomendasi implementasi:

- compute: Kubernetes managed service
- database: managed PostgreSQL bila regulasi memungkinkan
- object storage: untuk metadata-linked document/recording references
- key management: KMS/HSM/Vault

### 4. Desain Modul Backend

Modul backend disusun mengikuti PRD dan README:

- `case-reference`
- `judicial-determination`
- `scheduling`
- `virtual-courtroom`
- `notification-ack`
- `readiness`
- `identity-verification`
- `hearing-control`
- `incident-continuity`
- `appeal-verdict`
- `document-evidence`
- `monitoring-reporting`
- `security-access`
- `admin-configuration`

Struktur monorepo yang direkomendasikan:

.
├── apps/
│ ├── api/
│ └── web/
├── services/
│ └── zoom-provider/
├── packages/
│ ├── domain/
│ ├── shared-types/
│ ├── ui/
│ └── config/
├── infra/
│ ├── docker/
│ ├── k8s/
│ ├── terraform/
│ └── secrets/
├── docs/
├── scripts/
└── tests/

### 5. Skema Database dan ERD

#### 5.1 Strategi Skema

Skema database utama bersifat relasional dengan tabel inti berikut:

- `organizations`
- `users`
- `roles`
- `user_role_assignments`
- `cases`
- `case_participants`
- `judicial_determinations`
- `hearing_schedules`
- `hearing_sessions`
- `notifications`
- `acknowledgments`
- `readiness_checklists`
- `readiness_items`
- `participant_verifications`
- `hearing_events`
- `incidents`
- `appeal_verdict_flows`
- `document_references`
- `audit_logs`
- `outbox_events`
- `sla_configs`

#### 5.2 ERD Tingkat Tinggi

erDiagram
ORGANIZATIONS ||--o{ USERS : has
ROLES ||--o{ USER_ROLE_ASSIGNMENTS : grants
USERS ||--o{ USER_ROLE_ASSIGNMENTS : receives
ORGANIZATIONS ||--o{ CASES : owns
CASES ||--o{ CASE_PARTICIPANTS : has
CASES ||--o{ JUDICIAL_DETERMINATIONS : references
CASES ||--o{ HEARING_SCHEDULES : schedules
HEARING_SCHEDULES ||--o{ HEARING_SESSIONS : creates
HEARING_SCHEDULES ||--o{ NOTIFICATIONS : triggers
NOTIFICATIONS ||--o{ ACKNOWLEDGMENTS : expects
HEARING_SCHEDULES ||--|| READINESS_CHECKLISTS : requires
READINESS_CHECKLISTS ||--o{ READINESS_ITEMS : contains
HEARING_SCHEDULES ||--o{ PARTICIPANT_VERIFICATIONS : verifies
HEARING_SCHEDULES ||--o{ HEARING_EVENTS : logs
HEARING_SCHEDULES ||--o{ INCIDENTS : affects
CASES ||--o{ APPEAL_VERDICT_FLOWS : tracks
CASES ||--o{ DOCUMENT_REFERENCES : links
USERS ||--o{ AUDIT_LOGS : generates

#### 5.3 Catatan Skema Penting

- `cases` hanya menyimpan referensi operasional, bukan register resmi penuh.
- `judicial_determinations` menyimpan metadata referensi penetapan, hash, status sah.
- `hearing_schedules` menyimpan agenda, slot waktu, status, alasan perubahan.
- `hearing_sessions` menyimpan metadata Zoom/provider meeting.
- `notifications` dan `acknowledgments` dipisah agar SLA acknowledgment mudah dipantau.
- `audit_logs` bersifat append-only.
- `outbox_events` menjadi dasar worker asynchronous.

### 6. Desain API

#### 6.1 Gaya API

- **RESTful API** dengan JSON
- OpenAPI/Swagger sebagai sumber dokumentasi kontrak

Alasan:

- lebih mudah untuk role-based enterprise app,
- lebih jelas untuk audit dan integrasi terkontrol,
- cocok dengan NestJS Swagger,
- lebih sederhana untuk operasi lintas instansi dibanding GraphQL di fase awal.

#### 6.2 Autentikasi dan Otorisasi

- **OIDC / OAuth 2.0** melalui Keycloak
- access token: **JWT**
- backend melakukan:
  - JWT validation
  - role mapping
  - organization mapping
  - policy enforcement berbasis RBAC/ABAC

#### 6.3 Versi API

- Prefix: `/api/v1`
- Swagger UI: `/docs`

#### 6.4 Endpoint Utama

| Domain        | Endpoint                                 | Method    | Fungsi                              |
| ------------- | ---------------------------------------- | --------- | ----------------------------------- |
| Auth          | `/api/v1/me`                             | GET       | profil user dan role aktif          |
| Cases         | `/api/v1/cases`                          | GET/POST  | daftar dan create referensi perkara |
| Cases         | `/api/v1/cases/{id}`                     | GET/PATCH | detail dan update terbatas          |
| Determination | `/api/v1/cases/{id}/determinations`      | POST      | catat referensi penetapan           |
| Scheduling    | `/api/v1/hearings/schedules`             | POST      | buat jadwal                         |
| Scheduling    | `/api/v1/hearings/schedules/{id}`        | PATCH     | ubah jadwal                         |
| Scheduling    | `/api/v1/hearings/schedules/{id}/cancel` | POST      | batalkan jadwal                     |
| Notifications | `/api/v1/notifications/{id}/ack`         | POST      | acknowledgment                      |
| Readiness     | `/api/v1/hearings/{id}/readiness`        | GET/PUT   | checklist readiness                 |
| Verification  | `/api/v1/hearings/{id}/verifications`    | POST      | verifikasi peserta/ruang            |
| Sessions      | `/api/v1/hearings/{id}/session/create`   | POST      | buat meeting provider               |
| Sessions      | `/api/v1/hearings/{id}/session`          | GET       | detail meeting                      |
| Hearing       | `/api/v1/hearings/{id}/status`           | POST      | update status sidang                |
| Incident      | `/api/v1/incidents`                      | POST      | catat insiden                       |
| Reports       | `/api/v1/reports/kpi`                    | GET       | KPI dashboard                       |
| Admin         | `/api/v1/admin/config`                   | GET/PUT   | konfigurasi                         |

#### 6.5 Contoh Request / Response

POST /api/v1/hearings/schedules
{
"caseId": "case_123",
"agenda": "Pemeriksaan saksi",
"date": "2026-08-03",
"startTime": "09:00",
"durationMinutes": 90,
"judgeIds": ["usr_judge_1"],
"clerkId": "usr_clerk_1",
"virtualRoomType": "zoom"
}

201 Created
{
"id": "sched_001",
"caseId": "case_123",
"status": "CONFIRMED",
"conflictStatus": "NONE",
"auditRef": "aud_98312"
}

#### 6.6 Kode Status HTTP Umum

- `200 OK`
- `201 Created`
- `202 Accepted`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`
- `500 Internal Server Error`

### 7. Manajemen Data

#### 7.1 Strategi Persistensi

- PostgreSQL untuk seluruh data transaksi utama
- Redis untuk cache/queue/lock
- object storage atau external document system untuk file besar bila diperlukan
- CIMS menyimpan **document reference metadata**, bukan selalu binary utama

#### 7.2 Migrasi Skema

- gunakan migration tool berbasis Node/SQL terstruktur
- setiap perubahan skema harus versioned
- migration dieksekusi otomatis di environment staging/pre-prod/prod lewat pipeline
- backward-compatible migrations diprioritaskan

#### 7.3 Backup dan Restore

- full backup harian PostgreSQL
- incremental/WAL backup berkala
- restore drill terjadwal di staging
- retention backup sesuai kebijakan instansi

#### 7.4 Pertimbangan Keamanan Data

- enkripsi TLS in transit
- enkripsi at rest untuk disk/database bila tersedia
- secret management via KMS/Vault/HSM
- PII minimization
- audit access ke data sensitif
- RLS untuk pembatasan akses per organisasi/perkara

### 8. Keamanan Sistem

#### 8.1 Mekanisme Autentikasi

- OIDC login via Keycloak
- fallback dev header auth hanya untuk non-production sesuai README sumber
- MFA wajib untuk admin dan role sensitif

#### 8.2 Mekanisme Otorisasi

- RBAC untuk hak dasar modul
- ABAC untuk pembatasan per organisasi, per perkara, per jenis sidang, per fungsi
- policy guards di backend
- UI tidak boleh menjadi satu-satunya enforcement layer

#### 8.3 Perlindungan terhadap Ancaman Umum

Mitigasi minimal:

- SQL Injection: ORM/query parameterization + no raw query tanpa sanitasi
- XSS: output escaping + CSP + sanitasi input rich text
- CSRF: gunakan token/strict same-site bila session-based; untuk JWT SPA tetap jaga cookie policy jika dipakai
- Broken Access Control: server-side authorization checks pada setiap endpoint
- SSRF: pembatasan outbound connector
- Rate limiting: Redis-based throttling
- File upload validation: whitelist MIME/size, malware scanning bila ada upload file
- Secure headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options

#### 8.4 Secret dan Key Management

- local preproduction: generated local secrets sesuai README
- production: **Vault / KMS / HSM**
- secret rotation policy
- no secret di source control
- separate credentials per environment

#### 8.5 Audit Log dan Monitoring Keamanan

- login sukses/gagal
- MFA events
- access denied
- role changes
- config changes
- incident events
- suspicious retries dan provider failures

### 9. Observability

#### 9.1 Logging

Strategi logging:

- format: JSON structured logging
- correlation ID pada setiap request
- log level: `debug`, `info`, `warn`, `error`, `fatal`
- pemisahan application logs, audit logs, security logs

Tools yang direkomendasikan:

- **Grafana Loki** atau **ELK/OpenSearch**

#### 9.2 Monitoring

Metrik utama:

- CPU, memory, disk, network
- API latency p50/p95/p99
- error rate per endpoint
- throughput request
- queue lag/outbox lag
- notification success rate
- ACK overdue rate
- readiness completion rate
- meeting creation failure rate
- incident open count

Tools:

- **Prometheus + Grafana**
- alternatif managed: Datadog/New Relic

#### 9.3 Tracing

- **OpenTelemetry** instrumentation
- trace HTTP request → domain action → database → outbox → worker → provider
- exporter ke **Jaeger** atau **Tempo**

### 10. Deployment Strategy

#### 10.1 Lingkungan Deployment

- **Development**
- **Test / SIT**
- **Staging / UAT**
- **Production**

#### 10.2 Metode Deployment

Rekomendasi:

- **Blue/Green** untuk production jika infrastruktur memungkinkan
- alternatif: **Rolling deployment** dengan canary kecil untuk worker/provider service

#### 10.3 Load Balancing dan Auto-scaling

- ingress/load balancer di depan web dan API
- HPA untuk API dan worker berdasarkan CPU + custom metrics seperti queue length
- PostgreSQL scaling read replica bila perlu

### 11. Penanganan Kesalahan

#### 11.1 Backend

- gunakan global exception filter di NestJS
- response error standar:
  - code
  - message
  - correlationId
  - validation details bila aman ditampilkan
- retry policy hanya untuk operasi idempotent/asynchronous yang aman

Contoh format error:

{
"code": "READINESS_ITEM_MISSING",
"message": "Sidang belum dapat ditandai READY karena checklist wajib belum lengkap.",
"correlationId": "req_abc123"
}

#### 11.2 Frontend

- tampilkan error message yang dapat ditindaklanjuti
- bedakan validation error, permission error, dan system error
- fallback UI untuk empty/loading/error states

#### 11.3 Pelaporan dan Notifikasi Kesalahan

- Sentry untuk FE/BE error tracking direkomendasikan
- alerting ke channel operasional untuk error rate tinggi, queue stuck, integrasi Zoom gagal massal

### 12. Performansi dan Skalabilitas

#### 12.1 Strategi Optimasi

- indexing pada query perkara, jadwal, notifications, ack status, status sidang
- cache dashboard dan lookup konfigurasi
- pagination pada daftar besar
- materialized view atau reporting table bila laporan berat
- async processing untuk notifikasi, reporting, dan provider sync

#### 12.2 Strategi Skalabilitas

- horizontal scaling API dan worker
- isolate worker pool untuk notification dan provider jobs
- partition audit log atau reporting data bila volume meningkat
- modular decomposition ke service terpisah bila load domain tertentu melonjak

### 13. Strategi Pengujian

#### 13.1 Unit Test

- framework: **Jest**
- fokus: domain rules, hard gates, conflict detection, SLA rules, audit chain logic

#### 13.2 Integration Test

- API + PostgreSQL + Redis + mock provider
- test transaksi lintas modul

#### 13.3 End-to-End Test

- **Playwright** untuk frontend end-to-end
- skenario per role: panitera, hakim, jaksa, petugas pemasyarakatan, admin

#### 13.4 Performance Test

- **k6** atau **Locust**
- target: schedule creation burst, notification spike, dashboard reads, meeting creation concurrency

#### 13.5 Security Test

- SAST: CodeQL / Semgrep
- dependency scanning: npm audit/Snyk/Dependabot
- DAST ringan untuk staging
- config scan untuk container dan IaC

#### 13.6 Test Gate yang Direkomendasikan

- `npm run test:domain`
- `npm run typecheck`
- integration tests
- e2e smoke tests
- `npm run check:phase6` sesuai README sumber

### 14. Rekomendasi README Produksi vs README Saat Ini

README sumber sudah kuat pada arah arsitektur dan local preproduction, tetapi untuk kebutuhan engineering dan onboarding v1.0 perlu ditambah:

- arsitektur sistem yang lebih eksplisit
- ERD tingkat tinggi
- strategi API dan auth
- environment matrix
- deployment approach
- testing matrix
- observability stack
- security controls produksi

---

## Bagian B — README.md yang Ditingkatkan

# CIMS (Court Intelligence Management System)

## Deskripsi Singkat

CIMS adalah sistem koordinasi persidangan pidana elektronik lintas instansi yang berfungsi sebagai lapisan orkestrasi, notifikasi, readiness, monitoring, dan audit untuk operasional sidang virtual. CIMS tidak menggantikan register resmi perkara seperti SIPP atau e-Berpadu, melainkan memastikan bahwa alur persidangan elektronik dapat dijalankan secara tertib, aman, akuntabel, dan terdokumentasi.

Versi ini menargetkan implementasi **v1.0** dengan pendekatan **Compliance-First Architecture** yang menerapkan hard gates, immutable audit trail, acknowledgment tracking, dan provider-agnostic video integration dengan Zoom sebagai provider default pada fase awal.

## Masalah yang Diselesaikan

CIMS membantu mengatasi masalah umum dalam persidangan elektronik, seperti:

- konflik jadwal lintas pihak,
- keterlambatan pemberitahuan dan acknowledgment,
- ketidaksiapan teknis sebelum sidang,
- lemahnya keterlacakan bukti operasional,
- kurangnya dashboard monitoring dan evaluasi,
- sulitnya memantau kewajiban administratif pasca-sidang.

## Fitur Utama

- **Alur 7 langkah sidang elektronik**: perkara → penetapan → jadwal → pemberitahuan → readiness → ruang virtual → kontrol sidang
- **Dashboard per peran** untuk hakim, panitera, jaksa, petugas pemasyarakatan, advokat, dan admin
- **Hard gate compliance** untuk mencegah sidang berjalan sebelum syarat minimum terpenuhi
- **Notification & acknowledgment tracking** dengan reminder dan escalation
- **Readiness checklist** untuk tiga instansi dan technical test
- **Integrasi Zoom API** melalui backend adapter yang aman
- **Immutable audit trail** dengan rantai HMAC
- **Modul putusan banding** untuk area yang masuk ruang lingkup implementasi
- **Incident & continuity management** untuk gangguan teknis, insiden siber, dan keadaan kahar
- **Reporting & KPI dashboard** untuk monitoring operasional dan evaluasi

## Status Proyek

![Status](https://img.shields.io/badge/Status-Preproduction%20Baseline-blue)
![Versi](https://img.shields.io/badge/Versi-v1.0%20Target-green)
![Arsitektur](https://img.shields.io/badge/Architecture-Compliance%20First-purple)

## Teknologi yang Digunakan

- **Backend**: Node.js v22, NestJS, Fastify, TypeScript
- **Frontend**: React, Vite, Tailwind CSS v4, Radix UI, shadcn/ui
- **Database**: PostgreSQL 17 dengan Row-Level Security
- **Caching / Queue**: Redis, BullMQ
- **Identity**: OIDC / Keycloak
- **Video Provider**: Zoom API melalui adapter service
- **Infra**: Docker, Kubernetes
- **CI/CD**: GitHub Actions atau GitLab CI
- **Monitoring & Logging**: Prometheus, Grafana, Loki/ELK, OpenTelemetry

## Arsitektur

CIMS menggunakan **modular monolith dengan pendekatan hexagonal architecture**, disiapkan untuk evolusi bertahap ke service decomposition bila diperlukan. Domain logic dan aturan hukum dipisahkan dari framework dan provider integration.
mermaid
graph TD
A[Users / Web Browser] --> B[React Web App]
B --> C[NestJS API]
C --> D[Domain & Workflow Engine]
C --> E[(PostgreSQL 17)]
C --> F[(Redis)]
C --> G[OIDC / Keycloak]
C --> H[Transactional Outbox]
H --> I[Async Worker]
I --> J[Zoom Provider Adapter]
I --> K[Notification Gateway]
J --> L[Zoom API]

### Prinsip Arsitektur

- **Domain-Driven Design**
- **Compliance & Hard Gates**
- **Immutable Audit Trail**
- **Transactional Outbox**
- **RBAC & ABAC**
- **Provider-Agnostic Video**

## Struktur Direktori

text
.
├── apps/
│ ├── api/ # Backend API (NestJS + Fastify)
│ └── web/ # Frontend React + Vite
├── services/
│ └── zoom-provider/ # Adapter/provider meeting service
├── packages/
│ ├── domain/ # Domain rules, hard gates, policy
│ ├── shared-types/ # Tipe data bersama
│ ├── ui/ # Shared UI components
│ └── config/ # Shared config
├── infra/
│ ├── docker/ # Docker assets
│ ├── k8s/ # Kubernetes manifests / Helm
│ ├── secrets/ # Local preproduction generated secrets
│ └── terraform/ # Infra as code (opsional)
├── docs/ # Dokumentasi tambahan
├── scripts/ # Script utilitas
├── tests/ # Unit, integration, e2e, performance tests
├── .env.example
├── docker-compose.yml
└── README.md

## Instalasi & Konfigurasi

### Prasyarat

- Node.js v22
- npm
- Docker & Docker Compose
- PostgreSQL 17 (jika tidak memakai Docker full stack)
- Redis

### Menjalankan Local Preproduction

1. **Inisialisasi secrets lokal**
   bash
   bash scripts/setup-preproduction.sh

2. **Install dependency dan build**
   bash
   npm ci
   npm run build

3. **Jalankan semua container**
   bash
   docker compose -f infra/docker-compose.preproduction.yml up --build -d

4. **Migrasi schema dan seed data**
   bash
   docker compose -f infra/docker-compose.preproduction.yml exec api node tools/migrate-postgres.mjs

5. **Akses aplikasi**

- Web UI: `http://localhost:8080`
- API Docs / Swagger: `http://localhost:3000/docs`

## Environment

- **Development**: untuk coding harian
- **Test / SIT**: untuk integrasi modul
- **Staging / UAT**: untuk validasi lintas peran dan readiness
- **Production**: untuk operasional resmi

## Penggunaan API

API menggunakan gaya **RESTful** dengan prefix `/api/v1` dan format JSON. Dokumentasi interaktif tersedia di `/docs`.

### Endpoint Utama

- `GET /api/v1/me`
- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `POST /api/v1/cases/{id}/determinations`
- `POST /api/v1/hearings/schedules`
- `PATCH /api/v1/hearings/schedules/{id}`
- `POST /api/v1/notifications/{id}/ack`
- `GET /api/v1/hearings/{id}/readiness`
- `PUT /api/v1/hearings/{id}/readiness`
- `POST /api/v1/hearings/{id}/session/create`
- `POST /api/v1/hearings/{id}/status`
- `POST /api/v1/incidents`
- `GET /api/v1/reports/kpi`

### Contoh Request

json
POST /api/v1/hearings/schedules
{
"caseId": "case_123",
"agenda": "Pemeriksaan saksi",
"date": "2026-08-03",
"startTime": "09:00",
"durationMinutes": 90
}

## Keamanan

- OIDC / Keycloak untuk autentikasi
- JWT untuk akses API
- RBAC dan ABAC untuk pembatasan per modul, organisasi, dan perkara
- MFA untuk role sensitif
- Enkripsi data in transit dan praktik enkripsi at rest
- Immutable audit trail
- Secret management via Vault/KMS/HSM untuk production
- Row-Level Security di PostgreSQL

## Observability

- **Logging**: structured JSON logs
- **Monitoring**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Audit logs**: event penting bisnis dan keamanan

## Pengujian

### Test Suite Utama

bash
npm run test:domain
npm run typecheck
npm run test
npm run check:phase6

### Jenis Pengujian

- Unit tests
- Integration tests
- End-to-end tests
- Performance tests
- Security checks

## Transisi Menuju Production

Production **tidak boleh** diaktifkan sebelum syarat berikut terpenuhi:

- OIDC issuer dan role mapping sudah dikonfigurasi pada external identity provider
- Secret keys berpindah dari local file ke KMS/HSM/Vault
- Koneksi ke notification gateway resmi tersedia
- SSL/TLS diwajibkan untuk koneksi data sensitif
- UAT lintas instansi telah selesai dan diotorisasi
- Go-live checklist dan readiness review telah disetujui

## Deployment

Strategi deployment yang direkomendasikan:

- Staging deployment otomatis dari branch release
- Production deployment menggunakan blue/green atau rolling deployment terkontrol
- Monitoring, alerting, rollback plan, dan hypercare wajib aktif pada release v1.0

## Kontribusi

Kontribusi internal harus mengikuti workflow branch, code review, test gate, dan persetujuan domain owner untuk perubahan rule bisnis yang memengaruhi kepatuhan.

## Lisensi dan Kontak

Lisensi, kepemilikan kode, dan mekanisme pelaporan keamanan mengikuti kebijakan organisasi pengelola CIMS.

### 15. Ringkasan Rekomendasi Teknis Final

Rekomendasi teknis final untuk CIMS v1.0 adalah:

- arsitektur **modular monolith + hexagonal**,
- backend **Node.js + NestJS + Fastify + TypeScript**,
- frontend **React + Vite + Tailwind + Radix/shadcn**,
- database **PostgreSQL 17 + RLS**,
- cache/queue **Redis + BullMQ**,
- auth **OIDC/Keycloak**,
- observability **Prometheus + Grafana + Loki/ELK + OpenTelemetry**,
- deployment **Docker + Kubernetes**,
- CI/CD **GitHub Actions/GitLab CI**,
- integrasi Zoom melalui **backend adapter aman**,
- auditability, hard gate, dan security control dijadikan bagian inti desain, bukan tambahan belakangan.
