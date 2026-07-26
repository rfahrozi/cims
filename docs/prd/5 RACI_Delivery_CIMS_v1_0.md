# RACI Delivery CIMS v1.0

Versi: 1.0  
Tanggal: 2026-07-26

## Tujuan

Dokumen ini memetakan tanggung jawab delivery CIMS v1.0 menggunakan model **RACI** agar roadmap, sprint plan, UAT, dan go-live dapat dieksekusi dengan jelas.

Keterangan:

- **R = Responsible** — pelaksana utama
- **A = Accountable** — pemegang keputusan akhir
- **C = Consulted** — pihak yang wajib dikonsultasikan
- **I = Informed** — pihak yang perlu diberi informasi

## Peran Inti

| Kode | Peran                                      |
| ---- | ------------------------------------------ |
| SC   | Steering Committee / Sponsor               |
| PO   | Product Owner / Product Manager            |
| BA   | Business Analyst / Process Analyst         |
| UX   | UX/UI Designer                             |
| BE   | Backend Engineer Lead                      |
| FE   | Frontend Engineer Lead                     |
| QA   | QA Lead                                    |
| DO   | DevOps / Platform Engineer                 |
| SE   | Security Lead                              |
| DL   | Data / DB Lead                             |
| OPS  | Operasional Pengadilan / Panitera Champion |
| LEG  | Legal / Compliance                         |
| UAT  | UAT Champion Lintas Instansi               |

## RACI Tingkat Program

| Aktivitas                                | SC  | PO  | BA  | UX  | BE  | FE  | QA  | DO  | SE  | DL  | OPS | LEG | UAT |
| ---------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Finalisasi scope v1.0                    | A   | R   | C   | I   | I   | I   | I   | I   | I   | I   | C   | C   | I   |
| Finalisasi PRD                           | I   | A   | R   | C   | C   | C   | I   | I   | I   | I   | C   | C   | I   |
| Finalisasi roadmap & sprint plan         | I   | A   | R   | I   | C   | C   | C   | C   | C   | I   | C   | I   | I   |
| Finalisasi boundary CIMS vs sistem resmi | A   | R   | C   | I   | C   | I   | I   | I   | C   | I   | C   | R   | I   |
| Finalisasi role & permission baseline    | I   | A   | R   | I   | C   | C   | C   | I   | C   | I   | C   | C   | I   |
| Persetujuan arsitektur teknis            | I   | A   | C   | I   | R   | C   | I   | C   | C   | C   | I   | I   | I   |
| Persetujuan desain keamanan              | I   | C   | I   | I   | C   | I   | I   | C   | A/R | C   | I   | C   | I   |
| Persetujuan model data                   | I   | C   | C   | I   | C   | I   | I   | I   | I   | A/R | C   | I   | I   |
| Delivery sprint                          | I   | A   | C   | C   | R   | R   | R   | R   | C   | C   | C   | I   | I   |
| SIT                                      | I   | C   | C   | I   | C   | C   | A/R | C   | C   | C   | C   | I   | I   |
| UAT                                      | I   | C   | C   | I   | I   | I   | C   | I   | I   | I   | C   | I   | A/R |
| Persetujuan go-live                      | A   | R   | C   | I   | C   | C   | C   | C   | C   | C   | C   | C   | C   |
| Hypercare                                | I   | A   | C   | I   | R   | R   | R   | R   | C   | C   | R   | I   | C   |

## RACI per Fase

### Phase 0 — Mobilization & Design Baseline

| Aktivitas                       | SC  | PO  | BA  | UX  | BE  | FE  | QA  | DO  | SE  | DL  | OPS | LEG | UAT |
| ------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kickoff program                 | A   | R   | C   | I   | I   | I   | I   | I   | I   | I   | I   | I   | I   |
| Baseline scope & release policy | A   | R   | C   | I   | I   | I   | I   | I   | I   | I   | C   | C   | I   |
| Workflow & state machine final  | I   | A   | R   | C   | C   | I   | I   | I   | I   | I   | C   | C   | I   |
| Draft architecture baseline     | I   | A   | C   | I   | R   | C   | I   | C   | C   | C   | I   | I   | I   |
| Draft security baseline         | I   | C   | I   | I   | C   | I   | I   | C   | A/R | I   | I   | C   | I   |
| Draft data model baseline       | I   | C   | C   | I   | C   | I   | I   | I   | I   | A/R | C   | I   | I   |

### Phase 1–2 — Core Workflow, Scheduling, Notification, Virtual Courtroom

| Aktivitas                   | SC  | PO  | BA  | UX  | BE  | FE  | QA  | DO  | SE  | DL  | OPS | LEG | UAT |
| --------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Case intake & determination | I   | A   | R   | C   | R   | C   | C   | I   | I   | C   | C   | C   | I   |
| Scheduling module           | I   | A   | R   | C   | R   | R   | C   | I   | I   | C   | C   | I   | I   |
| Notification & ACK          | I   | A   | R   | C   | R   | R   | C   | I   | C   | I   | C   | C   | I   |
| Zoom integration adapter    | I   | C   | I   | I   | A/R | I   | C   | C   | C   | I   | C   | I   | I   |
| SIT core flow               | I   | C   | C   | I   | C   | C   | A/R | I   | I   | I   | C   | I   | I   |

### Phase 3–4 — Readiness, Hearing Control, Evidence, Security, Continuity

| Aktivitas                        | SC  | PO  | BA  | UX  | BE  | FE  | QA  | DO  | SE  | DL  | OPS | LEG | UAT |
| -------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Readiness checklist              | I   | A   | R   | C   | R   | R   | C   | I   | I   | I   | C   | I   | I   |
| Verifikasi identitas & kehadiran | I   | A   | R   | C   | R   | R   | C   | I   | C   | I   | C   | C   | I   |
| Hearing control                  | I   | A   | C   | C   | R   | R   | C   | I   | I   | I   | C   | I   | I   |
| Evidence & audit log             | I   | C   | C   | I   | A/R | I   | C   | I   | C   | C   | I   | I   | I   |
| Incident/cyber/force majeure     | I   | C   | C   | I   | R   | I   | C   | C   | A   | I   | C   | C   | I   |
| MFA & access hardening           | I   | C   | I   | I   | C   | I   | C   | C   | A/R | I   | I   | I   | I   |

### Phase 5–6 — UAT, Go-Live, Hypercare

| Aktivitas              | SC  | PO  | BA  | UX  | BE  | FE  | QA  | DO  | SE  | DL  | OPS | LEG | UAT |
| ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UAT planning           | I   | A   | R   | I   | C   | C   | C   | I   | I   | I   | C   | I   | R   |
| UAT execution          | I   | C   | C   | I   | I   | I   | C   | I   | I   | I   | C   | I   | A/R |
| Defect triage          | I   | A   | C   | I   | R   | R   | R   | C   | C   | C   | C   | I   | C   |
| Go-live checklist      | A   | R   | C   | I   | C   | C   | C   | R   | C   | C   | C   | C   | I   |
| Production deployment  | I   | C   | I   | I   | C   | I   | I   | A/R | C   | I   | I   | I   | I   |
| Hypercare daily triage | I   | A   | C   | I   | R   | R   | R   | R   | C   | C   | R   | I   | C   |

## RACI per Sprint

| Sprint    | Fokus                      | A   | R                   | C            | I       |
| --------- | -------------------------- | --- | ------------------- | ------------ | ------- |
| Sprint 0  | Inception & setup          | PO  | BA, BE, DO          | QA, SE, UX   | SC, OPS |
| Sprint 1  | Case intake foundation     | PO  | BE, FE, BA          | QA, DL       | OPS     |
| Sprint 2  | Determination gate         | PO  | BE, FE, BA          | QA, LEG      | OPS     |
| Sprint 3  | Smart scheduling           | PO  | BE, FE, BA          | QA, UX, OPS  | SC      |
| Sprint 4  | Notification & ACK         | PO  | BE, FE, BA          | QA, LEG, OPS | SC      |
| Sprint 5  | Zoom integration           | PO  | BE, DO              | QA, SE, OPS  | SC      |
| Sprint 6  | Readiness & technical test | PO  | BE, FE, BA          | QA, OPS      | SC      |
| Sprint 7  | Identity & presence        | PO  | BE, FE, BA          | QA, SE, OPS  | LEG     |
| Sprint 8  | Hearing execution          | PO  | BE, FE              | QA, OPS      | SC      |
| Sprint 9  | Evidence & auditability    | PO  | BE, DL              | QA, SE       | OPS     |
| Sprint 10 | Incident & continuity      | PO  | BE, DO              | QA, SE, OPS  | LEG     |
| Sprint 11 | Security & admin config    | PO  | BE, DO, SE          | QA           | SC, OPS |
| Sprint 12 | Monitoring & reporting     | PO  | BE, FE, DL          | QA, OPS      | SC      |
| Sprint 13 | Appeal verdict flow        | PO  | BE, FE, BA          | QA, LEG, OPS | SC      |
| Sprint 14 | SIT & hardening            | PO  | QA, BE, FE          | DO, SE, OPS  | SC      |
| Sprint 15 | UAT & release candidate    | PO  | QA, UAT, BE, FE     | OPS, LEG     | SC      |
| Sprint 16 | Go-live & hypercare        | PO  | DO, BE, FE, QA, OPS | SE, BA, UAT  | SC      |

## Governance Cadence

| Forum                  | Frekuensi           | Peserta inti             | Output                                 |
| ---------------------- | ------------------- | ------------------------ | -------------------------------------- |
| Daily squad            | Harian              | PO, BA, BE, FE, QA       | blocker, progress, dependency          |
| Weekly delivery review | Mingguan            | PO, BA, leads, DO, SE    | sprint health, risk, scope adjustments |
| UAT readiness review   | Menjelang UAT       | PO, QA, OPS, UAT, BE, FE | readiness decision                     |
| Steering committee     | Bulanan / milestone | SC, PO, leads            | keputusan scope, blocker, go-live      |
| Hypercare war room     | Harian saat go-live | PO, DO, QA, BE, FE, OPS  | issue triage, hotfix decision          |

## Catatan Penggunaan

Dokumen ini dapat langsung dipakai untuk:

- baseline tanggung jawab delivery,
- lampiran roadmap implementasi,
- input ke Jira/ClickUp custom field owner/approver,
- alignment lintas instansi sebelum UAT dan go-live.
