# CIMS Sprint 3 Issue Breakdown

## Fokus Sprint 3

Sprint 3 berfokus pada **compliance runtime**: memastikan fitur-fitur yang sudah ada bukan hanya tersedia secara arsitektural, tetapi benar-benar menegakkan aturan proses, tenggat, pembatasan akses, dan jejak audit pada level backend/domain.

Sprint ini melanjutkan hasil Sprint 1 dan Sprint 2. Asumsinya:

- production gates dasar sudah aktif
- IAM baseline sudah lebih aman
- CI minimum sudah berjalan
- integrasi sandbox utama mulai tersedia
- fondasi secret/crypto/evidence/provider hardening sudah dimulai

Fokus Sprint 3 dibagi ke lima epic:

- Epic H — Compliance Rule Matrix & Traceability
- Epic I — Decision, Notice, and Scheduling Runtime Enforcement
- Epic J — Readiness, Participants, and Custody Runtime Enforcement
- Epic K — Governance, Compliance, and Legacy Proxy Controls
- Epic L — Compliance Test Pack & Runtime Evidence

## Outcome Sprint

Pada akhir Sprint 3, target minimum adalah:

- Modul regulatif paling kritis memiliki rule matrix yang jelas dan dapat ditelusuri ke implementasi.
- Same-day publication, 7-day transmission, receipt/audit notice, dan dependency gate jadwal mulai ditegakkan di runtime.
- Readiness lintas instansi, pembatasan participant data, dan custody workflow memiliki enforcement minimum.
- Governance/compliance controls yang paling penting memiliki guardrail dasar.
- Ada paket test dan evidence yang cukup untuk membawa sistem ke Sprint 4 dengan fokus observability, runbook, dan readiness testing.

## Label yang Disarankan

- `sprint-3`
- `production-readiness`
- `compliance-runtime`
- `p0` / `p1` / `p2`
- `backend`
- `domain`
- `security`
- `integration`
- `qa`
- `documentation`

## Epic H — Compliance Rule Matrix & Traceability

### Issue H1 — Build compliance rule matrix for critical modules

**Type:** Analysis / Documentation
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Compliance Lead + Backend Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `documentation`

**Description**
Susun matriks aturan untuk modul-modul kritis agar tiap kewajiban proses dan kontrol bisa ditelusuri ke kode, test, dan evidencenya.

**Scope**

- Modul prioritas: `appeal-decision`, `notices`, `scheduling`, `readiness`, `participants`, `custody`, `liaison`, `governance`, `compliance`, `legacy-proxy`
- Untuk tiap modul, definisikan: rule, trigger, actor, data input, outcome, exception path, audit expectation, test expectation
- Tautkan rule ke file/modul implementasi saat ini bila sudah ada

**Acceptance criteria**

- Ada rule matrix versi 1 untuk seluruh modul prioritas.
- Setiap rule memiliki severity dan owner.
- Matrix cukup detail untuk dipakai membuat issue implementasi dan test.

**Dependencies**

- Sprint 1 role matrix baseline
- Sprint 2 integrasi baseline yang relevan

**Definition of done**

- Dokumen matrix tersedia
- Disetujui internal untuk dijadikan baseline sprint

### Issue H2 — Add implementation traceability map rule → module → test

**Type:** Documentation / Engineering
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** QA Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `qa`, `documentation`

**Description**
Tambahkan peta traceability untuk menunjukkan rule mana yang sudah diimplementasikan, diuji, atau masih gap.

**Scope**

- Rule status: implemented, partial, missing
- Test status: unit, integration, e2e, missing
- Evidence status: audit log, dashboard, report, missing

**Acceptance criteria**

- Ada traceability map yang bisa dipakai saat readiness review.
- Minimal seluruh issue Sprint 3 mengacu ke map ini.

**Dependencies**

- H1

**Definition of done**

- Traceability map tersedia sebagai artefak sprint

## Epic I — Decision, Notice, and Scheduling Runtime Enforcement

### Issue I1 — Enforce appeal-decision same-day publication baseline

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `backend`, `domain`

**Description**
Tambahkan enforcement runtime dasar untuk same-day publication pada modul `appeal-decision`.

**Scope**

- Definisikan event/trigger publication
- Validasi syarat minimum sebelum publication
- Simpan publication timestamp yang dapat diaudit
- Klasifikasikan status: pending, published-on-time, published-late, failed
- Error path untuk publication failure

**Acceptance criteria**

- Publication event memiliki timestamp audit.
- Status on-time vs late dapat dibedakan.
- Failure menghasilkan state yang eksplisit, bukan silent failure.

**Dependencies**

- H1
- Sprint 2 gateway/evidence baseline jika relevan

**Definition of done**

- Implementasi merged
- Test utama lulus
- Bukti audit tersedia dari log atau state model

### Issue I2 — Enforce appeal-decision 7-day transmission baseline

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `backend`, `integration`

**Description**
Tambahkan baseline enforcement untuk pengiriman salinan putusan dan berkas dalam window 7 hari.

**Scope**

- Definisikan due-date calculation
- Status transmission: pending, sent, overdue, failed
- Retry/follow-up trigger bila belum terkirim
- Audit timestamp pengiriman

**Acceptance criteria**

- Due date 7 hari dapat dihitung dan disimpan.
- Sistem bisa membedakan transmission tepat waktu, terlambat, dan gagal.
- Ada test untuk overdue path.

**Dependencies**

- I1
- Sprint 2 gateway baseline

**Definition of done**

- Implementasi merged
- Test lulus
- Status transition terdokumentasi

### Issue I3 — Harden notices receipt and delivery audit trail

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Integration Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `backend`, `integration`

**Description**
Perkuat modul `notices` agar pengiriman, receipt, dan bukti delivery memiliki jejak audit yang jelas.

**Scope**

- Delivery receipt model
- Timestamp sent/received/failed
- Receiver/route/channel attribution jika tersedia
- Failure classification
- Minimal acknowledgement handling

**Acceptance criteria**

- Notice memiliki audit trail end-to-end minimal.
- Sent, received, failed, dan unacknowledged dapat dibedakan.
- Ada test untuk success dan failure path.

**Dependencies**

- H1
- Sprint 2 notification gateway baseline

**Definition of done**

- Implementasi merged
- Test lulus
- Audit fields tersedia

### Issue I4 — Enforce reschedule and notice dependency rules in scheduling

**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `backend`, `domain`

**Description**
Pastikan perubahan jadwal tidak dapat dilakukan tanpa memenuhi dependency rule yang dibutuhkan, termasuk notice impact.

**Scope**

- Valid state transition untuk reschedule
- Dependency ke notice dan readiness
- Audit siapa yang mengubah jadwal dan kapan
- Reason code minimum untuk reschedule

**Acceptance criteria**

- Reschedule tanpa dependency minimum ditolak.
- Semua perubahan jadwal penting tercatat dengan actor dan reason.
- Ada test untuk transition valid dan invalid.

**Dependencies**

- H1
- I3

**Definition of done**

- Implementasi merged
- Test lulus

### Issue I5 — Add SLA alert baseline for publication and transmission deadlines

**Type:** Engineering / QA
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** QA Lead + Backend Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `qa`, `backend`

**Description**
Tambahkan baseline alerting/logical flags untuk same-day publication dan 7-day transmission agar keterlambatan bisa terlihat lebih awal.

**Scope**

- Warning threshold
- Overdue flag
- Summary output untuk review manual
- Integrasi minimal ke logging/metrics yang tersedia

**Acceptance criteria**

- Keterlambatan dapat ditandai otomatis.
- Ada output yang bisa dipakai untuk review operasional.

**Dependencies**

- I1
- I2

**Definition of done**

- Alert baseline tersedia
- Bukti output tersedia pada sprint review

## Epic J — Readiness, Participants, and Custody Runtime Enforcement

### Issue J1 — Enforce cross-agency readiness checklist gate

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `backend`, `domain`

**Description**
Pastikan sidang virtual atau langkah proses terkait tidak bisa lanjut bila checklist readiness lintas instansi belum terpenuhi.

**Scope**

- Definisikan readiness minimum per tahap
- Gate launch/continue action berdasarkan checklist
- Status readiness: incomplete, ready, blocked
- Audit perubahan checklist

**Acceptance criteria**

- Action penting ditolak bila readiness belum memenuhi syarat.
- Checklist status dapat diaudit.
- Ada test blocked vs ready path.

**Dependencies**

- H1
- Sprint 2 virtual session baseline

**Definition of done**

- Implementasi merged
- Test lulus

### Issue J2 — Add participant data partitioning and protected-identity baseline

**Type:** Engineering / Security
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `security`, `backend`

**Description**
Tambahkan baseline pembatasan tampilan/akses data peserta dan identitas terlindungi di backend.

**Scope**

- Klasifikasi field sensitif participant
- View policy per role
- Masking atau redaction baseline
- Audit access untuk data yang dilindungi jika relevan

**Acceptance criteria**

- Role yang tidak berhak tidak menerima field sensitif tertentu.
- Protected identity memiliki baseline masking/redaction.
- Ada test untuk role allowed vs denied field visibility.

**Dependencies**

- H1
- Sprint 1 role matrix baseline

**Definition of done**

- Implementasi merged
- Test lulus

### Issue J3 — Enforce custody workflow dependency and audit trail

**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `backend`, `integration`

**Description**
Tambahkan enforcement dasar pada workflow `custody` agar transisi penting bergantung pada syarat yang benar dan meninggalkan audit trail yang memadai.

**Scope**

- Dependency ke scheduling/readiness bila relevan
- State transition valid untuk custody action utama
- Actor, timestamp, reason capture
- Error path bila dependency tidak terpenuhi

**Acceptance criteria**

- Transition custody invalid ditolak.
- Audit actor/timestamp/reason tersedia untuk action utama.
- Ada test valid dan invalid transition.

**Dependencies**

- H1
- J1

**Definition of done**

- Implementasi merged
- Test lulus

### Issue J4 — Add liaison delegation validity baseline

**Type:** Engineering / Documentation
**Priority:** P2
**Estimate:** 3 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p2`, `backend`

**Description**
Tambahkan baseline validitas delegasi pejabat penghubung agar aksi yang bergantung pada liaison tidak berjalan dengan delegasi tidak valid.

**Scope**

- Masa berlaku delegasi
- Status aktif/nonaktif
- Basic validation sebelum action tertentu
- Audit perubahan delegasi

**Acceptance criteria**

- Delegasi kadaluarsa atau nonaktif tidak dapat dipakai.
- Ada audit perubahan status delegasi.

**Dependencies**

- H1

**Definition of done**

- Implementasi merged
- Test minimum lulus

## Epic K — Governance, Compliance, and Legacy Proxy Controls

### Issue K1 — Enforce maker-checker baseline for governance-sensitive actions

**Type:** Engineering / Security
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Security Engineer + Backend Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `security`, `backend`

**Description**
Tambahkan baseline maker-checker untuk aksi governance yang sensitif agar self-approval tidak terjadi pada jalur utama.

**Scope**

- Identifikasi action sensitif
- Rule maker-checker minimum
- Rejection untuk self-approval path
- Audit approval trail

**Acceptance criteria**

- Action governance prioritas tidak dapat disetujui oleh aktor yang sama bila rule berlaku.
- Approval trail dapat diaudit.
- Ada test untuk self-approval denial.

**Dependencies**

- H1
- Sprint 1 IAM baseline

**Definition of done**

- Implementasi merged
- Test lulus

### Issue K2 — Validate legal-hold invariant enforcement baseline

**Type:** Engineering / Compliance
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Compliance Lead + Backend Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `backend`, `documentation`

**Description**
Pastikan data atau objek yang berada dalam kondisi legal hold tidak dapat melewati aksi yang seharusnya diblok.

**Scope**

- Identifikasi aksi yang harus diblok saat legal hold aktif
- Tambahkan invariant check dasar
- Tambahkan error path yang eksplisit
- Tambahkan test minimum

**Acceptance criteria**

- Legal hold aktif mencegah aksi yang dilarang.
- Error message dan audit trail tersedia.

**Dependencies**

- H1
- Sprint 2 evidence/storage baseline bila relevan

**Definition of done**

- Implementasi merged
- Test lulus

### Issue K3 — Prevent auth/policy/audit bypass in legacy-proxy flows

**Type:** Engineering / Security
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `security`, `backend`, `integration`

**Description**
Audit dan perbaiki `legacy-proxy` agar tidak menjadi jalur bypass terhadap auth, policy, correlation, dan audit.

**Scope**

- Audit semua proxy path
- Pastikan auth guard tetap berlaku
- Pastikan policy requirement tetap berlaku
- Tambahkan correlation dan audit minimum
- Pastikan error eksternal tidak menutupi identitas request internal

**Acceptance criteria**

- Tidak ada proxy path kritis yang bisa dipakai tanpa auth/policy yang sepadan.
- Request proxied meninggalkan correlation id dan audit trail.
- Ada test untuk deny path dan proxied success path.

**Dependencies**

- H1
- Sprint 1 IAM baseline

**Definition of done**

- Audit selesai
- Fix merged
- Test lulus

### Issue K4 — Add governance/compliance action audit completeness review

**Type:** Analysis / QA
**Priority:** P2
**Estimate:** 2 points
**Suggested owner:** QA Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p2`, `qa`, `documentation`

**Description**
Review kelengkapan audit untuk action governance dan compliance yang paling sensitif.

**Scope**

- Actor
- Timestamp
- Old/new value jika relevan
- Reason code jika relevan
- Correlation id

**Acceptance criteria**

- Ada daftar gap audit completeness.
- Gap kritis dibawa sebagai backlog Sprint 4 bila belum bisa ditutup.

**Dependencies**

- K1
- K2
- K3

**Definition of done**

- Review note tersedia

## Epic L — Compliance Test Pack & Runtime Evidence

### Issue L1 — Build compliance integration test pack for decision/notice/scheduling

**Type:** QA / Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** QA Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p0`, `qa`, `backend`

**Description**
Buat integration test pack untuk modul `appeal-decision`, `notices`, dan `scheduling` berdasarkan rule matrix Sprint 3.

**Scope**

- Publication on-time / late
- Transmission pending / overdue
- Notice sent / failed / acknowledged
- Scheduling valid / invalid reschedule

**Acceptance criteria**

- Minimal 8 skenario integrasi utama diuji otomatis.
- Hasil test dapat dipetakan ke rule matrix.

**Dependencies**

- H1
- I1
- I2
- I3
- I4

**Definition of done**

- Test suite merged
- CI integration bila memungkinkan

### Issue L2 — Build compliance integration test pack for readiness/participants/custody

**Type:** QA / Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `qa`, `backend`

**Description**
Tambahkan integration tests untuk gate readiness, visibilitas participant, dan custody workflow.

**Acceptance criteria**

- Minimal 6 skenario utama diuji otomatis.
- Ada test blocked vs allowed path untuk readiness dan participant visibility.

**Dependencies**

- J1
- J2
- J3

**Definition of done**

- Test suite merged

### Issue L3 — Produce Sprint 3 runtime evidence package

**Type:** Documentation / QA
**Priority:** P1
**Estimate:** 2 points
**Suggested owner:** QA Lead + Engineering Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `documentation`, `qa`

**Description**
Kumpulkan evidence runtime Sprint 3 agar hasil compliance enforcement dapat direview lintas fungsi.

**Scope**

- Rule matrix snapshot
- Traceability snapshot
- Test results
- Residual risks
- Open gaps carried to Sprint 4

**Acceptance criteria**

- Ada satu paket evidence Sprint 3 yang siap dipakai pada review.
- Residual risks terdokumentasi jelas.

**Dependencies**

- H1
- H2
- L1
- L2

**Definition of done**

- Evidence package tersedia

### Issue M3 — Publish Sprint 3 compliance runtime review template

**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 1 point
**Suggested owner:** Engineering Lead
**Labels:** `sprint-3`, `production-readiness`, `compliance-runtime`, `p1`, `documentation`

**Description**
Buat template review Sprint 3 yang fokus pada rule enforcement, test evidence, audit completeness, dan residual compliance gaps.

**Acceptance criteria**

- Template tersedia dan dipakai minimal sekali pada sprint review.

**Dependencies**

- Tidak ada

**Definition of done**

- Template tersedia

## Rekomendasi Urutan Pembuatan Issue di Board

1. H1
2. I1
3. I3
4. J1
5. J2
6. K3
7. H2
8. I2
9. I4
10. K1
11. K2
12. J3
13. L1
14. L2
15. I5
16. J4
17. K4
18. L3
19. M3

## Rekomendasi Milestone

### Milestone 1 — Rule Matrix & Core Enforcement

- H1
- H2
- I1
- I2
- I3
- I4

### Milestone 2 — Operational Gate Enforcement

- J1
- J2
- J3
- J4

### Milestone 3 — Governance & Proxy Safety

- K1
- K2
- K3
- K4

### Milestone 4 — Test & Evidence

- L1
- L2
- L3
- M3

## Exit Criteria Sprint 3

Sprint 3 dapat ditutup dengan hasil baik bila:

- Rule matrix dan traceability map tersedia untuk seluruh modul prioritas.
- Same-day publication, 7-day transmission, receipt audit, dan scheduling dependency memiliki enforcement baseline.
- Readiness lintas instansi, participant data partitioning, dan custody workflow memiliki guardrail minimum.
- Legacy proxy tidak lagi menjadi jalur bypass yang tidak diaudit.
- Test pack Sprint 3 tersedia dan menghasilkan evidence yang bisa dibawa ke Sprint 4.

## Catatan Handoff ke Sprint 4

Jika Sprint 3 selesai sesuai target, Sprint 4 dapat fokus pada:

- observability dashboard
- queue/outbox visibility
- SLA dashboard
- incident runbook
- security incident flow
- backup/restore runbook
- provider outage playbook
- readiness test suite lanjutan
- preparation untuk DR rehearsal dan UAT package
