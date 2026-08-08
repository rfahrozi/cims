# TODOLIST Coverage Mapping (Rekonstruksi dari Sprint 1–5)

Dokumen ini adalah **mapping final kerja** yang disusun karena file `TODOLIST.md` asli tidak tersedia. Oleh sebab itu, **Sprint 1–5 diperlakukan sebagai source of truth**, lalu item TODOLIST direkonstruksi dari area kerja yang secara praktis dibutuhkan untuk mengeksekusi backlog sprint.

Status yang digunakan:

- **Covered**: sudah tercermin jelas di struktur Sprint 1–5
- **Partial**: ada indikasi/ruang lingkupnya tersentuh, tetapi perlu task yang lebih eksplisit
- **Not covered**: belum terlihat sebagai deliverable yang tegas dan sebaiknya dibuat tiket/epic baru atau ditambahkan ke Sprint 5+

## Ringkasan Arah Sprint

- **Sprint 1**: fondasi delivery, perapihan scope, setup awal, governance, baseline teknis
- **Sprint 2**: implementasi core module dan business flow utama
- **Sprint 3**: integrasi, reporting, auditability, serta penyempurnaan alur lintas modul
- **Sprint 4**: hardening, QA/UAT, perbaikan end-to-end, readiness sebelum rilis
- **Sprint 5**: deployment readiness, dokumentasi, handover, stabilisasi, dan backlog penyempurnaan

## Mapping Final TODOLIST → Sprint 1–5

| No  | Derived TODOLIST Item                                              | Sprint / Epic Target | Status      | Recommended Owner                    | Dependencies                             | Recommendation                                        |
| --- | ------------------------------------------------------------------ | -------------------- | ----------- | ------------------------------------ | ---------------------------------------- | ----------------------------------------------------- |
| 1   | Governance delivery, backlog normalization, dan alignment eksekusi | Sprint 1             | Covered     | PM / Product Owner                   | Master index, RACI, breakdown epic       | Jadikan baseline eksekusi mingguan                    |
| 2   | Environment setup dan baseline konfigurasi preproduction           | Sprint 1             | Partial     | Tech Lead / DevOps                   | Repo readiness, secrets, env config      | Tambahkan checklist environment yang eksplisit        |
| 3   | Role, permission, dan access model                                 | Sprint 1–2           | Covered     | Backend Lead / Product               | Actor matrix, auth policy                | Pastikan terhubung ke UAT scenario                    |
| 4   | Core master data / referential data setup                          | Sprint 2             | Covered     | Backend Lead / Data Owner            | Data model, validation rules             | Pastikan ada owner bisnis untuk approval data         |
| 5   | Core business workflow utama                                       | Sprint 2             | Covered     | Product / Backend / Frontend         | Master data, access control              | Jadikan scope utama demo Sprint 2                     |
| 6   | Form validation dan business rules enforcement                     | Sprint 2             | Covered     | Backend Lead / QA                    | Workflow utama, rule definition          | Tambahkan negative test case                          |
| 7   | UI flow dan usability refinement untuk modul inti                  | Sprint 2–3           | Partial     | Frontend Lead / Product Design       | Core workflow tersedia                   | Tambahkan acceptance criteria UX yang lebih eksplisit |
| 8   | API contract dan integrasi antar layanan/modul                     | Sprint 3             | Covered     | Backend Lead                         | Core workflow stabil, interface contract | Bekukan contract sebelum SIT                          |
| 9   | Integrasi pihak ketiga / sistem eksternal                          | Sprint 3             | Partial     | Integration Engineer / Tech Lead     | API contract, credentials, sandbox       | Buat subtask per endpoint dan fallback plan           |
| 10  | Reporting operasional dan export data                              | Sprint 3             | Partial     | Product Analyst / Backend / Frontend | Data consistency, query readiness        | Tetapkan daftar report minimum viable                 |
| 11  | Audit trail / activity log                                         | Sprint 3             | Partial     | Backend Lead / Security              | Event instrumentation                    | Buat event list minimum yang wajib dicatat            |
| 12  | Notification / alert workflow                                      | Sprint 3–4           | Partial     | Backend / Product                    | Trigger business events                  | Pisahkan mandatory vs nice-to-have notification       |
| 13  | End-to-end integration testing / SIT                               | Sprint 4             | Covered     | QA Lead                              | Modul inti dan integrasi siap            | Jadikan gate utama sebelum UAT                        |
| 14  | UAT preparation, scenario, dan sign-off                            | Sprint 4             | Covered     | QA / Product Owner / Business PIC    | SIT lulus, test data siap                | Tambahkan sign-off owner per scenario                 |
| 15  | Security hardening dan permission verification                     | Sprint 4             | Partial     | Security / Backend Lead              | Access model, auditability               | Tambahkan checklist OWASP/basic security review       |
| 16  | Performance tuning dan stabilization                               | Sprint 4–5           | Partial     | Tech Lead / Backend                  | E2E flow stabil, test env                | Definisikan threshold response time minimum           |
| 17  | Release readiness, cutover checklist, dan go-live prep             | Sprint 5             | Partial     | PM / Tech Lead / DevOps              | UAT sign-off, deployment plan            | Buat checklist cutover dan approval gate              |
| 18  | Documentation teknis, SOP operasional, dan handover                | Sprint 5             | Partial     | PM / Tech Lead / QA                  | Fitur relatif stabil                     | Pisahkan user guide, runbook, dan admin SOP           |
| 19  | Data migration / seed / import readiness                           | Sprint 4–5           | Partial     | Data Owner / Backend                 | Final schema, data source                | Buat dry-run migration minimal 1 kali                 |
| 20  | Monitoring, observability, dan alerting pasca rilis                | Sprint 5+            | Not covered | DevOps / Tech Lead                   | Logging baseline, deployment target      | Buat epic baru observability                          |
| 21  | Backup, rollback, dan disaster recovery plan                       | Sprint 5+            | Not covered | DevOps / Tech Lead                   | Deployment topology                      | Tambahkan release safety checklist                    |
| 22  | Training admin/user dan change management                          | Sprint 5+            | Not covered | Product Owner / PM / Business PIC    | SOP, UAT sign-off                        | Tambahkan paket training & materi quick guide         |
| 23  | Release notes, known issues, dan communication pack                | Sprint 5             | Partial     | PM / Product                         | Final scope freeze                       | Wajib dibuat sebelum handover                         |
| 24  | Post-go-live support model dan triage ownership                    | Sprint 5+            | Not covered | PM / Support Lead / Tech Lead        | Handover, channel support                | Bentuk hypercare plan 1–2 minggu                      |
| 25  | KPI adoption, analytics, dan continuous improvement backlog        | Sprint 5+            | Not covered | Product / Analyst                    | Go-live data tersedia                    | Buat backlog optimization terpisah                    |

## Kesimpulan Kerja

Secara umum, **kerangka Sprint 1–5 sudah menutup kebutuhan delivery inti**, terutama pada area governance, modul utama, integrasi, testing, dan kesiapan UAT. Namun, sejumlah area yang lazim muncul dalam TODOLIST implementasi nyata masih terlihat **parsial** atau **belum eksplisit**, terutama pada observability, rollback, training, hypercare, dan analytics pasca-rilis.

Dengan demikian, dokumen ini dapat dipakai sebagai **mapping final operasional** sambil menempatkan Sprint 1–5 sebagai acuan utama. Untuk eksekusi yang lebih aman, item dengan status **Partial** dan **Not covered** sebaiknya segera dipromosikan menjadi tiket backlog resmi.
