# CIMS Production Readiness Roadmap

## Tujuan
Dokumen ini menjadi baseline eksekusi perbaikan bertahap untuk membawa CIMS dari status **preproduction baseline** menuju **production-ready** yang selaras dengan kebutuhan kepatuhan, keamanan, integrasi lintas instansi, dan ketahanan operasional.

## Keputusan Saat Ini
Status saat ini adalah **Conditional No-Go for Production**. Fokus perbaikan tidak dimulai dari penambahan fitur baru, melainkan dari penutupan risiko produksi, hardening identitas dan akses, hardening integrasi, penguatan compliance runtime, serta operational readiness.

## Sasaran 90 Hari
Dalam 90 hari, target minimum adalah:

- Menutup seluruh blocker P0 pada auth, environment gating, dan mode integrasi.
- Menyelesaikan hardening dasar IAM berbasis OIDC dan policy enforcement.
- Mengaktifkan jalur integrasi sandbox resmi untuk notifikasi, official system, dan provider video.
- Menjalankan quality gate CI yang lebih ketat, termasuk scan keamanan dan integration tests.
- Menyiapkan evidence package untuk UAT, load test, backup/restore, dan DR rehearsal awal.
- Menyusun matriks kepatuhan per modul untuk fitur yang paling kritis secara regulatif.

## Prinsip Eksekusi
1. Tidak ada fitur baru sebelum risiko P0 dan P1 utama ditutup.
2. Semua perubahan harus menghasilkan bukti: test, log, dashboard, atau dokumen keputusan.
3. Setiap modul kritis harus punya owner engineering dan owner bisnis/regulasi.
4. Semua mode dev/mock/local harus dibatasi keras dan gagal start bila dipakai di environment yang salah.
5. Compliance harus di-enforce di backend/domain, bukan hanya di UI atau SOP manual.

## Prioritas Utama
### P0
- Production fail-fast config
- AUTH hardening dan penghapusan bypass non-dev
- OIDC verifier dan role mapping lintas instansi
- Larangan mode MOCK/LOCAL/MEMORY di environment serius

### P1
- Notification gateway hardening
- Official system gateway hardening
- Secrets management via KMS/HSM/Vault
- Evidence object storage hardening
- Appeal decision dan notices compliance pack

### P2
- CI/CD security gates
- Observability dan reconciliation dashboard
- Load test, soak test, pentest, failover, backup/restore, DR rehearsal
- UAT lintas instansi dan formal sign-off

## Roadmap 30 / 60 / 90 Hari

## Hari 0–30: Stabilization & Production Gates
### Tujuan
Menutup risiko deploy yang paling berbahaya dan memastikan aplikasi tidak bisa hidup dalam mode yang salah.

### Epic 1 — Production Gate Enforcement
**Outcome:** aplikasi gagal start jika kombinasi environment tidak aman.

Task utama:
- Buat validator environment terpusat.
- Fail startup jika `NODE_ENV=production` tetapi `AUTH_MODE=DEV`.
- Fail startup jika `OIDC_ISSUER`, `OIDC_JWKS_URL`, atau `OIDC_AUDIENCE` kosong di production.
- Fail startup jika `PERSISTENCE_MODE=MEMORY` di stage selain local.
- Fail startup jika `EVIDENCE_STORAGE_MODE=LOCAL` di production.
- Fail startup jika gateway eksternal masih `MOCK` di production.
- Paksa `DB_SSL=true` di stage non-local.
- Tambahkan log startup yang menjelaskan gate mana yang gagal.

Definition of Done:
- Ada service/validator environment tunggal.
- Ada test untuk forbidden environment matrix.
- Ada dokumen `production-gates.md`.

### Epic 2 — IAM Hardening Phase 1
**Outcome:** tidak ada jalur autentikasi longgar di non-dev.

Task utama:
- Audit `auth.guard`, `policy.guard`, dan `oidc-token-verifier`.
- Nonaktifkan `dev-identity` di environment selain development.
- Definisikan role matrix awal lintas instansi.
- Tambahkan authorization tests untuk endpoint kritis.
- Verifikasi semua endpoint sensitif memakai guard dan policy.

Definition of Done:
- Role matrix terdokumentasi.
- Minimal 1 test matrix untuk role x endpoint x action.
- Tidak ada endpoint kritis tanpa policy enforcement.

### Epic 3 — CI Hardening Minimum
**Outcome:** PR tidak bisa lolos bila gagal quality gate dasar.

Task utama:
- Tambahkan lint step bila belum ada.
- Tambahkan dependency vulnerability scan.
- Tambahkan secret scan.
- Tambahkan migration verification.
- Tambahkan integration test lane untuk modul kritis.
- Tambahkan artifact retention untuk hasil test.

Definition of Done:
- Workflow CI memblok merge bila quality gate gagal.
- Hasil scan tersimpan sebagai artifact.

### Deliverable Akhir 30 Hari
- Production fail-fast config aktif.
- Dev bypass tertutup.
- IAM baseline lebih aman.
- CI memiliki gate dasar.
- Daftar blocker P0 berkurang signifikan.

## Hari 31–60: Integration & Data Protection Hardening
### Tujuan
Memindahkan sistem dari mode simulasi menuju mode integrasi yang layak diuji serius.

### Epic 4 — Notification & Official Gateway Hardening
**Outcome:** integrasi eksternal mendukung sandbox resmi, retry, audit, dan reconciliation.

Task utama:
- Implementasi HTTP sandbox mode untuk notifikasi.
- Implementasi HTTP sandbox mode untuk official-system gateway.
- Tambahkan timeout, retry, backoff, dan idempotency.
- Tambahkan receipt tracking dan failure classification.
- Tambahkan reconciliation job dan dashboard error.

Definition of Done:
- Gateway tidak lagi hanya MOCK pada stage uji serius.
- Delivery state dapat diaudit end-to-end.

### Epic 5 — Secrets & Crypto Hardening
**Outcome:** secret dan enkripsi data sensitif layak untuk environment produksi.

Task utama:
- Integrasi KMS/HSM/Vault.
- Tambahkan key versioning.
- Tambahkan rotation workflow.
- Audit algoritma, IV/nonce, dan AEAD pada field encryption.
- Tambahkan audit log untuk operasi kriptografi administratif.

Definition of Done:
- Secret lokal bukan lagi mekanisme utama production.
- Ada prosedur rotasi kunci yang teruji.

### Epic 6 — Evidence Storage Hardening
**Outcome:** dokumen/evidence memiliki integritas, audit trail, dan storage policy yang lebih kuat.

Task utama:
- Ganti storage mode ke object storage production-grade.
- Tambahkan checksum verification.
- Tambahkan manifest verification.
- Validasi legal hold dan retention compatibility.
- Tambahkan recovery test untuk objek evidence.

Definition of Done:
- Evidence tidak lagi mengandalkan storage lokal pada stage serius.
- Integrity verification tersedia dan teruji.

### Epic 7 — Zoom / Virtual Session Hardening
**Outcome:** provider video aman, dapat direkonsiliasi, dan tahan terhadap failure mode umum.

Task utama:
- Audit webhook signature validation.
- Tambahkan anti-replay protection.
- Tambahkan meeting reconciliation.
- Tambahkan orphan-room cleanup.
- Tambahkan test untuk duplicate webhook, timeout, dan out-of-order events.

Definition of Done:
- Webhook tervalidasi.
- Failure mode utama provider punya handling eksplisit.

### Deliverable Akhir 60 Hari
- Integrasi sandbox resmi hidup.
- Secret dan crypto lebih kuat.
- Evidence storage lebih layak produksi.
- Virtual session lebih aman dan andal.

## Hari 61–90: Compliance Runtime & Operational Readiness
### Tujuan
Membuktikan bahwa fitur kritis bukan hanya ada, tetapi benar-benar enforce aturan dan siap diuji menuju go-live.

### Epic 8 — Compliance Pack untuk Modul Kritis
**Outcome:** aturan regulatif paling penting ter-enforce di backend/domain dan terbukti lewat test.

Modul prioritas:
- `appeal-decision`
- `notices`
- `scheduling`
- `readiness`
- `participants`
- `custody`
- `liaison`
- `governance`
- `compliance`
- `legacy-proxy`

Task utama:
- Buat matriks rule per modul.
- Implementasikan hard gate yang belum ada.
- Tambahkan SLA alert untuk same-day publication dan 7-day transmission.
- Tambahkan audit receipt untuk notices.
- Tambahkan maker-checker dan self-approval prevention bila relevan.
- Pastikan legacy proxy tidak mem-bypass auth/policy/audit.

Definition of Done:
- Setiap modul kritis punya daftar aturan, bukti implementasi, dan test.
- Rule paling sensitif secara regulatif punya traceability.

### Epic 9 — Observability & Runbook
**Outcome:** operasi sistem dapat dipantau dan ditangani secara disiplin.

Task utama:
- Dashboard latency/error per modul.
- Dashboard queue/outbox dan failed delivery.
- Dashboard SLA same-day / 7-day process.
- Incident runbook.
- Security incident flow 1x24 jam.
- Key rotation runbook.
- Provider outage playbook.
- Backup/restore runbook.

Definition of Done:
- Tim dapat mendeteksi dan merespons kegagalan utama secara operasional.

### Epic 10 — Readiness Test & UAT
**Outcome:** tersedia bukti formal bahwa sistem layak masuk tahap go-live decision.

Task utama:
- Load test.
- Soak test.
- Penetration test.
- Failover test.
- Backup/restore rehearsal.
- Disaster recovery rehearsal.
- UAT lintas instansi.
- Pengumpulan sign-off formal.

Definition of Done:
- Ada evidence package readiness.
- Ada keputusan formal GO / CONDITIONAL GO / NO-GO berdasarkan hasil uji.

### Deliverable Akhir 90 Hari
- Modul kritis punya compliance evidence.
- Operasi memiliki dashboard dan runbook.
- Pengujian readiness utama telah dijalankan.
- Ada dasar kuat untuk decision meeting production.

## Backlog Modul Prioritas
| Modul | Fokus Perbaikan | Prioritas |
|---|---|---|
| auth / common security | OIDC, role mapping, policy guard, dev bypass | P0 |
| infrastructure | env gating, crypto, outbox, gateway, metrics | P0 |
| notices | receipt, SLA, retry, audit | P1 |
| appeal-decision | same-day publication, 7-day transmission, alerting | P1 |
| scheduling | state transition, dependency gate, reschedule audit | P1 |
| readiness | lintas instansi checklist, hard gate sidang | P1 |
| participants | masking, access partitioning, protected identities | P1 |
| custody | mutasi tahanan, dependency dan audit trail | P1 |
| liaison | pejabat penghubung, delegasi, masa berlaku | P2 |
| governance/compliance | legal hold, retention, maker-checker | P2 |
| legacy-proxy | anti-bypass control | P2 |
| zoom-provider | webhook security, reconciliation, failure handling | P1 |

## Struktur Sprint yang Disarankan
### Sprint 1
- Production Gate Enforcement
- IAM Hardening Phase 1
- CI Hardening Minimum

### Sprint 2
- Notification & Official Gateway Hardening
- Secrets & Crypto Hardening

### Sprint 3
- Evidence Storage Hardening
- Zoom / Virtual Session Hardening
- Compliance Pack untuk `notices` dan `appeal-decision`

### Sprint 4
- Compliance Pack untuk `scheduling`, `readiness`, `participants`, `custody`
- Observability & Runbook

### Sprint 5
- Governance / compliance hardening
- Readiness test suite
- UAT prep dan sign-off package

## KPI Program Perbaikan
- 0 forbidden production startup configuration lolos deploy.
- 100% endpoint kritis ter-cover auth + policy test.
- 100% gateway eksternal kritis punya retry, timeout, audit, dan reconciliation.
- 100% modul P1 memiliki matriks rule dan test utama.
- Semua blocker P0 dan mayoritas blocker P1 tertutup sebelum decision meeting production.

## Risiko Eksekusi
- Role mapping lintas instansi tidak cepat disepakati.
- KMS/HSM/Vault dan sandbox eksternal terlambat tersedia.
- Test non-fungsional membutuhkan environment khusus dan waktu lebih panjang.
- Ada gap implementasi yang baru terlihat saat UAT atau reconciliation test.

## Mitigasi
- Tetapkan owner lintas fungsi sejak awal.
- Pisahkan workstream engineering, security, dan integration.
- Terapkan weekly readiness review.
- Simpan evidence per epic, bukan di akhir program.

## Struktur Owner yang Disarankan
- Engineering Lead: koordinasi delivery teknis.
- Security Lead: IAM, crypto, secret, pentest remediation.
- Integration Lead: gateway resmi, provider video, reconciliation.
- Domain/Compliance Lead: rule matrix per modul.
- QA/Release Lead: CI, integration test, readiness evidence, UAT package.

## Exit Criteria untuk Decision Meeting Production
Sistem baru layak masuk decision meeting production bila:

1. Semua blocker P0 tertutup.
2. Gateway kritis tidak lagi berjalan dalam mode mock/local untuk stage target.
3. IAM dan policy enforcement telah lolos test matriks awal.
4. Modul regulatif paling kritis telah memiliki compliance evidence.
5. Observability, incident runbook, backup/restore, dan DR rehearsal minimum telah tersedia.
6. UAT lintas instansi telah berjalan dan menghasilkan catatan sign-off atau daftar tindakan residual yang disetujui.

## Rekomendasi Langkah Berikutnya
Langkah paling efektif setelah roadmap ini adalah membuat turunan operasionalnya dalam bentuk:
- Epic backlog per workstream
- Task list sprint 1 yang siap dikerjakan
- RACI per tim
- Checklist evidence untuk readiness review mingguan