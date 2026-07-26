# Dependency Lockfile + Domain Contract Registry

## 1. Tujuan

Dokumen ini menetapkan aturan dependency lintas module/domain setelah penghapusan `@Global()` dan migrasi ke explicit imports. Tujuannya adalah mengunci boundary arsitektur agar tidak bocor kembali, memastikan interaksi lintas domain hanya melalui kontrak resmi, dan menyediakan dasar enforcement di CI.

Dokumen ini berlaku sebagai baseline arsitektur untuk seluruh backend module yang sebelumnya dapat mengakses provider secara implisit melalui global exposure atau modul agregator.

## 2. Ruang Lingkup

Dokumen ini mencakup:

- aturan dependency untuk feature module
- surface kontrak domain yang boleh dipakai lintas module
- dependency yang dilarang
- exception sementara yang masih ditoleransi
- mekanisme enforcement dan verifikasi

Dokumen ini tidak menggantikan desain bisnis domain. Dokumen ini hanya mengatur boundary teknis dan dependency surface.

## 3. Prinsip Arsitektur

1. Setiap feature module hanya boleh mengimpor boundary module yang benar-benar dibutuhkan.
2. Tidak ada module yang boleh mengandalkan availability implisit dari `@Global()`.
3. Interaksi lintas domain harus melalui kontrak resmi: port, token, facade, DTO contract, atau event contract.
4. Implementasi internal domain lain tidak boleh diakses langsung.
5. Export module harus minimal, disengaja, dan terdokumentasi.
6. Semua exception harus tercatat dengan owner dan target removal.

## 4. Boundary Modules Resmi

| Boundary Module         | Tanggung Jawab                                                     | Contoh Isi                                                 |
| ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `PersistenceModule`     | persistence, repository exposure yang disetujui, DB health, outbox | repository adapter, transaction helper, persistence health |
| `IntegrationModule`     | gateway eksternal dan surface integrasi luar                       | external API gateway, messaging adapter                    |
| `SecurityModule`        | crypto, access control, readiness/security checks                  | access policy, encryption service                          |
| `ObservabilityModule`   | logging, metrics, auditing                                         | logger, audit writer, metric publisher                     |
| `WorkflowSupportModule` | dukungan workflow internal                                         | outbox worker, transient workflow store                    |

## 5. Dependency Lock Matrix

### 5.1 Aturan umum

- Feature module **tidak boleh** mengimpor `InfrastructureModule` kecuali tercatat sebagai exception sementara.
- Feature module **tidak boleh** mengimpor folder internal domain lain.
- Feature module **hanya boleh** memakai approved contract surface yang tercatat pada tabel di bawah.
- Jika sebuah dependency belum tercatat di lock matrix, dependency tersebut dianggap **belum disetujui**.

### 5.2 Lock matrix

| Module / Domain       | Allowed Dependencies                                                | Forbidden Dependencies                                                               | Approved Contract Surface                                          | Temporary Exception                     | Owner         | Status  |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------- | ------------- | ------- |
| `HearingsModule`      | `PersistenceModule`, `ObservabilityModule`                          | `InfrastructureModule`, repository/domain service konkret dari domain lain           | `HEARING_POLICY_PORT`, `HearingReadModel`, `HearingScheduledEvent` | None                                    | Backend Team  | Locked  |
| `ReadinessModule`     | `PersistenceModule`, `SecurityModule`, `ObservabilityModule`        | `InfrastructureModule`, `HearingsService`, repository konkret domain lain            | `READINESS_STATUS_PORT`, `ReadinessCheckResult`                    | None                                    | Backend Team  | Locked  |
| `CaseModule`          | `PersistenceModule`, `IntegrationModule`, `ObservabilityModule`     | `InfrastructureModule`, direct import `HearingsService`, internal readiness provider | `CASE_LOOKUP_PORT`, `CASE_EVENT_PORT`, `CaseSummaryDto`            | Adapter legacy ke `HEARING_POLICY_PORT` | Backend Team  | Partial |
| `SchedulingModule`    | `PersistenceModule`, `ObservabilityModule`, `WorkflowSupportModule` | `InfrastructureModule`, direct import external gateway domain lain                   | `SCHEDULE_POLICY_PORT`, `ScheduleWindowDto`                        | None                                    | Backend Team  | Locked  |
| `NotificationsModule` | `IntegrationModule`, `ObservabilityModule`                          | `InfrastructureModule`, repository konkret dari feature domain                       | `NotificationDispatchPort`, `NotificationRequestedEvent`           | None                                    | Platform Team | Locked  |

## 6. Domain Contract Registry

### 6.1 Aturan kontrak

Kontrak domain harus:

- merepresentasikan capability, bukan implementasi
- memiliki surface yang sempit dan stabil
- tidak membocorkan entity ORM, repository detail, atau struktur internal domain
- diexport secara eksplisit dari module pemilik
- dipakai lintas domain melalui token/interface/facade/event yang terdokumentasi

### 6.2 Registry kontrak

| Contract Name              | Tipe                     | Owned By              | Dipakai Oleh                             | Input / Output Ringkas                            | Exported From         | Status   |
| -------------------------- | ------------------------ | --------------------- | ---------------------------------------- | ------------------------------------------------- | --------------------- | -------- |
| `HEARING_POLICY_PORT`      | Port + DI token          | `HearingsModule`      | `CaseModule`, `SchedulingModule`         | input policy check; output `{ allowed, reason? }` | `HearingsModule`      | Approved |
| `HearingReadModel`         | Read DTO contract        | `HearingsModule`      | consumer read-only lintas domain         | summary hearing untuk query/read path             | `HearingsModule`      | Approved |
| `HearingScheduledEvent`    | Domain/integration event | `HearingsModule`      | `NotificationsModule`, workflow consumer | payload schedule hearing                          | event bus / publisher | Approved |
| `READINESS_STATUS_PORT`    | Port + DI token          | `ReadinessModule`     | orchestration / admin workflow           | output status readiness agregat                   | `ReadinessModule`     | Approved |
| `ReadinessCheckResult`     | DTO contract             | `ReadinessModule`     | consumer status/readiness                | hasil check readiness yang stabil                 | `ReadinessModule`     | Approved |
| `CASE_LOOKUP_PORT`         | Port + DI token          | `CaseModule`          | `HearingsModule`, `SchedulingModule`     | lookup case summary/identity                      | `CaseModule`          | Approved |
| `CASE_EVENT_PORT`          | Event publishing facade  | `CaseModule`          | workflow / notification                  | publish event case lifecycle                      | `CaseModule`          | Approved |
| `NotificationDispatchPort` | Port + facade            | `NotificationsModule` | domain publisher terotorisasi            | kirim permintaan dispatch notifikasi              | `NotificationsModule` | Approved |

## 7. Forbidden Dependency Rules

Dependency berikut dilarang kecuali tercatat di exception register:

- import `InfrastructureModule` dari feature module
- import path `*/internal/*` dari luar domain pemilik
- inject repository konkret milik domain lain
- inject service konkret milik domain lain
- memakai entity ORM sebagai kontrak lintas domain
- memakai DTO internal domain lain tanpa dipromosikan menjadi contract DTO resmi
- mengakses provider privat melalui re-export transitif yang tidak tercatat

### 7.1 Contoh pola yang dilarang

- `CaseModule -> HearingsService`
- `ReadinessModule -> HearingsRepository`
- `NotificationsModule -> CaseEntity`
- `FeatureModule -> InfrastructureModule`
- `DomainA -> ../domain-b/internal/*`

## 8. Exception Register

| Consumer     | Current Forbidden Dependency                   | Reason                                     | Temporary Adapter / Mitigation   | Target Removal                                    | Owner        | Status |
| ------------ | ---------------------------------------------- | ------------------------------------------ | -------------------------------- | ------------------------------------------------- | ------------ | ------ |
| `CaseModule` | direct dependency pada capability hearing lama | legacy orchestration belum selesai dipisah | adapter ke `HEARING_POLICY_PORT` | Sprint berikutnya setelah contract adoption penuh | Backend Team | Open   |

Aturan exception:

- setiap exception wajib punya alasan bisnis/teknis yang jelas
- setiap exception wajib punya owner
- setiap exception wajib punya target removal
- exception tanpa target removal dianggap tidak valid

## 9. Export Policy

Setiap module hanya boleh mengekspor:

- DI token kontrak resmi
- facade aplikasi yang memang public
- DTO/event contract yang stabil
- provider teknis yang telah disetujui dalam lock matrix

Setiap module tidak boleh mengekspor:

- helper internal
- repository internal tanpa justifikasi arsitektural eksplisit
- service implementasi yang hanya dipakai internal module
- entity ORM sebagai kontrak publik

## 10. Enforcement dan CI Gate

### 10.1 Minimum enforcement

CI harus memeriksa hal berikut:

- tidak ada import `InfrastructureModule` pada feature module yang statusnya `Locked`
- tidak ada import ke path `*/internal/*` dari luar domain
- tidak ada inject repository/service konkret domain lain
- hanya approved contract surface yang dipakai lintas domain
- semua exception yang aktif masih tercatat di exception register

### 10.2 Opsi implementasi

Enforcement dapat dilakukan melalui salah satu atau kombinasi berikut:

- `dependency-cruiser`
- `eslint` import restrictions
- `madge`
- custom AST/path validation script di CI
- rule boundary bawaan workspace/monorepo

## 11. Verifikasi Operasional

Setelah perubahan pada lockfile atau contract registry, jalankan urutan verifikasi berikut:

1. `typecheck`
2. `build`
3. unit test terkait module yang diubah
4. integration test bila menyentuh persistence/integration boundary
5. dependency validation script

Contoh perintah:

pnpm typecheck
pnpm build
pnpm test
pnpm validate:dependencies

## 12. Change Control

Perubahan terhadap dokumen ini wajib dilakukan jika:

- ada kontrak domain baru yang dipublikasikan
- ada module yang berpindah dependency boundary
- ada exception baru
- ada exception yang ditutup
- ada export surface yang dipersempit atau dihapus

Format commit yang disarankan:

- `refactor(boundary): lock allowed dependencies for hearings and readiness`
- `refactor(contracts): introduce hearing and readiness public contracts`
- `chore(ci): add dependency validation gate`
- `chore(boundary): register legacy exception for case orchestration`

## 13. Definition of Done Tahap 5

Tahap 5 dianggap selesai jika:

- setiap feature module memiliki allowed dependency yang terdokumentasi
- forbidden dependency utama sudah dinyatakan eksplisit
- interaksi lintas domain hanya memakai contract surface resmi
- export surface setiap module sudah minimal
- CI memiliki gate dependency validation
- semua exception tercatat dan memiliki target removal
- build dan test suite lulus setelah enforcement diaktifkan

## 14. Status Persetujuan

| Item           | Nilai                                                              |
| -------------- | ------------------------------------------------------------------ |
| Document Owner | Backend Architecture / Tech Lead                                   |
| Reviewers      | Backend Team, Platform Team                                        |
| Effective Date | Isi saat dokumen mulai berlaku                                     |
| Review Cadence | Setiap perubahan boundary besar atau minimal per sprint arsitektur |
| Current Phase  | Tahap 5 - Strict Dependency Lockfile dan Kontrak Domain            |

---

Dokumen ini menjadi baseline resmi untuk mengendalikan dependency lintas module/domain setelah audit boundary selesai dan explicit import migration diterapkan.
