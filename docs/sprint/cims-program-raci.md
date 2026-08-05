# CIMS Program RACI

## Tujuan
Dokumen ini menetapkan pembagian tanggung jawab lintas program untuk workstream production readiness CIMS. Tujuannya adalah menghindari area abu-abu dalam ownership, approval, consultation, dan support saat eksekusi sprint berlangsung.

## Cara Baca RACI
- **R — Responsible**: pihak yang mengerjakan langsung.
- **A — Accountable**: pihak yang bertanggung jawab akhir atas hasil.
- **C — Consulted**: pihak yang harus dimintai masukan sebelum keputusan penting.
- **I — Informed**: pihak yang harus diberi informasi tentang progres atau hasil.

## Peran yang Digunakan
- **Engineering Lead**: pemilik delivery teknis lintas sprint.
- **Backend Lead**: pemilik area API, domain enforcement, dan modul backend utama.
- **Platform Lead**: pemilik CI/CD, metrics, environment, deployment, dan recovery path.
- **Security Lead**: pemilik IAM, crypto, secret, security verification, dan incident security.
- **Integration Lead**: pemilik gateway eksternal, reconciliation, dan provider integration.
- **QA Lead**: pemilik strategy test, integration test, readiness test, dan evidence quality.
- **Compliance Lead**: pemilik rule matrix, regulatory interpretation, UAT scenario lintas fungsi, dan sign-off support.
- **Product/Program Owner**: pemilik prioritas bisnis, keputusan scope, dan penerimaan residual risk bisnis.

## RACI Tingkat Program
| Workstream | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Program roadmap & sequencing | A | C | C | C | C | C | C | R |
| Sprint planning & scope control | A | R | R | R | R | R | C | C |
| Weekly readiness review | A | R | R | R | R | R | C | I |
| Risk register & escalation | A | C | C | C | C | C | C | I |
| Final production decision package | A | C | C | C | C | C | C | I |

## RACI Workstream Teknis Utama
| Workstream | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Environment gating & startup safety | A | R | R | C | I | C | I | I |
| AUTH / OIDC / role mapping | A | C | I | R | I | C | C | I |
| Policy guard & endpoint coverage | A | R | I | C | I | C | C | I |
| CI hardening & quality gates | A | I | R | C | I | C | I | I |
| Notification gateway hardening | A | C | I | C | R | C | I | I |
| Official-system gateway hardening | A | C | I | C | R | C | C | I |
| Secrets management & crypto | A | C | C | R | I | C | I | I |
| Evidence storage hardening | A | C | R | C | I | C | C | I |
| Zoom / virtual session hardening | A | C | I | C | R | C | C | I |
| Compliance rule matrix | I | C | I | I | I | C | A/R | C |
| Compliance runtime enforcement | A | R | I | C | C | C | C | I |
| Governance & legal hold controls | A | R | I | C | I | C | C | I |
| Legacy-proxy anti-bypass control | A | R | I | C | C | C | I | I |
| Observability & SLA dashboards | A | C | R | C | C | C | I | I |
| Backup/restore & DR readiness | A | I | R | C | I | C | I | I |
| UAT preparation & execution | A | C | I | I | C | R | C | I |
| Final evidence package | A | C | C | C | C | R | C | I |

## RACI per Sprint

## Sprint 1 — Startup Safety, IAM Baseline, CI Minimum
| Area | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Production Gate Enforcement | A | R | R | C | C | C | I | I |
| IAM Hardening Phase 1 | A | C | I | R | I | C | C | I |
| CI Hardening Minimum | A | I | R | C | I | C | I | I |
| Production gates documentation | A | R | C | C | I | I | I | I |

## Sprint 2 — Integration & Data Protection Baseline
| Area | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Notification gateway hardening | A | C | I | C | R | C | I | I |
| Official-system gateway hardening | A | C | I | C | R | C | C | I |
| Secrets & crypto hardening | A | C | C | R | I | C | I | I |
| Evidence storage hardening | A | C | R | C | I | C | C | I |
| Zoom / virtual session hardening | A | C | I | C | R | C | C | I |

## Sprint 3 — Compliance Runtime
| Area | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Compliance rule matrix | I | C | I | I | I | C | A/R | C |
| Appeal decision / notices / scheduling enforcement | A | R | I | C | C | C | C | I |
| Readiness / participants / custody enforcement | A | R | I | C | C | C | C | I |
| Governance & legacy-proxy controls | A | R | I | C | C | C | C | I |
| Compliance integration tests & evidence | A | C | I | I | I | R | C | I |

## Sprint 4 — Operational Readiness
| Area | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Observability & metrics | A | C | R | C | C | C | I | I |
| SLA / outbox / reconciliation visibility | A | C | R | I | C | C | I | I |
| Incident runbook & playbooks | A | I | C | R | C | C | I | I |
| Backup/restore & DR prep | A | I | R | C | I | C | I | I |
| UAT preparation | A | I | I | I | C | R | C | I |

## Sprint 5 — Release Readiness Decision
| Area | Engineering Lead | Backend Lead | Platform Lead | Security Lead | Integration Lead | QA Lead | Compliance Lead | Product/Program Owner |
|---|---|---|---|---|---|---|---|---|
| Load / soak / failover testing | A | C | R | I | C | R | I | I |
| Security verification & remediation intake | A | C | I | R | I | C | I | I |
| DR rehearsal & recovery assessment | A | I | R | C | I | C | I | I |
| UAT execution & sign-off package | A | C | I | I | C | R | C | I |
| Final evidence package & decision memo | A | C | C | C | C | R | C | I |

## Decision Rights yang Disarankan
### Keputusan yang harus dimiliki Engineering Lead
- prioritas sprint lintas workstream,
- keputusan carry-over issue,
- penerimaan risiko teknis non-regulatif tingkat menengah,
- readiness summary sebelum review formal.

### Keputusan yang harus dimiliki Security Lead
- severity temuan security,
- apakah suatu temuan adalah release-blocking security issue,
- approval jalur kontrol IAM, webhook security, dan secret handling.

### Keputusan yang harus dimiliki Compliance Lead
- interpretasi rule matrix,
- klasifikasi gap regulatif sebagai blocker atau non-blocker,
- approval awal untuk skenario UAT dan evidence compliance.

### Keputusan yang harus dimiliki Platform Lead
- kesiapan CI, observability, recovery, dan deployment guard,
- kelayakan backup/restore rehearsal,
- readiness environment uji.

### Keputusan yang harus dimiliki Product/Program Owner
- prioritas bisnis lintas sprint,
- penerimaan residual risk bisnis yang tidak bersifat release-blocking teknis/regulatif,
- keputusan apakah scope tertentu dapat ditunda.

## Cadence Approval yang Disarankan
### Saat issue dibuat
- Responsible ditetapkan,
- Accountable diverifikasi,
- dependency lintas fungsi dikonfirmasi.

### Saat issue masuk In Review
- reviewer utama sesuai kolom Accountable atau Consulted,
- evidence minimum sudah dilampirkan.

### Saat sprint review
- Engineering Lead memimpin review,
- QA Lead memverifikasi evidence,
- Compliance Lead dan Security Lead menandai residual risk yang belum ditutup.

### Saat decision meeting production
- Engineering Lead menyajikan package akhir,
- QA Lead menyajikan evidence summary,
- Security Lead menyajikan status security findings,
- Compliance Lead menyajikan status rule and UAT coverage,
- Product/Program Owner menerima atau menolak residual risk bisnis yang tersisa.

## Escalation Path yang Disarankan
### Jika blocker teknis muncul
Responsible mengeskalasi ke Accountable pada hari yang sama. Jika blocker memengaruhi sprint outcome, Engineering Lead memasukkannya ke weekly readiness review.

### Jika blocker security muncul
Security Lead menentukan severity dan apakah blocker tersebut harus menghentikan rollout sprint tertentu atau hanya memerlukan remediation terencana.

### Jika blocker compliance muncul
Compliance Lead menentukan apakah gap tersebut bersifat interpretasi, implementasi, atau evidence gap, lalu mengarahkan apakah perlu issue baru atau revisi acceptance criteria.

### Jika dependency eksternal macet
Integration Lead atau Platform Lead mengeskalasi ke Engineering Lead dan Product/Program Owner untuk keputusan re-sequencing atau scope change.

## Artefak yang Harus Dimiliki per Peran
### Engineering Lead
- sprint summary,
- blocker register,
- decision log,
- final memo draft.

### Backend Lead
- implementation notes,
- module coverage status,
- enforcement gap list.

### Platform Lead
- CI evidence,
- metrics/dashboard snapshots,
- recovery procedure dan dry-run evidence.

### Security Lead
- IAM status,
- crypto/secret posture note,
- security findings register.

### Integration Lead
- gateway readiness note,
- reconciliation note,
- provider outage findings.

### QA Lead
- test evidence package,
- readiness test catalog,
- UAT result summary.

### Compliance Lead
- rule matrix,
- traceability map,
- compliance gap register,
- UAT scenario inventory.

### Product/Program Owner
- scope decisions,
- residual risk acceptance notes,
- release decision notes.

## Rekomendasi Penerapan Praktis
- Tetapkan satu owner **Responsible** per issue, bukan tim kolektif.
- Jangan gabungkan **Responsible** dan **Accountable** terlalu sering pada workstream lintas fungsi yang sensitif.
- Setiap issue P0 wajib punya jalur escalation yang jelas.
- Setiap sprint review wajib menutup diskusi dengan daftar owner dan due date untuk residual risk.

## Langkah Berikutnya
Setelah dokumen RACI ini, langkah paling berguna adalah:
- menetapkan nama orang nyata ke setiap peran,
- memetakan issue Sprint 1–5 ke owner aktual,
- menambahkan label owner/workstream di board,
- menjalankan review mingguan dengan struktur yang sama di seluruh sprint.
