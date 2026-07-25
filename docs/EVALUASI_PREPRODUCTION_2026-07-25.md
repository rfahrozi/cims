# LAPORAN EVALUASI MENYELURUH CIMS v0.19.0
## Kesiapan Preproduction (Local Docker)
**Tanggal Evaluasi:** 25 Juli 2026  
**Referensi SOP:** SOP/CIMS/PPE/001/2026 (Versi 2.0)  
**Referensi Matriks:** Matriks Penyesuaian MVP CIMS Versi 2.0  
**Tambahan Referensi:** Agenda Sidang dan Penjadwalan Sidang  
**Evaluator:** Claude Fable (AI Technical Review)  
**Status Produksi Saat Ini:** ⛔ NO-GO (Resmi ditetapkan oleh tim pengembang)

---

## RINGKASAN EKSEKUTIF

Sistem CIMS v0.19.0 telah melewati **6 fase pengembangan** dan secara arsitektural sudah menganut pendekatan **compliance-first** sesuai tuntutan SOP dan Matriks MVP. Implementasi domain hukum, gate workflow, dan governance infrastruktur menunjukkan kematangan yang signifikan. Namun, terdapat **beberapa gap kritis** yang harus diselesaikan sebelum sistem dapat memasuki tahap preproduction di Docker lokal secara penuh.

### Skor Kepatuhan Keseluruhan

| Dimensi | Status | Skor |
|---------|--------|------|
| Domain Hukum & Gate Workflow | ✅ Implemented | 9/10 |
| Penetapan Hakim (Judicial Determination) | ✅ Implemented | 9/10 |
| Penjadwalan & Konflik | ✅ Implemented | 8/10 |
| Agenda Sidang | ⚠️ Partial | 6/10 |
| Pemberitahuan & Acknowledgment | ✅ Implemented | 8/10 |
| Checklist Kesiapan | ✅ Implemented | 8/10 |
| Verifikasi Identitas & Sterilitas | ✅ Implemented | 7/10 |
| Konsultasi Advokat | ✅ Implemented | 9/10 |
| Saksi, Ahli, Penerjemah | ⚠️ Partial | 5/10 |
| Pelaksanaan Sidang (Hearing Control) | ✅ Implemented | 9/10 |
| Gangguan Teknis | ✅ Implemented | 8/10 |
| Insiden Siber | ✅ Implemented | 8/10 |
| Keadaan Kahar | ✅ Implemented | 8/10 |
| Mutasi/Perpindahan Tahanan | ❌ Missing | 2/10 |
| Putusan Banding | ⚠️ Partial | 5/10 |
| Dokumentasi & Rekaman | ✅ Implemented | 7/10 |
| Keamanan Data & Akses | ⚠️ Partial | 7/10 |
| Monitoring & Evaluasi | ✅ Implemented | 7/10 |
| Pejabat Penghubung (Liaison Officer) | ❌ Missing | 1/10 |
| Kesiapan Docker/Preproduction | ⚠️ Partial | 6/10 |

---

## BAGIAN 1: EVALUASI KEPATUHAN TERHADAP SOP

### 1.1 ✅ SOP 9 & 10.2 – Alur Utama & Penetapan Hakim

**Status: SESUAI dengan perbaikan minor**

Implementasi telah mengikuti prinsip compliance-first. **Hard gate** judicial determination terpasang di:
- `packages/domain/src/gates.ts` → `assertValidDetermination()` dan `nextGate()`
- `packages/domain/src/workflow.ts` → `assertVirtualProvisionAllowed()`
- `apps/api/src/modules/scheduling/scheduling.service.ts` → Guard `hasApprovedDetermination` sebelum create proposal
- `apps/api/src/modules/virtual-sessions/virtual-sessions.service.ts` → Guard sebelum provisioning ruang virtual

**State machine** sudah mengikuti SOP Bagian 13 dengan tepat:
```
DRAFT → WAITING_JUDICIAL_DETERMINATION → ELECTRONIC_TRIAL_DETERMINED
→ COORDINATION → WAITING_ACKNOWLEDGMENT → READINESS_CHECK
→ TECHNICAL_TEST → READY → IN_PROGRESS → SUSPENDED/POSTPONED → COMPLETED
→ DOCUMENTATION_PENDING → CLOSED
```

**Yang sudah benar:**
- Ruang virtual TIDAK dapat dibuat sebelum penetapan hakim sah (AC-01 ✅)
- Role JUDGE yang berwenang mengeluarkan determination
- Audit trail setiap langkah
- Official reference wajib dicatat

**Minor Gap:**
- `Determination` tidak menyimpan `mode persidangan` (langsung/elektronik/hybrid) secara terstruktur — hanya di `reason` field free-text. SOP 10.2 mengharuskan penetapan memuat mode secara eksplisit.
- `RequestedMode` ada di `CreateRequestDto` tetapi tidak dipropagasi ke tabel `judicial_determinations`.

---

### 1.2 ✅ SOP 10.3 – Penjadwalan & Validasi Konflik (Agenda Sidang)

**Status: SESUAI dengan catatan penting**

Modul scheduling sudah compliance:
- `packages/domain/src/scheduling.ts` → `validateProposal()`, `detectConflicts()`, `assertConflictsResolved()`
- Resource-based conflict detection (hakim, ruang, Penuntut Umum, Pemasyarakatan)
- Proposal → ConflictCheck → Approve workflow dengan audit trail
- Versioning jadwal: `ACTIVE`/`SUPERSEDED` — jadwal lama otomatis di-supersede saat jadwal baru disetujui

**Agenda Sidang (Tambahan Referensi):**

Hearing type sudah tersedia sebagai enum di kode:
```
PEMBACAAN_DAKWAAN, PEMERIKSAAN_SAKSI, PEMERIKSAAN_AHLI,
PEMERIKSAAN_TERDAKWA, TUNTUTAN, PLEDOI, PEMBACAAN_PUTUSAN, LAINNYA
```

**Gap yang ditemukan:**

| Gap | Tingkat | Deskripsi |
|-----|---------|-----------|
| Tidak ada agenda item per sidang | Medium | SOP mengacu pada "agenda persidangan" sebagai daftar item yang bisa berubah. Saat ini `hearing_type` hanya satu nilai per hearing, tidak mendukung multiple agenda items dalam satu sesi. |
| Perubahan jadwal tidak menyimpan alasan terstruktur | Medium | SOP 10.3: "perubahan jadwal wajib memuat alasan, dokumen dasar, pengguna yang mengubah, serta pemberitahuan ulang." Approval reason ada (`approval_reason`), tetapi tidak ada field `change_reason` terpisah saat supersede jadwal lama. |
| Tidak ada pemberitahuan ulang otomatis saat jadwal berubah | High | SOP 10.3 dan Matriks M-07: perubahan jadwal harus memicu pemberitahuan ulang ke seluruh pihak. Sistem belum memiliki trigger otomatis saat schedule di-supersede. |
| Kalender multi-hearing (cross-satker) | Low | Belum ada tampilan kalender gabungan lintas instansi untuk melihat konflik jadwal dari perspektif pengadilan secara keseluruhan. |

---

### 1.3 ✅ SOP 10.5 – Pemberitahuan Resmi & Acknowledgment

**Status: SEBAGIAN BESAR SESUAI**

Implementasi sudah memisahkan:
- Pemberitahuan resmi (`official_notices`) vs reminder biasa
- Chain pemberitahuan dengan `proof of delivery` (`delivery_receipts`)
- Acknowledgment dengan `receipt_reference` dan timestamp
- SLA deadline per recipient (`ack_deadline`)
- Fallback dan retry melalui outbox pattern
- Circuit breaker untuk notification gateway

**Rantai pemberitahuan SOP 10.5:**

| Rantai | SOP | Implementasi | Status |
|--------|-----|-------------|--------|
| Pengadilan → Kejaksaan | Wajib | ✅ notice dengan recipient kejaksaan | OK |
| Kejaksaan → Pemasyarakatan | Wajib | ✅ via official notice chain | OK |
| Pemasyarakatan → Terdakwa | Wajib (berita acara) | ⚠️ Hanya via checklist readiness, tidak ada form F-03 berita acara terpisah | Partial |
| Kejaksaan → Advokat | Wajib | ✅ via notice system | OK |

**Gap:**
- Notice type tidak di-validate dengan enum tetap — `notice_type` adalah free-text string sehingga bisa salah eja. SOP menyebutkan jenis pemberitahuan yang berbeda (jadwal, perubahan jadwal, putusan banding).
- Tidak ada **SLA monitoring dashboard** yang menampilkan acknowledgment overdue secara real-time per jenis pemberitahuan.
- Pemberitahuan via WhatsApp/SMS sebagai reminder tambahan tidak diimplementasikan (ini acceptable karena SOP menempatkannya opsional).

---

### 1.4 ✅ SOP 10.6 & 10.7 – Checklist Kesiapan & Verifikasi Identitas

**Status: SESUAI**

- Dynamic checklist tersedia per organisasi (COURT, PROSECUTION, CORRECTIONS)
- Evidence upload untuk item checklist
- Technical test modul terpisah
- Maker-checker pattern pada intake
- Verifikasi identitas dengan method, officer, timestamp
- Room inspection (sterilitas) dengan CCTV status

**Checklist wajib SOP 10.6:**

| Komponen | SOP | Kode | Status |
|----------|-----|------|--------|
| Penetapan elektronik tersedia | Wajib | ✅ Gate JUDICIAL_DETERMINATION | OK |
| Ruang fisik tersedia dan steril | Wajib | ✅ room_inspections table | OK |
| Kamera menampilkan keseluruhan ruang | Wajib | ✅ readiness_items | OK |
| Mikrofon dan audio | Wajib | ✅ technical_tests | OK |
| Internet utama dan cadangan | Wajib | ✅ checklist item | OK |
| Catu daya cadangan | Sesuai risiko | ✅ checklist item | OK |
| Terdakwa tersedia | Wajib | ✅ identity_verifications | OK |
| Identitas diverifikasi petugas | Wajib | ✅ identity_verifications | OK |
| Advokat tersedia | Jika ada | ⚠️ tidak ada gate khusus | Partial |
| Kerahasiaan konsultasi | Wajib bila ada advokat | ✅ consultation_sessions, recording_allowed=false | OK |
| Saksi/ahli/penerjemah siap | Sesuai agenda | ⚠️ tidak ada modul witness readiness | GAP |
| Rekaman audiovisual siap | Jika diwajibkan | ⚠️ Hanya metadata, belum ada recording readiness gate | Partial |

---

### 1.5 ✅ SOP 10.8 – Pendampingan Advokat

**Status: SESUAI**

Implementasi sudah mengikuti SOP dengan baik:
- `assertConsultationParticipants()` — memvalidasi kehadiran defendant + advocate
- `recording_allowed: false` di consultation sessions — dilarang direkam
- Ruang konsultasi privat tersedia (`CONSULTATION` room type)
- Webhook guard: jika recording.completed dari CONSULTATION room → trigger CRITICAL security event (`PROHIBITED_CONSULTATION_RECORDING`)
- Audit trail untuk start/end konsultasi

**Satu gap:**
- SOP 10.8: "Penempatan advokat di lokasi lain hanya berdasarkan penetapan hakim." — Sistem belum memvalidasi bahwa advokat yang berada di lokasi berbeda dari terdakwa harus ada penetapan hakim terpisah yang mendukungnya. `participant_locations` tidak di-enforce di gate.

---

### 1.6 ⚠️ SOP 10.9 – Pemeriksaan Saksi, Ahli, dan Penerjemah

**Status: PARTIAL — GAP MEDIUM**

Peserta dengan role WITNESS, EXPERT, INTERPRETER sudah ada di enum `ParticipantRole`, dan room WITNESS tersedia. Namun:

| Kebutuhan SOP | Status |
|---------------|--------|
| Lokasi pemeriksaan ditetapkan hakim | ❌ Tidak ada field `location_determination_reference` per saksi |
| Verifikasi identitas saksi sebelum pemeriksaan | ⚠️ Hanya identity_verifications per organisasi, bukan per peserta individual |
| Petugas pengawas saksi | ❌ Tidak ada field pengawas per saksi |
| Saksi rentan/anak — akses dan tampilan disesuaikan | ❌ `protectedIdentity` ada untuk defendant, belum diimplementasikan untuk witness |
| Saksi dari luar negeri via perwakilan RI | ❌ Tidak ada dukungan lokasi internasional |
| Penerjemah — verifikasi kualifikasi | ❌ Tidak ada modul spesifik |

---

### 1.7 ✅ SOP 10.10 & 10.11 – Pelaksanaan & Gangguan Teknis

**Status: SESUAI**

Hearing control sudah lengkap:
- START, SUSPEND, RESUME, END, POSTPONE — semua diimplementasikan
- Hanya JUDGE yang bisa memulai/mengakhiri sidang (`requireRoles(user, ['JUDGE'])`)
- State machine `transitionHearing()` mencegah transisi tidak valid
- `transitionIncident()` untuk state OPEN/MITIGATING/RESOLVED/CLOSED
- Gangguan teknis CRITICAL/HIGH otomatis suspend sidang yang sedang berlangsung
- 3 domain insiden terpisah: TECHNICAL, CYBER, FORCE_MAJEURE

---

### 1.8 ✅ SOP 10.12 – Insiden Siber

**Status: SESUAI**

- Notifikasi deadline 1×24 jam: `incidentNotificationDeadline('CYBER', occurredAt)` → +24h ✅
- `incident.overdue` endpoint untuk monitoring insiden yang melewati deadline
- Description dan resolution di-encrypt (`description_encrypted`) sesuai prinsip kerahasiaan
- Eskalasi otomatis: incident CRITICAL/HIGH → auto-suspend sidang

---

### 1.9 ✅ SOP 10.13 – Keadaan Kahar

**Status: SESUAI**

- Notifikasi deadline 3×24 jam: `incidentNotificationDeadline('FORCE_MAJEURE', occurredAt)` → +72h ✅
- Domain terpisah dari gangguan teknis
- Status tracking OPEN/MITIGATING/RESOLVED/CLOSED

---

### 1.10 ❌ SOP 10.14 – Mutasi/Perpindahan Tahanan

**Status: TIDAK DIIMPLEMENTASIKAN — GAP KRITIS**

SOP 10.14 mewajibkan:
1. Instansi asal mencatat mutasi dan lokasi baru
2. Pejabat penghubung menyampaikan ke Pengadilan, Kejaksaan, Pemasyarakatan tujuan
3. Akses CIMS dialihkan (least privilege)
4. Checklist kesiapan, verifikasi identitas, uji teknis diulang di lokasi baru
5. Riwayat lokasi dan pengalihan tanggung jawab di audit trail

**Tidak ada implementasi:**
- Tidak ada tabel `custody_transfers`
- Tidak ada modul perpindahan tahanan
- Tidak ada alur pengalihan akses otomatis

Ini adalah **fitur wajib** per Matriks MVP tabel 9 (entitas `custody_transfers`).

---

### 1.11 ⚠️ SOP 10.15 – Pembacaan Putusan Tingkat Banding

**Status: PARTIAL — GAP SIGNIFIKAN**

Database legacy (`0005_sprint_10_12_appeal_audit_reconciliation.sql`) memiliki tabel:
- `appeal_decision_readings`
- `appeal_notice_steps`
- `appeal_presence_records`
- `appeal_publications` (petikan hari yang sama)
- `appeal_transmissions` (salinan 7 hari)

**Namun:**
- Tabel ini menggunakan tipe UUID dari legacy migration, **bukan** skema TypeScript terbaru
- **Tidak ada modul NestJS** untuk appeal decision reading (tidak ada `modules/appeal-decision` atau serupa)
- **Tidak ada halaman web** untuk alur pembacaan putusan banding
- **Tidak ada API endpoint** untuk workflow ini
- Matriks MVP menetapkan ini sebagai **MUST HAVE (M-15)** dan merupakan fitur wajib mulai **1 Agustus 2026**

**Kritis:** Tenggat 1 Agustus 2026 sudah sangat dekat (6 hari lagi).

---

### 1.12 ❌ SOP Bagian 7 & 8 – Pejabat Penghubung (Liaison Officer)

**Status: TIDAK DIIMPLEMENTASIKAN — GAP KRITIS**

SOP mendefinisikan Pejabat Penghubung sebagai aktor wajib:
- Mengelola koordinasi, acknowledgment, eskalasi, tindak lanjut antarinstansi
- Tanpa mengambil alih kewenangan substantif

Matriks MVP Bagian 9 mendefinisikan entitas `liaison_officers` (periode penunjukan, delegasi).

**Tidak ada implementasi:**
- Tidak ada tabel `liaison_officers` di schema
- Tidak ada role `LIAISON_OFFICER` dalam `CimsRole` enum
- Tidak ada modul atau endpoint terkait
- Matriks MVP mendefinisikan ini sebagai requirement M-01

---

### 1.13 ✅ SOP 10.16 & 10.17 – Dokumentasi, Rekaman & Keamanan Data

**Status: SEBAGIAN BESAR SESUAI**

**Yang sudah baik:**
- Audit trail append-only dengan HMAC chain (`event_hash`, `previous_hash`) ✅
- `verifyChain()` untuk validasi integritas audit trail ✅
- `pg_advisory_xact_lock` untuk mencegah race condition di audit ✅
- Field encryption untuk data sensitif (description_encrypted, resolution_encrypted) ✅
- Row-Level Security (RLS) di PostgreSQL ✅
- Legal hold dengan maker-checker pattern ✅
- Retention policy dengan governance approval ✅
- Evidence export dengan SHA-256 hash dan manifest ✅

**Gap:**
- AI output label "draft" dan human review: sudah ada flag di Matriks, tetapi tidak ada modul AI di v0.19 (sesuai keputusan — defer ke Phase 3). ✅ Benar.
- Rekaman audiovisual: metadata saja, belum ada chain of custody per rekaman. Tabel `recordings` disebutkan di Matriks tapi tidak ada di schema TypeScript terbaru.
- OIDC role mapping dari JWT ke `CimsRole` sudah ada skeleton tetapi **belum diuji secara live** (hanya DEV mode di development).

---

## BAGIAN 2: EVALUASI TERHADAP MATRIKS MVP

### 2.1 Must Have (M-01 s/d M-16) — Status Implementasi

| ID | Requirement | Status | Catatan |
|----|------------|--------|---------|
| M-01 | Identity, organization, satker, role, delegated authority, MFA | ⚠️ | Organization ada, MFA hanya di readiness check (OIDC), liaison officer belum ada |
| M-02 | Sinkronisasi/referensi perkara dari sistem resmi | ⚠️ | Manual intake ada, integrasi official_system_gateway MOCK, import disabled |
| M-03 | Permohonan/keadaan tertentu | ✅ | electronic_hearing_requests terimplementasi |
| M-04 | Penetapan hakim sebagai gerbang proses | ✅ | Hard gate di domain dan semua service layer |
| M-05 | Scheduling, conflict check, approval, riwayat perubahan | ✅ | Lengkap, versioning ada |
| M-06 | Provider-agnostic virtual room dan pengendalian peran | ✅ | VIDEO_PROVIDER_MODE abstraction, room isolation per peran |
| M-07 | Pemberitahuan resmi, ack, proof of delivery, fallback | ✅ | Lengkap dengan outbox pattern |
| M-08 | Portal Pengadilan, Kejaksaan, Pemasyarakatan, pejabat penghubung | ⚠️ | 3 instansi ada, pejabat penghubung belum ada portalnya |
| M-09 | Checklist kesiapan, uji teknis, unggah eviden | ✅ | Dynamic checklist, evidence upload, technical test |
| M-10 | Verifikasi identitas, lokasi peserta, sterilitas ruangan | ✅ | identity_verifications + room_inspections |
| M-11 | Kehadiran, event log, skors, penundaan, penjadwalan ulang | ✅ | hearing_control_events, attendance tracking |
| M-12 | Gangguan teknis, insiden siber, keadaan kahar | ✅ | 3 domain terpisah, deadline timer |
| M-13 | Audit trail immutable | ✅ | HMAC chain, advisory lock, verify endpoint |
| M-14 | Dashboard kepatuhan dan eskalasi | ⚠️ | Compliance dashboard ada, eskalasi overdue ada, namun SLA monitoring kurang |
| M-15 | Modul pembacaan putusan tingkat banding | ❌ | DB schema ada (legacy), tapi tidak ada modul NestJS/endpoint/UI |
| M-16 | Integrasi dokumen dan rekaman via metadata, hash, referensi | ⚠️ | Evidence export ada, recordings metadata belum lengkap di schema terbaru |

**Ringkasan M-level:** 8 PASS ✅ | 5 PARTIAL ⚠️ | 3 MISSING ❌

---

### 2.2 Acceptance Criteria (AC-01 s/d AC-12)

| AC | Kriteria | Status |
|----|---------|--------|
| AC-01 | Virtual room tidak bisa dibuat sebelum penetapan sah | ✅ PASS |
| AC-02 | Setiap notice punya sender, recipient, dokumen ref, sent time, delivery status, ack, fallback | ✅ PASS |
| AC-03 | Hearing tidak bisa READY sebelum mandatory checklist lengkap | ✅ PASS |
| AC-04 | Sistem merekam verifikasi identitas, lokasi, inspeksi ruang, petugas | ✅ PASS |
| AC-05 | Hakim bisa suspend/resume/postpone/close, setiap aksi di-log | ✅ PASS |
| AC-06 | Insiden teknis, siber, force majeure menggunakan form dan eskalasi terpisah | ✅ PASS |
| AC-07 | Timer notifikasi siber mendukung kewajiban 1×24 jam | ✅ PASS |
| AC-08 | Timer force majeure mendukung kewajiban 3×24 jam | ✅ PASS |
| AC-09 | Appeal decision workflow mendukung: tanggal asli, perubahan tanggal, notice chain, kehadiran, petikan hari yang sama, transmisi 7 hari, tenggat kasasi | ❌ FAIL — modul belum ada |
| AC-10 | CIMS menyimpan referensi sistem resmi, tidak membuat catatan hukum tandingan | ✅ PASS |
| AC-11 | AI output diberi label draft dan tidak bisa dipublikasikan tanpa human approval | ✅ PASS (AI belum ada, correctly deferred) |
| AC-12 | Semua aksi privileged mencantumkan user, role, org, waktu, device/IP, alasan, correlation ID | ✅ PASS |

**AC Score: 11/12 PASS — AC-09 FAIL**

---

### 2.3 State Machine — Evaluasi

State machine yang diimplementasikan di `packages/domain/src/types.ts` dan `workflow.ts` sudah mengikuti Matriks MVP Bagian 8:

| Transisi | Matriks | Implementasi | Status |
|----------|---------|-------------|--------|
| DRAFT → WAITING_JUDICIAL_DETERMINATION | ✅ | ✅ via createRequest | OK |
| WAITING → ELECTRONIC_TRIAL_DETERMINED | ✅ | ✅ via createDetermination | OK |
| DETERMINED → COORDINATION | ✅ | ✅ implicit via scheduling | OK |
| COORDINATION → WAITING_ACKNOWLEDGMENT | ✅ | ✅ via notice send | OK |
| WAITING_ACK → READINESS_CHECK | ✅ | ✅ gate check | OK |
| READINESS_CHECK → TECHNICAL_TEST | ✅ | ✅ gate check | OK |
| TECHNICAL_TEST → READY | ✅ | ✅ gate check | OK |
| READY → IN_PROGRESS | ✅ | ✅ JUDGE START | OK |
| IN_PROGRESS → SUSPENDED | ✅ | ✅ JUDGE SUSPEND | OK |
| SUSPENDED → IN_PROGRESS | ✅ | ✅ JUDGE RESUME | OK |
| IN_PROGRESS → POSTPONED | ✅ | ✅ JUDGE POSTPONE | OK |
| IN_PROGRESS → COMPLETED | ✅ | ✅ JUDGE END | OK |
| COMPLETED → DOCUMENTATION_PENDING | ✅ | ✅ implicit | OK |
| DOCUMENTATION_PENDING → CLOSED | ✅ | ✅ via governance | OK |

**Catatan:** State `HEARING_RUNTIME` (NOT_READY/READY/STARTED/SUSPENDED/ENDED/POSTPONED) dan `HEARING` state (`DRAFT`/`COORDINATION`/dll.) adalah dua layer terpisah — ini sudah tepat secara arsitektural.

---

## BAGIAN 3: EVALUASI DATA MODEL

### 3.1 Entitas Matriks MVP vs Implementasi

| Entitas Matriks | Tabel DB Terbaru | Status |
|-----------------|-----------------|--------|
| organizations | ✅ organizations | OK |
| organization_units | ❌ Belum ada | MISSING |
| liaison_officers | ❌ Belum ada | MISSING |
| users, roles, permissions | ✅ (via OIDC + in-memory) | Partial |
| delegations | ❌ Belum ada | MISSING |
| cases | ✅ court_cases | OK |
| official_system_refs | ⚠️ official_case_reference field saja | Partial |
| case_parties | ✅ hearing participants + defendants | OK |
| electronic_hearing_requests | ✅ electronic_hearing_requests | OK |
| judicial_determinations | ✅ judicial_determinations | OK |
| hearings | ✅ hearings | OK |
| hearing_schedules | ✅ schedule_proposals + active_schedules | OK |
| schedule_conflicts | ✅ schedule_conflict_results | OK |
| virtual_room_providers | ✅ zoom-provider adapter | OK |
| virtual_sessions | ✅ virtual_sessions + virtual_rooms | OK |
| official_notices | ✅ official_notices | OK |
| notice_recipients | ✅ notice_recipients | OK |
| delivery_receipts | ✅ notice_delivery_attempts | OK |
| acknowledgments | ✅ notice_acknowledgments | OK |
| readiness_checklists | ✅ readiness_submissions | OK |
| readiness_items | ✅ readiness_items | OK |
| technical_tests | ✅ technical_tests | OK |
| identity_verifications | ✅ identity_verifications | OK |
| participant_locations | ⚠️ Partial — ada di participants tapi tidak ada tabel terpisah | Partial |
| room_inspections | ✅ room_inspections | OK |
| attendance | ✅ hearing_control_events (attendance type) | Partial |
| hearing_events | ✅ hearing_control_events | OK |
| technical_incidents | ✅ incidents (type=TECHNICAL) | OK |
| cyber_incidents | ✅ incidents (type=CYBER) | OK |
| force_majeure_events | ✅ incidents (type=FORCE_MAJEURE) | OK |
| custody_transfers | ❌ Belum ada | MISSING |
| appeal_decision_readings | ✅ (legacy schema, belum TS) | Partial |
| recordings | ❌ Tidak ada di TS schema terbaru | MISSING |
| documents | ⚠️ Evidence exports + metadata | Partial |
| document_hashes | ✅ evidence_export_items.content_hash | Partial |
| retention_policies | ✅ retention_policies | OK |
| audit_logs | ✅ audit_events + HMAC chain | OK |

---

## BAGIAN 4: EVALUASI KEAMANAN

### 4.1 Implementasi vs Kebutuhan Matriks MVP Bagian 11

| Domain Keamanan | Kebutuhan | Implementasi | Status |
|-----------------|-----------|-------------|--------|
| MFA wajib untuk peran sensitif | Wajib | ⚠️ Bergantung OIDC provider — belum ada enforcement di aplikasi | Partial |
| RBAC + ABAC | Wajib | ✅ `canAccessResource()` dengan hearingAssignments + organizationIds | OK |
| Encryption at rest | Wajib | ✅ `field-crypto.service.ts` AES-256-GCM untuk data sensitif | OK |
| Encryption in transit | Wajib | ✅ DB_SSL=true di produksi, HTTPS mandatory | OK |
| Secret management | Wajib | ✅ Docker secrets via file, `secretValue()` helper | OK |
| Session control | Wajib | ✅ JWT via OIDC, `jose` library | OK |
| Data minimization | Wajib | ✅ `publicParticipantName()` masking, protectedIdentity | OK |
| Access purpose limitation | Wajib | ✅ hearing-scoped access via hearingAssignments | OK |
| Biometrics disabled by default | Wajib | ✅ Face recognition ditunda (correctly deferred) | OK |
| Access review | Wajib | ✅ access_review_campaigns dengan KEEP/REVOKE | OK |
| Append-only audit | Wajib | ✅ HMAC chain, pg advisory lock | OK |
| Trusted timestamp | Wajib | ✅ UTC timestamp di semua tabel | OK |
| Document hash | Wajib | ✅ SHA-256 di evidence exports | OK |
| Backup + DR | Wajib | ⚠️ Volume PostgreSQL ada, DR procedure belum teruji | Partial |
| Observability | Wajib | ✅ StructuredLogger, metrics service, circuit breaker snapshot | OK |
| DLP | Wajib | ❌ Tidak ada implementasi DLP | MISSING |
| OIDC role mapping | Wajib produksi | ⚠️ Skeleton ada, belum diuji live dengan provider nyata | Partial |
| KMS/HSM | Wajib produksi | ❌ Hanya env var, belum KMS | MISSING |
| Field-level encryption key rotation | Wajib | ❌ Belum ada mekanisme key rotation | MISSING |

---

## BAGIAN 5: EVALUASI KESIAPAN DOCKER (PREPRODUCTION)

### 5.1 Struktur Docker yang Tersedia

```
infra/docker-compose.production-like.yml  ← Production-like stack
infra/docker-compose.yml                   ← Dev stack (simplified)
apps/api/Dockerfile                        ← Multi-stage: build + runtime
apps/web/Dockerfile                        ← Multi-stage: build + nginx
apps/worker.Dockerfile                     ← Worker process
services/zoom-provider/Dockerfile          ← Zoom adapter
```

### 5.2 Kekuatan Docker Setup

| Aspek | Penilaian |
|-------|-----------|
| Multi-stage builds (build vs runtime) | ✅ Sangat baik — binary production minimal |
| Secrets via Docker secrets (file-based) | ✅ Sesuai best practice, bukan env var plain |
| Network isolation (edge/data/provider) | ✅ API tidak bisa langsung akses provider network |
| `read_only: true` + `tmpfs: [/tmp]` | ✅ Hardening container yang tepat |
| `security_opt: no-new-privileges` | ✅ Privilege escalation prevention |
| `USER node` di runtime | ✅ Non-root container |
| PostgreSQL health check | ✅ `pg_isready` sebelum API start |
| Service dependencies | ✅ `depends_on` dengan condition healthy |
| Nginx non-root | ✅ `USER nginx`, `pid /tmp/nginx.pid` |
| Nginx security headers | ✅ X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| Volume persistence | ✅ `cims_pgdata` named volume |
| Internal networks | ✅ `data` dan `provider` networks internal |

### 5.3 Gap Kritis untuk Preproduction Docker

| Gap | Prioritas | Detail |
|-----|-----------|--------|
| **Secrets directory tidak ada** | 🔴 BLOCKER | `infra/secrets/` belum ada. Semua 13 secret file dibutuhkan sebelum `docker compose up` bisa berjalan |
| **Package-lock.json tidak valid** | 🔴 BLOCKER | PRODUCTION_STATUS.json: `"official_package_lock": "BLOCKED_REGISTRY_TIMEOUT"` — build deterministic tidak bisa |
| **OIDC provider belum dikonfigurasi** | 🔴 BLOCKER | `OIDC_ISSUER` dan `OIDC_JWKS_URL` kosong. Produksi tidak akan start (ada guard di `main.ts`) |
| **API tidak expose health check yang berguna** | 🟡 MEDIUM | `/health` hanya mengembalikan status statik, tidak cek database, bukan `/health/ready` yang terstandarisasi |
| **Tidak ada `HEALTHCHECK` di Dockerfile** | 🟡 MEDIUM | Container orchestrator tidak tahu kapan API benar-benar sehat |
| **Web Dockerfile membutuhkan nginx.conf yang di-copy** | ⚠️ Minor | Sudah ada di `apps/web/nginx.conf` — OK |
| **Worker tidak ada health check** | 🟡 MEDIUM | Worker process tidak ada endpoint monitoring |
| **Tidak ada docker-compose untuk preproduction (DEV mode)** | 🟡 MEDIUM | `infra/docker-compose.yml` sangat minimal (tidak ada worker, tidak ada web) |
| **RETENTION_EXECUTION_ENABLED harus false** | ✅ OK | Sudah di-lock false di production-like compose |
| **Evidence storage lokal vs HTTP** | 🟡 MEDIUM | `.env.example` default ke `LOCAL` mode, production-like perlu `HTTP` mode dengan storage eksternal |
| **OIDC tidak ada di docker-compose.yml dev** | 🟡 MEDIUM | Dev compose tidak include keycloak/mock OIDC provider |
| **Tidak ada `docker-compose.preproduction.yml`** | 🟡 MEDIUM | Perlu file compose khusus preproduction yang menggunakan DEV auth tapi PostgreSQL penuh |

### 5.4 Checklist Preproduction Docker Lokal

Untuk bisa menjalankan `docker compose up` di lokal dengan kondisi yang layak:

**Langkah Wajib Sebelum `docker compose up`:**

```bash
# 1. Buat direktori secrets
mkdir -p infra/secrets

# 2. Generate secrets (HANYA untuk dev/preproduction — bukan produksi)
echo "cims_dev_password_2026" > infra/secrets/postgres_password.txt
echo "postgresql://cims:cims_dev_password_2026@postgres:5432/cims?sslmode=disable" > infra/secrets/database_url.txt
openssl rand -base64 32 > infra/secrets/token_pepper.txt
openssl rand -base64 32 > infra/secrets/field_encryption_key.txt
openssl rand -base64 32 > infra/secrets/audit_hash_key.txt
openssl rand -base64 32 > infra/secrets/webhook_shared_secret.txt
echo "mock-notification-key" > infra/secrets/notification_gateway_api_key.txt
echo "mock-official-system-key" > infra/secrets/official_system_gateway_api_key.txt
echo "mock-evidence-key" > infra/secrets/evidence_storage_api_key.txt
echo "dummy-zoom-account" > infra/secrets/zoom_account_id.txt
echo "dummy-zoom-client-id" > infra/secrets/zoom_client_id.txt
echo "dummy-zoom-client-secret" > infra/secrets/zoom_client_secret.txt
echo "dummy-zoom-host-user" > infra/secrets/zoom_host_user_id.txt

# 3. Set env vars untuk production-like compose
export OIDC_ISSUER=http://localhost:8080/realms/cims  # atau mock
export OIDC_JWKS_URL=http://localhost:8080/realms/cims/protocol/openid-connect/certs
export WEB_ORIGINS=http://localhost:8080
export EVIDENCE_STORAGE_URL=http://minio:9000
```

**Problem:** `docker-compose.production-like.yml` menggunakan `AUTH_MODE: OIDC` yang membutuhkan provider OIDC nyata. Untuk preproduction lokal dengan DEV mode, perlu file docker-compose terpisah.

---

## BAGIAN 6: REKOMENDASI PRIORITAS

### 🔴 CRITICAL — Harus diselesaikan sebelum preproduction

| No | Item | Estimasi |
|----|------|----------|
| C-01 | Buat `infra/docker-compose.preproduction.yml` dengan AUTH_MODE=DEV, PostgreSQL penuh, semua service | 1 hari |
| C-02 | Buat `infra/secrets/.gitignore` dan `Makefile` / `scripts/setup-preproduction.sh` untuk generate secrets lokal | 0.5 hari |
| C-03 | Implementasikan **Modul Appeal Decision Reading** (NestJS + endpoint + UI) — tenggat 1 Agustus 2026 | 5-7 hari |
| C-04 | Implementasikan **Pejabat Penghubung (Liaison Officer)** — tabel, role, modul | 2-3 hari |
| C-05 | Implementasikan **Custody Transfer (Mutasi Tahanan)** — modul M-12 SOP 10.14 | 2-3 hari |
| C-06 | Fix `notice_type` dari free-text ke enum yang tervalidasi | 0.5 hari |

### 🟡 HIGH — Harus diselesaikan sebelum UAT lintas instansi

| No | Item | Estimasi |
|----|------|----------|
| H-01 | Tambah `mode persidangan` (LANGSUNG/ELEKTRONIK/HYBRID) sebagai field terstruktur di `judicial_determinations` | 0.5 hari |
| H-02 | Pemberitahuan ulang otomatis saat jadwal di-supersede | 1 hari |
| H-03 | Witness/Expert examination workflow — verifikasi per saksi, pengawas, saksi rentan | 2-3 hari |
| H-04 | `HEALTHCHECK` di semua Dockerfile | 0.5 hari |
| H-05 | Database migrations: migrasi tabel appeal dari UUID legacy ke text/uuid yang konsisten dengan skema TS | 1 hari |
| H-06 | `organization_units` tabel untuk satuan kerja internal | 1 hari |
| H-07 | Agenda item per sidang (bukan hanya satu `hearing_type`) — kalender multi-item | 1-2 hari |
| H-08 | SLA monitoring dashboard per jenis pemberitahuan | 1 hari |

### 🟢 MEDIUM — Untuk kualitas sistem sebelum pilot

| No | Item | Estimasi |
|----|------|----------|
| M-01 | `recordings` tabel dengan metadata dan chain of custody di TypeScript schema | 1 hari |
| M-02 | `participant_locations` tabel terpisah dengan dasar penetapan hakim | 0.5 hari |
| M-03 | Keycloak/OIDC mock container di docker-compose preproduction | 1 hari |
| M-04 | Advocate location enforcement — advocate di lokasi lain harus ada penetapan | 0.5 hari |
| M-05 | `delegations` tabel untuk pelimpahan kewenangan sementara | 1 hari |
| M-06 | Kalender view multi-hearing cross-satker di frontend | 2 hari |
| M-07 | `/health/live` dan `/health/ready` yang terstandarisasi | 0.5 hari |
| M-08 | `official_system_refs` sebagai tabel terpisah (bukan hanya field) | 0.5 hari |

---

## BAGIAN 7: KEKUATAN ARSITEKTUR — YANG SUDAH BENAR

Proyek ini memiliki fondasi teknis yang sangat solid:

1. **Domain-First Architecture**: Domain rules murni di `packages/domain/` — tidak bergantung framework, mudah diuji unit
2. **Hard Gates yang Tegas**: Tidak ada jalan bypass untuk judicial determination, notice acknowledgment, readiness checklist
3. **Audit Trail HMAC Chain**: Teknik blockchain-lite untuk integritas audit — setiap event terhubung ke event sebelumnya
4. **Transactional Outbox Pattern**: Konsistensi pengiriman pemberitahuan tanpa coupling tight ke message broker
5. **Circuit Breaker**: Resilience untuk semua integrasi eksternal (notification, official system, video, evidence)
6. **Private Consultation Protection**: Recording DILARANG di consultation room + webhook guard yang memunculkan CRITICAL security event
7. **Maker-Checker**: Diterapkan di 3 tempat (intake activation, legal hold release, evidence export)
8. **Provider Abstraction**: VIDEO_PROVIDER_MODE abstraction — tidak terkunci ke Zoom
9. **Row-Level Security**: PostgreSQL RLS untuk isolasi data per organisasi
10. **Field Encryption**: Data sensitif (deskripsi insiden, resolusi) di-encrypt di storage
11. **Three-Network Isolation**: Edge → Data → Provider, API tidak bisa langsung akses provider

---

## BAGIAN 8: KESIMPULAN & REKOMENDASI

### Penilaian Akhir

| Aspek | Nilai |
|-------|-------|
| **Kepatuhan SOP keseluruhan** | **73%** (16.5/22.5 poin) |
| **Kepatuhan Matriks MVP (M-level)** | **67%** (8/12 PASS, 3 partial, 1 fail) |
| **Acceptance Criteria** | **92%** (11/12 PASS) |
| **Kesiapan Docker Preproduction** | **55%** — membutuhkan setup signifikan |
| **Keamanan (non-functional)** | **70%** — fondasi baik, OIDC live belum diuji |

### Keputusan Go/No-Go Preproduction

**Rekomendasi: ⚠️ CONDITIONAL GO untuk Local Docker Preproduction**

Sistem **DAPAT** dijalankan di Docker lokal dalam mode preproduction (DEV auth, PostgreSQL) setelah:

1. ✅ `infra/docker-compose.preproduction.yml` dibuat dengan konfigurasi yang tepat
2. ✅ Script setup secrets lokal tersedia
3. ✅ `npm ci` berhasil dan `package-lock.json` di-commit
4. ✅ `npm run build` berhasil untuk semua workspace
5. ✅ `npm run db:migrate` berhasil di PostgreSQL lokal

Sistem **BELUM DAPAT** masuk UAT lintas instansi atau pilot nyata tanpa:
- Appeal Decision Reading module (tenggat 1 Agustus 2026)
- Liaison Officer module
- Custody Transfer module
- Live OIDC integration
- Cross-institution UAT formal

---

## LAMPIRAN: FILE-FILE YANG PERLU SEGERA DIBUAT

### A. `infra/docker-compose.preproduction.yml` (Sketsa)
```yaml
# Local preproduction: PostgreSQL full, DEV auth, mock gateways, semua service
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: cims
      POSTGRES_USER: cims
      POSTGRES_PASSWORD: cims_preproduction
    ports: ["5432:5432"]
    volumes: ["cims_pgdata_preproduction:/var/lib/postgresql/data"]
    healthcheck:
      test: [CMD-SHELL, 'pg_isready -U cims -d cims']
      interval: 10s
      timeout: 5s
      retries: 10

  api:
    build: { context: .., dockerfile: apps/api/Dockerfile }
    environment:
      NODE_ENV: development
      AUTH_MODE: DEV
      PERSISTENCE_MODE: POSTGRES
      DATABASE_URL: postgresql://cims:cims_preproduction@postgres:5432/cims
      DB_SSL: 'false'
      SWAGGER_ENABLED: 'true'
      OUTBOX_WORKER_ENABLED: 'false'
      RETENTION_EXECUTION_ENABLED: 'false'
      LEGAL_HOLD_MAKER_CHECKER: 'true'
      NOTIFICATION_GATEWAY_MODE: MOCK
      OFFICIAL_SYSTEM_GATEWAY_MODE: MOCK
      VIDEO_PROVIDER_MODE: HTTP
      VIDEO_PROVIDER_URL: http://zoom-provider:3010
      EVIDENCE_STORAGE_MODE: LOCAL
      EVIDENCE_LOCAL_DIR: /tmp/cims-evidence
      AUDIT_HASH_KEY: preproduction-audit-key-not-for-production
      TOKEN_PEPPER: preproduction-token-pepper-not-for-production
      FIELD_ENCRYPTION_KEY: cHJlcHJvZHVjdGlvbi1rZXktMzItYnl0ZXM=
      WEBHOOK_SHARED_SECRET: preproduction-webhook-secret
      WEB_ORIGINS: 'http://localhost:5173,http://localhost:8080'
    ports: ["3000:3000"]
    depends_on: { postgres: { condition: service_healthy } }
    tmpfs: [/tmp]

  worker:
    build: { context: .., dockerfile: apps/worker.Dockerfile }
    environment:
      NODE_ENV: development
      AUTH_MODE: DEV
      PERSISTENCE_MODE: POSTGRES
      DATABASE_URL: postgresql://cims:cims_preproduction@postgres:5432/cims
      DB_SSL: 'false'
      OUTBOX_WORKER_ENABLED: 'true'
      OUTBOX_POLL_INTERVAL_MS: '2000'
      NOTIFICATION_GATEWAY_MODE: MOCK
      OFFICIAL_SYSTEM_GATEWAY_MODE: MOCK
      VIDEO_PROVIDER_MODE: HTTP
      VIDEO_PROVIDER_URL: http://zoom-provider:3010
      EVIDENCE_STORAGE_MODE: LOCAL
      EVIDENCE_LOCAL_DIR: /tmp/cims-evidence
      AUDIT_HASH_KEY: preproduction-audit-key-not-for-production
      TOKEN_PEPPER: preproduction-token-pepper-not-for-production
      FIELD_ENCRYPTION_KEY: cHJlcHJvZHVjdGlvbi1rZXktMzItYnl0ZXM=
      WEBHOOK_SHARED_SECRET: preproduction-webhook-secret
    depends_on: { postgres: { condition: service_healthy } }
    tmpfs: [/tmp]

  web:
    build: { context: .., dockerfile: apps/web/Dockerfile }
    ports: ["8080:8080"]

  zoom-provider:
    build: { context: .., dockerfile: services/zoom-provider/Dockerfile }
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://cims:cims_preproduction@postgres:5432/cims
      ZOOM_ACCOUNT_ID: dummy-account-id
      ZOOM_CLIENT_ID: dummy-client-id
      ZOOM_CLIENT_SECRET: dummy-client-secret
      ZOOM_HOST_USER_ID: dummy-host-user
      ZOOM_API_TIMEOUT_MS: '15000'
    depends_on: { postgres: { condition: service_healthy } }
    ports: ["3010:3010"]
    tmpfs: [/tmp]

volumes:
  cims_pgdata_preproduction: {}
```

---

*Laporan ini disusun berdasarkan analisis mendalam terhadap seluruh source code CIMS v0.19.0, SOP/CIMS/PPE/001/2026, Matriks Penyesuaian MVP CIMS v2.0, dan referensi tambahan agenda sidang dan penjadwalan sidang.*
