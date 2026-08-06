# CIMS Sprint 1 Issue Breakdown

## Cara Pakai

Dokumen ini memecah backlog Sprint 1 menjadi issue yang bisa langsung dipindahkan ke GitHub Issues, Jira, atau board sprint. Setiap issue sudah memiliki tujuan, ruang lingkup, acceptance criteria, dependensi, estimasi, dan owner yang disarankan.

## Label yang Disarankan

- `sprint-1`
- `production-readiness`
- `p0` / `p1` / `p2`
- `security`
- `platform`
- `backend`
- `integration`
- `qa`
- `documentation`

## Epic A — Production Gate Enforcement

### Issue A1 — Build centralized environment validator

**Type:** Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-1`, `production-readiness`, `p0`, `backend`, `platform`

**Description**
Bangun validator environment terpusat yang mengevaluasi kombinasi env kritis saat bootstrap aplikasi. Tujuannya agar API dan komponen terkait gagal start bila konfigurasi tidak layak untuk environment target.

**Scope**

- Inventarisasi env kritis
- Kategori environment
- Forbidden environment matrix
- Validator bootstrap tunggal
- Unit tests untuk matrix validation

**Acceptance criteria**

- Ada komponen validator terpusat yang dipanggil saat startup.
- Kombinasi env yang dilarang menyebabkan startup gagal.
- Error startup menjelaskan field yang gagal dan alasan penolakannya.
- Ada test otomatis untuk minimal 5 skenario valid dan 5 skenario invalid.

**Dependencies**

- Tidak ada

**Definition of done**

- Kode merged
- Test lulus
- Matrix env tersedia dalam kode atau dokumen referensi

### Issue A2 — Enforce fail-fast AUTH gating in serious environments

**Type:** Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-1`, `production-readiness`, `p0`, `security`, `backend`

**Description**
Tambahkan fail-fast gate untuk konfigurasi autentikasi agar environment serius tidak pernah berjalan dengan auth dev atau OIDC config yang tidak lengkap.

**Scope**

- Tolak startup jika `AUTH_MODE=DEV` di `staging/preprod/production`
- Tolak startup jika `OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE` kosong pada env serius
- Logging yang menjelaskan auth mode aktif
- Test negatif untuk konfigurasi invalid

**Acceptance criteria**

- `AUTH_MODE=DEV` mustahil aktif di environment serius.
- OIDC config wajib divalidasi sebelum app siap menerima request.
- Log startup menampilkan auth mode dan status validasinya.
- Test otomatis gagal bila gate dihapus atau dilonggarkan.

**Dependencies**

- Issue A1

**Definition of done**

- Gate aktif di bootstrap
- Test lulus
- Tidak ada jalur bypass auth dev di non-dev

### Issue A3 — Enforce persistence and evidence storage gating

**Type:** Engineering
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `backend`, `platform`

**Description**
Cegah persistence mode dan evidence storage mode yang tidak layak masuk ke environment serius.

**Scope**

- Tolak `PERSISTENCE_MODE=MEMORY` di `staging/preprod/production`
- Tolak `EVIDENCE_STORAGE_MODE=LOCAL` di `production`
- Tandai mode storage aktif pada startup log
- Tambahkan test matrix storage/persistence

**Acceptance criteria**

- Mode memory tidak bisa dipakai di env serius.
- Mode local evidence tidak bisa dipakai di production.
- Startup log menunjukkan mode persistence dan evidence yang aktif.

**Dependencies**

- Issue A1

**Definition of done**

- Gate aktif
- Test lulus
- Dokumentasi env terbarui bila perlu

### Issue A4 — Enforce integration mode gating for mock providers

**Type:** Engineering
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Integration Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `integration`, `platform`

**Description**
Pastikan gateway notifikasi, official system, dan provider terkait tidak dapat berjalan pada mode mock di environment target yang serius.

**Scope**

- Validasi `NOTIFICATION_GATEWAY_MODE`
- Validasi `OFFICIAL_SYSTEM_GATEWAY_MODE`
- Validasi provider mode lain yang relevan
- Test kombinasi env invalid

**Acceptance criteria**

- Mode mock diblok sesuai matrix environment.
- Kombinasi provider mode yang dilarang menyebabkan startup gagal.
- Pesan error startup cukup jelas untuk investigasi cepat.

**Dependencies**

- Issue A1

**Definition of done**

- Gate aktif
- Test lulus

### Issue A5 — Enforce database transport requirements

**Type:** Engineering
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `platform`, `security`

**Description**
Paksa koneksi database memakai transport yang layak untuk environment non-local.

**Scope**

- Validasi `DB_SSL=true` untuk env non-local
- Tambahkan startup check untuk parameter SSL yang diperlukan
- Tambahkan logging status DB transport
- Tambahkan test untuk konfigurasi invalid

**Acceptance criteria**

- App non-local gagal start bila SSL DB tidak valid.
- Startup log menandai apakah DB transport memenuhi policy.

**Dependencies**

- Issue A1

**Definition of done**

- Gate aktif
- Test lulus

### Issue A6 — Publish production gates documentation

**Type:** Documentation
**Priority:** P1
**Estimate:** 1 point
**Suggested owner:** Engineering Lead
**Labels:** `sprint-1`, `production-readiness`, `p1`, `documentation`

**Description**
Dokumentasikan aturan minimum deploy agar seluruh reviewer dan releaser punya rujukan yang sama.

**Scope**

- Dokumen `production-gates.md`
- Matrix env valid/invalid
- Alasan tiap gate
- Contoh konfigurasi valid dan invalid

**Acceptance criteria**

- Dokumen tersedia di repo.
- Reviewer dapat menggunakannya untuk memeriksa readiness deploy.

**Dependencies**

- Issue A1 sampai A5

**Definition of done**

- Dokumen merged
- Direferensikan pada sprint review

## Epic B — IAM Hardening Phase 1

### Issue B1 — Harden auth guard for non-dev safety

**Type:** Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `security`, `backend`

**Description**
Audit dan perkeras implementasi `auth.guard.ts` agar auth dev tidak dapat lolos ke environment non-dev dan seluruh cabang auth utama memiliki test.

**Scope**

- Audit branch `AUTH_MODE=DEV`
- Perketat condition branch dev
- Structured log untuk auth branch yang aktif
- Unit tests dev vs non-dev

**Acceptance criteria**

- `AUTH_MODE=DEV` hanya valid di development.
- Semua cabang auth penting memiliki minimal satu test.
- Tidak ada branch auth yang silently fallback ke allow.

**Dependencies**

- Issue A2

**Definition of done**

- Code merged
- Test lulus
- Hasil audit dicatat singkat di PR description atau docs

### Issue B2 — Audit and harden OIDC token verifier path

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `security`

**Description**
Tinjau jalur verifikasi token OIDC untuk memastikan validasi dasar sudah cukup aman pada environment serius.

**Scope**

- Validasi issuer
- Validasi audience
- Validasi expiry dan not-before
- Audit signature failure handling
- Audit JWKS URL usage dan cache behavior
- Tambahkan test untuk invalid token utama

**Acceptance criteria**

- Invalid issuer, invalid audience, expired token, dan malformed token ditolak.
- Ada dokumentasi singkat tentang gap verifier yang masih tersisa untuk fase berikutnya.
- Test invalid token cases otomatis berjalan di CI.

**Dependencies**

- Issue A2

**Definition of done**

- Audit selesai
- Perbaikan minimum merged
- Test lulus

### Issue B3 — Define initial cross-agency role matrix

**Type:** Analysis / Documentation
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Compliance Lead + Security Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `security`, `documentation`

**Description**
Buat role matrix baseline lintas instansi sebagai acuan policy enforcement dan authz tests.

**Scope**

- Identifikasi role utama
- Definisi permission minimum
- Pemetaan role ke endpoint prioritas
- Review cepat dengan owner domain/regulasi

**Acceptance criteria**

- Ada dokumen role matrix versi 1.
- Role matrix cukup rinci untuk dipakai menulis authz tests.
- Minimal role berikut tercakup: pengadilan, kejaksaan, pemasyarakatan, liaison, governance, auditor, operator terbatas.

**Dependencies**

- Tidak ada

**Definition of done**

- Dokumen merged atau disimpan sebagai artefak sprint
- Disetujui internal untuk dipakai sprint ini

### Issue B4 — Audit policy coverage on critical endpoints

**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-1`, `production-readiness`, `p0`, `backend`, `security`

**Description**
Pastikan endpoint kritis tidak hanya mengandalkan login, tetapi juga dilindungi policy/permission yang eksplisit.

**Priority scope**

- `appeal-decision`
- `notices`
- `scheduling`
- `participants`
- `custody`
- `governance`
- `compliance`
- `legacy-proxy`
- `provider-webhooks` untuk jalur terkait kontrol internal

**Acceptance criteria**

- Ada daftar endpoint kritis dan status coverage auth/policy-nya.
- Endpoint kritis yang belum memiliki policy requirement diperbaiki.
- Minimal baseline integration test tersedia untuk allow/deny endpoint prioritas.

**Dependencies**

- Issue B3

**Definition of done**

- Coverage report tersedia
- Fix policy yang hilang merged
- Test lulus

### Issue B5 — Disable dev identity interceptor outside development

**Type:** Engineering
**Priority:** P0
**Estimate:** 2 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-1`, `production-readiness`, `p0`, `backend`, `security`

**Description**
Pastikan `dev-identity.interceptor` tidak mungkin aktif di `staging`, `preprod`, atau `production`.

**Scope**

- Audit wiring interceptor
- Tambahkan conditional registration yang aman
- Tambahkan test untuk non-dev environments

**Acceptance criteria**

- Dev identity interceptor tidak aktif di non-dev.
- Ada test yang membuktikan non-activation tersebut.

**Dependencies**

- Issue A2

**Definition of done**

- Code merged
- Test lulus

### Issue B6 — Create baseline authorization matrix tests

**Type:** QA / Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Engineer + Security Engineer
**Labels:** `sprint-1`, `production-readiness`, `p1`, `qa`, `security`

**Description**
Buat baseline automated tests untuk memverifikasi kombinasi role x endpoint x action pada endpoint paling kritis.

**Scope**

- Pilih minimal 10 endpoint kritis
- Susun allow/deny matrix per role
- Jalankan di CI
- Output test failure mudah dibaca

**Acceptance criteria**

- Ada suite authz matrix tests baseline.
- CI gagal bila terjadi regression akses.
- Hasil test bisa dipakai untuk sprint review.

**Dependencies**

- Issue B3
- Issue B4

**Definition of done**

- Test suite merged
- CI terintegrasi
- Minimal 10 endpoint ter-cover

## Epic C — CI Hardening Minimum

### Issue C1 — Add lint as mandatory CI gate

**Type:** Platform
**Priority:** P1
**Estimate:** 2 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-1`, `production-readiness`, `p1`, `platform`

**Description**
Tambahkan lint sebagai gate wajib di CI agar quality baseline lebih konsisten.

**Scope**

- Standarkan command lint
- Tambahkan job lint ke workflow
- Fail pipeline jika lint gagal

**Acceptance criteria**

- Semua PR menjalankan lint.
- Lint failure memblok merge.

**Dependencies**

- Tidak ada

**Definition of done**

- Workflow merged
- Job lint terlihat pada PR

### Issue C2 — Add dependency vulnerability scan to CI

**Type:** Security / Platform
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-1`, `production-readiness`, `p1`, `security`, `platform`

**Description**
Tambahkan scan dependency untuk menangkap kerentanan package yang dipakai repo.

**Scope**

- Pilih tool scanning
- Definisikan severity threshold
- Simpan hasil scan sebagai artifact
- Tentukan fail/warn policy

**Acceptance criteria**

- Scan dependency berjalan otomatis di PR dan/atau main.
- Temuan severity tinggi terlihat jelas.
- Ada kebijakan awal kapan pipeline harus fail.

**Dependencies**

- Tidak ada

**Definition of done**

- Workflow merged
- Hasil scan bisa diunduh atau dilihat dari CI

### Issue C3 — Add secret scanning to CI

**Type:** Security / Platform
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-1`, `production-readiness`, `p1`, `security`, `platform`

**Description**
Tambahkan secret scan untuk mencegah hardcoded secret masuk ke branch utama.

**Scope**

- Pilih tool secret scan
- Konfigurasi baseline/allowlist jika perlu
- Fail CI untuk temuan valid
- Simpan hasil scan sebagai artifact

**Acceptance criteria**

- Semua PR dipindai untuk secret leakage.
- Temuan valid memblok merge.

**Dependencies**

- Tidak ada

**Definition of done**

- Workflow merged
- Hasil scan tersedia sebagai evidence

### Issue C4 — Add migration verification lane

**Type:** Platform / Backend
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-1`, `production-readiness`, `p1`, `platform`, `backend`

**Description**
Tambahkan verifikasi migration agar perubahan schema tidak merusak jalur delivery.

**Scope**

- Job migration verify
- Dry-run atau apply pada test DB ephemeral
- Simpan log hasil verifikasi

**Acceptance criteria**

- PR yang merusak migration gagal di CI.
- Log verifikasi migration tersedia untuk debugging.

**Dependencies**

- Ketersediaan test database CI

**Definition of done**

- Workflow merged
- Verification lane stabil

### Issue C5 — Add critical integration test lane

**Type:** QA / Platform
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-1`, `production-readiness`, `p1`, `qa`, `platform`

**Description**
Tambahkan satu jalur integration test minimum untuk modul kritis agar regressions tidak hanya terdeteksi di unit tests.

**Suggested module scope**

- auth
- notices
- scheduling
- appeal-decision

**Acceptance criteria**

- Ada lane integration test minimum pada CI.
- Hasil gagal dapat ditelusuri dengan log yang cukup.
- Minimal 1 skenario sukses dan 1 skenario gagal per modul prioritas.

**Dependencies**

- Issue C1
- Issue C4

**Definition of done**

- Workflow merged
- Lane berjalan stabil di PR utama

### Issue C6 — Retain CI artifacts for readiness review

**Type:** Platform
**Priority:** P2
**Estimate:** 1 point
**Suggested owner:** Platform Engineer
**Labels:** `sprint-1`, `production-readiness`, `p2`, `platform`

**Description**
Simpan artifact hasil lint, test, dan scan untuk digunakan dalam readiness review mingguan.

**Scope**

- Artifact naming convention
- Retention policy minimum
- Simpan log scan/test relevan

**Acceptance criteria**

- Hasil lint/test/scan dapat diunduh dari CI.
- Naming artifact cukup konsisten untuk review mingguan.

**Dependencies**

- Issue C1
- Issue C2
- Issue C3
- Issue C4
- Issue C5

**Definition of done**

- Artifacts tersedia di pipeline

## Issue Tambahan untuk Sprint Management

### Issue M1 — Publish Sprint 1 readiness review template

**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 1 point
**Suggested owner:** Engineering Lead
**Labels:** `sprint-1`, `production-readiness`, `p1`, `documentation`

**Description**
Buat template review mingguan untuk memastikan sprint menghasilkan evidence yang bisa dikonsumsi oleh engineering, security, dan compliance.

**Scope**

- Status issue P0/P1
- Residual risks
- Test evidence
- CI evidence
- Decision log

**Acceptance criteria**

- Ada template review mingguan yang dipakai di akhir sprint.

**Dependencies**

- Tidak ada

**Definition of done**

- Template tersedia dan dipakai minimal sekali

## Rekomendasi Urutan Pembuatan Issue di Board

1. A1
2. A2
3. B1
4. B5
5. C1
6. C3
7. B3
8. B4
9. B2
10. C2
11. C4
12. B6
13. C5
14. A3
15. A4
16. A5
17. A6
18. C6
19. M1

## Rekomendasi Milestone

### Milestone 1 — Startup Safety

- A1
- A2
- A3
- A4
- A5

### Milestone 2 — IAM Baseline

- B1
- B2
- B3
- B4
- B5
- B6

### Milestone 3 — CI Baseline

- C1
- C2
- C3
- C4
- C5
- C6

### Milestone 4 — Sprint Governance

- A6
- M1

## Exit Criteria Sprint 1

Sprint 1 bisa ditutup dengan hasil baik bila:

- Semua issue P0 selesai atau memiliki residual risk yang disetujui eksplisit.
- Tidak ada auth dev, memory persistence, atau mock gateway yang lolos ke env serius.
- Endpoint kritis prioritas sudah punya coverage auth/policy awal.
- CI punya gate minimum dan evidence tersimpan.
- Tim siap masuk Sprint 2 tanpa ambiguity besar pada auth dan production gates.
