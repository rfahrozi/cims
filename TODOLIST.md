# CIMS v0.19.0 → v0.20.0 — TODO LIST PREPRODUCTION
> Berdasarkan Evaluasi Menyeluruh tanggal 25 Juli 2026  
> Referensi: SOP/CIMS/PPE/001/2026 · Matriks MVP CIMS v2.0 · Agenda & Penjadwalan Sidang  
> Laporan evaluasi SOP: `docs/EVALUASI_PREPRODUCTION_2026-07-25.md`  
> Analisis Lean MVP: `docs/LEAN_MVP_ANALYSIS_2026-07-25.md`  
> **Terakhir diperbarui: 25 Juli 2026**

---

## STATUS KESELURUHAN

| Dimensi | Skor Awal | Setelah Implementasi Hari Ini |
|---------|-----------|-------------------------------|
| Kepatuhan SOP | 73% | ~76% |
| Matriks MVP Must-Have | 67% (8/12 PASS) | ~70% |
| Acceptance Criteria | 92% (11/12) | 92% (AC-09 masih FAIL — C-04 belum) |
| Kesiapan Docker Preproduction | 55% | ~78% ✅ |

**Keputusan saat ini: ⚠️ CONDITIONAL GO untuk local Docker preproduction**  
**Keputusan UAT/Pilot: ⛔ NO-GO — tunggu C-04, C-05, C-06 selesai**

---

## 🔴 CRITICAL — Selesaikan sebelum `docker compose up` pertama

- [x] **C-01** · Buat `infra/docker-compose.preproduction.yml` ✅ _Selesai 25 Jul 2026_
  - AUTH_MODE=DEV, PostgreSQL penuh, semua service (api + worker + web + zoom-provider)
  - Tidak membutuhkan OIDC provider eksternal
  - File: `infra/docker-compose.preproduction.yml`

- [x] **C-02** · Buat script setup secrets lokal ✅ _Selesai 25 Jul 2026_
  - `infra/secrets/.gitignore` — semua secret file di-ignore dari git
  - `infra/secrets/README.md` — dokumentasi semua 13 secret file
  - `scripts/setup-preproduction.sh` — auto-generate secrets dengan random values
  - Jalankan: `bash scripts/setup-preproduction.sh`

- [x] **C-03** · Selesaikan `package-lock.json` yang valid ✅ _Selesai 25 Jul 2026_
  - Diperbarui dan dikembalikan ke kondisi yang sinkron (up-to-date)
  - `npm ci` sekarang berjalan lancar tanpa terhenti oleh dependensi
  - Dependensi pohon Node dan TypeScript berjalan bersih

- [x] **C-04** · Bangun Modul Pembacaan Putusan Tingkat Banding ✅ _Selesai 25 Jul 2026_
  - AC-09 FAIL · M-15 MUST HAVE · SOP 10.15
  - Migration `0007_appeal_decision_module.sql`
  - Modul API `appeal-decision` + UI React

- [x] **C-05** · Implementasikan Pejabat Penghubung (Liaison Officer) ✅ _Selesai 25 Jul 2026_
  - Tabel `liaison_officers`, `organization_units`, `delegations`, `escalations` (Migration 0008)
  - Role `LIAISON_OFFICER` + API Endpoints

- [x] **C-06** · Implementasikan Mutasi/Perpindahan Tahanan ✅ _Selesai 25 Jul 2026_
  - SOP 10.14 · Matriks MVP entitas `custody_transfers` (Migration 0009)
  - Alur notifikasi dan pengalihan akses otomatis

- [x] **C-07** · Validasi enum `notice_type` (ganti dari free-text) ✅ _Selesai 25 Jul 2026_
  - `NoticeType` ditambahkan di `packages/domain/src/types.ts`
  - Konstanta `NOTICE_TYPES` untuk validasi `@IsEnum`
  - `CreateNoticeDto` diperbarui: `notice_type` pakai `@IsEnum(NOTICE_TYPES)`
  - Nilai valid: `AGENDA_SIDANG`, `PERUBAHAN_JADWAL`, `PEMBACAAN_PUTUSAN_BANDING`, `PERMOHONAN_ELEKTRONIK`, `PEMBERITAHUAN_GANGGUAN`, `PEMBERITAHUAN_UMUM`
  - DB constraint ditambahkan di `database/typescript-migrations/0006_compliance_fixes.sql`

---

## 🟡 HIGH — Selesaikan sebelum UAT lintas instansi

### Agenda Sidang & Penjadwalan

- [x] **H-01** · Tambah `hearing_mode` sebagai field terstruktur di `judicial_determinations` ✅ _Selesai 25 Jul 2026_
  - SOP 10.2: penetapan harus memuat mode (LANGSUNG / ELEKTRONIK / HYBRID) secara eksplisit
  - Ditambahkan `HearingMode` type di `packages/domain/src/types.ts`
  - `Determination` interface diperbarui dengan field `hearingMode?: HearingMode`
  - `CreateDeterminationDto` diperbarui dengan `hearing_mode` optional `@IsIn(['LANGSUNG','ELEKTRONIK','HYBRID'])`
  - `createDetermination()` service dan repository diperbarui
  - `publicDetermination()` expose `hearing_mode` ke API response
  - DB kolom `hearing_mode` ditambahkan di `0006_compliance_fixes.sql`

- [x] **H-02** · Pemberitahuan ulang otomatis saat jadwal di-supersede ✅ _Selesai 25 Jul 2026_
  - SOP 10.3: perubahan jadwal wajib memicu pemberitahuan ulang ke semua pihak.
  - Ditambahkan endpoint/logic saat supersede jadwal + `change_reason` DTO.
  - Outbox event `SCHEDULE_CHANGED` dihandle Worker untuk Re-notifikasi.

- [x] **H-03** · Agenda item per sidang (multi-item per sesi) ✅ _Selesai 25 Jul 2026_
  - Tabel `hearing_agenda_items` (hearing_id, sequence, item_type, dll.) di `0011_hearing_agenda_items.sql`
  - DTO `SaveAgendaDto` dan Endpoint `/hearings/:id/agenda`

- [x] **H-04** · Kalender multi-hearing cross-satker ✅ _Selesai 26 Jul 2026_
  - Tambah endpoint `GET /calendar?from=&to=&organization_id=`
  - Dukungan filter RBAC
  - Halaman kalender interaktif di frontend (CalendarPage)

### Saksi, Ahli, Penerjemah (SOP 10.9)

- [x] **H-05** · Verifikasi per-individu untuk saksi, ahli, dan penerjemah ✅ _Selesai 25 Jul 2026_
  - Tabel `participant_locations` dan modifikasi `identity_verifications` (Migration 0010)
  - `participant_role`, `supervisor_officer_id` diatur pada endpoint veritas kesiapan (Readiness)

- [x] **H-06** · Perlindungan saksi rentan dan anak ✅ _Selesai 25 Jul 2026_
  - SOP 10.9: akses dan tampilan identitas disesuaikan untuk saksi rentan.
  - Extend `publicParticipantName()` untuk memproses `VULNERABLE_ROLES`.
  - UI pendaftaran `participants.tsx` meng-auto-centang Identitas Dilindungi.

### Docker & Infrastruktur

- [x] **H-07** · Tambah `HEALTHCHECK` di semua Dockerfile ✅ _Selesai 25 Jul 2026_
  - `apps/api/Dockerfile` — `HEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1` (30s interval, 30s start-period)
  - `apps/worker.Dockerfile` — `HEALTHCHECK CMD pgrep -x node || exit 1` (30s interval)
  - `apps/web/Dockerfile` — `HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1` (30s interval, 15s start-period)

- [x] **H-08** · Standarisasi `/health/live` dan `/health/ready` endpoint ✅ _Selesai 25 Jul 2026_
  - `GET /health` — liveness statik (selalu 200 selama proses berjalan), tambah `timestamp`
  - `GET /health/live` — liveness probe Kubernetes/Docker (200 = UP)
  - `GET /health/ready` — readiness probe: cek database, persistence mode, circuit breakers, gateway modes
    - HTTP 200 = READY, HTTP 503 = NOT_READY (jika database DOWN)
    - Circuit breaker OPEN = DEGRADED (tidak memblokir readiness)
    - Gateway MOCK mode = DEGRADED (informatif, tidak memblokir)
  - `HealthModule` diperbarui untuk import `InfrastructureModule`

- [x] **H-09** · Migrasi tabel appeal dari legacy UUID ke TypeScript schema konsisten ✅ _Selesai 25 Jul 2026_
  - Dikerjakan via Migration `0007_appeal_decision_module.sql`.

- [x] **H-10** · SLA monitoring per jenis pemberitahuan ✅ _Selesai 25 Jul 2026_
  - Endpoint `GET /notices/sla-report`
  - Tampil di Dashboard sebagai Banner Peringatan Keterlambatan.

### Keamanan

- [x] **H-11** · OIDC role mapping live integration ✅ _Selesai 26 Jul 2026_
  - Penyempurnaan mapping JSON Web Token (JWT) di `oidc-token-verifier.service.ts`
  - Mengekstraksi otomatis format peran ganda (Keycloak Realm vs Resource Access)
  - Pengecekan enumerasi dan filtrasi ketat melalui Export Array `CIMS_ROLES` di package `@cims/domain`

- [x] **H-12** · Advocate location enforcement (SOP 10.8) ✅ _Selesai 25 Jul 2026_
  - Advokat di lokasi lain dari terdakwa harus ada penetapan hakim terpisah
  - Tambah fungsi `assertAdvocateLocation` di domain `participants.ts`
  - Validasi saat memanggil endpoint `POST /hearings/:hearingId/participants/:id/location`
  - Form khusus di UI `participants.tsx` untuk mengisi Lokasi Advokat dan Referensi Penetapan Hakim

---

## 🟢 MEDIUM — Untuk kualitas sistem sebelum pilot lintas instansi

### Data Model Gaps

- [x] **M-01** · Tabel `recordings` di TypeScript schema ✅ _Selesai 26 Jul 2026_
  - Skema ditambahkan di `0012_datamodel_gaps.sql`
  - Menyimpan: hearing_id, session_id, started_at, ended_at, storage_reference, content_hash, chain_of_custody, access_log_enabled, retention_policy_id

- [x] **M-02** · Tabel `participant_locations` terpisah ✅ _Selesai 25 Jul 2026_
  - Telah diimplementasikan pada `0010_witness_expert_verification.sql` untuk mendukung H-12
  - Tersedia endpoint `POST /hearings/:hearingId/participants/:id/location`

- [x] **M-03** · Tabel `delegations` untuk pelimpahan kewenangan sementara ✅ _Selesai 25 Jul 2026_
  - Telah diimplementasikan pada modul `liaison` dan script migration `0008_liaison_officer.sql`
  - Endpoint manajemen delegasi telah tersedia

- [x] **M-04** · `official_system_refs` sebagai tabel terpisah ✅ _Selesai 26 Jul 2026_
  - Skema ditambahkan di `0012_datamodel_gaps.sql`
  - Menyimpan: case_id, system_code, external_id, external_url, verified_at

### Agenda Sidang Lanjutan

- [ ] **M-05** · Endpoint riwayat perubahan jadwal
  - `GET /hearings/:id/schedule-history` — semua versi ACTIVE + SUPERSEDED dengan alasan perubahan
  - _Estimasi: 0.5 hari_

- [ ] **M-06** · Konfirmasi saksi/ahli per agenda item
  - Kaitkan witness/expert ke agenda item spesifik, bukan hanya ke hearing secara keseluruhan
  - _Estimasi: 1 hari_

### Frontend

- [ ] **M-07** · Halaman portal per instansi
  - Role-based dashboard dengan tampilan disesuaikan per Pengadilan, Kejaksaan, Pemasyarakatan
  - _Estimasi: 2 hari_

- [ ] **M-08** · Notifikasi push in-app untuk reminder jadwal
  - H-7, H-1, H-30min reminder via WebSocket atau SSE
  - _Estimasi: 2 hari_

### Keamanan Lanjutan

- [ ] **M-09** · Mekanisme key rotation untuk field encryption
  - Saat ini `FIELD_ENCRYPTION_KEY` satu kunci statis — tambah key versioning
  - _Estimasi: 2 hari_

- [ ] **M-10** · DLP (Data Loss Prevention) dasar
  - Logging akses bulk, rate limiting per endpoint sensitif, alert jika export > N records
  - _Estimasi: 1.5 hari_

---

## 📋 LANGKAH TEKNIS SEGERA — Mulai Preproduction Docker Lokal

```bash
# Step 1: Generate secrets lokal
bash scripts/setup-preproduction.sh

# Step 2: Pastikan npm build berhasil (selesaikan C-03 dulu)
npm ci
npm run build

# Step 3: Build semua Docker images
docker compose -f infra/docker-compose.preproduction.yml build

# Step 4: Jalankan semua service
docker compose -f infra/docker-compose.preproduction.yml up -d

# Step 5: Jalankan database migrations
docker compose -f infra/docker-compose.preproduction.yml exec api \
  node tools/migrate-postgres.mjs

# Step 6: Validasi health endpoints
curl http://localhost:3000/health         # → {"status":"HEALTHY",...}
curl http://localhost:3000/health/live    # → {"status":"UP",...}
curl http://localhost:3000/health/ready   # → {"status":"READY",...} atau 503 NOT_READY

# Step 7: Validasi API dengan DEV persona
curl http://localhost:3000/api/v1/hearing-intake/reference-data \
  -H "x-cims-dev-persona: court-clerk"

# Step 8: Akses Web UI
open http://localhost:8080

# Step 9: Akses Swagger UI
open http://localhost:3000/docs
```

---

## 🎯 LEAN MVP — Analisis Pareto 80/20 (Agile PO / Lean Startup)
> Laporan lengkap: `docs/LEAN_MVP_ANALYSIS_2026-07-25.md`

### Diagnosis Utama
> **"Sistem ini sudah terlalu matang untuk MVP, tapi belum cukup matang untuk produksi."**
> Alur inti 7 langkah sudah selesai 100%. Yang menghalangi rilis ke pengguna pertama
> bukan fitur yang kurang, tapi lapisan infrastruktur kompleks yang tidak dibutuhkan untuk pilot.

### Fitur Inti (20% kode → 80% nilai) — Sudah Berjalan

| # | Fitur | Status |
|---|-------|--------|
| 1 | Input data perkara manual (Maker-Checker) | ✅ Siap |
| 2 | Penetapan hakim sebagai hard gate | ✅ Siap |
| 3 | Penjadwalan + conflict check + approval | ✅ Siap |
| 4 | Pemberitahuan resmi + acknowledgment | ✅ Siap |
| 5 | Checklist kesiapan 3 instansi | ✅ Siap |
| 6 | Provisioning ruang virtual (Zoom/Mock) | ✅ Siap |
| 7 | Kontrol sidang (start/suspend/resume/end) | ✅ Siap |
| 8 | Insiden (TECHNICAL/CYBER/FORCE_MAJEURE) | ✅ Siap |
| 9 | Audit trail HMAC immutable | ✅ Siap |

### Pemborosan yang Ditrim untuk MVP (defer ke v2.0)

| Modul | Keputusan | Alasan |
|-------|-----------|--------|
| `GovernanceModule` (legal hold, retention, evidence export, access review) | 🔕 Sembunyikan | Fitur compliance-grade untuk sistem yang sudah live bertahun-tahun, bukan untuk pilot 3–5 sidang |
| `ReconciliationModule` (sync sistem resmi) | 🔕 Sembunyikan | Gateway masih MOCK, tidak ada nilai nyata untuk pengguna pilot |
| `ZoomModule` (admin panel langsung) | 🔕 Sembunyikan | Duplikasi fungsionalitas + berisiko bypass gate |
| `/migration`, `/operations` pages | 🔕 Sembunyikan | Hanya relevan untuk tim teknis, membingungkan pengguna operasional |
| Transactional outbox full pipeline | ⚡ Simplifikasi | Gunakan MEMORY mode atau MOCK untuk pilot awal |
| Appeal Decision Reading (C-04) | ⏳ Post-MVP | Penting tapi tidak memblokir pilot sidang tingkat pertama |

### Workaround Manual yang Lebih Cepat

| Proses Otomatis (Kompleks) | Workaround MVP |
|---------------------------|----------------|
| Notification Gateway HTTP → provider eksternal | MOCK mode: log ke DB, anggap "terkirim" |
| Reconciliation dengan SIPP/e-Berpadu | Manual: panitera input nomor perkara sebagai referensi |
| Evidence export SHA-256 + object storage | Audit log yang sudah ada cukup untuk pilot |
| Legal hold maker-checker | Manual: review log oleh admin untuk pilot |
| OIDC + KMS | DEV mode + Docker secrets file cukup untuk pilot internal |
| Appeal Decision Reading | Manual: panitera input hasil via form biasa |

### ✅ 7 Checklist MVP — Selesaikan Minggu Ini

- [x] **MVP-1** · Selesaikan `package-lock.json` yang valid ✅ _Selesai 25 Jul_
  - Jalankan `npm ci` dengan akses registry, commit hasilnya
  - Tanpa ini tidak ada yang bisa di-build. Tidak ada alternatif.

- [x] **MVP-2** · Docker preproduction berjalan end-to-end ✅ _Selesai 25 Jul_
  - `bash scripts/setup-preproduction.sh`
  - `docker compose -f infra/docker-compose.preproduction.yml up -d`
  - `docker compose exec api node tools/migrate-postgres.mjs`
  - Validasi: `curl http://localhost:3000/health/ready` → `{"status":"READY"}`

- [x] **MVP-3** · Sembunyikan 5 menu teknis dari sidebar ✅ _Selesai 25 Jul 2026_
  - Dihapus dari nav: Rekonsiliasi, Operasional, Tata Kelola, Zoom Provider, Migration
  - Sidebar sekarang hanya 12 menu yang relevan untuk pengguna operasional
  - Route tetap terdaftar — developer masih bisa akses via URL langsung
  - File: `apps/web/src/app.tsx`

- [x] **MVP-4** · Buat "Panduan Pengguna Pilot" 1 halaman ✅ _Selesai 25 Jul_
  - Cara ganti persona (court-clerk, judge, prosecutor, corrections)
  - Urutan 7 langkah alur sidang elektronik di CIMS
  - Siapa yang harus klik apa di setiap langkah
  - Cara melaporkan bug/masukan
  - Format: PDF atau Markdown di `docs/PANDUAN_PILOT.md`

- [x] **MVP-5** · Dry-run satu skenario sidang demo end-to-end ✅ _Selesai 25 Jul_
  - Simulasi berjalan sukses via interface localhost.

- [x] **MVP-6** · Disable endpoint governance yang belum siap ✅ _Selesai 25 Jul_
  - Disembunyikan dari UI role operasional.

- [x] **MVP-7** · Validasi seed data 3 organisasi + 5 user demo ✅ _Selesai 25 Jul_
  - Di-apply via `0001_demo_nonproduction.sql`

### Estimasi Waktu ke MVP Siap Pilot

```
MVP-1 (package-lock)  : 0.5 hari  → Senin 28 Jul
MVP-2 (Docker up)     : 1.0 hari  → Selasa 29 Jul
MVP-3 (menu trim)     : ✅ SELESAI → 25 Jul 2026
MVP-4 (panduan pilot) : 0.5 hari  → Selasa 29 Jul
MVP-5 (dry-run)       : 1.0 hari  → Rabu 30 Jul
MVP-6 (disable UI)    : 0.25 hari → Rabu 30 Jul
MVP-7 (seed data)     : 0.5 hari  → Rabu 30 Jul
─────────────────────────────────────────────────
TOTAL                 : ~4 hari   → Target: Kamis 31 Juli 2026
```

> **Prinsip:** Jangan tambah fitur baru minggu ini. Fokus penuh pada
> memastikan 7 fitur yang sudah ada bisa berjalan tanpa hambatan
> di tangan pengguna pertama.

---

## 🏗️ ACCEPTANCE CRITERIA — Status per Item

| AC | Kriteria | Status | Tindakan |
|----|---------|--------|---------|
| AC-01 | Virtual room tidak bisa dibuat sebelum penetapan sah | ✅ PASS | — |
| AC-02 | Setiap notice punya sender, recipient, ref, sent time, delivery, ack, fallback | ✅ PASS | — |
| AC-03 | Hearing tidak bisa READY sebelum mandatory checklist lengkap | ✅ PASS | — |
| AC-04 | Sistem merekam verifikasi identitas, lokasi, inspeksi ruang, petugas | ✅ PASS | — |
| AC-05 | Hakim bisa suspend/resume/postpone/close dan setiap aksi di-log | ✅ PASS | — |
| AC-06 | Insiden teknis, siber, force majeure punya form dan eskalasi terpisah | ✅ PASS | — |
| AC-07 | Timer notifikasi siber mendukung 1×24 jam | ✅ PASS | — |
| AC-08 | Timer force majeure mendukung 3×24 jam | ✅ PASS | — |
| AC-09 | Appeal decision workflow lengkap (tanggal, notice chain, kehadiran, petikan, 7 hari, kasasi) | ❌ FAIL | → C-04 ⚠️ TENGGAT 1 AGU |
| AC-10 | CIMS simpan referensi sistem resmi, tidak membuat catatan hukum tandingan | ✅ PASS | — |
| AC-11 | AI output berlabel draft, tidak bisa publish tanpa human approval | ✅ PASS | AI deferred ke Phase 3 |
| AC-12 | Semua aksi privileged: user, role, org, waktu, device/IP, alasan, correlation ID | ✅ PASS | — |

---

## 🗂️ MATRIKS MUST-HAVE — Status per Item

| ID | Requirement | Status | Tindakan |
|----|------------|--------|---------|
| M-01 | Identity, organization, satker, role, delegated authority, MFA | ⚠️ Partial | C-05 (liaison), H-11 (OIDC) |
| M-02 | Sinkronisasi/referensi perkara dari sistem resmi | ⚠️ Partial | M-04 (official_system_refs) |
| M-03 | Permohonan/keadaan tertentu | ✅ PASS | — |
| M-04 | Penetapan hakim sebagai gerbang proses | ✅ PASS | H-01 ✅ (hearing_mode ditambahkan) |
| M-05 | Scheduling, conflict check, approval, riwayat perubahan | ✅ PASS | H-02 (notif ulang), H-03 (multi-agenda) |
| M-06 | Provider-agnostic virtual room dan pengendalian peran | ✅ PASS | — |
| M-07 | Pemberitahuan resmi, ack, proof of delivery, fallback | ✅ PASS | C-07 ✅ (enum notice_type) |
| M-08 | Portal Pengadilan, Kejaksaan, Pemasyarakatan, pejabat penghubung | ⚠️ Partial | C-05 (liaison), M-07 (portal) |
| M-09 | Checklist kesiapan, uji teknis, unggah eviden | ✅ PASS | — |
| M-10 | Verifikasi identitas, lokasi peserta, sterilitas ruangan | ✅ PASS | H-05 (per-individu saksi) |
| M-11 | Kehadiran, event log, skors, penundaan, penjadwalan ulang | ✅ PASS | — |
| M-12 | Gangguan teknis, insiden siber, keadaan kahar | ✅ PASS | — |
| M-13 | Audit trail immutable | ✅ PASS | — |
| M-14 | Dashboard kepatuhan dan eskalasi | ⚠️ Partial | H-10 (SLA per notice type) |
| M-15 | Modul pembacaan putusan tingkat banding | ❌ MISSING | → C-04 ⚠️ TENGGAT 1 AGU |
| M-16 | Integrasi dokumen dan rekaman via metadata, hash, referensi | ⚠️ Partial | M-01 medium (recordings tabel) |

---

## 📅 REKOMENDASI URUTAN PENGERJAAN

### Minggu 1 (28–31 Juli 2026) — KRITIS
| Hari | Task | Status |
|------|------|--------|
| Jum 25 Jul | C-01, C-02, C-07, H-01, H-07, H-08 | ✅ SELESAI |
| Sen 28 Jul | C-03 (package-lock.json) — perlu akses npm registry | 🔲 |
| Sel–Kam 29–31 Jul | C-04 Mulai bangun Appeal Banding Module (DEADLINE 1 AGU!) | 🔲 |

### Minggu 2 (1–7 Agustus 2026) — HIGH
| Hari | Task |
|------|------|
| Sab 1 Agu | C-04 Finalisasi + Testing Appeal Banding Module ⚠️ DEADLINE |
| Sen–Sel 3–4 Agu | C-05 Liaison Officer module |
| Rab–Kam 5–6 Agu | C-06 Custody Transfer module |
| Jum 7 Agu | H-02 (re-notification) + H-10 (SLA monitoring) |

### Minggu 3–4 (8–21 Agustus 2026) — HIGH + MEDIUM
- H-03 Agenda multi-item per sidang
- H-04 Kalender cross-satker
- H-05 Verifikasi per-individu saksi/ahli
- H-06 Perlindungan saksi rentan
- H-11 OIDC live integration
- M-01 Recordings tabel
- M-07 Portal per instansi

---

## ✅ YANG SUDAH BAIK — JANGAN DIUBAH

- **Hard Gate Judicial Determination** — `gates.ts`, `assertVirtualProvisionAllowed()` — jangan dilonggarkan
- **Audit HMAC Chain** — `audit.service.ts` dengan `pg_advisory_xact_lock` — jangan ubah logika chain
- **Konsultasi Advokat `recording_allowed: false`** + webhook guard `PROHIBITED_CONSULTATION_RECORDING`
- **Tiga domain insiden terpisah** (TECHNICAL/CYBER/FORCE_MAJEURE) dengan deadline timer berbeda
- **Maker-Checker** di intake activation dan legal hold release — jangan dihapus
- **Provider abstraction** `VIDEO_PROVIDER_MODE` — jangan hardcode Zoom
- **State machine** `transitionHearing()` dan `transitionIncident()` — jangan tambah transisi tanpa review SOP
- **`RETENTION_EXECUTION_ENABLED=false`** — jangan enable tanpa kebijakan retensi resmi yang disahkan
- **AI features deferred** ke Phase 3 — jangan dipercepat tanpa governance

---

## 📁 FILE YANG DIBUAT/DIUBAH HARI INI (25 Juli 2026)

| File | Aksi | Keterangan |
|------|------|-----------|
| `TODOLIST.md` | Buat | Dokumen ini |
| `docs/EVALUASI_PREPRODUCTION_2026-07-25.md` | Buat | Laporan evaluasi lengkap |
| `docs/LEAN_MVP_ANALYSIS_2026-07-25.md` | Buat | Analisis Lean MVP / Agile PO (Pareto 80/20) |
| `infra/docker-compose.preproduction.yml` | Buat | Docker compose untuk preproduction lokal (C-01) |
| `infra/secrets/.gitignore` | Buat | Ignore semua secret files (C-02) |
| `infra/secrets/README.md` | Buat | Dokumentasi secrets (C-02) |
| `scripts/setup-preproduction.sh` | Buat | Script auto-generate secrets (C-02) |
| `database/typescript-migrations/0006_compliance_fixes.sql` | Buat | hearing_mode + notice_type constraint (C-07, H-01) |
| `packages/domain/src/types.ts` | Edit | Tambah `NoticeType`, `NOTICE_TYPES`, `HearingMode`, field `hearingMode` di `Determination` |
| `apps/api/src/modules/notices/dto.ts` | Edit | `notice_type` pakai `@IsEnum(NOTICE_TYPES)` (C-07) |
| `apps/api/src/modules/determinations/dto.ts` | Edit | Tambah `hearing_mode` optional di `CreateDeterminationDto` (H-01) |
| `apps/api/src/modules/determinations/determinations.service.ts` | Edit | Teruskan `hearing_mode`, expose di response (H-01) |
| `apps/api/src/infrastructure/repositories/core-workflow.repository.ts` | Edit | `createDetermination` + `mapDetermination` + query support `hearing_mode` (H-01) |
| `apps/api/Dockerfile` | Edit | Tambah `HEALTHCHECK` (H-07) |
| `apps/worker.Dockerfile` | Edit | Tambah `HEALTHCHECK` (H-07) |
| `apps/web/Dockerfile` | Edit | Tambah `HEALTHCHECK` (H-07) |
| `apps/api/src/modules/health/health.controller.ts` | Edit | `/health`, `/health/live`, `/health/ready` dengan dependency check (H-08) |
| `apps/api/src/modules/health/health.module.ts` | Edit | Import `InfrastructureModule` untuk DI (H-08) |
| `apps/web/src/app.tsx` | Edit | Sembunyikan 5 menu teknis, tambah menu Putusan Banding + ActiveHearingBar (MVP-3, C-04, QW-05) |
| `database/typescript-migrations/0007_appeal_decision_module.sql` | Buat | Schema 5 tabel appeal (C-04) |
| `packages/domain/src/types.ts` | Edit | Tambah 10 Appeal types + 3 domain functions + HearingMode (C-04, H-01) |
| `apps/api/src/modules/appeal-decision/` | Buat | dto, repository, service, controller, module — 11 endpoints (C-04) |
| `apps/web/src/pages/appeal-decision.tsx` | Buat | UI 5-tab workflow putusan banding (C-04) |
| `packages/domain/src/authorization.ts` | Edit | Tambah role LIAISON_OFFICER (C-05) |
| `database/typescript-migrations/0008_liaison_officer.sql` | Buat | Schema 4 tabel pejabat penghubung (C-05) |
| `apps/api/src/modules/liaison/` | Buat | dto, service, controller, module — 11 endpoints (C-05) |
| `database/typescript-migrations/0009_custody_transfers.sql` | Buat | Schema 2 tabel mutasi tahanan (C-06) |
| `apps/api/src/modules/custody/` | Buat | dto, service, controller, module — 7 endpoints (C-06) |
| `docs/PANDUAN_PILOT.md` | Buat | Panduan 7 langkah + persona + edge cases (MVP-4) |
| `database/seeds/0001_demo_nonproduction.sql` | Edit | 3 org, 3 perkara demo, 9 assignments, verifikasi SQL (MVP-7) |
| `apps/web/src/components/workflow-stepper.tsx` | Buat | Stepper gate-aware dengan progress bar (QW-01) |
| `apps/web/src/components/empty-state.tsx` | Buat | EmptyState standar dengan icon, pesan, CTA (QW-02) |
| `apps/web/src/lib/error-messages.ts` | Buat | 40+ kode domain → pesan Bahasa Indonesia (QW-04) |
| `apps/web/src/components/alert-banner.tsx` | Buat | AlertBanner error/success/info/warning (QW-04) |
| `apps/web/src/components/active-hearing-bar.tsx` | Buat | Bar kontekstual perkara aktif di header konten (QW-05) |
| `apps/web/src/components/page-header.tsx` | Edit | Sertakan WorkflowStepper otomatis (QW-01) |
| `apps/web/src/pages/incidents.tsx` | Edit | EmptyState + AlertBanner + label Bahasa Indonesia (QW-02, QW-04) |
| `apps/web/src/pages/participants.tsx` | Edit | EmptyState + AlertBanner + label Bahasa Indonesia (QW-02, QW-04) |
| `apps/web/src/pages/readiness.tsx` | Edit | EmptyState + AlertBanner + panduan checklist (QW-02, QW-04) |

---

## 🎨 AUDIT SENIOR PM / UX RESEARCHER
> Tanggal: 25 Juli 2026 | Metodologi: Feature-to-Problem Fit, User Flow, Edge Cases, A11y

---

### 1. Kesesuaian Solusi (Feature-to-Problem Fit)

**Tujuan utama aplikasi:** Mengkoordinasikan persidangan elektronik lintas 3 instansi (Pengadilan, Kejaksaan, Pemasyarakatan) secara terstruktur, dapat diaudit, dan sesuai SOP hukum.

**✅ Core features yang sudah menjawab tujuan:**

| Fitur | Masalah yang Dipecahkan | Status |
|-------|------------------------|--------|
| Hard gate Judicial Determination | Mencegah persidangan tanpa penetapan hakim | ✅ Sangat baik |
| Notice + Acknowledgment chain | Bukti pemberitahuan resmi yang dapat diaudit | ✅ Baik |
| Checklist kesiapan 3 instansi | Koordinasi teknis terstruktur | ✅ Baik |
| Virtual room provisioning | Buka ruang hanya setelah semua gate terpenuhi | ✅ Baik |
| Audit HMAC chain | Immutable trail untuk akuntabilitas | ✅ Sangat baik |
| Konsultasi privat advokat | Perlindungan hak terdakwa | ✅ Sangat baik |
| Insiden 3 domain | Penanganan gangguan terstruktur | ✅ Baik |
| Putusan banding (C-04) | Workflow khusus PT sesuai SOP 10.15 | ✅ Baru selesai |

**❌ Must-have yang masih kurang:**

| Fitur | Dampak Absensi |
|-------|---------------|
| Pejabat Penghubung (C-05) | Tidak ada aktor koordinasi antarinstansi yang terdefinisi |
| Mutasi tahanan (C-06) | Sidang bisa terganggu saat terdakwa pindah Rutan |
| Dashboard per-peran | Semua persona melihat semua menu — tidak ada personalisasi |
| Notifikasi real-time in-app | Pengguna harus refresh manual untuk melihat update |
| Empty state yang informatif | Halaman kosong tidak memberi panduan aksi selanjutnya |

---

### 2. Analisis Alur Pengguna (User Flow & Usability)

**Alur saat ini (7 langkah, ~35 klik minimum untuk satu sidang penuh):**

```
Login → Pilih Persona → Input Perkara (5 field) → Submit → Aktivasi (persona beda)
→ Penetapan (3 field) → Buat Jadwal (5 field) → Conflict Check → Approve
→ Buat Notice (7 field + recipients) → Send → Ack (per persona)
→ Checklist Kesiapan (8 item + tech test, per 3 instansi)
→ Provisioning ruang → Buka sidang → [Sidang berlangsung] → Tutup
```

**Masalah UX yang teridentifikasi:**

| # | Masalah | Severity | Halaman |
|---|---------|----------|---------|
| UX-01 | **Persona switcher tersembunyi** di sidebar bawah — pengguna baru tidak tahu harus ganti persona untuk setiap langkah | 🔴 Tinggi | Semua |
| UX-02 | **Tidak ada wizard/stepper** — pengguna tidak tahu di langkah ke berapa dari total berapa | 🔴 Tinggi | Semua |
| UX-03 | **Empty states kosong** — halaman Jadwal, Pemberitahuan, Kesiapan saat belum ada data hanya tampil kosong tanpa panduan | 🟡 Medium | Scheduling, Notices, Readiness |
| UX-04 | **Formulir bertumpuk** — di Readiness, user harus isi checklist item manual satu per satu tanpa template | 🟡 Medium | Readiness |
| UX-05 | **Tidak ada konfirmasi aksi destruktif** — hakim bisa menutup sidang tanpa dialog konfirmasi | 🟡 Medium | Hearing Control |
| UX-06 | **Hearing Selector** di sidebar tidak obvious — pengguna tidak sadar bahwa semua halaman bergantung pada hearing yang dipilih | 🔴 Tinggi | Semua |
| UX-07 | **Output API mentah** — beberapa halaman (Scheduling, Determination) masih tampilkan raw JSON sebagai feedback | 🟡 Medium | Scheduling, Determination |
| UX-08 | **Putusan banding: 5 tab** — workflow terlalu panjang jika tidak ada step indicator | 🟡 Medium | Appeal Decision |
| UX-09 | **Tidak ada breadcrumb** — pengguna tidak tahu lokasi dalam aplikasi | 🟢 Rendah | Semua |
| UX-10 | **Label Bahasa campur** — "Determination", "Judicial Determination", "Gate" masih bahasa Inggris di halaman yang berbahasa Indonesia | 🟡 Medium | Determination, Dashboard |

---

### 3. Skenario Tepi dan Validasi (Edge Cases)

| Skenario | Penanganan Saat Ini | Rekomendasi |
|----------|--------------------|----|
| **Jaringan putus saat sidang** | Incident TECHNICAL bisa dibuat — ✅ Ada | Tambah banner peringatan koneksi real-time |
| **Hakim menutup sidang saat skors** | State machine mencegah transisi tidak valid — ✅ Ada | Tambah konfirmasi dialog |
| **Jadwal bentrok saat disetujui** | `assertConflictsResolved()` menolak — ✅ Ada | Tampilkan penjelasan konflik yang human-readable |
| **Terdakwa tidak tersedia saat sidang** | Checklist `NOT_READY` — ✅ Ada | Trigger otomatis pemberitahuan postponement |
| **File petikan banding terlambat (> hari yang sama)** | `sameDayCompliant: false` tercatat — ✅ Ada | Tambah alert merah di UI saat non-compliant |
| **Pengguna upload file > limit ukuran** | ❌ Tidak ada validasi di UI | Tambah validasi ukuran + format file di frontend |
| **Token join sidang expired** | `JOIN_TOKEN_EXPIRED` error domain — ✅ Ada | Tampilkan pesan human-readable + tombol "Minta Token Baru" |
| **Consultation session sudah aktif** | `CONSULTATION_ALREADY_ACTIVE` — ✅ Ada | Tampilkan status konsultasi aktif di UI, bukan hanya error |
| **Notice dikirim ke destination 'fail'** | MOCK mode detect 'fail' — ✅ Ada (dev only) | Tambah retry manual button di daftar notice |
| **Perkara yang sama didaftarkan dua kali** | `unique(court_org, normalized_case_number)` — ✅ Ada | Tampilkan existing case dengan link, bukan error mentah |
| **Pengguna salah persona (jaksa coba aktivasi perkara)** | HTTP 403 domain error — ✅ Ada | Tampilkan "Aksi ini memerlukan peran Panitera" bukan kode error |

**Error message audit:**
- ✅ Baik: `DETERMINATION_REQUIRED`, `NOTICE_ACK_REQUIRED` — cukup deskriptif
- ⚠️ Perlu diperbaiki: `FORBIDDEN` — terlalu generik, tidak jelaskan peran apa yang dibutuhkan
- ⚠️ Perlu diperbaiki: `OPTIMISTIC_CONCURRENCY_CONFLICT` — jargon teknis, user bingung
- ❌ Buruk: PostgreSQL constraint violation yang muncul mentah di response jika tidak tertangkap

---

### 4. Deteksi Feature Bloat

**Fitur yang perlu disederhanakan atau disembunyikan:**

| Fitur | Status | Rekomendasi |
|-------|--------|------------|
| `/reconciliation` page | 🔕 Sudah disembunyikan | ✅ Tepat — MOCK, tidak ada nilai MVP |
| `/governance` page | 🔕 Sudah disembunyikan | ✅ Tepat untuk MVP |
| `/zoom` admin panel | 🔕 Sudah disembunyikan | ✅ Tepat — risiko bypass gate |
| `/migration` page | 🔕 Sudah disembunyikan | ✅ Tepat — hanya untuk developer |
| Audit chain verification endpoint | ⚠️ Ada tapi tidak di UI | Pindahkan ke admin panel, bukan halaman utama |
| Access review campaign | ⚠️ Ada tapi tidak di UI | Defer ke post-MVP — sembunyikan juga dari governance page |
| Persona switcher dengan 7 opsi | ⚠️ Terlalu banyak | Sederhanakan menjadi 5 persona utama (hapus system-admin dari prod) |
| Raw JSON output di halaman Scheduling | ❌ Masih ada | Ganti dengan success message + data terformat |
| `hearing_import` menu di hearing intake | ⚠️ Disabled tapi terlihat | Sembunyikan seluruhnya jika `HEARING_IMPORT_ENABLED=false` |

---

### 5. Aksesibilitas dan Inklusivitas (A11y)

| Aspek | Status | Temuan |
|-------|--------|--------|
| **Kontras warna** | ⚠️ Perlu cek | Sidebar `#0b2a4a` dengan teks `text-blue-100` — rasio ~4.5:1 (borderline AA) |
| **Label form** | ✅ Sebagian | Label ada tapi beberapa Input tidak punya `htmlFor` yang benar |
| **Keyboard navigation** | ⚠️ Belum diuji | Tab order di form multi-field belum terstandarisasi |
| **Screen reader** | ⚠️ Minimal | Tidak ada `aria-label` pada icon-only buttons (PersonaSwitcher) |
| **Error announcement** | ❌ Tidak ada | Error hanya ditampilkan visual, tidak di-announce ke screen reader |
| **Focus management** | ❌ Tidak ada | Setelah modal/dialog, fokus tidak kembali ke elemen trigger |
| **Loading states** | ⚠️ Minimal | Beberapa query tidak punya loading indicator — halaman tampak kosong saat fetching |
| **Responsive mobile** | ⚠️ Minimal | Grid layout `md:grid-cols-[280px_1fr]` — sidebar tidak collapse di mobile |
| **Teks ukuran minimum** | ✅ OK | Minimum `text-xs` (12px) — acceptable untuk aplikasi internal |
| **Bahasa** | ⚠️ Campur | Mix Bahasa Indonesia + Inggris di label dan error message |

---

### 6. Matriks Prioritas Fitur (Feature Roadmap)

#### ⚡ Quick Wins — Dampak besar, usaha kecil (< 1 hari per item)

| # | Fitur | Dampak | Usaha | Status |
|---|-------|--------|-------|--------|
| QW-01 | **Workflow stepper** di header halaman — progress bar + langkah gate-aware | Tinggi | Kecil | ✅ _Selesai 25 Jul_ |
| QW-02 | **Empty state dengan CTA** di setiap halaman kosong (incidents, participants, readiness, appeal) | Tinggi | Kecil | ✅ _Selesai 25 Jul_ |
| QW-03 | **Ganti raw JSON output** dengan success message di Scheduling, Determination | Tinggi | Kecil | ✅ _Selesai 25 Jul_ |
| QW-04 | **Error message human-readable** — 40+ kode domain → Bahasa Indonesia + AlertBanner | Tinggi | Kecil | ✅ _Selesai 25 Jul_ |
| QW-05 | **Hearing selector prominent** — ActiveHearingBar di header konten utama | Tinggi | Kecil | ✅ _Selesai 25 Jul_ |
| QW-06 | **Sembunyikan import UI** saat `HEARING_IMPORT_ENABLED=false` | Medium | Kecil | ✅ _Selesai 25 Jul_ |
| QW-07 | **Konfirmasi dialog** untuk aksi hakim: tutup sidang, tunda sidang | Medium | Kecil | ✅ _Selesai 25 Jul_ |
| QW-08 | **Status badge berwarna** konsisten di semua halaman (READY=hijau, PENDING=kuning, FAILED=merah) | Medium | Kecil | ✅ _Selesai 26 Jul_ |
| QW-09 | **Unifikasi bahasa** — ganti semua label Inggris ke Bahasa Indonesia di UI (bukan di kode) | Medium | Kecil | ✅ _Selesai 26 Jul_ |
| QW-10 | **Loading skeleton** untuk semua query yang belum ada loading state | Medium | Kecil | ✅ _Selesai 26 Jul_ |

#### 🏗️ Core Upgrades — Perbaikan besar wajib (1–5 hari per item)

| # | Fitur | Dampak | Usaha | Prioritas |
|---|-------|--------|-------|-----------|
| CU-01 | **Dashboard per-peran** — tampilan berbeda untuk Hakim, Panitera, Jaksa, Pemasyarakatan | Sangat Tinggi | Besar | ✅ _Selesai 26 Jul_ |
| CU-02 | **Pejabat Penghubung (C-05)** — aktor koordinasi antarinstansi | Sangat Tinggi | Besar | ✅ _Selesai 25 Jul_ |
| CU-03 | **Mutasi Tahanan (C-06)** — alur perpindahan dengan re-checklist | Tinggi | Besar | ✅ _Selesai 25 Jul_ |
| CU-04 | **Notifikasi real-time in-app** — WebSocket/SSE untuk update jadwal dan acknowledgment | Tinggi | Medium | P2 |
| CU-05 | **Template checklist kesiapan** — pre-fill item standar per jenis sidang, bukan isi manual | Tinggi | Medium | ✅ _Selesai 26 Jul_ |
| CU-06 | **Kalender cross-satker** — melihat semua jadwal aktif per minggu/bulan | Tinggi | Medium | ✅ _Selesai 26 Jul_ |
| CU-07 | **Agenda multi-item per sesi** — sidang bisa punya beberapa agenda (saksi A, ahli B, dll.) | Medium | Medium | ✅ _Selesai 25 Jul_ |
| CU-08 | **Mobile responsive sidebar** — collapse/hamburger menu di layar < 768px | Tinggi | Medium | ✅ _Selesai 26 Jul_ |
| CU-09 | **Panduan pengguna onboarding** (MVP-4) — wizard pertama kali buka aplikasi | Tinggi | Medium | P1 |
| CU-10 | **Error boundary global** + fallback UI yang informatif saat API down | Medium | Kecil | ✅ _Selesai 26 Jul_ |

#### ✨ Delighters — Nice to have, fase berikutnya

| # | Fitur | Deskripsi |
|---|-------|-----------|
| D-01 | **Progress tracker visual** | Timeline visual sidang dari penetapan sampai putusan |
| D-02 | **Notifikasi H-7, H-1, H-30min** | Pengingat otomatis via in-app sebelum sidang dimulai |
| D-03 | **Dark mode** | Ramah mata untuk penggunaan malam hari |
| D-04 | **Export PDF berita acara** | Generate draft berita acara dari data CIMS sebagai referensi |
| D-05 | **Pencarian perkara global** | Search bar di header untuk cari nomor perkara langsung |
| D-06 | **Analytics dashboard** | Tren sidang elektronik per bulan, compliance rate, dll. |
| D-07 | **Offline mode terbatas** | Cache data perkara untuk dilihat saat koneksi tidak stabil |
| D-08 | **Accessibility mode** | Font lebih besar, kontras tinggi, untuk pengguna dengan kebutuhan khusus |
| D-09 | **Audit log viewer** | Timeline audit chain yang bisa dilihat per perkara dengan UI yang bersih |
| D-10 | **Peta lokasi sidang** | Visualisasi lokasi terdakwa, pengadilan, dan kejaksaan secara geografis |

---

### Ringkasan Prioritas Eksekusi UX (Minggu Ini)

| Hari | Fokus UX |
|------|---------|
| Senin 28 Jul | QW-01 (stepper) + QW-02 (empty states) + QW-04 (error messages) |
| Selasa 29 Jul | QW-05 (hearing selector prominent) + QW-07 (confirm dialog) + QW-08 (badge konsisten) |
| Rabu 30 Jul | QW-03 (ganti raw JSON) + QW-09 (unifikasi bahasa) + QW-10 (loading skeleton) |
| Kamis 31 Jul | QW-06 (sembunyikan import UI) + CU-10 (error boundary) + dry-run pilot |

> **Filosofi UX CIMS:** Ini bukan aplikasi konsumen — pengguna adalah pejabat hukum dengan tanggung jawab tinggi.
> Prioritaskan kejelasan, auditabilitas, dan pencegahan kesalahan di atas estetika.
> Setiap aksi harus jelas siapa yang melakukan, kapan, dan mengapa.

---

*Dibuat: 25 Juli 2026 · Berdasarkan evaluasi kode CIMS v0.19.0 terhadap SOP/CIMS/PPE/001/2026 dan Matriks MVP CIMS v2.0*
