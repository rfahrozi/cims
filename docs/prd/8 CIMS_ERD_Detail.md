# CIMS ERD Detail

Versi: 1.0  
Tanggal: 2026-07-26  
Status: Draft implementasi

## Tujuan

Dokumen ini menjabarkan **ERD detail** untuk CIMS v1.0 sebagai baseline desain data logis. Dokumen ini diturunkan dari PRD, roadmap implementasi, backlog epic-user story, dan desain teknis CIMS.

ERD ini disusun untuk membantu:

- tim backend menyusun skema PostgreSQL,
- tim data memetakan relasi antar entitas,
- tim QA memahami objek data yang harus diuji,
- tim security mengidentifikasi titik data sensitif,
- tim produk menjaga agar implementasi tetap konsisten dengan batas sistem CIMS.

## Prinsip Desain Data

- CIMS menyimpan **referensi operasional** dan **evidence metadata**, bukan menggantikan register resmi perkara.
- Data dirancang untuk mendukung **workflow, hard gate, auditability, dan reporting**.
- Dokumen resmi tidak selalu disimpan penuh di CIMS; pada banyak kasus cukup **reference, hash, metadata, dan lokasi sumber resmi**.
- Entitas utama memiliki field audit standar minimal: `created_at`, `created_by`, `updated_at`, `updated_by`.
- Seluruh status penting disimpan eksplisit agar mudah dipakai pada state machine dan dashboard.

## ERD Logis Tingkat Tinggi

erDiagram
ORGANIZATIONS ||--o{ USERS : has
ROLES ||--o{ USER_ROLE_ASSIGNMENTS : grants
USERS ||--o{ USER_ROLE_ASSIGNMENTS : assigned

ORGANIZATIONS ||--o{ CASES : owns
CASES ||--o{ CASE_PARTICIPANTS : has
CASES ||--o{ JUDICIAL_DETERMINATIONS : references
CASES ||--o{ HEARING_SCHEDULES : schedules
CASES ||--o{ DOCUMENT_REFERENCES : links
CASES ||--o{ APPEAL_VERDICT_FLOWS : tracks

HEARING_SCHEDULES ||--o{ HEARING_ASSIGNMENTS : assigns
HEARING_SCHEDULES ||--|| READINESS_CHECKLISTS : requires
READINESS_CHECKLISTS ||--o{ READINESS_ITEMS : contains
HEARING_SCHEDULES ||--o{ PARTICIPANT_VERIFICATIONS : verifies
HEARING_SCHEDULES ||--o{ HEARING_SESSIONS : creates
HEARING_SCHEDULES ||--o{ HEARING_EVENTS : logs
HEARING_SCHEDULES ||--o{ NOTIFICATIONS : triggers
HEARING_SCHEDULES ||--o{ INCIDENTS : affects

NOTIFICATIONS ||--o{ ACKNOWLEDGMENTS : expects
USERS ||--o{ AUDIT_LOGS : generates
USERS ||--o{ INCIDENTS : reports
USERS ||--o{ PARTICIPANT_VERIFICATIONS : verifies

## Entitas dan Atribut Utama

### 1. organizations

Mewakili instansi atau unit organisasi.

| Field             | Type         | Catatan                                |
| ----------------- | ------------ | -------------------------------------- |
| id                | uuid         | PK                                     |
| code              | varchar(50)  | unik                                   |
| name              | varchar(255) | nama organisasi                        |
| organization_type | varchar(50)  | court, prosecutor, correctional, admin |
| is_active         | boolean      | default true                           |
| created_at        | timestamptz  | audit                                  |
| updated_at        | timestamptz  | audit                                  |

### 2. users

Mewakili akun pengguna terdaftar.

| Field            | Type         | Catatan                   |
| ---------------- | ------------ | ------------------------- |
| id               | uuid         | PK                        |
| organization_id  | uuid         | FK organizations          |
| external_subject | varchar(255) | subject OIDC/Keycloak     |
| username         | varchar(100) | unik                      |
| full_name        | varchar(255) | nama tampil               |
| email            | varchar(255) | opsional sesuai kebijakan |
| status           | varchar(30)  | active, disabled, locked  |
| mfa_required     | boolean      | default false             |
| created_at       | timestamptz  | audit                     |
| updated_at       | timestamptz  | audit                     |

### 3. roles

| Field          | Type         | Catatan       |
| -------------- | ------------ | ------------- |
| id             | uuid         | PK            |
| code           | varchar(50)  | unik          |
| name           | varchar(100) | nama role     |
| description    | text         | deskripsi     |
| is_system_role | boolean      | default false |

### 4. user_role_assignments

Penghubung antara user dan role.

| Field                 | Type        | Catatan      |
| --------------------- | ----------- | ------------ |
| id                    | uuid        | PK           |
| user_id               | uuid        | FK users     |
| role_id               | uuid        | FK roles     |
| scope_organization_id | uuid        | opsional     |
| assigned_at           | timestamptz | waktu assign |
| assigned_by           | uuid        | FK users     |
| is_active             | boolean     | default true |

### 5. cases

Entitas referensi perkara operasional di CIMS.

| Field                  | Type         | Catatan                          |
| ---------------------- | ------------ | -------------------------------- |
| id                     | uuid         | PK                               |
| organization_id        | uuid         | FK organizations                 |
| case_number            | varchar(150) | unik per organisasi              |
| case_type              | varchar(50)  | pidana umum, pidana khusus, dll. |
| official_source_system | varchar(100) | SIPP, e-Berpadu, dll.            |
| source_reference_id    | varchar(150) | id referensi sistem resmi        |
| title                  | varchar(255) | ringkas perkara                  |
| status                 | varchar(50)  | draft, active, closed            |
| confidentiality_level  | varchar(30)  | normal, restricted, sealed       |
| opened_at              | timestamptz  | tanggal aktif di CIMS            |
| created_at             | timestamptz  | audit                            |
| created_by             | uuid         | FK users                         |
| updated_at             | timestamptz  | audit                            |
| updated_by             | uuid         | FK users                         |

### 6. case_participants

Pihak-pihak yang terlibat dalam perkara.

| Field                   | Type         | Catatan                                                        |
| ----------------------- | ------------ | -------------------------------------------------------------- |
| id                      | uuid         | PK                                                             |
| case_id                 | uuid         | FK cases                                                       |
| participant_name        | varchar(255) | nama pihak                                                     |
| participant_role        | varchar(50)  | judge, clerk, prosecutor, defendant, advocate, witness, expert |
| organization_name       | varchar(255) | bila non-user internal                                         |
| user_id                 | uuid         | FK users, opsional                                             |
| contact_ref             | varchar(255) | referensi kontak resmi                                         |
| attendance_mode_default | varchar(30)  | physical, electronic                                           |
| is_active               | boolean      | default true                                                   |

### 7. judicial_determinations

Referensi penetapan persidangan elektronik.

| Field                  | Type         | Catatan                |
| ---------------------- | ------------ | ---------------------- |
| id                     | uuid         | PK                     |
| case_id                | uuid         | FK cases               |
| determination_number   | varchar(150) | nomor penetapan        |
| determination_date     | date         | tanggal penetapan      |
| hearing_mode           | varchar(50)  | electronic             |
| reason                 | text         | alasan/rujukan         |
| validity_status        | varchar(30)  | draft, verified, valid |
| document_hash          | varchar(255) | hash referensi         |
| document_reference_url | text         | lokasi resmi dokumen   |
| verified_at            | timestamptz  | waktu verifikasi       |
| verified_by            | uuid         | FK users               |
| created_at             | timestamptz  | audit                  |
| created_by             | uuid         | FK users               |

### 8. hearing_schedules

Jadwal sidang elektronik.

| Field                     | Type         | Catatan                                            |
| ------------------------- | ------------ | -------------------------------------------------- |
| id                        | uuid         | PK                                                 |
| case_id                   | uuid         | FK cases                                           |
| judicial_determination_id | uuid         | FK judicial_determinations                         |
| agenda                    | varchar(255) | agenda sidang                                      |
| schedule_date             | date         | tanggal                                            |
| start_time                | time         | jam mulai                                          |
| duration_minutes          | integer      | durasi                                             |
| timezone                  | varchar(50)  | default Asia/Jakarta                               |
| location_mode             | varchar(30)  | electronic                                         |
| virtual_room_type         | varchar(30)  | zoom, provider_x                                   |
| status                    | varchar(30)  | draft, confirmed, rescheduled, canceled, completed |
| conflict_status           | varchar(30)  | none, warning, conflict                            |
| reason_for_change         | text         | jika berubah                                       |
| created_at                | timestamptz  | audit                                              |
| created_by                | uuid         | FK users                                           |
| updated_at                | timestamptz  | audit                                              |
| updated_by                | uuid         | FK users                                           |

### 9. hearing_assignments

Menghubungkan jadwal sidang dengan user/pihak yang ditugaskan.

| Field               | Type         | Catatan                                     |
| ------------------- | ------------ | ------------------------------------------- |
| id                  | uuid         | PK                                          |
| hearing_schedule_id | uuid         | FK hearing_schedules                        |
| participant_type    | varchar(50)  | judge, clerk, prosecutor, operator, liaison |
| user_id             | uuid         | FK users, opsional                          |
| external_party_name | varchar(255) | bila bukan user sistem                      |
| assignment_status   | varchar(30)  | assigned, confirmed, declined               |
| note                | text         | catatan                                     |

### 10. hearing_sessions

Metadata ruang sidang virtual/provider meeting.

| Field               | Type         | Catatan                                  |
| ------------------- | ------------ | ---------------------------------------- |
| id                  | uuid         | PK                                       |
| hearing_schedule_id | uuid         | FK hearing_schedules                     |
| provider            | varchar(50)  | zoom                                     |
| provider_meeting_id | varchar(100) | id meeting                               |
| join_url            | text         | tautan peserta                           |
| host_url            | text         | tautan host                              |
| passcode_ref        | varchar(255) | referensi terenkripsi / masked           |
| provider_status     | varchar(30)  | scheduled, live, ended, canceled, failed |
| created_via_job_id  | uuid         | referensi outbox/job                     |
| created_at          | timestamptz  | audit                                    |
| updated_at          | timestamptz  | audit                                    |

### 11. notifications

Catatan pengiriman notifikasi resmi.

| Field               | Type         | Catatan                                            |
| ------------------- | ------------ | -------------------------------------------------- |
| id                  | uuid         | PK                                                 |
| hearing_schedule_id | uuid         | FK hearing_schedules                               |
| case_id             | uuid         | FK cases                                           |
| notification_type   | varchar(50)  | schedule, reschedule, cancellation, verdict_notice |
| channel             | varchar(50)  | email, official_gateway, wa_reminder               |
| recipient_ref       | varchar(255) | user/contact reference                             |
| subject             | varchar(255) | subjek                                             |
| payload_summary     | text         | ringkasan isi                                      |
| sent_status         | varchar(30)  | pending, sent, failed                              |
| sent_at             | timestamptz  | waktu kirim                                        |
| delivery_reference  | varchar(255) | ref provider                                       |
| created_at          | timestamptz  | audit                                              |
| created_by          | uuid         | FK users/system                                    |

### 12. acknowledgments

Catatan acknowledgment terhadap notifikasi.

| Field           | Type         | Catatan                         |
| --------------- | ------------ | ------------------------------- |
| id              | uuid         | PK                              |
| notification_id | uuid         | FK notifications                |
| actor_user_id   | uuid         | FK users, opsional              |
| actor_name      | varchar(255) | fallback eksternal              |
| ack_status      | varchar(30)  | acknowledged, declined, expired |
| acknowledged_at | timestamptz  | waktu ack                       |
| note            | text         | catatan                         |
| overdue_flag    | boolean      | indikator SLA                   |

### 13. readiness_checklists

Satu checklist readiness per hearing schedule.

| Field               | Type        | Catatan                    |
| ------------------- | ----------- | -------------------------- |
| id                  | uuid        | PK                         |
| hearing_schedule_id | uuid        | FK hearing_schedules, unik |
| overall_status      | varchar(30) | not_ready, partial, ready  |
| reviewed_at         | timestamptz | waktu review akhir         |
| reviewed_by         | uuid        | FK users                   |
| note                | text        | catatan umum               |

### 14. readiness_items

Item checklist readiness detail.

| Field                  | Type         | Catatan                                     |
| ---------------------- | ------------ | ------------------------------------------- |
| id                     | uuid         | PK                                          |
| readiness_checklist_id | uuid         | FK readiness_checklists                     |
| item_code              | varchar(50)  | kode item                                   |
| item_label             | varchar(255) | label                                       |
| item_group             | varchar(50)  | network, room, identity, operator, document |
| mandatory              | boolean      | item wajib                                  |
| status                 | varchar(30)  | pending, passed, failed, not_applicable     |
| verifier_id            | uuid         | FK users                                    |
| verified_at            | timestamptz  | waktu verifikasi                            |
| note                   | text         | catatan                                     |

### 15. participant_verifications

Verifikasi identitas peserta dan/atau ruang.

| Field                 | Type         | Catatan                              |
| --------------------- | ------------ | ------------------------------------ |
| id                    | uuid         | PK                                   |
| hearing_schedule_id   | uuid         | FK hearing_schedules                 |
| participant_name      | varchar(255) | nama peserta                         |
| participant_role      | varchar(50)  | defendant, witness, expert, advocate |
| verification_type     | varchar(50)  | identity, room, presence             |
| verification_result   | varchar(30)  | passed, failed, pending              |
| verification_metadata | jsonb        | metadata aman/minimal                |
| verifier_id           | uuid         | FK users                             |
| verified_at           | timestamptz  | waktu verifikasi                     |
| note                  | text         | catatan                              |

### 16. hearing_events

Timeline event selama sidang.

| Field               | Type        | Catatan                                                      |
| ------------------- | ----------- | ------------------------------------------------------------ |
| id                  | uuid        | PK                                                           |
| hearing_schedule_id | uuid        | FK hearing_schedules                                         |
| event_type          | varchar(50) | start, suspend, resume, postpone, complete, participant_join |
| event_time          | timestamptz | waktu kejadian                                               |
| actor_user_id       | uuid        | FK users                                                     |
| event_summary       | text        | ringkasan                                                    |
| event_payload       | jsonb       | metadata tambahan                                            |

### 17. incidents

Gangguan teknis, insiden siber, keadaan kahar, dan exception lain.

| Field               | Type        | Catatan                                |
| ------------------- | ----------- | -------------------------------------- |
| id                  | uuid        | PK                                     |
| hearing_schedule_id | uuid        | FK hearing_schedules, opsional         |
| case_id             | uuid        | FK cases, opsional                     |
| category            | varchar(30) | technical, cyber, force_majeure, other |
| severity            | varchar(20) | low, medium, high, critical            |
| status              | varchar(30) | open, in_progress, resolved, closed    |
| occurred_at         | timestamptz | waktu kejadian                         |
| reported_by         | uuid        | FK users                               |
| owner_user_id       | uuid        | FK users                               |
| summary             | text        | ringkasan                              |
| impact              | text        | dampak                                 |
| action_taken        | text        | tindakan                               |
| resolution_note     | text        | penutupan                              |
| closed_at           | timestamptz | penutupan                              |

### 18. appeal_verdict_flows

Tracking administratif putusan banding bila scope berlaku.

| Field                      | Type        | Catatan                        |
| -------------------------- | ----------- | ------------------------------ |
| id                         | uuid        | PK                             |
| case_id                    | uuid        | FK cases                       |
| hearing_schedule_id        | uuid        | FK hearing_schedules, opsional |
| verdict_reading_date       | date        | tanggal pembacaan              |
| changed_reading_date       | date        | perubahan tanggal bila ada     |
| defendant_presence_mode    | varchar(30) | direct, electronic, absent     |
| prosecutor_presence_mode   | varchar(30) | direct, electronic, absent     |
| excerpt_uploaded_at        | timestamptz | waktu unggah petikan           |
| excerpt_same_day_status    | varchar(20) | on_time, overdue, pending      |
| file_transfer_due_at       | timestamptz | due date 7 hari                |
| file_transfer_completed_at | timestamptz | realisasi                      |
| file_transfer_status       | varchar(20) | pending, on_time, overdue      |
| note                       | text        | catatan                        |

### 19. document_references

Referensi dokumen resmi dan evidence metadata.

| Field                 | Type         | Catatan                                           |
| --------------------- | ------------ | ------------------------------------------------- |
| id                    | uuid         | PK                                                |
| case_id               | uuid         | FK cases                                          |
| hearing_schedule_id   | uuid         | FK hearing_schedules, opsional                    |
| document_type         | varchar(50)  | determination, minutes, verdict_excerpt, evidence |
| source_system         | varchar(100) | sistem resmi sumber                               |
| source_reference_id   | varchar(150) | ref dokumen                                       |
| document_hash         | varchar(255) | hash                                              |
| version_label         | varchar(50)  | versi                                             |
| storage_reference     | text         | lokasi metadata/reference                         |
| confidentiality_level | varchar(30)  | normal, restricted, sealed                        |
| created_at            | timestamptz  | audit                                             |
| created_by            | uuid         | FK users                                          |

### 20. audit_logs

Append-only log untuk event bisnis dan keamanan.

| Field           | Type         | Catatan                                |
| --------------- | ------------ | -------------------------------------- |
| id              | uuid         | PK                                     |
| actor_user_id   | uuid         | FK users, opsional untuk system action |
| actor_role      | varchar(100) | role saat aksi                         |
| object_type     | varchar(100) | case, schedule, notification, config   |
| object_id       | varchar(100) | id objek                               |
| action          | varchar(100) | create, update, ack, change_status     |
| result          | varchar(30)  | success, denied, failed                |
| correlation_id  | varchar(100) | tracing                                |
| ip_address      | inet         | IP                                     |
| user_agent      | text         | agent                                  |
| reason          | text         | alasan perubahan bila ada              |
| payload_summary | jsonb        | snapshot aman                          |
| occurred_at     | timestamptz  | waktu                                  |

### 21. outbox_events

Dasar pemrosesan asynchronous yang andal.

| Field          | Type         | Catatan                           |
| -------------- | ------------ | --------------------------------- |
| id             | uuid         | PK                                |
| aggregate_type | varchar(100) | case, schedule, notification      |
| aggregate_id   | varchar(100) | id objek                          |
| event_type     | varchar(100) | meeting.create, notification.send |
| payload        | jsonb        | payload                           |
| status         | varchar(30)  | pending, processing, done, failed |
| retry_count    | integer      | default 0                         |
| next_retry_at  | timestamptz  | jadwal retry                      |
| created_at     | timestamptz  | waktu buat                        |
| processed_at   | timestamptz  | waktu proses                      |

### 22. sla_configs

Konfigurasi SLA dan rule reminder.

| Field        | Type         | Catatan               |
| ------------ | ------------ | --------------------- |
| id           | uuid         | PK                    |
| config_key   | varchar(100) | unik                  |
| config_group | varchar(50)  | ack, appeal, incident |
| value_json   | jsonb        | nilai konfigurasi     |
| is_active    | boolean      | default true          |
| updated_at   | timestamptz  | audit                 |
| updated_by   | uuid         | FK users              |

## Relasi Kunci

| Relasi                                   | Kardinalitas | Makna                                                                           |
| ---------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| organizations → users                    | 1:N          | satu organisasi memiliki banyak user                                            |
| cases → judicial_determinations          | 1:N          | satu perkara bisa punya beberapa referensi penetapan                            |
| cases → hearing_schedules                | 1:N          | satu perkara bisa memiliki banyak sidang                                        |
| hearing_schedules → hearing_sessions     | 1:N          | satu jadwal bisa punya lebih dari satu session provider karena retry/reschedule |
| hearing_schedules → notifications        | 1:N          | satu sidang memicu banyak notifikasi                                            |
| notifications → acknowledgments          | 1:N          | satu notifikasi bisa punya beberapa ack/attempt                                 |
| hearing_schedules → readiness_checklists | 1:1          | satu sidang punya satu checklist readiness utama                                |
| readiness_checklists → readiness_items   | 1:N          | checklist terdiri dari item-item detail                                         |
| hearing_schedules → hearing_events       | 1:N          | timeline event sidang                                                           |
| hearing_schedules → incidents            | 1:N          | insiden dapat terjadi berkali-kali                                              |
| cases → document_references              | 1:N          | banyak referensi dokumen per perkara                                            |

## Indeks yang Direkomendasikan

| Tabel                   | Indeks                                       | Tujuan                           |
| ----------------------- | -------------------------------------------- | -------------------------------- |
| cases                   | (organization_id, case_number) unique        | lookup cepat dan cegah duplikasi |
| judicial_determinations | (case_id, validity_status)                   | cari penetapan aktif             |
| hearing_schedules       | (schedule_date, start_time)                  | kalender dan pencarian jadwal    |
| hearing_schedules       | (case_id, status)                            | detail perkara                   |
| notifications           | (sent_status, sent_at)                       | retry dan dashboard              |
| acknowledgments         | (notification_id, ack_status)                | overdue ack                      |
| readiness_items         | (readiness_checklist_id, mandatory, status)  | hard gate readiness              |
| hearing_sessions        | (hearing_schedule_id, provider_status)       | session monitoring               |
| incidents               | (category, severity, status, occurred_at)    | triage dan reporting             |
| appeal_verdict_flows    | (file_transfer_status, file_transfer_due_at) | deadline monitoring              |
| audit_logs              | (object_type, object_id, occurred_at)        | audit viewer                     |
| outbox_events           | (status, next_retry_at)                      | worker polling                   |

## Data Sensitif dan Perlindungannya

| Entitas                   | Data sensitif            | Perlakuan                              |
| ------------------------- | ------------------------ | -------------------------------------- |
| users                     | email, external subject  | batasi akses, audit read               |
| case_participants         | identitas pihak tertentu | minimisasi dan pembatasan role         |
| participant_verifications | metadata verifikasi      | simpan metadata minimum                |
| hearing_sessions          | host URL, passcode_ref   | masking/encryption/reference only      |
| document_references       | lokasi dokumen sensitif  | access control + confidentiality level |
| audit_logs                | IP, user agent, payload  | retention & restricted access          |

## Catatan Implementasi PostgreSQL

- Gunakan **UUID** sebagai primary key untuk seluruh entitas utama.
- Pertimbangkan **Row-Level Security** pada `cases`, `hearing_schedules`, `document_references`, dan `audit_logs` sesuai organisasi/perkara.
- `audit_logs` dan `outbox_events` sebaiknya append-only.
- `jsonb` dipakai hanya untuk metadata yang benar-benar fleksibel, bukan menggantikan desain relasional utama.
- Pertimbangkan partisi tabel untuk `audit_logs`, `hearing_events`, dan `notifications` bila volume meningkat.

## Entitas yang Berpotensi Ditambah Setelah v1.0

- `calendar_sync_jobs`
- `notification_templates`
- `security_events`
- `report_snapshots`
- `provider_webhook_events`
- `retention_policies`
- `controlled_limitations_register`

## Ringkasan

ERD ini sudah cukup detail untuk dijadikan dasar:

- desain skema fisik PostgreSQL,
- pembuatan migration awal,
- pemetaan entity ORM,
- penyusunan API contract,
- dan penulisan integration test berbasis data.

Langkah berikut yang paling logis setelah ERD ini adalah menyusun:

- data dictionary per field,
- migration plan v1.0,
- permission matrix per entitas,
- dan sinkronisasi ERD dengan OpenAPI draft.
