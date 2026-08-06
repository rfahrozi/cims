# CIMS Sprint 5 Issue Breakdown

## Fokus Sprint 5

Sprint 5 adalah sprint konvergensi menuju **decision-ready production review**. Fokusnya bukan lagi menambah banyak capability baru, tetapi menjalankan pengujian readiness utama, menutup gap kritis yang ditemukan, menyiapkan bukti formal, dan memfasilitasi keputusan akhir GO / CONDITIONAL GO / NO-GO.

Fokus Sprint 5 dibagi ke lima epic:

- Epic R — Load, Soak, and Failover Readiness Tests
- Epic S — Security Verification & Remediation Intake
- Epic T — Backup/Restore Follow-up & DR Rehearsal Execution
- Epic U — UAT Execution & Sign-off Package
- Epic V — Final Production Decision Package

## Outcome Sprint

Pada akhir Sprint 5, target minimum adalah:

- Pengujian readiness utama telah dijalankan atau secara eksplisit dijadwalkan ulang dengan alasan yang diterima.
- Temuan kritis dari pengujian memiliki jalur remediation yang jelas.
- UAT lintas instansi telah dijalankan untuk skenario prioritas.
- Paket bukti formal untuk decision meeting production tersedia.
- Tim mampu menyimpulkan keputusan GO, CONDITIONAL GO, atau NO-GO berdasarkan evidence, bukan asumsi.

## Label yang Disarankan

- `sprint-5`
- `production-readiness`
- `release-readiness`
- `p0` / `p1` / `p2`
- `qa`
- `security`
- `platform`
- `integration`
- `documentation`
- `go-no-go`

## Epic R — Load, Soak, and Failover Readiness Tests

### Issue R1 — Finalize load and soak test scope with success thresholds

**Type:** QA / Platform
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** QA Lead + Platform Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `qa`, `platform`

**Description**
Finalisasi scope load dan soak test berdasarkan readiness catalog Sprint 4 dan state sistem terkini.

**Acceptance criteria**

- Ada scope final load test dan soak test.
- Ada success threshold yang eksplisit.
- Ada daftar modul dan workflow yang termasuk atau dikecualikan.

**Dependencies**

- Sprint 4 Q1
- Sprint 4 observability baseline

**Definition of done**

- Test scope final tersedia

### Issue R2 — Execute load test baseline on agreed critical workflows

**Type:** QA / Platform
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `qa`, `platform`

**Description**
Jalankan load test baseline untuk workflow kritis yang disepakati.

**Suggested workflows**

- auth and session establishment
- notice submission/dispatch path
- scheduling/reschedule path
- appeal decision publication/transmission path

**Acceptance criteria**

- Load test dijalankan sesuai scope.
- Hasil throughput, latency, dan error rate terdokumentasi.
- Bottleneck utama diidentifikasi.

**Dependencies**

- R1

**Definition of done**

- Hasil test tersedia
- Review note tersedia

### Issue R3 — Execute soak test baseline for stability observation

**Type:** QA / Platform
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p1`, `qa`, `platform`

**Description**
Jalankan soak test baseline untuk mengamati degradasi performa, memory growth, retry accumulation, dan backlog growth.

**Acceptance criteria**

- Soak test dijalankan sesuai durasi minimum yang disepakati.
- Ada temuan stabilitas utama atau konfirmasi baseline sehat.
- Metric observasi dilampirkan.

**Dependencies**

- R1
- Sprint 4 metrics visibility

**Definition of done**

- Hasil soak test tersedia

### Issue R4 — Execute failover/partial outage scenario test baseline

**Type:** QA / Integration
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p1`, `qa`, `integration`

**Description**
Uji baseline perilaku sistem saat terjadi partial outage pada gateway/provider yang paling kritis.

**Acceptance criteria**

- Minimal satu skenario outage notifikasi/gateway diuji.
- Minimal satu skenario outage provider video diuji.
- Ada catatan behavior, fallback, dan recovery path.

**Dependencies**

- Sprint 2 integration baseline
- Sprint 4 playbooks

**Definition of done**

- Hasil failover test tersedia

## Epic S — Security Verification & Remediation Intake

### Issue S1 — Finalize security verification scope for release review

**Type:** Security / Documentation
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Security Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `security`, `documentation`

**Description**
Finalisasi scope verifikasi keamanan untuk release review, termasuk area yang telah diperkuat pada Sprint 1–4.

**Acceptance criteria**

- Ada daftar area security yang akan diverifikasi.
- Area out-of-scope dijelaskan.

**Dependencies**

- Sprint 1 IAM baseline
- Sprint 2 webhook/crypto baseline
- Sprint 3 governance/compliance baseline

**Definition of done**

- Scope final tersedia

### Issue S2 — Run application security verification baseline

**Type:** Security / QA
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `security`, `qa`

**Description**
Jalankan verifikasi keamanan baseline pada area prioritas tinggi yang dapat diuji dalam sprint.

**Suggested scope**

- auth and policy enforcement checks
- webhook validation paths
- legacy-proxy bypass attempts
- protected participant data visibility
- secret/config exposure review

**Acceptance criteria**

- Verifikasi baseline dijalankan.
- Temuan kritis dan tinggi teridentifikasi.
- Hasil terdokumentasi dalam format yang bisa langsung masuk remediation intake.

**Dependencies**

- S1

**Definition of done**

- Hasil verifikasi tersedia

### Issue S3 — Create security remediation intake backlog

**Type:** Documentation / Security
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Security Lead + Engineering Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `security`, `documentation`

**Description**
Buat backlog remediation dari temuan security agar decision meeting memiliki daftar tindakan yang jelas.

**Acceptance criteria**

- Semua temuan security diklasifikasikan menurut severity.
- Ada rekomendasi: fix-now, fix-before-go-live, post-go-live with acceptance.

**Dependencies**

- S2

**Definition of done**

- Backlog remediation tersedia

### Issue S4 — Fix critical release-blocking security findings

**Type:** Engineering / Security
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Security Engineer + Backend Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `security`, `backend`

**Description**
Perbaiki temuan security yang dikategorikan release-blocking dan realistis ditutup pada sprint ini.

**Acceptance criteria**

- Temuan release-blocking yang dipilih berhasil ditutup.
- Ada bukti re-test atau verification ulang.

**Dependencies**

- S3

**Definition of done**

- Fix merged
- Re-verification tersedia

## Epic T — Backup/Restore Follow-up & DR Rehearsal Execution

### Issue T1 — Resolve blockers from backup/restore dry-run

**Type:** Engineering / Platform
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p1`, `platform`

**Description**
Tutup blocker utama yang ditemukan pada dry-run backup/restore Sprint 4 agar scope DR rehearsal lebih realistis.

**Acceptance criteria**

- Blocker utama dipetakan ke tindakan nyata.
- Minimal blocker prioritas tinggi ditutup atau dimitigasi.

**Dependencies**

- Sprint 4 P3

**Definition of done**

- Review note dan fix utama tersedia

### Issue T2 — Execute limited-scope disaster recovery rehearsal

**Type:** QA / Platform
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Platform Lead + QA Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p1`, `qa`, `platform`

**Description**
Lakukan rehearsal DR dengan scope terbatas berdasarkan rencana yang telah disusun.

**Acceptance criteria**

- Rehearsal dijalankan untuk scope yang disepakati.
- Ada hasil actual vs expected.
- Ada daftar gap dan follow-up.

**Dependencies**

- Sprint 4 P4
- T1

**Definition of done**

- Evidence rehearsal tersedia

### Issue T3 — Produce recovery readiness assessment note

**Type:** Documentation / Platform
**Priority:** P2
**Estimate:** 2 points
**Suggested owner:** Platform Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p2`, `documentation`, `platform`

**Description**
Buat catatan penilaian kesiapan recovery berdasarkan backup/restore dan DR rehearsal.

**Acceptance criteria**

- Ada assessment note yang jujur tentang apa yang sudah dan belum siap.

**Dependencies**

- T2

**Definition of done**

- Assessment note tersedia

## Epic U — UAT Execution & Sign-off Package

### Issue U1 — Finalize cross-agency UAT schedule and participants

**Type:** Process / Documentation
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Engineering Lead + Compliance Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `documentation`

**Description**
Finalisasi jadwal, aktor, dan precondition untuk UAT lintas instansi.

**Acceptance criteria**

- Ada jadwal UAT final.
- Ada daftar peserta dan owner per skenario.
- Ada precondition checklist untuk memulai UAT.

**Dependencies**

- Sprint 4 Q2
- Sprint 4 Q3

**Definition of done**

- Paket jadwal UAT tersedia

### Issue U2 — Execute priority UAT scenarios

**Type:** QA / Compliance
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** QA Lead + Compliance Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `qa`, `documentation`

**Description**
Jalankan skenario UAT prioritas tertinggi yang paling memengaruhi keputusan produksi.

**Suggested scope**

- intake → scheduling → notices → readiness → virtual session
- appeal-decision publication/transmission path
- participant visibility and protected identity behavior
- governance-sensitive action path jika memungkinkan

**Acceptance criteria**

- UAT prioritas dijalankan.
- Hasil actual vs expected terdokumentasi.
- Temuan dibedakan menjadi blocker vs non-blocker.

**Dependencies**

- U1

**Definition of done**

- UAT evidence tersedia
- Temuan tercatat

### Issue U3 — Collect sign-off comments and residual risk acceptance

**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Engineering Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p1`, `documentation`, `go-no-go`

**Description**
Kumpulkan komentar sign-off, catatan pengecualian, dan residual risk acceptance dari pihak yang relevan.

**Acceptance criteria**

- Ada catatan sign-off atau penolakan dari pihak terkait.
- Residual risk tercatat dengan owner dan keputusan.

**Dependencies**

- U2

**Definition of done**

- Paket komentar/sign-off tersedia

## Epic V — Final Production Decision Package

### Issue V1 — Assemble final production readiness evidence package

**Type:** Documentation / QA
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** QA Lead + Engineering Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `documentation`, `go-no-go`

**Description**
Kumpulkan seluruh evidence utama dari Sprint 1–5 menjadi paket final untuk decision meeting.

**Scope**

- production gates evidence
- IAM and security evidence
- integration and reconciliation evidence
- compliance runtime evidence
- observability and runbook evidence
- load/soak/failover evidence
- backup/restore and DR evidence
- UAT evidence

**Acceptance criteria**

- Ada satu paket evidence final yang rapi dan dapat direview.
- Struktur paket memudahkan penilaian GO/CONDITIONAL GO/NO-GO.

**Dependencies**

- R2
- R3
- R4
- S2
- T2
- U2

**Definition of done**

- Paket evidence tersedia

### Issue V2 — Produce final blocker and residual risk register

**Type:** Documentation / Governance
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Engineering Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `documentation`, `go-no-go`

**Description**
Susun register akhir yang merangkum blocker, residual risk, mitigasi, dan rekomendasi keputusan.

**Acceptance criteria**

- Semua blocker dan residual risk diklasifikasikan.
- Ada rekomendasi keputusan yang jelas untuk tiap item.

**Dependencies**

- S3
- U3
- V1

**Definition of done**

- Risk register final tersedia

### Issue V3 — Prepare GO / CONDITIONAL GO / NO-GO decision memo

**Type:** Documentation / Leadership
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Engineering Lead + Compliance Lead + Security Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p0`, `documentation`, `go-no-go`

**Description**
Siapkan memo keputusan akhir yang merangkum readiness, gap tersisa, syarat jika conditional go, dan alasan bila no-go.

**Acceptance criteria**

- Ada draft memo keputusan final.
- Memo didukung oleh evidence package dan risk register.

**Dependencies**

- V1
- V2

**Definition of done**

- Memo tersedia untuk decision meeting

### Issue V4 — Publish Sprint 5 final review template

**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 1 point
**Suggested owner:** Engineering Lead
**Labels:** `sprint-5`, `production-readiness`, `release-readiness`, `p1`, `documentation`

**Description**
Buat template review akhir Sprint 5 untuk memfasilitasi rapat keputusan produksi.

**Acceptance criteria**

- Template tersedia dan siap dipakai pada final review.

**Dependencies**

- Tidak ada

**Definition of done**

- Template tersedia

## Rekomendasi Urutan Pembuatan Issue di Board

1. R1
2. S1
3. U1
4. V4
5. R2
6. S2
7. T1
8. U2
9. R3
10. R4
11. S3
12. S4
13. T2
14. V1
15. U3
16. V2
17. T3
18. V3

## Rekomendasi Milestone

### Milestone 1 — Readiness Test Execution

- R1
- R2
- R3
- R4

### Milestone 2 — Security Release Verification

- S1
- S2
- S3
- S4

### Milestone 3 — Recovery & DR Evidence

- T1
- T2
- T3

### Milestone 4 — UAT & Final Decision Package

- U1
- U2
- U3
- V1
- V2
- V3
- V4

## Exit Criteria Sprint 5

Sprint 5 dapat ditutup dengan hasil baik bila:

- Load/soak/failover baseline telah dijalankan dan terdokumentasi.
- Security verification baseline telah selesai dan temuan kritis ditangani atau dipetakan jelas.
- DR rehearsal terbatas telah dijalankan.
- UAT prioritas telah dijalankan dan hasilnya terdokumentasi.
- Evidence package final, risk register, dan decision memo tersedia.
- Tim siap mengadakan decision meeting production berbasis evidence.

## Catatan Setelah Sprint 5

Setelah Sprint 5, program masuk ke fase keputusan. Hasil akhirnya bisa berupa:

- **GO** bila blocker kritis tertutup dan residual risk dapat diterima,
- **CONDITIONAL GO** bila ada syarat tambahan yang wajib dipenuhi sebelum real-case rollout,
- **NO-GO** bila evidence menunjukkan gap kritis masih terlalu tinggi.
