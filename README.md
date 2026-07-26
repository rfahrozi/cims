# CIMS — Court Intelligence Management System

**Versi:** v0.20.0 · Preproduction · Diperbarui: 26 Juli 2026

Sistem Koordinasi Persidangan Pidana Elektronik Lintas Instansi (Pengadilan, Kejaksaan, dan Pemasyarakatan) yang mengedepankan **Compliance-First Architecture**. CIMS tidak menggantikan register resmi perkara (SIPP / e-Berpadu), melainkan bertindak sebagai **lapisan orkestrasi, notifikasi, readiness, monitoring, dan audit** untuk operasional sidang virtual.

Sistem ini didesain 100% mematuhi **SOP/CIMS/PPE/001/2026**.

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

## ✅ Status Kesiapan (26 Juli 2026)

| Dimensi                        | Status              | Catatan                                                                              |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------ |
| Alur 7 langkah inti            | ✅ **100% Selesai** | Intake → Penetapan → Jadwal → Notifikasi → Kesiapan → Ruang Virtual → Kontrol Sidang |
| Docker Preproduction           | ✅ **Siap**         | `docker compose up` berjalan end-to-end                                              |
| Putusan Banding (SOP 10.15)    | ✅ **Selesai**      | Deadline 1 Agustus 2026 terpenuhi                                                    |
| Pejabat Penghubung (SOP 7 & 8) | ✅ **Selesai**      | Liaison Officer, delegasi, eskalasi                                                  |
| Mutasi Tahanan (SOP 10.14)     | ✅ **Selesai**      | Re-checklist otomatis di Rutan tujuan                                                |
| Notification Template          | ✅ **Selesai**      | 16 template default per jenis × channel, editable admin                              |
| Brevo Email Adapter            | ✅ **Aktif**        | Channel EMAIL via Brevo API; WhatsApp/SMS stub siap                                  |
| SLA Config dari DB             | ✅ **Selesai**      | `sla_configs` table, configurable tanpa deploy                                       |
| Admin Console (`/admin`)       | ✅ **Selesai**      | Edit template & SLA inline, role SYSTEM_ADMIN                                        |
| Dashboard Per-Instansi         | ✅ **Selesai**      | Widget berbeda per Pengadilan / Kejaksaan / Rutan                                    |
| DOCUMENTATION_PENDING State    | ✅ **Selesai**      | Flag dokumen tertunda pasca sidang                                                   |
| Key Rotation Enkripsi          | ✅ **Selesai**      | Multi-key versioning V1/V2/V3                                                        |
| DLP Per-Endpoint               | ✅ **Selesai**      | `SensitiveRateGuard`, /metrics token, CSP aktif                                      |
| MFA Production                 | ⚠️ **Belum**        | Membutuhkan Keycloak production — Sprint 11                                          |
| OIDC Production                | ⚠️ **Belum**        | `AUTH_MODE=DEV` untuk preproduction lokal                                            |
| UAT Lintas Instansi            | ⚠️ **Belum**        | Dijadwalkan Sprint 13–14                                                             |

---

## 🗂️ Struktur Monorepo

```
cims-platform-ts/
├── apps/
│   ├── api/                      # Backend NestJS + Fastify (@cims/api)
│   └── web/                      # Frontend React + Vite (@cims/web)
├── services/
│   ├── zoom-provider/            # Adapter Zoom video (port 3010)
│   └── brevo-notification/       # Adapter Brevo email + WhatsApp stub (port 3020)
├── packages/
│   ├── domain/                   # @cims/domain — pure TypeScript, zero deps
│   └── contracts/                # @cims/contracts — shared DTOs
├── database/
│   └── typescript-migrations/    # 14 migration SQL (0001–0014)
│       └── 0014_notification_templates_sla.sql  ← terbaru
├── infra/
│   ├── docker-compose.yml                   # Dev lokal
│   ├── docker-compose.preproduction.yml     # Preproduction (5 services)
│   ├── docker-compose.production-like.yml  # Production-like (OIDC, TLS)
│   └── secrets/                             # 15 secret files (gitignored)
└── scripts/
    └── setup-preproduction.sh               # Auto-generate semua secrets
```

---

## 🛠️ Stack Teknologi

| Layer               | Teknologi                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| **Backend**         | Node.js ≥22, NestJS 11, Fastify, TypeScript                            |
| **Frontend**        | React 18, Vite, Tailwind CSS v4, shadcn/ui, Radix UI                   |
| **Database**        | PostgreSQL 17, 14 migration files                                      |
| **Auth**            | OIDC / Keycloak (`AUTH_MODE=OIDC`) · DEV mode header (`AUTH_MODE=DEV`) |
| **Enkripsi**        | AES-256-GCM field encryption + multi-key versioning                    |
| **Notifikasi**      | Brevo Transactional Email · WhatsApp stub (HTTP-ready)                 |
| **Video**           | Zoom Server-to-Server OAuth · Mock adapter untuk dev                   |
| **Package Manager** | npm workspaces, npm@10.9.0                                             |

---

## 🐳 Menjalankan Preproduction (Docker)

### 1. Inisialisasi Secrets

```bash
# Generate semua 15 secret file (password, key enkripsi, API keys)
bash scripts/setup-preproduction.sh

# Untuk email nyata via Brevo, sertakan API key:
BREVO_API_KEY=xkeysib-xxx... bash scripts/setup-preproduction.sh
```

### 2. Build & Jalankan

```bash
npm ci
npm run build

# Build + jalankan: API, Worker, Web, Zoom Provider, Brevo Notification, PostgreSQL
docker compose -f infra/docker-compose.preproduction.yml up --build -d
```

### 3. Migrasi Database

```bash
docker compose -f infra/docker-compose.preproduction.yml exec api \
  node tools/migrate-postgres.mjs
```

### 4. Akses Aplikasi

| Layanan                | URL                                     |
| ---------------------- | --------------------------------------- |
| **Web UI**             | http://localhost:8080                   |
| **API + Swagger**      | http://localhost:3000/docs              |
| **Zoom Provider**      | http://localhost:3010/health            |
| **Brevo Notification** | http://localhost:3020/health            |
| **PostgreSQL**         | `localhost:5435` (user: cims, db: cims) |

> **Tip:** Gunakan **Persona Switcher** di sidebar kiri bawah untuk simulasi login sebagai Panitera, Hakim, Jaksa, atau Petugas Pemasyarakatan.

### 5. Validasi Health

```bash
curl http://localhost:3000/health/live   # → {"status":"UP"}
curl http://localhost:3000/health/ready  # → {"status":"UP","decision":"GO",...}
```

---

## 🧪 Development & Testing

```bash
# Test domain logic (gate, conflict detection, state machine, HMAC)
npm run test:domain

# TypeScript typecheck seluruh monorepo
npm run typecheck

# Lint + format
npm run lint
npm run format

# SOP compliance checker (production baseline)
npm run check:phase6

# Dev mode (hot reload)
npm run dev:api    # API backend
npm run dev:web    # Frontend
npm run dev:worker # Outbox worker
```

---

## 🔒 Keamanan

### Field Encryption Key Rotation

CIMS mendukung rotasi kunci enkripsi tanpa downtime:

```bash
# Generate kunci baru
openssl rand -base64 32

# Tambahkan ke infra/secrets/field_encryption_key_v2.txt
# Aktifkan di docker-compose (FIELD_ENCRYPTION_KEY_V2_FILE)
# Restart → enkripsi baru pakai V2, data V1 lama tetap bisa didekripsi
```

### 10 Roles CIMS

| Kode               | Nama                   | Instansi        |
| ------------------ | ---------------------- | --------------- |
| `COURT_CLERK`      | Panitera               | Pengadilan      |
| `SUBSTITUTE_CLERK` | Panitera Pengganti     | Pengadilan      |
| `JUDGE`            | Hakim                  | Pengadilan      |
| `PROSECUTOR`       | Penuntut Umum          | Kejaksaan       |
| `CORRECTIONS`      | Petugas Pemasyarakatan | Lapas/Rutan     |
| `IT_OPERATOR`      | Operator TI            | Tim Teknis      |
| `LIAISON_OFFICER`  | Pejabat Penghubung     | Lintas Instansi |
| `AUDITOR`          | Auditor                | Pengawasan      |
| `SECURITY_OFFICER` | Petugas Keamanan       | Keamanan        |
| `SYSTEM_ADMIN`     | Administrator Sistem   | Sistem          |

### DLP & Rate Limiting

- **Rate limit global:** dikonfigurasi via `RATE_LIMIT_MAX` + `RATE_LIMIT_WINDOW_MS`
- **`SensitiveRateGuard`:** rate limit per-IP ketat untuk endpoint agregat sensitif (SLA report, compliance dashboard, admin config)
- **`/metrics` endpoint:** dilindungi `METRICS_BEARER_TOKEN` — blokir otomatis di production tanpa token

---

## 📧 Notification Channels

| Channel    | Status   | Keterangan                                                             |
| ---------- | -------- | ---------------------------------------------------------------------- |
| `EMAIL`    | ✅ Aktif | Brevo Transactional API — isi `brevo_api_key.txt`                      |
| `WHATSAPP` | 🔄 Stub  | Jalur HTTP siap — set `WHATSAPP_PROVIDER_MODE=HTTP` saat provider siap |
| `SMS`      | 🔄 Stub  | Log + return DELIVERED                                                 |
| `IN_APP`   | 🔄 Stub  | WebSocket/SSE direncanakan fase berikutnya                             |

Template teks per jenis × channel tersimpan di tabel `notification_templates` — dapat diubah admin di `/admin` tanpa deploy ulang.

---

## ⚠️ Syarat Sebelum Production (NO-GO Checklist)

Production **TIDAK DIIZINKAN** sebelum semua item berikut terpenuhi:

- [ ] `OIDC_ISSUER` + Keycloak production dikonfigurasi (`AUTH_MODE=OIDC`)
- [ ] MFA aktif untuk semua role internal utama (melalui Keycloak)
- [ ] `DB_SSL=true` dengan sertifikat TLS yang valid
- [ ] Secret files diganti dengan secret manager (Vault / AWS Secrets Manager / GCP)
- [ ] `METRICS_BEARER_TOKEN` dikonfigurasi untuk endpoint Prometheus
- [ ] `BREVO_API_KEY` production diisi (bukan placeholder)
- [ ] UAT lintas instansi selesai diotorisasi oleh Pejabat Liaison
- [ ] Controlled Limitation Register ditandatangani oleh steering committee
- [ ] `SWAGGER_ENABLED=false` di production

---

## 🗓️ Roadmap

| Sprint           | Fokus                                              | Status                  |
| ---------------- | -------------------------------------------------- | ----------------------- |
| ~~Sprint 1–10~~  | Alur inti, notifikasi, video, keamanan, modul SOP  | ✅ Selesai              |
| ~~Sprint 11~~    | MFA Keycloak, OIDC Enforcement, admin config       | ✅ Selesai (Dipercepat) |
| ~~Sprint 12~~    | Portal per-instansi, notif in-app SSE              | ✅ Selesai (Dipercepat) |
| ~~Sprint 13–15~~ | SIT & UAT Scenarios, Defect Burn Down, RC          | ✅ Selesai (Dipercepat) |
| **Sprint 16**    | UAT Lintas Instansi (Dry-Run), Go-Live & Hypercare | Agustus 2026            |

---

🤖 _Dibangun dengan metodologi Lean MVP · Compliance-First · SOP/CIMS/PPE/001/2026_
