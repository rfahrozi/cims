# CIMS Sprint 4 Issue Breakdown

## Fokus Sprint 4

Sprint 4 berfokus pada **operational readiness**. Setelah Sprint 1 menutup production gates, Sprint 2 memperkuat integrasi dan proteksi data, dan Sprint 3 mulai menegakkan compliance runtime, Sprint 4 memastikan sistem dapat **dipantau, dioperasikan, dipulihkan, dan direview secara disiplin**.

Fokus Sprint 4 dibagi ke lima epic:

- Epic M — Observability & SLA Visibility
- Epic N — Outbox, Delivery, and Reconciliation Visibility
- Epic O — Incident Runbook & Operational Playbooks
- Epic P — Backup/Restore and Recovery Readiness
- Epic Q — Readiness Test Expansion & UAT Preparation

## Outcome Sprint

Pada akhir Sprint 4, target minimum adalah:

- Tim memiliki dashboard operasional minimum untuk latency, error, dan SLA proses kritis.
- Queue/outbox dan delivery failure dapat dipantau secara sistematis.
- Runbook utama tersedia untuk insiden keamanan, gangguan provider, dan operasi pemulihan.
- Backup/restore rehearsal awal memiliki prosedur dan evidence dasar.
- Paket readiness test dan UAT preparation sudah cukup matang untuk Sprint 5.

## Label yang Disarankan

- `sprint-4`
- `production-readiness`
- `operational-readiness`
- `p0` / `p1` / `p2`
- `platform`
- `backend`
- `security`
- `qa`
- `documentation`
- `sre`

## Epic M — Observability & SLA Visibility

### Issue M4 — Define operational metrics catalog

**Type:** Analysis / Platform
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Platform Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `platform`

**Description**
Tentukan katalog metric operasional yang wajib tersedia untuk API, worker, gateway, dan modul compliance prioritas.

**Scope**

- Latency metric
- Error metric
- Throughput metric
- Queue/outbox metric
- SLA metric untuk same-day publication dan 7-day transmission
- Security-relevant metric minimum

**Acceptance criteria**

- Ada metric catalog versi 1.
- Metric diklasifikasikan sebagai required vs nice-to-have.
- Metric memiliki owner dan sumber data.

**Dependencies**

- Sprint 3 rule matrix dan enforcement baseline

**Definition of done**

- Metric catalog tersedia
- Dipakai sebagai acuan issue dashboard berikutnya

### Issue M5 — Add baseline API and worker metrics instrumentation

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `platform`, `backend`

**Description**
Tambahkan instrumentation minimum untuk API dan worker agar latency, error, dan success rate dapat dipantau.

**Acceptance criteria**

- API dan worker mengekspor metric dasar.
- Error rate dan latency dapat diamati per komponen utama.
- Ada bukti metric dapat terbaca pada environment uji.

**Dependencies**

- M4

**Definition of done**

- Instrumentation merged
- Smoke verification tersedia

### Issue M6 — Build SLA dashboard baseline for publication and transmission deadlines

**Type:** Platform / QA
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Lead + Platform Engineer
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `platform`, `qa`

**Description**
Bangun dashboard baseline untuk memantau status same-day publication dan 7-day transmission.

**Acceptance criteria**

- Dashboard dapat menampilkan on-time, overdue, failed, dan pending count.
- Data dashboard konsisten dengan state model Sprint 3.
- Output dashboard dapat dipakai pada review mingguan.

**Dependencies**

- Sprint 3 issue I1
- Sprint 3 issue I2
- M4

**Definition of done**

- Dashboard baseline tersedia
- Evidence screenshot atau output tersedia

### Issue M7 — Add security event visibility baseline

**Type:** Security / Platform
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `security`, `platform`

**Description**
Tambahkan visibilitas minimum untuk event keamanan penting seperti invalid token, invalid webhook, policy denial, dan replay detection.

**Acceptance criteria**

- Security event utama dapat diaggregasi.
- Ada output yang bisa dipakai untuk review security mingguan.

**Dependencies**

- Sprint 1 IAM baseline
- Sprint 2 webhook/security baseline
- M4

**Definition of done**

- Security visibility baseline tersedia

## Epic N — Outbox, Delivery, and Reconciliation Visibility

### Issue N1 — Build outbox and failed-delivery dashboard baseline

**Type:** Engineering / Platform
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `integration`, `platform`

**Description**
Bangun dashboard minimum untuk queue/outbox, failed delivery, dan retry status.

**Acceptance criteria**

- Outbox pending, sent, failed, retried dapat terlihat.
- Failed delivery utama dapat diurutkan berdasarkan severity atau age.
- Output dashboard bisa dipakai untuk triage operasional.

**Dependencies**

- Sprint 2 delivery-state tracking
- Sprint 2 reconciliation baseline

**Definition of done**

- Dashboard baseline tersedia

### Issue N2 — Add reconciliation summary report for external flows

**Type:** Engineering / QA
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `qa`, `integration`

**Description**
Tambahkan laporan ringkas hasil reconciliation agar mismatch flow eksternal dapat ditinjau secara periodik.

**Acceptance criteria**

- Ada summary output yang menunjukkan match, pending, mismatch.
- Output dapat dibandingkan lintas periode review.

**Dependencies**

- Sprint 2 D6
- Sprint 2 G4

**Definition of done**

- Report tersedia dan dipakai minimal sekali

### Issue N3 — Add delivery failure triage workflow documentation

**Type:** Documentation / Process
**Priority:** P2
**Estimate:** 2 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p2`, `documentation`

**Description**
Dokumentasikan langkah triage untuk failure pengiriman agar operator tidak menebak-nebak langkah selanjutnya.

**Acceptance criteria**

- Ada workflow triage untuk notifikasi, official gateway, dan provider failure.
- Decision path utama jelas.

**Dependencies**

- N1
- N2

**Definition of done**

- Dokumen tersedia

## Epic O — Incident Runbook & Operational Playbooks

### Issue O1 — Create incident severity and escalation model

**Type:** Process / Documentation
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Engineering Lead + Security Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `documentation`

**Description**
Tetapkan model severity dan eskalasi insiden agar semua runbook memiliki bahasa operasional yang sama.

**Acceptance criteria**

- Ada definisi severity level.
- Ada jalur eskalasi utama untuk engineering, security, dan integration.

**Dependencies**

- Tidak ada

**Definition of done**

- Dokumen severity/escalation tersedia

### Issue O2 — Publish security incident 1x24 jam response flow

**Type:** Documentation / Security
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Security Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `security`, `documentation`

**Description**
Buat flow penanganan insiden keamanan yang memenuhi kebutuhan respons awal 1x24 jam.

**Acceptance criteria**

- Ada langkah deteksi, triage, containment, evidence capture, dan escalation.
- Ada daftar input minimum untuk incident review.

**Dependencies**

- O1
- M7

**Definition of done**

- Flow tersedia dan direview internal

### Issue O3 — Publish provider outage playbook

**Type:** Documentation / Integration
**Priority:** P1
**Estimate:** 2 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `integration`, `documentation`

**Description**
Buat playbook untuk outage provider seperti gateway notifikasi atau video provider.

**Acceptance criteria**

- Ada langkah diagnosa, fallback, retry policy awareness, dan recovery check.
- Ada daftar indikator bahwa provider telah pulih.

**Dependencies**

- N1
- N2

**Definition of done**

- Playbook tersedia

### Issue O4 — Publish key-rotation and secret compromise playbook

**Type:** Documentation / Security
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Security Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `security`, `documentation`

**Description**
Buat playbook untuk skenario kompromi secret atau kebutuhan rotasi kunci mendadak.

**Acceptance criteria**

- Ada langkah containment, rotation, verification, dan evidence capture.
- Ada catatan dependency ke secret provider dan field crypto.

**Dependencies**

- Sprint 2 E2
- Sprint 2 E6

**Definition of done**

- Playbook tersedia

## Epic P — Backup/Restore and Recovery Readiness

### Issue P1 — Inventory critical data recovery paths

**Type:** Analysis / Platform
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Platform Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `platform`

**Description**
Petakan jalur recovery untuk data dan state paling kritis agar backup/restore rehearsal punya scope yang benar.

**Scope**

- Database state
- Evidence storage
- Outbox/reconciliation state
- Secret/config dependency minimum
- Monitoring evidence yang perlu dipertahankan

**Acceptance criteria**

- Ada inventory recovery path kritis.
- Scope rehearsal awal terdefinisi jelas.

**Dependencies**

- Sprint 2 evidence/storage baseline
- Sprint 2 gateway baseline

**Definition of done**

- Inventory tersedia

### Issue P2 — Draft backup and restore procedure baseline

**Type:** Documentation / Platform
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `platform`, `documentation`

**Description**
Susun prosedur backup/restore baseline yang dapat dijalankan pada rehearsal awal.

**Acceptance criteria**

- Ada prosedur backup/restore untuk scope rehearsal awal.
- Ada daftar pre-check dan post-check minimum.

**Dependencies**

- P1

**Definition of done**

- Dokumen tersedia

### Issue P3 — Run backup/restore dry-run for selected critical path

**Type:** Engineering / QA
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Lead + Platform Engineer
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `qa`, `platform`

**Description**
Lakukan dry-run backup/restore untuk satu jalur kritis yang disepakati.

**Suggested path**

- core database state
- satu subset evidence object
- satu subset delivery/reconciliation state jika memungkinkan

**Acceptance criteria**

- Dry-run selesai dan hasilnya terdokumentasi.
- Ada temuan gap yang dibawa ke Sprint 5 bila perlu.

**Dependencies**

- P2

**Definition of done**

- Dry-run evidence tersedia
- Review note tersedia

### Issue P4 — Draft disaster recovery rehearsal plan baseline

**Type:** Documentation / Platform
**Priority:** P2
**Estimate:** 2 points
**Suggested owner:** Platform Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p2`, `platform`, `documentation`

**Description**
Susun rencana baseline untuk rehearsal DR penuh yang akan dijalankan pada fase berikutnya.

**Acceptance criteria**

- Ada scope, objective, participant, dan success criteria rehearsal DR.

**Dependencies**

- P1
- P2

**Definition of done**

- Dokumen rehearsal plan tersedia

## Epic Q — Readiness Test Expansion & UAT Preparation

### Issue Q1 — Expand readiness test catalog for production decision support

**Type:** QA / Documentation
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** QA Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p0`, `qa`, `documentation`

**Description**
Susun katalog test readiness yang akan menjadi dasar keputusan menuju go-live review.

**Scope**

- Load test scope
- Soak test scope
- Failover scope
- Recovery scope
- Compliance runtime verification scope
- Security verification scope

**Acceptance criteria**

- Ada readiness test catalog versi 1.
- Semua test diklasifikasikan sebagai mandatory vs optional.

**Dependencies**

- Sprint 3 evidence package

**Definition of done**

- Katalog test tersedia

### Issue Q2 — Build UAT scenario inventory by cross-agency workflow

**Type:** Analysis / Documentation
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Compliance Lead + QA Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `qa`, `documentation`

**Description**
Buat inventory skenario UAT berdasarkan workflow lintas instansi yang paling kritis.

**Acceptance criteria**

- Ada daftar skenario UAT prioritas.
- Setiap skenario punya aktor, prasyarat, expected outcome, dan bukti yang dibutuhkan.

**Dependencies**

- Sprint 3 rule matrix
- Q1

**Definition of done**

- Inventory tersedia

### Issue Q3 — Prepare UAT evidence template and sign-off package draft

**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 2 points
**Suggested owner:** Engineering Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `documentation`

**Description**
Siapkan template evidence dan draft paket sign-off untuk UAT agar Sprint 5 tidak mulai dari nol.

**Acceptance criteria**

- Ada template evidence UAT.
- Ada draft sign-off package dan daftar lampiran minimal.

**Dependencies**

- Q2

**Definition of done**

- Template tersedia

### Issue Q4 — Publish Sprint 4 operational readiness review template

**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 1 point
**Suggested owner:** Engineering Lead
**Labels:** `sprint-4`, `production-readiness`, `operational-readiness`, `p1`, `documentation`

**Description**
Buat template review Sprint 4 yang fokus pada observability, runbook, recovery, dan UAT prep.

**Acceptance criteria**

- Template tersedia dan dipakai minimal sekali.

**Dependencies**

- Tidak ada

**Definition of done**

- Template tersedia

## Rekomendasi Urutan Pembuatan Issue di Board

1. M4
2. M5
3. N1
4. O1
5. P1
6. Q1
7. M6
8. M7
9. N2
10. O2
11. P2
12. Q2
13. O3
14. O4
15. P3
16. P4
17. Q3
18. N3
19. Q4

## Rekomendasi Milestone

### Milestone 1 — Metrics & Visibility Baseline

- M4
- M5
- M6
- M7
- N1
- N2

### Milestone 2 — Incident & Playbook Baseline

- O1
- O2
- O3
- O4
- N3

### Milestone 3 — Recovery Readiness Baseline

- P1
- P2
- P3
- P4

### Milestone 4 — UAT Preparation Baseline

- Q1
- Q2
- Q3
- Q4

## Exit Criteria Sprint 4

Sprint 4 dapat ditutup dengan hasil baik bila:

- Metric catalog dan instrumentation baseline tersedia.
- Dashboard dasar untuk SLA dan outbox/failure visibility tersedia.
- Runbook utama untuk security incident, provider outage, dan key rotation tersedia.
- Ada prosedur backup/restore dan minimal satu dry-run evidence.
- Katalog readiness test dan inventori skenario UAT tersedia.
- Tim siap masuk Sprint 5 dengan dasar operational readiness yang cukup kuat.

## Catatan Handoff ke Sprint 5

Jika Sprint 4 selesai sesuai target, Sprint 5 dapat fokus pada:

- load test
- soak test
- failover test
- penetration test coordination and remediation intake
- backup/restore follow-up
- DR rehearsal execution
- UAT execution
- sign-off package finalization
- final go/no-go decision preparation
