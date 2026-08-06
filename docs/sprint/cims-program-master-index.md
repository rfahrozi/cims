# CIMS Program Master Index

## Tujuan

Dokumen ini adalah peta induk untuk seluruh program perbaikan **production readiness** CIMS. Fungsinya adalah menyatukan roadmap, backlog, issue breakdown, urutan sprint, dan keputusan eksekusi supaya tim tidak perlu membuka banyak dokumen tanpa konteks.

## Cara Menggunakan Dokumen Ini

Gunakan dokumen ini sebagai titik masuk utama untuk:

- memahami posisi program saat ini,
- melihat dokumen mana yang menjadi sumber kebenaran untuk tiap sprint,
- mengetahui fokus, outcome, dan exit criteria per sprint,
- menyiapkan planning, review, dan decision meeting.

## Dokumen Induk Program

### 1. Roadmap utama

- `cims-production-readiness-roadmap.md`

Dokumen ini berisi arah program 30/60/90 hari, prinsip eksekusi, prioritas P0/P1/P2, dan exit criteria menuju decision meeting production.

### 2. Backlog Sprint 1

- `cims-sprint1-backlog.md`

Dokumen ini berisi backlog operasional awal untuk menutup risiko produksi paling kritis.

## Dokumen Breakdown per Sprint

### Sprint 1

- `cims-sprint1-issue-breakdown.md`

Fokus utama:

- production gate enforcement,
- IAM hardening phase 1,
- CI hardening minimum.

Expected outcome:

- sistem gagal start pada konfigurasi tidak aman,
- auth dev tidak lolos ke non-dev,
- endpoint kritis memiliki baseline auth/policy coverage,
- CI memiliki quality gate minimum.

### Sprint 2

- `cims-sprint2-issue-breakdown.md`

Fokus utama:

- notification & official gateway hardening,
- secrets & crypto hardening,
- evidence storage hardening,
- zoom / virtual session hardening.

Expected outcome:

- integrasi sandbox nyata tersedia,
- secret management mulai keluar dari pola lokal,
- evidence storage memiliki baseline integritas,
- provider video memiliki baseline security dan failure handling.

### Sprint 3

- `cims-sprint3-issue-breakdown.md`

Fokus utama:

- compliance runtime,
- rule matrix & traceability,
- enforcement untuk decision, notices, scheduling,
- readiness, participants, custody,
- governance dan legacy-proxy controls.

Expected outcome:

- aturan proses kritis mulai enforced di runtime,
- evidence compliance dapat ditelusuri ke modul dan test,
- legacy bypass risk ditekan.

### Sprint 4

- `cims-sprint4-issue-breakdown.md`

Fokus utama:

- observability,
- SLA visibility,
- outbox/reconciliation visibility,
- incident runbook,
- backup/restore readiness,
- UAT preparation.

Expected outcome:

- tim dapat memantau sistem secara operasional,
- dashboard dan playbook minimum tersedia,
- recovery path memiliki prosedur dan dry-run awal.

### Sprint 5

- `cims-sprint5-issue-breakdown.md`

Fokus utama:

- load/soak/failover testing,
- security verification,
- DR rehearsal,
- UAT execution,
- final evidence package,
- GO / CONDITIONAL GO / NO-GO decision prep.

Expected outcome:

- program siap masuk decision meeting production berbasis evidence.

## Peta Urutan Program

### Fase 1 — Startup Safety & IAM Baseline

Dokumen utama:

- `cims-sprint1-backlog.md`
- `cims-sprint1-issue-breakdown.md`

Tujuan fase:

- menutup risiko salah deploy,
- memastikan auth dev dan mode mock/local tidak bocor ke environment serius,
- membangun baseline quality gate.

### Fase 2 — Integration & Data Protection Baseline

Dokumen utama:

- `cims-sprint2-issue-breakdown.md`

Tujuan fase:

- memindahkan sistem dari simulasi ke integrasi sandbox yang lebih nyata,
- memperkuat secret, crypto, evidence, dan provider handling.

### Fase 3 — Compliance Runtime Enforcement

Dokumen utama:

- `cims-sprint3-issue-breakdown.md`

Tujuan fase:

- memastikan aturan proses dan kewajiban normatif ditegakkan di runtime dan dapat diuji.

### Fase 4 — Operational Readiness

Dokumen utama:

- `cims-sprint4-issue-breakdown.md`

Tujuan fase:

- memberi kemampuan monitoring, triage, recovery, dan playbook operasional.

### Fase 5 — Release Readiness Decision

Dokumen utama:

- `cims-sprint5-issue-breakdown.md`

Tujuan fase:

- mengumpulkan evidence final dan memfasilitasi keputusan produksi.

## Ringkasan Fokus per Sprint

| Sprint   | Tema                  | Fokus Utama                                 | Output Kunci                                           |
| -------- | --------------------- | ------------------------------------------- | ------------------------------------------------------ |
| Sprint 1 | Startup Safety        | env gate, auth, CI minimum                  | fail-fast config, IAM baseline, CI gates               |
| Sprint 2 | Integration Baseline  | gateway, secret, crypto, evidence, provider | sandbox integration, crypto baseline, storage baseline |
| Sprint 3 | Compliance Runtime    | rule enforcement di backend/domain          | rule matrix, runtime controls, compliance tests        |
| Sprint 4 | Operational Readiness | observability, runbook, recovery, UAT prep  | dashboard, playbook, dry-run evidence                  |
| Sprint 5 | Release Decision      | testing, UAT, DR, final memo                | evidence package, risk register, decision memo         |

## Status Program yang Direkomendasikan

Gunakan status program berikut untuk review mingguan:

- **Planned**
- **In Progress**
- **At Risk**
- **Blocked**
- **Ready for Review**
- **Accepted**
- **Carried Forward**

## Board dan Navigasi yang Disarankan

### Board level program

Gunakan satu board program besar dengan filter per sprint.

### Board level sprint

Setiap sprint disarankan memiliki kolom:

- Backlog
- Ready
- In Progress
- In Review
- Ready for QA
- Done
- Blocked

### Swimlane yang disarankan

- Security
- Platform
- Backend
- Integration
- QA
- Documentation / Governance

## Ritme Meeting yang Disarankan

### Weekly readiness review

Agenda:

- progres issue P0/P1,
- residual risk baru,
- hasil test/evidence minggu berjalan,
- blocker lintas tim,
- keputusan carry-over.

### Sprint planning

Agenda:

- konfirmasi scope sprint,
- konfirmasi dependency dan owner,
- konfirmasi definition of done,
- konfirmasi evidence yang harus dihasilkan.

### Sprint review

Agenda:

- demo hasil penting,
- review issue selesai vs carry-over,
- review residual risk,
- persetujuan readiness untuk sprint berikutnya.

### Decision review

Dilakukan setelah Sprint 5 atau ketika evidence program dianggap cukup.

## Dependency Program yang Harus Dijaga

- keputusan role matrix lintas instansi,
- akses ke identity provider dan konfigurasi OIDC,
- ketersediaan sandbox integrasi eksternal,
- keputusan target secret provider,
- keputusan target object storage,
- environment uji untuk load/soak/failover,
- partisipasi pihak lintas instansi untuk UAT.

## Risiko Program yang Paling Penting

- role mapping lintas instansi terlambat disepakati,
- sandbox eksternal tidak stabil atau terlambat tersedia,
- technical debt lama muncul setelah CI gate diperketat,
- enforcement compliance membuka gap implementasi yang lebih besar dari perkiraan,
- bukti readiness tidak dikumpulkan secara disiplin sejak awal.

## Mitigasi Program yang Disarankan

- simpan evidence per sprint, bukan di akhir,
- bedakan blocker release vs backlog perbaikan biasa,
- gunakan weekly review yang ketat,
- timebox keputusan arsitektur lintas fungsi,
- buat owner tunggal untuk tiap workstream utama.

## Artefak yang Harus Ada di Akhir Program

- production readiness roadmap,
- backlog dan issue breakdown setiap sprint,
- role matrix dan compliance rule matrix,
- hasil test dan scan penting,
- dashboard dan runbook utama,
- evidence package final,
- residual risk register,
- GO / CONDITIONAL GO / NO-GO memo.

## Entry Criteria per Sprint

### Masuk Sprint 1

- roadmap disetujui internal,
- daftar owner awal tersedia.

### Masuk Sprint 2

- fail-fast config dan IAM baseline minimum aktif.

### Masuk Sprint 3

- gateway sandbox utama dan baseline crypto/evidence sudah tersedia.

### Masuk Sprint 4

- compliance runtime minimum telah enforced untuk modul kritis.

### Masuk Sprint 5

- observability, runbook, recovery baseline, dan UAT prep tersedia.

## Exit Criteria per Sprint

### Exit Sprint 1

- env gate aktif,
- auth dev tidak lolos ke non-dev,
- CI baseline aktif.

### Exit Sprint 2

- gateway sandbox utama aktif,
- secret/crypto/evidence/provider baseline tersedia.

### Exit Sprint 3

- compliance rule matrix dan runtime enforcement minimum tersedia.

### Exit Sprint 4

- dashboard, playbook, backup/restore baseline, dan UAT prep tersedia.

### Exit Sprint 5

- load/soak/failover/security/UAT evidence tersedia,
- risk register final tersedia,
- decision memo siap direview.

## Saran Urutan Penggunaan Dokumen oleh Tim

1. Mulai dari `cims-program-master-index.md`
2. Buka `cims-production-readiness-roadmap.md`
3. Buka `cims-sprint1-backlog.md` untuk sprint aktif
4. Gunakan dokumen `cims-sprintX-issue-breakdown.md` saat membuat issue dan menjalankan sprint
5. Gunakan dokumen RACI untuk memastikan ownership dan approval path jelas

## Dokumen Pelengkap

- `cims-program-raci.md`

Dokumen ini mendefinisikan pembagian peran, tanggung jawab, approval, dan support lintas workstream.

## Rekomendasi Langkah Berikutnya

Setelah master index ini, langkah paling berguna adalah:

- memetakan issue ke board nyata,
- menetapkan owner per epic dan per sprint,
- menjalankan weekly readiness review dengan template tetap,
- mulai Sprint 1 dengan issue P0 terlebih dahulu.
