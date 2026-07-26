# CIMS Data Dictionary & Permission Matrix

Versi: 1.0  
Tanggal: 2026-07-26  
Status: Baseline implementasi

## 1. Tujuan

Dokumen ini menyatukan dua artefak implementasi penting untuk CIMS v1.0:

- **Data Dictionary** untuk mendefinisikan field utama, tipe data, aturan validasi, sumber data, dan sensitivitas.
- **Permission Matrix** untuk menetapkan hak akses per role terhadap modul, entitas, dan aksi utama.

Dokumen ini diturunkan dari PRD, roadmap, OpenAPI draft, ERD detail, dan evaluasi SOP. Tujuannya agar implementasi engineering, QA, security review, dan UAT memakai definisi yang konsisten.

## 2. Prinsip Umum

- CIMS adalah **system of coordination and evidence**, bukan register resmi perkara.
- Untuk banyak data hukum/administratif, CIMS menyimpan **reference metadata** dan **status operasional**, bukan selalu dokumen primer.
- Hak akses harus ditegakkan di **backend**; pembatasan UI hanya lapisan tambahan.
- Semua perubahan penting harus meninggalkan **audit log**.
- Data sensitif harus dibatasi dengan prinsip **least privilege** dan **need to know**.

## 3. Daftar Role Baseline

| Kode | Role                                   | Ringkasan                                                                                      |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| JDG  | Hakim                                  | melihat perkara terkait, memonitor readiness, mengendalikan status sidang sesuai kewenangan    |
| CLK  | Panitera                               | mengelola operasional perkara, penetapan referensi, jadwal, notifikasi, readiness, dokumentasi |
| PRO  | Penuntut Umum                          | menerima notifikasi, acknowledgment, melihat perkara terkait, mengikuti sidang                 |
| COR  | Petugas Pemasyarakatan / Rutan / Lapas | acknowledgment, checklist lokasi, verifikasi terdakwa, pelaporan kendala                       |
| ADV  | Advokat / Penasihat Hukum              | menerima notifikasi, acknowledgment, mengikuti sidang yang relevan                             |
| OPS  | Operator Sidang Elektronik             | teknis ruang virtual, kehadiran, status sidang, event log                                      |
| LIA  | Pejabat Penghubung                     | follow-up acknowledgment, koordinasi lintas pihak, eskalasi                                    |
| ADM  | Administrator Sistem                   | role, user, konfigurasi, provider, channel, SLA, tanpa hak otomatis ke seluruh isi perkara     |
| SEC  | Security / Compliance Admin            | review audit/security event, kontrol MFA, akses kebijakan keamanan                             |
| TIO  | Tim TI / Support                       | dukungan teknis, incident handling, provider integration support                               |
| UAT  | UAT / Auditor Internal                 | akses terbatas untuk validasi sesuai penugasan                                                 |
| SYS  | System Worker                          | akun sistem untuk job, outbox, reminder, sync, provider webhook                                |

## 4. Klasifikasi Sensitivitas Data

| Kode | Level                        | Definisi                                                                       | Perlakuan                            |
| ---- | ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| P0   | Public Operational           | data non-sensitif yang bisa dilihat lintas role internal pada konteks terbatas | logging biasa                        |
| P1   | Internal Restricted          | data operasional umum internal perkara                                         | RBAC + audit access                  |
| P2   | Sensitive Personal / Legal   | data pihak, lokasi terdakwa, status kehadiran rinci, metadata verifikasi       | RBAC/ABAC ketat + masking bila perlu |
| P3   | Critical Security / Judicial | host URL, passcode reference, hash dokumen, security event detail              | akses sangat terbatas + audit wajib  |

## 5. Data Dictionary

### 5.1 organizations

| Field             | Type         | Required | Description          | Validasi / Rule                                     | Source | Sensitivity |
| ----------------- | ------------ | -------: | -------------------- | --------------------------------------------------- | ------ | ----------- |
| id                | uuid         |       Ya | ID organisasi        | generated UUID                                      | system | P1          |
| code              | varchar(50)  |       Ya | kode unik organisasi | unique, upper snake/kebab allowed                   | admin  | P1          |
| name              | varchar(255) |       Ya | nama organisasi      | non-empty                                           | admin  | P1          |
| organization_type | varchar(50)  |       Ya | jenis instansi       | enum: court, prosecutor, correctional, admin, other | admin  | P1          |
| is_active         | boolean      |       Ya | status aktif         | default true                                        | admin  | P1          |
| created_at        | timestamptz  |       Ya | waktu dibuat         | system timestamp                                    | system | P1          |
| updated_at        | timestamptz  |       Ya | waktu update         | system timestamp                                    | system | P1          |

### 5.2 users

| Field            | Type         | Required | Description       | Validasi / Rule                 | Source    | Sensitivity |
| ---------------- | ------------ | -------: | ----------------- | ------------------------------- | --------- | ----------- |
| id               | uuid         |       Ya | ID user           | generated UUID                  | system    | P2          |
| organization_id  | uuid         |       Ya | organisasi user   | FK organizations                | admin/IdP | P2          |
| external_subject | varchar(255) |       Ya | subject OIDC      | unique, immutable after mapping | IdP       | P3          |
| username         | varchar(100) |       Ya | username internal | unique                          | IdP/admin | P2          |
| full_name        | varchar(255) |       Ya | nama lengkap      | non-empty                       | IdP/admin | P2          |
| email            | varchar(255) |    Tidak | email kerja       | email format                    | IdP/admin | P2          |
| status           | varchar(30)  |       Ya | status user       | enum: active, disabled, locked  | admin     | P2          |
| mfa_required     | boolean      |       Ya | kewajiban MFA     | default false                   | admin/sec | P3          |
| created_at       | timestamptz  |       Ya | audit create      | system                          | system    | P2          |
| updated_at       | timestamptz  |       Ya | audit update      | system                          | system    | P2          |

### 5.3 roles

| Field          | Type         | Required | Description        | Validasi / Rule | Source | Sensitivity |
| -------------- | ------------ | -------: | ------------------ | --------------- | ------ | ----------- |
| id             | uuid         |       Ya | ID role            | generated UUID  | system | P1          |
| code           | varchar(50)  |       Ya | kode role          | unique          | admin  | P1          |
| name           | varchar(100) |       Ya | nama role          | non-empty       | admin  | P1          |
| description    | text         |    Tidak | deskripsi role     | optional        | admin  | P1          |
| is_system_role | boolean      |       Ya | role sistem/bawaan | default false   | admin  | P1          |

### 5.4 user_role_assignments

| Field                 | Type        | Required | Description       | Validasi / Rule  | Source | Sensitivity |
| --------------------- | ----------- | -------: | ----------------- | ---------------- | ------ | ----------- |
| id                    | uuid        |       Ya | ID assignment     | UUID             | system | P2          |
| user_id               | uuid        |       Ya | user terkait      | FK users         | admin  | P2          |
| role_id               | uuid        |       Ya | role terkait      | FK roles         | admin  | P2          |
| scope_organization_id | uuid        |    Tidak | batas organisasi  | FK organizations | admin  | P2          |
| assigned_at           | timestamptz |       Ya | waktu assign      | system           | system | P2          |
| assigned_by           | uuid        |       Ya | pemberi assign    | FK users         | admin  | P2          |
| is_active             | boolean     |       Ya | status assignment | default true     | admin  | P2          |

### 5.5 cases

| Field                  | Type         | Required | Description                        | Validasi / Rule                       | Source               | Sensitivity |
| ---------------------- | ------------ | -------: | ---------------------------------- | ------------------------------------- | -------------------- | ----------- |
| id                     | uuid         |       Ya | ID perkara CIMS                    | UUID                                  | system               | P1          |
| organization_id        | uuid         |       Ya | pemilik perkara operasional        | FK organizations                      | official sync/manual | P1          |
| case_number            | varchar(150) |       Ya | nomor perkara                      | unique per organization               | official sync/manual | P2          |
| case_type              | varchar(50)  |       Ya | jenis perkara                      | controlled enum/master data           | official sync/manual | P1          |
| official_source_system | varchar(100) |    Tidak | sistem sumber                      | SIPP/e-Berpadu/dll                    | official sync        | P1          |
| source_reference_id    | varchar(150) |    Tidak | ID sumber resmi                    | unique within source if available     | official sync        | P1          |
| title                  | varchar(255) |    Tidak | judul/ringkasan                    | optional                              | manual/system        | P1          |
| status                 | varchar(50)  |       Ya | status operasional perkara di CIMS | enum: draft, active, closed, archived | system/manual        | P1          |
| confidentiality_level  | varchar(30)  |       Ya | klasifikasi akses                  | enum: normal, restricted, sealed      | legal/ops            | P3          |
| opened_at              | timestamptz  |    Tidak | mulai aktif di CIMS                | optional                              | system               | P1          |
| created_at             | timestamptz  |       Ya | audit create                       | system                                | system               | P1          |
| created_by             | uuid         |       Ya | creator                            | FK users/system                       | system               | P1          |
| updated_at             | timestamptz  |       Ya | audit update                       | system                                | system               | P1          |
| updated_by             | uuid         |       Ya | updater                            | FK users/system                       | system               | P1          |

### 5.6 case_participants

| Field                   | Type         | Required | Description            | Validasi / Rule                                                         | Source       | Sensitivity |
| ----------------------- | ------------ | -------: | ---------------------- | ----------------------------------------------------------------------- | ------------ | ----------- |
| id                      | uuid         |       Ya | ID peserta             | UUID                                                                    | system       | P2          |
| case_id                 | uuid         |       Ya | perkara                | FK cases                                                                | sync/manual  | P2          |
| participant_name        | varchar(255) |       Ya | nama peserta           | non-empty                                                               | sync/manual  | P2          |
| participant_role        | varchar(50)  |       Ya | peran peserta          | judge, clerk, prosecutor, defendant, advocate, witness, expert, liaison | sync/manual  | P2          |
| organization_name       | varchar(255) |    Tidak | organisasi asal        | optional                                                                | sync/manual  | P2          |
| user_id                 | uuid         |    Tidak | link ke akun user      | FK users                                                                | system/admin | P2          |
| contact_ref             | varchar(255) |    Tidak | referensi kontak resmi | masked jika perlu                                                       | sync/manual  | P2          |
| attendance_mode_default | varchar(30)  |    Tidak | mode kehadiran default | physical, electronic                                                    | manual       | P2          |
| is_active               | boolean      |       Ya | status aktif           | default true                                                            | system       | P2          |

### 5.7 judicial_determinations

| Field                  | Type         | Required | Description            | Validasi / Rule          | Source          | Sensitivity |
| ---------------------- | ------------ | -------: | ---------------------- | ------------------------ | --------------- | ----------- |
| id                     | uuid         |       Ya | ID penetapan referensi | UUID                     | system          | P2          |
| case_id                | uuid         |       Ya | perkara terkait        | FK cases                 | manual/sync     | P2          |
| determination_number   | varchar(150) |       Ya | nomor penetapan        | non-empty                | official/manual | P2          |
| determination_date     | date         |       Ya | tanggal penetapan      | valid date               | official/manual | P2          |
| hearing_mode           | varchar(50)  |       Ya | mode sidang            | enum, default electronic | official/manual | P2          |
| reason                 | text         |    Tidak | alasan/rujukan         | optional                 | manual          | P2          |
| validity_status        | varchar(30)  |       Ya | status sah             | draft, verified, valid   | manual/system   | P2          |
| document_hash          | varchar(255) |    Tidak | hash referensi dokumen | optional                 | system/manual   | P3          |
| document_reference_url | text         |    Tidak | lokasi resmi dokumen   | validated URL/ref        | official/manual | P3          |
| verified_at            | timestamptz  |    Tidak | waktu verifikasi       | optional                 | system          | P2          |
| verified_by            | uuid         |    Tidak | verifier               | FK users                 | system/manual   | P2          |
| created_at             | timestamptz  |       Ya | audit create           | system                   | system          | P2          |
| created_by             | uuid         |       Ya | creator                | FK users                 | system          | P2          |

### 5.8 hearing_schedules

| Field                     | Type         | Required | Description      | Validasi / Rule                                    | Source        | Sensitivity |
| ------------------------- | ------------ | -------: | ---------------- | -------------------------------------------------- | ------------- | ----------- |
| id                        | uuid         |       Ya | ID jadwal        | UUID                                               | system        | P1          |
| case_id                   | uuid         |       Ya | perkara          | FK cases                                           | system/manual | P1          |
| judicial_determination_id | uuid         |       Ya | penetapan dasar  | FK judicial_determinations                         | system/manual | P2          |
| agenda                    | varchar(255) |       Ya | agenda sidang    | non-empty                                          | manual        | P1          |
| schedule_date             | date         |       Ya | tanggal sidang   | valid date                                         | manual        | P1          |
| start_time                | time         |       Ya | jam mulai        | HH:MM:SS                                           | manual        | P1          |
| duration_minutes          | integer      |       Ya | durasi           | > 0                                                | manual        | P1          |
| timezone                  | varchar(50)  |       Ya | zona waktu       | default Asia/Jakarta                               | system/manual | P1          |
| location_mode             | varchar(30)  |       Ya | mode lokasi      | electronic                                         | system/manual | P1          |
| virtual_room_type         | varchar(30)  |       Ya | provider room    | zoom/provider_x                                    | config/manual | P1          |
| status                    | varchar(30)  |       Ya | status jadwal    | draft, confirmed, rescheduled, canceled, completed | system/manual | P1          |
| conflict_status           | varchar(30)  |       Ya | status konflik   | none, warning, conflict                            | system        | P1          |
| reason_for_change         | text         |    Tidak | alasan perubahan | wajib saat reschedule/cancel                       | manual        | P1          |
| created_at                | timestamptz  |       Ya | audit            | system                                             | system        | P1          |
| created_by                | uuid         |       Ya | creator          | FK users                                           | system        | P1          |
| updated_at                | timestamptz  |       Ya | audit            | system                                             | system        | P1          |
| updated_by                | uuid         |       Ya | updater          | FK users                                           | system        | P1          |

### 5.9 hearing_assignments

| Field               | Type         | Required | Description       | Validasi / Rule               | Source        | Sensitivity |
| ------------------- | ------------ | -------: | ----------------- | ----------------------------- | ------------- | ----------- |
| id                  | uuid         |       Ya | ID assignment     | UUID                          | system        | P1          |
| hearing_schedule_id | uuid         |       Ya | jadwal            | FK hearing_schedules          | system/manual | P1          |
| participant_type    | varchar(50)  |       Ya | tipe partisipan   | controlled enum               | manual        | P1          |
| user_id             | uuid         |    Tidak | user internal     | FK users                      | manual/admin  | P1          |
| external_party_name | varchar(255) |    Tidak | pihak non-user    | optional                      | manual        | P2          |
| assignment_status   | varchar(30)  |       Ya | status assignment | assigned, confirmed, declined | manual/system | P1          |
| note                | text         |    Tidak | catatan           | optional                      | manual        | P1          |

### 5.10 hearing_sessions

| Field               | Type         | Required | Description          | Validasi / Rule                          | Source          | Sensitivity |
| ------------------- | ------------ | -------: | -------------------- | ---------------------------------------- | --------------- | ----------- |
| id                  | uuid         |       Ya | ID session           | UUID                                     | system          | P2          |
| hearing_schedule_id | uuid         |       Ya | jadwal terkait       | FK hearing_schedules                     | system          | P2          |
| provider            | varchar(50)  |       Ya | nama provider        | zoom, etc                                | config/system   | P1          |
| provider_meeting_id | varchar(100) |       Ya | meeting ID           | non-empty                                | provider        | P2          |
| join_url            | text         |       Ya | URL peserta          | valid URL                                | provider        | P2          |
| host_url            | text         |    Tidak | URL host             | restricted access                        | provider        | P3          |
| passcode_ref        | varchar(255) |    Tidak | ref masked/encrypted | never plaintext in logs                  | provider/system | P3          |
| provider_status     | varchar(30)  |       Ya | status provider      | scheduled, live, ended, canceled, failed | provider/system | P1          |
| created_via_job_id  | uuid         |    Tidak | ref job async        | optional                                 | system          | P1          |
| created_at          | timestamptz  |       Ya | audit                | system                                   | system          | P2          |
| updated_at          | timestamptz  |       Ya | audit                | system                                   | system          | P2          |

### 5.11 notifications

| Field               | Type         | Required | Description           | Validasi / Rule                                    | Source          | Sensitivity |
| ------------------- | ------------ | -------: | --------------------- | -------------------------------------------------- | --------------- | ----------- |
| id                  | uuid         |       Ya | ID notifikasi         | UUID                                               | system          | P1          |
| hearing_schedule_id | uuid         |       Ya | jadwal                | FK hearing_schedules                               | system          | P1          |
| case_id             | uuid         |       Ya | perkara               | FK cases                                           | system          | P1          |
| notification_type   | varchar(50)  |       Ya | jenis notifikasi      | schedule, reschedule, cancellation, verdict_notice | system/manual   | P1          |
| channel             | varchar(50)  |       Ya | kanal                 | email, official_gateway, wa_reminder               | config/system   | P1          |
| recipient_ref       | varchar(255) |       Ya | referensi penerima    | masked jika perlu                                  | system/manual   | P2          |
| subject             | varchar(255) |    Tidak | subjek                | optional                                           | system/manual   | P1          |
| payload_summary     | text         |    Tidak | ringkasan isi         | no secret/full sensitive payload                   | system          | P2          |
| sent_status         | varchar(30)  |       Ya | status kirim          | pending, sent, failed                              | system          | P1          |
| sent_at             | timestamptz  |    Tidak | waktu kirim           | optional                                           | system          | P1          |
| delivery_reference  | varchar(255) |    Tidak | ref provider          | optional                                           | system/provider | P1          |
| created_at          | timestamptz  |       Ya | audit                 | system                                             | system          | P1          |
| created_by          | uuid         |       Ya | creator/system worker | FK users/system                                    | system          | P1          |

### 5.12 acknowledgments

| Field           | Type         | Required | Description        | Validasi / Rule                 | Source        | Sensitivity |
| --------------- | ------------ | -------: | ------------------ | ------------------------------- | ------------- | ----------- |
| id              | uuid         |       Ya | ID ack             | UUID                            | system        | P1          |
| notification_id | uuid         |       Ya | notifikasi         | FK notifications                | system        | P1          |
| actor_user_id   | uuid         |    Tidak | user yang ack      | FK users                        | system/manual | P1          |
| actor_name      | varchar(255) |    Tidak | fallback eksternal | optional                        | manual/system | P2          |
| ack_status      | varchar(30)  |       Ya | status ack         | acknowledged, declined, expired | system/manual | P1          |
| acknowledged_at | timestamptz  |    Tidak | waktu ack          | optional                        | system        | P1          |
| note            | text         |    Tidak | catatan            | optional                        | manual        | P1          |
| overdue_flag    | boolean      |       Ya | indikator SLA      | system calculated               | system        | P1          |

### 5.13 readiness_checklists

| Field               | Type        | Required | Description        | Validasi / Rule             | Source        | Sensitivity |
| ------------------- | ----------- | -------: | ------------------ | --------------------------- | ------------- | ----------- |
| id                  | uuid        |       Ya | ID checklist       | UUID                        | system        | P1          |
| hearing_schedule_id | uuid        |       Ya | jadwal terkait     | unique FK hearing_schedules | system        | P1          |
| overall_status      | varchar(30) |       Ya | status readiness   | not_ready, partial, ready   | system/manual | P1          |
| reviewed_at         | timestamptz |    Tidak | waktu final review | optional                    | system/manual | P1          |
| reviewed_by         | uuid        |    Tidak | reviewer akhir     | FK users                    | system/manual | P1          |
| note                | text        |    Tidak | catatan umum       | optional                    | manual        | P1          |

### 5.14 readiness_items

| Field                  | Type         | Required | Description      | Validasi / Rule                             | Source        | Sensitivity |
| ---------------------- | ------------ | -------: | ---------------- | ------------------------------------------- | ------------- | ----------- |
| id                     | uuid         |       Ya | ID item          | UUID                                        | system        | P1          |
| readiness_checklist_id | uuid         |       Ya | parent checklist | FK readiness_checklists                     | system        | P1          |
| item_code              | varchar(50)  |       Ya | kode item        | unique within checklist                     | config/system | P1          |
| item_label             | varchar(255) |       Ya | label item       | non-empty                                   | config/system | P1          |
| item_group             | varchar(50)  |       Ya | grup             | network, room, identity, operator, document | config/system | P1          |
| mandatory              | boolean      |       Ya | item wajib       | hard gate                                   | config/system | P1          |
| status                 | varchar(30)  |       Ya | hasil item       | pending, passed, failed, not_applicable     | manual/system | P1          |
| verifier_id            | uuid         |    Tidak | verifier         | FK users                                    | manual/system | P1          |
| verified_at            | timestamptz  |    Tidak | waktu verifikasi | optional                                    | system        | P1          |
| note                   | text         |    Tidak | catatan          | optional                                    | manual        | P1          |

### 5.15 participant_verifications

| Field                 | Type         | Required | Description      | Validasi / Rule                      | Source        | Sensitivity |
| --------------------- | ------------ | -------: | ---------------- | ------------------------------------ | ------------- | ----------- |
| id                    | uuid         |       Ya | ID verifikasi    | UUID                                 | system        | P2          |
| hearing_schedule_id   | uuid         |       Ya | jadwal           | FK hearing_schedules                 | system/manual | P2          |
| participant_name      | varchar(255) |       Ya | nama peserta     | non-empty                            | manual        | P2          |
| participant_role      | varchar(50)  |       Ya | peran peserta    | defendant, witness, expert, advocate | manual        | P2          |
| verification_type     | varchar(50)  |       Ya | tipe verifikasi  | identity, room, presence             | manual/system | P2          |
| verification_result   | varchar(30)  |       Ya | hasil            | passed, failed, pending              | manual/system | P2          |
| verification_metadata | jsonb        |    Tidak | metadata minimum | no excessive PII                     | manual/system | P3          |
| verifier_id           | uuid         |    Tidak | verifier         | FK users                             | manual/system | P2          |
| verified_at           | timestamptz  |    Tidak | waktu verifikasi | optional                             | system        | P2          |
| note                  | text         |    Tidak | catatan          | optional                             | manual        | P2          |

### 5.16 hearing_events

| Field               | Type        | Required | Description       | Validasi / Rule                                              | Source        | Sensitivity |
| ------------------- | ----------- | -------: | ----------------- | ------------------------------------------------------------ | ------------- | ----------- |
| id                  | uuid        |       Ya | ID event          | UUID                                                         | system        | P1          |
| hearing_schedule_id | uuid        |       Ya | jadwal            | FK hearing_schedules                                         | system/manual | P1          |
| event_type          | varchar(50) |       Ya | jenis event       | start, suspend, resume, postpone, complete, participant_join | manual/system | P1          |
| event_time          | timestamptz |       Ya | waktu kejadian    | timestamp                                                    | system/manual | P1          |
| actor_user_id       | uuid        |    Tidak | pelaku            | FK users                                                     | system/manual | P1          |
| event_summary       | text        |       Ya | ringkasan         | non-empty                                                    | manual/system | P1          |
| event_payload       | jsonb       |    Tidak | metadata tambahan | avoid secrets                                                | manual/system | P2          |

### 5.17 incidents

| Field               | Type        | Required | Description      | Validasi / Rule                        | Source        | Sensitivity |
| ------------------- | ----------- | -------: | ---------------- | -------------------------------------- | ------------- | ----------- |
| id                  | uuid        |       Ya | ID insiden       | UUID                                   | system        | P2          |
| hearing_schedule_id | uuid        |    Tidak | jadwal terkait   | FK hearing_schedules                   | manual/system | P2          |
| case_id             | uuid        |    Tidak | perkara terkait  | FK cases                               | manual/system | P2          |
| category            | varchar(30) |       Ya | kategori         | technical, cyber, force_majeure, other | manual/system | P2          |
| severity            | varchar(20) |       Ya | tingkat          | low, medium, high, critical            | manual/system | P2          |
| status              | varchar(30) |       Ya | status           | open, in_progress, resolved, closed    | manual/system | P2          |
| occurred_at         | timestamptz |       Ya | waktu kejadian   | timestamp                              | manual/system | P2          |
| reported_by         | uuid        |    Tidak | pelapor          | FK users                               | manual/system | P2          |
| owner_user_id       | uuid        |    Tidak | penanggung jawab | FK users                               | manual/system | P2          |
| summary             | text        |       Ya | ringkasan        | non-empty                              | manual        | P2          |
| impact              | text        |    Tidak | dampak           | optional                               | manual        | P2          |
| action_taken        | text        |    Tidak | tindakan         | optional                               | manual        | P2          |
| resolution_note     | text        |    Tidak | resolusi         | optional                               | manual        | P2          |
| closed_at           | timestamptz |    Tidak | waktu close      | optional                               | system/manual | P2          |

### 5.18 appeal_verdict_flows

| Field                      | Type        | Required | Description          | Validasi / Rule            | Source        | Sensitivity |
| -------------------------- | ----------- | -------: | -------------------- | -------------------------- | ------------- | ----------- |
| id                         | uuid        |       Ya | ID flow banding      | UUID                       | system        | P2          |
| case_id                    | uuid        |       Ya | perkara              | FK cases                   | manual/system | P2          |
| hearing_schedule_id        | Tidak       |     uuid | jadwal terkait       | FK hearing_schedules       | manual/system | P2          |
| verdict_reading_date       | date        |       Ya | tanggal pembacaan    | valid date                 | manual        | P2          |
| changed_reading_date       | date        |    Tidak | perubahan tanggal    | optional                   | manual        | P2          |
| defendant_presence_mode    | varchar(30) |    Tidak | mode hadir terdakwa  | direct, electronic, absent | manual        | P2          |
| prosecutor_presence_mode   | varchar(30) |    Tidak | mode hadir PU        | direct, electronic, absent | manual        | P2          |
| excerpt_uploaded_at        | timestamptz |    Tidak | waktu unggah petikan | optional                   | manual/system | P2          |
| excerpt_same_day_status    | varchar(20) |       Ya | status same-day      | on_time, overdue, pending  | system/manual | P2          |
| file_transfer_due_at       | timestamptz |    Tidak | due date 7 hari      | optional                   | system        | P2          |
| file_transfer_completed_at | timestamptz |    Tidak | realisasi            | optional                   | manual/system | P2          |
| file_transfer_status       | varchar(20) |       Ya | status transfer      | pending, on_time, overdue  | system/manual | P2          |
| note                       | text        |    Tidak | catatan              | optional                   | manual        | P2          |

### 5.19 document_references

| Field                 | Type         | Required | Description                  | Validasi / Rule                                   | Source          | Sensitivity |
| --------------------- | ------------ | -------: | ---------------------------- | ------------------------------------------------- | --------------- | ----------- |
| id                    | uuid         |       Ya | ID ref dokumen               | UUID                                              | system          | P2          |
| case_id               | uuid         |       Ya | perkara                      | FK cases                                          | manual/system   | P2          |
| hearing_schedule_id   | uuid         |    Tidak | jadwal terkait               | FK hearing_schedules                              | manual/system   | P2          |
| document_type         | varchar(50)  |       Ya | jenis dokumen                | determination, minutes, verdict_excerpt, evidence | manual/system   | P2          |
| source_system         | varchar(100) |    Tidak | sistem sumber                | optional                                          | official/manual | P2          |
| source_reference_id   | varchar(150) |    Tidak | ref dokumen sumber           | optional                                          | official/manual | P2          |
| document_hash         | varchar(255) |    Tidak | hash dokumen                 | optional                                          | system/manual   | P3          |
| version_label         | varchar(50)  |    Tidak | label versi                  | optional                                          | manual/system   | P2          |
| storage_reference     | text         |    Tidak | lokasi metadata atau dokumen | no direct open secret links                       | manual/system   | P3          |
| confidentiality_level | varchar(30)  |       Ya | klasifikasi                  | normal, restricted, sealed                        | manual/legal    | P3          |
| created_at            | timestamptz  |       Ya | audit                        | system                                            | system          | P2          |
| created_by            | uuid         |       Ya | creator                      | FK users                                          | system          | P2          |

### 5.20 audit_logs

| Field           | Type         | Required | Description      | Validasi / Rule                  | Source        | Sensitivity |
| --------------- | ------------ | -------: | ---------------- | -------------------------------- | ------------- | ----------- |
| id              | uuid         |       Ya | ID audit         | UUID                             | system        | P3          |
| actor_user_id   | uuid         |    Tidak | aktor            | FK users या system actor         | system        | P3          |
| actor_role      | varchar(100) |    Tidak | role saat aksi   | optional                         | system        | P3          |
| object_type     | varchar(100) |       Ya | tipe objek       | case, schedule, config, etc.     | system        | P2          |
| object_id       | varchar(100) |       Ya | ID objek         | non-empty                        | system        | P2          |
| action          | varchar(100) |       Ya | aksi             | create, update, ack, deny, login | system        | P2          |
| result          | varchar(30)  |       Ya | hasil            | success, denied, failed          | system        | P2          |
| correlation_id  | varchar(100) |    Tidak | tracing ref      | optional                         | system        | P2          |
| ip_address      | inet         |    Tidak | IP               | optional                         | system        | P3          |
| user_agent      | text         |    Tidak | client info      | optional                         | system        | P3          |
| reason          | text         |    Tidak | alasan perubahan | optional                         | system/manual | P2          |
| payload_summary | jsonb        |    Tidak | snapshot aman    | no full secret payload           | system        | P3          |
| occurred_at     | timestamptz  |       Ya | waktu            | system timestamp                 | system        | P2          |

### 5.21 outbox_events

| Field          | Type         | Required | Description     | Validasi / Rule                   | Source | Sensitivity |
| -------------- | ------------ | -------: | --------------- | --------------------------------- | ------ | ----------- |
| id             | uuid         |       Ya | ID event        | UUID                              | system | P2          |
| aggregate_type | varchar(100) |       Ya | jenis aggregate | case, schedule, notification      | system | P2          |
| aggregate_id   | varchar(100) |       Ya | ID aggregate    | non-empty                         | system | P2          |
| event_type     | varchar(100) |       Ya | tipe event      | meeting.create, notification.send | system | P2          |
| payload        | jsonb        |       Ya | payload event   | validated schema                  | system | P2          |
| status         | varchar(30)  |       Ya | status proses   | pending, processing, done, failed | system | P2          |
| retry_count    | integer      |       Ya | hitung retry    | >= 0                              | system | P2          |
| next_retry_at  | timestamptz  |    Tidak | jadwal retry    | optional                          | system | P2          |
| created_at     | timestamptz  |       Ya | waktu buat      | system                            | system | P2          |
| processed_at   | timestamptz  |    Tidak | waktu proses    | optional                          | system | P2          |

### 5.22 sla_configs

| Field        | Type         | Required | Description       | Validasi / Rule                 | Source | Sensitivity |
| ------------ | ------------ | -------: | ----------------- | ------------------------------- | ------ | ----------- |
| id           | uuid         |       Ya | ID config         | UUID                            | system | P2          |
| config_key   | varchar(100) |       Ya | key unik          | unique                          | admin  | P2          |
| config_group | varchar(50)  |       Ya | grup config       | ack, appeal, incident, reminder | admin  | P2          |
| value_json   | jsonb        |       Ya | nilai konfigurasi | validated by schema             | admin  | P2          |
| is_active    | boolean      |       Ya | status aktif      | default true                    | admin  | P2          |
| updated_at   | timestamptz  |       Ya | audit             | system                          | system | P2          |
| updated_by   | uuid         |       Ya | updater           | FK users                        | system | P2          |

## 6. Permission Matrix Tingkat Modul

Legenda:

- **N** = no access
- **R** = read
- **C** = create
- **U** = update
- **D** = delete/disable/cancel
- **A** = approve / privileged action
- Kombinasi seperti `RCU`, `RUA`, dll.

| Modul                    | JDG        | CLK        | PRO        | COR        | ADV        | OPS        | LIA | ADM        | SEC | TIO        | UAT        | SYS |
| ------------------------ | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | --- | ---------- | --- | ---------- | ---------- | --- |
| Cases                    | R          | RCU        | R          | R          | R          | R          | R   | R          | R   | R          | R          | N   |
| Determinations           | R          | RCU        | R          | R          | R          | R          | R   | R          | R   | N          | R          | N   |
| Scheduling               | R          | RCUA       | R          | R          | R          | R          | R   | R          | R   | N          | R          | N   |
| Notifications & ACK      | R          | RCU        | RU         | RU         | RU         | R          | RCU | R          | R   | N          | R          | C/U |
| Readiness                | R          | RCUA       | R          | RCU        | R          | RCU        | R   | R          | R   | RCU        | R          | N   |
| Participant Verification | R          | RCU        | R          | RCU        | R          | RCU        | R   | R          | R   | R          | R          | N   |
| Hearing Control          | RUA        | RCU        | R          | R          | R          | RCUA       | R   | R          | R   | R          | R          | N   |
| Virtual Sessions         | R          | R          | R          | R          | R          | RCUA       | R   | R          | R   | RCU        | R          | C/U |
| Incidents                | R          | RCU        | R          | RCU        | R          | RCU        | R   | R          | RUA | RCUA       | R          | C/U |
| Appeal Verdict Flow      | R          | RCUA       | R          | R          | R          | R          | R   | R          | R   | N          | R          | N   |
| Document References      | R          | RCU        | R          | R          | R          | R          | R   | R          | R   | N          | R          | N   |
| Audit Logs               | R(limited) | R(limited) | N          | N          | N          | R(limited) | N   | R(limited) | RUA | R(limited) | R(limited) | C   |
| Admin Config             | N          | N          | N          | N          | N          | N          | N   | RCUA       | RUA | R          | N          | N   |
| User & Role Management   | N          | N          | N          | N          | N          | N          | N   | RCUA       | RUA | N          | N          | N   |
| KPI & Reporting          | R          | R          | R(limited) | R(limited) | R(limited) | R          | R   | R          | R   | R          | R          | N   |

## 7. Permission Matrix Tingkat Entitas dan Aksi

### 7.1 cases

| Aksi                    | JDG      | CLK | PRO      | COR      | ADV      | OPS      | LIA      | ADM           | SEC | TIO        | UAT      | SYS |
| ----------------------- | -------- | --- | -------- | -------- | -------- | -------- | -------- | ------------- | --- | ---------- | -------- | --- |
| View case list          | R        | R   | R(scope) | R(scope) | R(scope) | R(scope) | R(scope) | R             | R   | R(limited) | R(scope) | N   |
| View case detail        | R(scope) | RCU | R(scope) | R(scope) | R(scope) | R(scope) | R(scope) | R             | R   | R(limited) | R(scope) | N   |
| Create case ref         | N        | C   | N        | N        | N        | N        | N        | C(limited)    | N   | N          | N        | N   |
| Update case metadata    | N        | U   | N        | N        | N        | N        | N        | U(limited)    | N   | N          | N        | N   |
| Change case status      | N        | U   | N        | N        | N        | N        | N        | U(limited)    | N   | N          | N        | N   |
| Delete/disable case ref | N        | N   | N        | N        | N        | N        | N        | D(restricted) | N   | N          | N        | N   |

### 7.2 judicial_determinations

| Aksi                          | JDG      | CLK | PRO      | COR      | ADV      | OPS      | LIA      | ADM        | SEC | TIO | UAT      | SYS |
| ----------------------------- | -------- | --- | -------- | -------- | -------- | -------- | -------- | ---------- | --- | --- | -------- | --- |
| View determination            | R(scope) | R   | R(scope) | R(scope) | R(scope) | R(scope) | R(scope) | R          | R   | N   | R(scope) | N   |
| Create determination ref      | N        | C   | N        | N        | N        | N        | N        | C(limited) | N   | N   | N        | N   |
| Verify/mark valid             | R        | U/A | N        | N        | N        | N        | N        | N          | N   | N   | N        | N   |
| Update determination metadata | N        | U   | N        | N        | N        | N        | N        | U(limited) | N   | N   | N        | N   |

### 7.3 hearing_schedules

| Aksi              | JDG      | CLK | PRO      | COR      | ADV      | OPS | LIA | ADM | SEC | TIO | UAT      | SYS |
| ----------------- | -------- | --- | -------- | -------- | -------- | --- | --- | --- | --- | --- | -------- | --- |
| View schedules    | R(scope) | R   | R(scope) | R(scope) | R(scope) | R   | R   | R   | R   | N   | R(scope) | N   |
| Create schedule   | N        | C/A | N        | N        | N        | N   | N   | N   | N   | N   | N        | N   |
| Reschedule        | N        | U/A | N        | N        | N        | N   | N   | N   | N   | N   | N        | N   |
| Cancel schedule   | N        | D/A | N        | N        | N        | N   | N   | N   | N   | N   | N        | N   |
| Override conflict | N        | A   | N        | N        | N        | N   | N   | N   | N   | N   | N        | N   |

### 7.4 notifications & acknowledgments

| Aksi                      | JDG      | CLK | PRO      | COR      | ADV      | OPS      | LIA                  | ADM | SEC | TIO | UAT      | SYS |
| ------------------------- | -------- | --- | -------- | -------- | -------- | -------- | -------------------- | --- | --- | --- | -------- | --- |
| View notifications        | R(scope) | R   | R(own)   | R(own)   | R(own)   | R(scope) | R                    | R   | R   | N   | R(scope) | R   |
| Send notification         | N        | C/A | N        | N        | N        | N        | C(limited follow-up) | N   | N   | N   | N        | C   |
| Retry failed notification | N        | U/A | N        | N        | N        | N        | C(limited escalate)  | N   | N   | N   | N        | U   |
| Acknowledge notification  | N        | N   | C/U(own) | C/U(own) | C/U(own) | N        | N                    | N   | N   | N   | N        | N   |
| View overdue ACK list     | R        | R   | N        | N        | N        | N        | R                    | R   | R   | N   | R        | N   |

### 7.5 readiness_checklists & readiness_items

| Aksi                    | JDG | CLK | PRO      | COR        | ADV      | OPS      | LIA | ADM | SEC | TIO       | UAT | SYS |
| ----------------------- | --- | --- | -------- | ---------- | -------- | -------- | --- | --- | --- | --------- | --- | --- |
| View readiness summary  | R   | R   | R(scope) | R(scope)   | R(scope) | R        | R   | R   | R   | R         | R   | N   |
| Fill readiness items    | N   | C/U | N        | C/U(scope) | N        | C/U      | N   | N   | N   | C/U(tech) | N   | N   |
| Mark item passed/failed | N   | U/A | N        | U(scope)   | N        | U(scope) | N   | N   | N   | U(scope)  | N   | N   |
| Mark overall READY      | R   | A   | N        | N          | N        | N        | N   | N   | N   | N         | N   | N   |

### 7.6 participant_verifications

| Aksi                         | JDG      | CLK | PRO              | COR                  | ADV            | OPS | LIA        | ADM | SEC | TIO        | UAT      | SYS |
| ---------------------------- | -------- | --- | ---------------- | -------------------- | -------------- | --- | ---------- | --- | --- | ---------- | -------- | --- |
| View verification            | R(scope) | R   | R(scope-limited) | R(scope)             | R(limited own) | R   | R(limited) | R   | R   | R(limited) | R(scope) | N   |
| Record identity verification | N        | C/U | N                | C/U(defendant scope) | N              | C/U | N          | N   | N   | N          | N        | N   |
| Record room verification     | N        | C/U | N                | C/U                  | N              | C/U | N          | N   | N   | C/U(tech)  | N        | N   |

### 7.7 hearing_sessions

| Aksi                      | JDG      | CLK | PRO    | COR    | ADV    | OPS      | LIA | ADM | SEC        | TIO        | UAT      | SYS |
| ------------------------- | -------- | --- | ------ | ------ | ------ | -------- | --- | --- | ---------- | ---------- | -------- | --- |
| View participant join URL | R(scope) | R   | R(own) | R(own) | R(own) | R        | R   | R   | R          | R(limited) | R(scope) | N   |
| View host URL             | N        | N   | N      | N      | N      | A/R      | N   | A/R | R(limited) | R/A        | N        | N   |
| Create session            | N        | N   | N      | N      | N      | A        | N   | N   | N          | A/R        | N        | C   |
| Update provider status    | N        | N   | N      | N      | N      | U(scope) | N   | N   | N          | U/A        | N        | U   |
| Cancel/recreate session   | N        | N   | N      | N      | N      | A        | N   | N   | N          | A/R        | N        | U   |

### 7.8 hearing_events / hearing control

| Aksi                     | JDG      | CLK      | PRO      | COR      | ADV      | OPS | LIA | ADM | SEC | TIO | UAT      | SYS |
| ------------------------ | -------- | -------- | -------- | -------- | -------- | --- | --- | --- | --- | --- | -------- | --- |
| View event timeline      | R(scope) | R        | R(scope) | R(scope) | R(scope) | R   | R   | R   | R   | R   | R(scope) | N   |
| Start hearing            | A        | U(scope) | N        | N        | N        | A/U | N   | N   | N   | N   | N        | N   |
| Suspend/Postpone hearing | A        | U(scope) | N        | N        | N        | A/U | N   | N   | N   | N   | N        | N   |
| Complete hearing         | A        | U(scope) | N        | N        | N        | A/U | N   | N   | N   | N   | N        | N   |
| Add hearing event note   | N        | C/U      | N        | N        | N        | C/U | N   | N   | N   | N   | N        | N   |

### 7.9 incidents

| Aksi                      | JDG              | CLK | PRO              | COR              | ADV | OPS | LIA        | ADM | SEC   | TIO | UAT        | SYS |
| ------------------------- | ---------------- | --- | ---------------- | ---------------- | --- | --- | ---------- | --- | ----- | --- | ---------- | --- |
| View incident             | R(scope-limited) | R   | R(scope-limited) | R(scope-limited) | N   | R   | R(limited) | R   | R     | R   | R(limited) | N   |
| Create technical incident | N                | C/U | N                | C/U              | N   | C/U | N          | N   | N     | C/U | N          | C   |
| Create cyber incident     | N                | N   | N                | N                | N   | N   | N          | N   | C/U/A | C/U | N          | C   |
| Assign incident owner     | N                | N   | N                | N                | N   | N   | N          | N   | A     | A/R | N          | U   |
| Close incident            | N                | N   | N                | N                | N   | N   | N          | N   | A     | A/R | N          | N   |

### 7.10 appeal_verdict_flows

| Aksi                             | JDG      | CLK   | PRO      | COR              | ADV      | OPS | LIA | ADM | SEC | TIO | UAT      | SYS                       |
| -------------------------------- | -------- | ----- | -------- | ---------------- | -------- | --- | --- | --- | --- | --- | -------- | ------------------------- |
| View appeal verdict flow         | R(scope) | R     | R(scope) | R(scope-limited) | R(scope) | R   | R   | R   | R   | N   | R(scope) | N                         |
| Create/update flow               | N        | C/U/A | N        | N                | N        | N   | N   | N   | N   | N   | N        | N                         |
| Update same-day upload status    | N        | U/A   | N        | N                | N        | N   | N   | N   | N   | N   | N        | U(system-derived allowed) |
| Update 7-day transfer completion | N        | U/A   | N        | N                | N        | N   | N   | N   | N   | N   | N        | N                         |

### 7.11 document_references

| Aksi                         | JDG                                | CLK | PRO              | COR              | ADV              | OPS              | LIA        | ADM | SEC | TIO | UAT              | SYS |
| ---------------------------- | ---------------------------------- | --- | ---------------- | ---------------- | ---------------- | ---------------- | ---------- | --- | --- | --- | ---------------- | --- |
| View document reference      | R(scope-limited by classification) | R   | R(scope-limited) | R(scope-limited) | R(scope-limited) | R(scope-limited) | R(limited) | R   | R   | N   | R(scope-limited) | N   |
| Create document reference    | N                                  | C/U | N                | N                | N                | N                | N          | N   | N   | N   | N                | N   |
| Update hash/version/location | N                                  | U   | N                | N                | N                | N                | N          | N   | N   | N   | N                | N   |
| Change confidentiality level | N                                  | N   | N                | N                | N                | N                | N          | N   | A/R | N   | N                | N   |

### 7.12 audit_logs

| Aksi                             | JDG        | CLK        | PRO    | COR    | ADV    | OPS        | LIA    | ADM        | SEC    | TIO                      | UAT        | SYS    |
| -------------------------------- | ---------- | ---------- | ------ | ------ | ------ | ---------- | ------ | ---------- | ------ | ------------------------ | ---------- | ------ |
| Generate log                     | system     | system     | system | system | system | system     | system | system     | system | system                   | system     | system |
| View own relevant business audit | R(limited) | R(limited) | N      | N      | N      | R(limited) | N      | R(limited) | R      | R(limited)               | R(limited) | N      |
| View full security audit         | N          | N          | N      | N      | N      | N          | N      | N          | A/R    | R(limited)               | N          | N      |
| Export audit logs                | N          | N          | N      | N      | N      | N          | N      | N          | A/R    | R(limited with approval) | N          | N      |

### 7.13 admin/config

| Aksi                          | JDG | CLK | PRO | COR | ADV | OPS | LIA | ADM | SEC        | TIO | UAT | SYS |
| ----------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | ---------- | --- | --- | --- |
| Manage users                  | N   | N   | N   | N   | N   | N   | N   | A/R | R(limited) | N   | N   | N   |
| Manage roles                  | N   | N   | N   | N   | N   | N   | N   | A/R | A/R        | N   | N   | N   |
| Manage provider config        | N   | N   | N   | N   | N   | N   | N   | A/R | C          | R   | N   | N   |
| Manage SLA config             | N   | N   | N   | N   | N   | N   | N   | A/R | C          | N   | N   | N   |
| Manage notification templates | N   | N   | N   | N   | N   | N   | N   | A/R | C          | N   | N   | N   |
| Force deactivate account      | N   | N   | N   | N   | N   | N   | N   | A/R | A/R        | N   | N   | N   |

## 8. Aturan ABAC Tambahan

Selain role matrix di atas, aturan berikut harus ditegakkan:

1. **Organization scope**: user hanya boleh melihat perkara/sidang yang terkait organisasi atau penugasannya.
2. **Case participation scope**: advokat, jaksa, petugas pemasyarakatan, dan pihak eksternal hanya melihat perkara yang memang terkait dengannya.
3. **Confidentiality level**:
   - `normal`: visible sesuai RBAC umum
   - `restricted`: butuh role relevan + keterlibatan perkara
   - `sealed`: hanya subset role yang sangat terbatas dan berwenang
4. **Host URL / passcode reference** hanya untuk operator berwenang, admin terotorisasi, dan Tim TI tertentu.
5. **Security incident detail** hanya untuk SEC, TIO tertentu, dan approval-based viewer.
6. **Audit log export** memerlukan approval dan harus tercatat sebagai audit event baru.

## 9. Field-Level Restriction yang Direkomendasikan

| Entitas                   | Field                                         | Aturan                                         |
| ------------------------- | --------------------------------------------- | ---------------------------------------------- |
| hearing_sessions          | host_url                                      | jangan tampil ke role non-OPS/ADM/TIO tertentu |
| hearing_sessions          | passcode_ref                                  | simpan masked/encrypted, jangan log plaintext  |
| participant_verifications | verification_metadata                         | tampilkan minimum; masking bila tidak perlu    |
| cases                     | confidentiality_level                         | ubah hanya oleh role berwenang                 |
| document_references       | storage_reference                             | batasi sesuai classification                   |
| audit_logs                | ip_address, user_agent, payload_summary       | batasi ke SEC/ADM terbatas                     |
| users                     | external_subject                              | hanya ADM/SEC tertentu                         |
| incidents                 | impact/action/resolution untuk cyber incident | akses terbatas ke SEC/TIO                      |

## 10. Aturan Audit yang Wajib

Aksi berikut **harus** menghasilkan audit log:

- create/update case
- create/verify determination
- create/reschedule/cancel schedule
- send notification
- acknowledgment
- mark readiness item
- mark overall READY
- create session / recreate session / cancel session
- update hearing status
- create/close incident
- create/update appeal verdict flow
- create/update document reference
- login/logout/MFA event
- role assignment change
- config change
- audit log export

## 11. Open Questions yang Perlu Diputuskan Sebelum Production

| Area             | Pertanyaan                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Data retention   | berapa lama audit_logs, notifications, incidents, dan metadata rekaman disimpan?                       |
| External parties | apakah advokat/saksi/ahli akan selalu punya akun, atau sebagian akan tetap eksternal tanpa akun penuh? |
| Sealed cases     | siapa saja role final yang boleh mengakses kasus dengan `sealed`?                                      |
| Contact refs     | format baku `recipient_ref` dan `contact_ref` akan seperti apa?                                        |
| Approval model   | apakah export audit dan perubahan confidentiality perlu 4-eyes approval?                               |

## 12. Rekomendasi Implementasi Teknis

- Terapkan **RBAC** di service layer dan endpoint guard.
- Tambahkan **ABAC policy check** untuk organization scope, case scope, dan confidentiality level.
- Gunakan **database row-level security** untuk entitas kunci jika memungkinkan.
- Buat **DTO validation schema** yang konsisten dengan field dictionary ini.
- Sinkronkan OpenAPI schema dengan data dictionary secara berkala.
- Jadikan permission matrix ini sebagai dasar test case untuk QA dan UAT.

## 13. Ringkasan

Dokumen ini sudah cukup untuk dipakai sebagai baseline:

- implementasi entity & DTO,
- penulisan migration awal,
- penyusunan guard/policy backend,
- penyusunan test matrix role-based,
- dan alignment antara PRD, ERD, OpenAPI, dan roadmap delivery.

Langkah paling logis berikutnya adalah:

- menyusun **migration plan database v1.0**,
- membuat **policy matrix dalam format backend guard rules**,
- dan menurunkan permission matrix menjadi **test case QA/UAT per role**.
