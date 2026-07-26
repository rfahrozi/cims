# Roadmap Implementasi dan Sprint Plan MVP menuju CIMS v1.0

Versi: 1.0  
Tanggal: 2026-07-26  
Status: Siap digunakan sebagai baseline delivery plan  
Referensi: PRD CIMS MVP, backlog epic-user story-acceptance criteria, SOP Persidangan Pidana Elektronik, PKS Persidangan Elektronik, dan SEMA No. 2 Tahun 2026

## 1. Tujuan Dokumen

Dokumen ini menyusun roadmap implementasi CIMS dari tahap persiapan sampai rilis **v1.0** yang siap digunakan secara operasional. Fokusnya adalah menerjemahkan PRD dan backlog ke dalam urutan delivery yang realistis, terukur, dan dapat dieksekusi oleh tim produk, engineering, QA, keamanan, operasional, dan stakeholder lintas instansi.

Dokumen ini dirancang untuk menjawab lima hal utama: apa yang dibangun, kapan dibangun, dalam urutan apa dibangun, siapa yang bertanggung jawab, dan apa syarat lulus sebelum masuk ke versi berikutnya.

## 2. Definisi Versi

### MVP

MVP adalah versi minimum yang sudah dapat menjalankan alur inti persidangan elektronik dengan kontrol dasar yang cukup untuk diuji secara operasional terbatas. MVP belum berarti siap produksi luas, tetapi harus cukup untuk membuktikan workflow utama, hard gate, integrasi dasar, dan auditability minimum.

### v1.0

v1.0 adalah versi yang siap digunakan dalam operasi resmi sesuai ruang lingkup yang telah disetujui. v1.0 harus sudah memenuhi syarat berikut: workflow inti berjalan end-to-end, kontrol keamanan minimum aktif, evidence log memadai, dashboard monitoring dasar tersedia, UAT lintas peran lulus, gap kritis ditutup atau diputuskan sebagai controlled limitation, dan readiness go-live telah disetujui.

## 3. Prinsip Delivery

Roadmap implementasi ini menggunakan prinsip berikut:

- bangun **workflow kritis lebih dulu**, baru fitur pendukung,
- **hard gate dan audit trail** tidak boleh ditunda ke akhir,
- integrasi eksternal dibangun lewat **adapter** agar tidak mengunci arsitektur,
- setiap fase harus menghasilkan artefak yang bisa diuji,
- tidak ada fitur yang dianggap selesai tanpa **acceptance criteria**, **logging**, dan **role restriction**,
- readiness operasional, keamanan, dan data governance berjalan paralel dengan development.

## 4. Asumsi Dasar Perencanaan

Roadmap ini menggunakan asumsi kerja berikut:

- durasi sprint: **2 minggu**,
- ritme delivery: **1 increment per sprint**,
- ada lingkungan **dev**, **test/staging**, dan **pre-prod**,
- ada tim inti lintas fungsi: Product, BA, Engineering, QA, Security, DevOps, dan UAT champion dari operasional,
- integrasi Zoom/meeting provider dilakukan melalui **backend aman**,
- keputusan mengenai batas CIMS vs sistem resmi sudah tersedia sebelum Sprint 2 berakhir,
- keputusan role utama dan persetujuan proses operasional tersedia sebelum UAT terpadu dimulai.

## 5. Struktur Fase Roadmap

Roadmap dibagi ke dalam 7 fase utama:

1. **Phase 0 - Mobilization & Design Baseline**
2. **Phase 1 - Core Workflow Foundation**
3. **Phase 2 - Scheduling, Notification & Virtual Courtroom**
4. **Phase 3 - Readiness, Presence & Hearing Control**
5. **Phase 4 - Evidence, Security & Continuity Hardening**
6. **Phase 5 - UAT, Compliance Closure & Operational Readiness**
7. **Phase 6 - Release v1.0 & Hypercare**

## 6. Ringkasan Timeline Tingkat Tinggi

| Fase    | Fokus                                            | Perkiraan Durasi | Output utama                                      |
| ------- | ------------------------------------------------ | ---------------: | ------------------------------------------------- |
| Phase 0 | Mobilisasi, finalisasi desain, governance        |         2 minggu | baseline scope, architecture, delivery governance |
| Phase 1 | Intake perkara, penetapan, state machine inti    |         4 minggu | workflow awal dan hard gate dasar                 |
| Phase 2 | Jadwal, notifikasi, ACK, integrasi ruang virtual |         4 minggu | orchestration end-to-end inti                     |
| Phase 3 | Readiness, verifikasi, kontrol sidang            |         4 minggu | sidang elektronik siap diuji operasional          |
| Phase 4 | Audit, evidence, security, incident flow         |         4 minggu | kontrol produksi minimum                          |
| Phase 5 | UAT, fixing, KPI dashboard, closure gap          |         4 minggu | release candidate v1.0                            |
| Phase 6 | Go-live, hypercare, stabilisasi                  |       2-4 minggu | v1.0 aktif dan termonitor                         |

Total baseline roadmap: **24-26 minggu** tergantung kecepatan closure dependency lintas instansi.

## 7. Milestone Utama

| Milestone | Deskripsi                                                          | Target Fase |
| --------- | ------------------------------------------------------------------ | ----------- |
| M1        | Baseline scope, architecture, governance approved                  | Phase 0     |
| M2        | Workflow perkara -> penetapan -> jadwal siap diuji                 | Phase 1     |
| M3        | Jadwal -> notifikasi -> ACK -> ruang virtual berjalan              | Phase 2     |
| M4        | Readiness -> sidang -> status -> hasil sidang berjalan             | Phase 3     |
| M5        | Security minimum, audit trail, incident flow, dashboard dasar siap | Phase 4     |
| M6        | UAT lintas peran lulus, gap kritis ditutup                         | Phase 5     |
| M7        | Go-live v1.0 dan hypercare aktif                                   | Phase 6     |

## 8. Deliverable per Fase

### Phase 0 - Mobilization & Design Baseline

#### Tujuan

Menyiapkan fondasi delivery, governance, baseline desain, dan keputusan kebijakan yang tidak boleh menggantung saat development dimulai.

#### Deliverable

- finalisasi scope MVP menuju v1.0,
- PRD final yang dibekukan untuk delivery awal,
- backlog epic/user story/acceptance criteria tervalidasi,
- system context diagram,
- workflow state machine final,
- keputusan boundary CIMS vs sistem resmi,
- baseline role utama dan kewenangan tingkat tinggi,
- daftar integrasi prioritas,
- risk register awal,
- release governance dan struktur forum steering.

#### Exit Criteria

- semua epic P0 telah diprioritaskan,
- keputusan boundary sistem disetujui,
- dependency kritis terdokumentasi,
- environment strategy disetujui,
- team staffing minimum lengkap.

### Phase 1 - Core Workflow Foundation

#### Tujuan

Membangun kerangka proses inti yang menjadi fondasi semua fitur berikutnya.

#### Deliverable

- Reference Case Module,
- Determination Module,
- state machine inti,
- role dasar dan login awal,
- audit log dasar untuk event bisnis penting,
- UI dasar detail perkara dan status proses.

#### Exit Criteria

- perkara dapat direferensikan,
- penetapan dapat dicatat dan divalidasi,
- hard gate penetapan aktif,
- status proses inti dapat berjalan di test environment,
- story P0 fase ini lulus QA internal.

### Phase 2 - Scheduling, Notification & Virtual Courtroom

#### Tujuan

Mewujudkan orchestration utama dari jadwal sampai ruang sidang virtual.

#### Deliverable

- Scheduling Module,
- conflict detection dasar,
- Notification & ACK Module,
- reminder dan escalation dasar,
- Virtual Courtroom Module dengan adapter Zoom,
- metadata meeting tersimpan,
- kalender/list view dasar.

#### Exit Criteria

- jadwal dapat dibuat, diubah, dibatalkan,
- notifikasi dapat terkirim dan acknowledgment dapat dilacak,
- ruang sidang virtual dapat dibuat dari jadwal sah,
- histori perubahan jadwal tercatat,
- dashboard overdue acknowledgment tersedia.

### Phase 3 - Readiness, Presence & Hearing Control

#### Tujuan

Membuat sistem cukup matang untuk uji operasional sidang elektronik end-to-end.

#### Deliverable

- Readiness Module,
- Technical Test logging,
- Identity & Room Verification Module,
- Hearing Control Module,
- participant presence tracking,
- sidang status timeline,
- pencatatan hasil sidang dan next action.

#### Exit Criteria

- status READY hanya muncul bila syarat minimum terpenuhi,
- kehadiran dan verifikasi dapat dicatat,
- status sidang dapat berubah sesuai workflow,
- hasil sidang dan next action tercatat,
- satu skenario sidang end-to-end lolos SIT.

### Phase 4 - Evidence, Security & Continuity Hardening

#### Tujuan

Menambahkan kontrol produksi minimum, keamanan, ketahanan operasional, dan evidence completeness.

#### Deliverable

- Evidence & Document Reference Module,
- metadata rekaman dan chain-of-custody dasar,
- incident technical flow,
- cyber incident flow,
- force majeure flow,
- mutation/transfer flow,
- Security & Access hardening,
- MFA untuk role sensitif,
- monitoring dan audit export dasar.

#### Exit Criteria

- audit log untuk event kunci lengkap,
- incident flow dapat diuji,
- kontrol keamanan minimum aktif,
- referensi dokumen dan metadata rekaman tersedia,
- dashboard monitoring dasar untuk KPI inti tersedia.

### Phase 5 - UAT, Compliance Closure & Operational Readiness

#### Tujuan

Memastikan sistem siap ke v1.0 melalui UAT, bug fixing, closure gap, dan readiness governance.

#### Deliverable

- UAT lintas peran,
- backlog defect dan perbaikannya,
- final dashboard KPI/SLA dasar,
- operational playbook,
- admin guide,
- user guide,
- training material,
- readiness review packet,
- release candidate v1.0.

#### Exit Criteria

- UAT utama lulus,
- defect kritis nol,
- defect high disetujui atau ditutup,
- go-live blockers selesai,
- controlled limitations terdokumentasi,
- steering approval untuk v1.0 diperoleh.

### Phase 6 - Release v1.0 & Hypercare

#### Tujuan

Melakukan rilis, stabilisasi, dan memastikan sistem benar-benar dapat dioperasikan.

#### Deliverable

- deployment v1.0,
- go-live checklist,
- war room / hypercare cadence,
- production monitoring,
- incident channel,
- laporan stabilisasi minggu 1 dan minggu 2,
- improvement backlog pasca v1.0.

#### Exit Criteria

- produksi stabil selama masa hypercare,
- tidak ada insiden kritis terbuka tanpa owner,
- KPI minimum dapat dipantau,
- backlog perbaikan pasca-rilis telah disusun.

## 9. Sprint Plan MVP menuju v1.0

### Sprint 0 - Inception & Delivery Setup

#### Tujuan Sprint

Menyiapkan delivery foundation sebelum coding efektif dimulai.

#### Fokus

- finalisasi scope P0/P1,
- finalisasi workflow dan state machine,
- setup repo, CI/CD, branching strategy,
- setup environment dev/test,
- setup format backlog dan DoR/DoD,
- baseline UX wireframe inti,
- baseline security architecture,
- baseline integration approach.

#### Output Sprint

- backlog tervalidasi,
- environment dasar tersedia,
- technical architecture note tersedia,
- sprint cadence aktif,
- risk register awal aktif.

#### Definition of Done Sprint

- tim siap memulai development Sprint 1,
- tidak ada dependency arsitektur kritis yang belum diputuskan.

### Sprint 1 - Case Intake Foundation

#### Fokus Utama

- EPIC-01 Case Intake & Reference Management
- sebagian EPIC-13 Security/Admin foundation

#### Story Prioritas

- referensi perkara,
- source tracking,
- sinkronisasi status dasar,
- login dasar,
- role dasar awal,
- audit log create/update perkara.

#### Output Sprint

- halaman daftar perkara,
- halaman detail perkara dasar,
- create/reference case flow,
- audit log dasar untuk intake.

#### Acceptance Exit Sprint

- panitera dapat membuat atau mereferensikan perkara,
- data minimum tervalidasi,
- audit log intake tersedia,
- role non-berwenang dibatasi dari aksi tertentu.

### Sprint 2 - Determination Gate & Status Engine

#### Fokus Utama

- EPIC-02 Judicial Determination Gate
- state machine inti

#### Story Prioritas

- pencatatan referensi penetapan,
- status sah/tidak sah,
- hard gate pembuatan ruang virtual,
- timeline status proses,
- audit log penetapan.

#### Output Sprint

- determination form,
- process status engine,
- hard gate validation backend,
- timeline perkara.

#### Acceptance Exit Sprint

- penetapan sah dapat dicatat,
- tanpa penetapan sah proses tidak bisa lanjut ke ruang virtual,
- timeline proses dapat dilihat.

### Sprint 3 - Smart Scheduling Core

#### Fokus Utama

- EPIC-03 Smart Scheduling

#### Story Prioritas

- create schedule,
- edit/reschedule/cancel schedule,
- conflict detection dasar,
- calendar/list view,
- change history.

#### Output Sprint

- scheduler UI,
- conflict checker dasar,
- histori perubahan jadwal.

#### Acceptance Exit Sprint

- jadwal dapat dibuat dan diubah,
- konflik utama terdeteksi,
- histori perubahan tersimpan.

### Sprint 4 - Notification & ACK Core

#### Fokus Utama

- EPIC-05 Notification, Acknowledgment & Escalation

#### Story Prioritas

- template notifikasi,
- send notification,
- acknowledgment action,
- overdue ACK dashboard,
- reminder H-1.

#### Output Sprint

- notification service dasar,
- acknowledgment tracking,
- reminder scheduler awal,
- escalation queue awal.

#### Acceptance Exit Sprint

- notifikasi dapat dikirim dan diterima statusnya,
- acknowledgment dapat dilacak,
- overdue ack dapat dilihat.

### Sprint 5 - Virtual Courtroom Integration

#### Fokus Utama

- EPIC-04 Virtual Courtroom Integration

#### Story Prioritas

- backend adapter Zoom,
- create meeting dari jadwal sah,
- simpan meeting metadata,
- status meeting dasar,
- join link rendering sesuai role.

#### Output Sprint

- create meeting integration,
- meeting metadata persistence,
- detail ruang virtual di halaman sidang.

#### Acceptance Exit Sprint

- ruang Zoom dapat dibuat melalui backend aman,
- metadata tersimpan,
- provider adapter siap untuk ekstensi.

### Sprint 6 - Readiness Checklist & Technical Test

#### Fokus Utama

- EPIC-06 Readiness Assurance

#### Story Prioritas

- checklist readiness,
- mandatory vs conditional items,
- technical test log,
- readiness summary dashboard,
- hard gate READY.

#### Output Sprint

- readiness workspace,
- verifier tracking,
- gate to READY.

#### Acceptance Exit Sprint

- sidang tidak bisa READY jika item wajib belum lengkap,
- summary readiness tersedia per perkara/sidang.

### Sprint 7 - Identity, Presence & Room Verification

#### Fokus Utama

- EPIC-07 Identity, Presence & Room Verification

#### Story Prioritas

- verifikasi identitas peserta,
- daftar hadir elektronik,
- verifikasi sterilitas ruang terdakwa,
- metadata kehadiran dan verifier.

#### Output Sprint

- presence log,
- room verification form,
- participant verification status.

#### Acceptance Exit Sprint

- kehadiran dan verifikasi dapat dicatat,
- ruang terdakwa memiliki evidence readiness yang dapat ditinjau.

### Sprint 8 - Hearing Execution & Status Control

#### Fokus Utama

- EPIC-08 Hearing Execution & Status Control

#### Story Prioritas

- perubahan status sidang,
- event log sidang,
- hasil sidang,
- next action,
- documentation pending marker.

#### Output Sprint

- hearing control screen,
- event/timeline log,
- hasil sidang & tindak lanjut.

#### Acceptance Exit Sprint

- skenario sidang end-to-end dapat dijalankan di staging,
- status sidang tercatat sesuai workflow.

### Sprint 9 - Evidence & Document Reference

#### Fokus Utama

- EPIC-11 Evidence, Document Reference & Auditability

#### Story Prioritas

- referensi dokumen resmi,
- hash/version reference,
- metadata rekaman,
- audit log explorer,
- export log dasar.

#### Output Sprint

- document reference module,
- recording metadata form,
- audit viewer dasar.

#### Acceptance Exit Sprint

- dokumen dan metadata rekaman dapat direferensikan,
- event penting dapat dicari di audit viewer.

### Sprint 10 - Incident, Cyber & Continuity

#### Fokus Utama

- EPIC-09 Incident, Cybersecurity & Continuity

#### Story Prioritas

- gangguan teknis,
- insiden siber,
- force majeure,
- mutasi/perpindahan tahanan,
- owner dan escalation tracking.

#### Output Sprint

- incident module,
- cyber/force majeure forms,
- re-check readiness trigger.

#### Acceptance Exit Sprint

- semua exception utama dapat dicatat dan ditindaklanjuti,
- alur re-check readiness bekerja untuk kasus tertentu.

### Sprint 11 - Security Hardening & Admin Configuration

#### Fokus Utama

- EPIC-13 Security, Access Control & Administration

#### Story Prioritas

- MFA,
- admin role management,
- provider/channel/SLA config,
- access denied logging,
- permission restriction tightening.

#### Output Sprint

- admin configuration console,
- MFA enforcement untuk role sensitif,
- audit log konfigurasi.

#### Acceptance Exit Sprint

- kontrol keamanan minimum aktif,
- admin dapat mengelola parameter utama tanpa mengubah kode.

### Sprint 12 - Monitoring, KPI & Reporting

#### Fokus Utama

- EPIC-12 Monitoring, KPI & Reporting

#### Story Prioritas

- dashboard operasional,
- KPI widgets,
- export report,
- summary incident/ACK/readiness/meeting use,
- report generation log.

#### Output Sprint

- dashboard manajerial dasar,
- laporan periodik dasar,
- KPI baseline view.

#### Acceptance Exit Sprint

- manajemen dapat melihat status operasional dan KPI dasar secara mandiri.

### Sprint 13 - Appeal Verdict & Post-Verdict Tracking

#### Fokus Utama

- EPIC-10 Appeal Verdict & Post-Verdict Administration

#### Story Prioritas

- flow pembacaan putusan banding,
- hadir/tidak hadir langsung/elektronik,
- same-day upload tracking,
- 7-day transfer tracking.

#### Output Sprint

- appeal verdict administrative tracker,
- deadline visual indicators,
- compliance widgets untuk area ini.

#### Acceptance Exit Sprint

- jika area ini in scope v1.0, flow administrasi pasca-putusan dapat dipantau end-to-end.

### Sprint 14 - SIT End-to-End & Defect Burn Down

#### Fokus Utama

- system integration test,
- end-to-end scenarios,
- stabilisasi defect.

#### Output Sprint

- SIT report,
- defect list terprioritas,
- fix batch 1.

#### Acceptance Exit Sprint

- skenario inti lulus SIT,
- defect kritis berada dalam tren turun atau nol.

### Sprint 15 - UAT, Readiness Review & Release Candidate

#### Fokus Utama

- UAT lintas peran,
- bug fixing final,
- release notes,
- operational runbook,
- training & go-live prep.

#### Output Sprint

- UAT signed results,
- RC build,
- go-live checklist,
- hypercare plan.

#### Acceptance Exit Sprint

- release candidate disetujui,
- blocker nol,
- controlled limitations telah diputuskan.

### Sprint 16 - Go-Live v1.0 & Hypercare

#### Fokus Utama

- deploy produksi,
- monitoring aktif,
- war room,
- incident response cepat,
- stabilisasi.

#### Output Sprint

- v1.0 live,
- hypercare daily report,
- issue triage log,
- post-go-live improvements backlog.

#### Acceptance Exit Sprint

- sistem stabil sesuai target hypercare,
- operasional berjalan,
- masuk transisi ke BAU/perbaikan berkelanjutan.

## 10. Pemetaan Epic ke Sprint

| Epic                           | Sprint Utama | Sprint Pendukung |
| ------------------------------ | ------------ | ---------------- |
| EPIC-01 Case Intake            | 1            | 14, 15           |
| EPIC-02 Determination Gate     | 2            | 14, 15           |
| EPIC-03 Smart Scheduling       | 3            | 14, 15           |
| EPIC-04 Virtual Courtroom      | 5            | 11, 14           |
| EPIC-05 Notification & ACK     | 4            | 12, 14           |
| EPIC-06 Readiness              | 6            | 14, 15           |
| EPIC-07 Identity & Presence    | 7            | 14, 15           |
| EPIC-08 Hearing Control        | 8            | 14, 15           |
| EPIC-09 Incident & Continuity  | 10           | 15               |
| EPIC-10 Appeal Verdict         | 13           | 15               |
| EPIC-11 Evidence & Audit       | 9            | 11, 14           |
| EPIC-12 Monitoring & Reporting | 12           | 15, 16           |
| EPIC-13 Security & Admin       | 1, 11        | 14, 15           |

## 11. Dependency Map

### Dependency Fungsional

- Penetapan sah diperlukan sebelum ruang virtual.
- Jadwal diperlukan sebelum notifikasi utama dan meeting creation.
- Readiness bergantung pada jadwal, peserta, dan konfigurasi meeting.
- Hearing control bergantung pada readiness dan meeting yang sudah dibuat.
- Reporting bergantung pada konsistensi event logging.
- Appeal verdict flow bergantung pada model perkara, notifikasi, dan evidence tracking.

### Dependency Teknis

- Authentication dan role dasar harus ada sebelum modul lain terbuka luas.
- Integration backend untuk Zoom harus siap sebelum Sprint 5 selesai.
- Notification channel service harus siap sebelum Sprint 4 UAT internal.
- Audit logging framework harus siap sejak Sprint 1 dan diperluas bertahap.
- Dashboard KPI menunggu data model event stabil sampai Sprint 10.

### Dependency Organisasi

- Persetujuan boundary sistem,
- penetapan kanal resmi,
- daftar role dan kewenangan minimum,
- persetujuan scope area putusan banding,
- kesiapan champion UAT lintas instansi.

## 12. Kapasitas Tim yang Disarankan

| Fungsi                             | Jumlah Minimum | Tanggung jawab inti                               |
| ---------------------------------- | -------------: | ------------------------------------------------- |
| Product Manager / Owner            |              1 | prioritas, keputusan scope, stakeholder alignment |
| Business Analyst / Process Analyst |            1-2 | story elaboration, rule bisnis, UAT support       |
| UX/UI Designer                     |              1 | flow, wireframe, usability                        |
| Backend Engineer                   |            2-3 | workflow, API, integrations, security logic       |
| Frontend Engineer                  |              2 | dashboard, forms, role-based UI                   |
| QA Engineer                        |            1-2 | test plan, SIT/UAT support, regression            |
| DevOps / Infra                     |              1 | environments, CI/CD, deployment, monitoring       |
| Security Engineer / Reviewer       |       1 shared | MFA, logging, security review                     |
| UAT Champion Operasional           |     2-4 shared | skenario, validasi proses, sign-off               |

## 13. Environment Strategy

| Environment   | Tujuan                       | Catatan                              |
| ------------- | ---------------------------- | ------------------------------------ |
| Dev           | pengembangan harian          | data dummy/sintetis                  |
| Test / SIT    | integrasi antar modul        | simulasi integrasi eksternal         |
| Staging / UAT | validasi proses lintas peran | lebih mendekati konfigurasi produksi |
| Production    | operasional resmi            | akses terbatas, logging penuh        |

## 14. Quality Gate per Tahap

### Quality Gate 1 - End of Phase 1

- workflow intake dan penetapan berjalan,
- hard gate dasar aktif,
- audit log inti aktif.

### Quality Gate 2 - End of Phase 2

- jadwal, notifikasi, ACK, dan meeting creation berjalan,
- conflict detection dasar berjalan,
- overdue acknowledgment terlihat.

### Quality Gate 3 - End of Phase 3

- readiness checklist aktif,
- status READY tervalidasi,
- hearing control berjalan.

### Quality Gate 4 - End of Phase 4

- evidence dan document reference aktif,
- MFA dan security minimum aktif,
- incident flow dapat diuji.

### Quality Gate 5 - End of Phase 5

- UAT lulus,
- blocker nol,
- release candidate disetujui.

## 15. UAT Readiness Checklist

Sebelum UAT resmi dimulai, kondisi berikut harus terpenuhi:

- seluruh story P0 dan P1 yang masuk ruang lingkup UAT sudah deployed ke staging,
- test data representatif tersedia,
- user UAT dan role-nya telah dibuat,
- skenario UAT lintas instansi telah disepakati,
- defect triage process telah disepakati,
- logging dan observability minimum aktif di staging,
- admin guide dan user guide draft tersedia.

## 16. Go-Live Checklist v1.0

Sebelum go-live, item berikut wajib hijau:

- approval steering/governance,
- sign-off UAT,
- zero open defect critical,
- high defect tersisa sudah di-accept atau ditutup,
- backup & rollback plan tersedia,
- production monitoring aktif,
- incident contact tree aktif,
- admin dan operator training selesai,
- controlled limitation register ditandatangani,
- release notes dan change communication terdistribusi.

## 17. Hypercare Plan

### Durasi

2 minggu minimum, dapat diperpanjang bila incident rate tinggi.

### Cadence

- daily check-in minggu 1,
- 3x per minggu minggu 2,
- war room untuk incident P1/P2,
- summary report harian pada minggu 1.

### Fokus Hypercare

- stabilitas login dan role access,
- stabilitas notifikasi dan ACK,
- stabilitas pembuatan ruang virtual,
- ketepatan status sidang,
- kualitas audit log,
- incident turnaround time,
- feedback usability operator/panitera.

## 18. Risiko Roadmap dan Mitigasi

| Risiko                              | Dampak                    | Probabilitas | Mitigasi                                 |
| ----------------------------------- | ------------------------- | ------------ | ---------------------------------------- |
| Boundary sistem belum final         | rework arsitektur         | Tinggi       | lock decision di Phase 0                 |
| Integrasi Zoom/backend terlambat    | blok Sprint 5             | Sedang       | adapter mock dulu, backend paralel       |
| Role matrix belum selesai           | delay UAT                 | Tinggi       | finalisasi role minimum di Sprint 2      |
| Kanal resmi belum diputuskan        | notifikasi tidak valid    | Sedang       | gunakan abstraction dan feature flag     |
| Data test tidak representatif       | UAT tidak realistis       | Sedang       | siapkan test pack sejak Sprint 8         |
| Defect menumpuk di akhir            | slip release              | Tinggi       | SIT bertahap, quality gate ketat         |
| Tim operasional tidak terlibat dini | solusi tidak usable       | Sedang       | UAT champion dilibatkan sejak Sprint 3   |
| KPI target belum diputuskan         | dashboard kurang bernilai | Sedang       | tampilkan baseline dulu, target menyusul |

## 19. Controlled Limitation Strategy

Jika pada saat release ada area yang belum otomatis penuh tetapi tidak kritis, area tersebut dapat dirilis sebagai controlled limitation dengan syarat:

- risiko dinilai dan disetujui,
- owner manual control ditetapkan,
- langkah kerja manual terdokumentasi,
- evidence tetap dapat dikumpulkan,
- ada target closure pasca v1.0.

Area yang **tidak boleh** menjadi controlled limitation tanpa persetujuan tingkat tinggi meliputi:

- hard gate penetapan,
- role access minimum,
- audit log inti,
- readiness minimum,
- incident ownership,
- integrasi/ruang sidang virtual bila itu inti scope implementasi.

## 20. Rencana Release

| Release               | Isi utama                              | Target          |
| --------------------- | -------------------------------------- | --------------- |
| Internal Alpha        | workflow inti awal, belum lengkap      | akhir Sprint 4  |
| Internal Beta         | schedule, ACK, meeting, readiness awal | akhir Sprint 8  |
| Controlled Beta / SIT | end-to-end hampir lengkap              | akhir Sprint 12 |
| Release Candidate     | hasil UAT, bug fix, hardening          | akhir Sprint 15 |
| v1.0 Production       | go-live + hypercare                    | Sprint 16       |

## 21. Rekomendasi Penggunaan Dokumen

Dokumen ini siap dipakai sebagai:

- acuan steering committee untuk persetujuan delivery,
- dasar sprint planning dan release planning,
- dasar penentuan staffing dan kapasitas,
- acuan quality gate dan readiness gate,
- dasar koordinasi lintas tim produk, engineering, QA, security, dan operasional.

## 22. Langkah Lanjutan Setelah Dokumen Ini

Agar roadmap ini langsung executable, langkah berikut disarankan:

1. tetapkan tanggal kalender sprint yang nyata,
2. mapping setiap user story P0/P1 ke issue tracker,
3. susun RACI delivery per fase,
4. susun UAT scenario pack,
5. buat data dictionary dan permission matrix detail,
6. buat integration contract draft,
7. tetapkan KPI target numerik untuk v1.0,
8. aktifkan governance forum mingguan dan steering bulanan.

## 23. Penutup

Roadmap ini menempatkan CIMS bukan sekadar sebagai proyek fitur, tetapi sebagai program implementasi operasional yang harus lulus pada tiga lapis sekaligus: lapis produk, lapis teknis, dan lapis kepatuhan operasional. Dengan urutan fase dan sprint plan ini, tim memiliki jalur yang jelas dari ide, pembangunan, pengujian, sampai go-live v1.0.

Jika seluruh dependency organisasi dapat diputuskan tepat waktu dan quality gate dijaga dengan disiplin, roadmap ini sudah cukup lengkap untuk dipakai sebagai baseline implementasi resmi CIMS menuju versi 1.0.
