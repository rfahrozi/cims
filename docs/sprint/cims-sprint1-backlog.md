# CIMS Sprint 1 Backlog

## Tujuan Sprint

Sprint 1 difokuskan untuk menutup risiko produksi paling kritis agar CIMS tidak dapat berjalan dalam konfigurasi yang salah, mengurangi kemungkinan bypass autentikasi di non-dev, dan menaikkan baseline quality gate CI sebelum workstream integrasi dan compliance runtime dimulai.

Fokus sprint ini hanya pada tiga epic:

- Epic 1 — Production Gate Enforcement
- Epic 2 — IAM Hardening Phase 1
- Epic 3 — CI Hardening Minimum

## Outcome Sprint

Pada akhir sprint, sistem harus memenuhi outcome berikut:

- Aplikasi gagal start bila environment tidak memenuhi syarat minimum produksi.
- Jalur `AUTH_MODE=DEV` dan `dev-identity` tidak mungkin aktif di environment selain development.
- Endpoint kritis memiliki baseline auth dan policy verification.
- CI menolak merge jika quality gate dasar gagal.
- Ada artefak dokumentasi yang cukup untuk readiness review mingguan.

## Definisi Selesai Sprint

Sprint dianggap selesai bila:

- Forbidden environment matrix sudah diimplementasikan dan diuji.
- Startup guard environment aktif di API dan komponen terkait.
- IAM baseline role matrix terdokumentasi.
- Minimal endpoint kritis prioritas telah punya auth/policy tests.
- CI menjalankan typecheck, test, build, lint, secret scan, dan dependency scan.
- Ada dokumen keputusan dan residual risk yang tersisa.

## Epic 1 — Production Gate Enforcement

### Tujuan

Mencegah sistem hidup dalam mode dev/mock/local/memory pada environment yang tidak seharusnya.

### Story 1.1 — Centralized environment validator

**Deskripsi:** Buat validator environment terpusat untuk membaca semua env kritis dan menghentikan startup jika kombinasi tidak valid.

**Task teknis:**

- Inventarisasi semua env kritis dari API, worker, dan services.
- Definisikan kategori environment: `local`, `dev`, `test`, `staging`, `preprod`, `production`.
- Buat service/module validator bootstrap tunggal.
- Definisikan forbidden combinations matrix.
- Tambahkan unit tests untuk validator.

**Acceptance criteria:**

- Ada satu komponen validator terpusat.
- Startup gagal bila env combination melanggar aturan.
- Pesan error startup jelas dan actionable.

**Estimasi:** 3 poin
**Owner:** Backend Lead
**Prioritas:** P0

### Story 1.2 — Fail-fast AUTH gating

**Deskripsi:** Pastikan aplikasi gagal start bila mode auth tidak layak untuk environment target.

**Task teknis:**

- Fail startup jika `NODE_ENV=production` dan `AUTH_MODE=DEV`.
- Fail startup jika OIDC config wajib kosong di non-local serious env.
- Validasi `OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE`.
- Validasi fallback dev persona tidak tersedia di non-dev.
- Tambahkan automated tests untuk setiap skenario invalid.

**Acceptance criteria:**

- Tidak ada environment serius yang bisa start dengan auth dev.
- Error message menyebut field env mana yang kurang/invalid.

**Estimasi:** 3 poin
**Owner:** Backend Lead
**Prioritas:** P0

### Story 1.3 — Persistence and storage gating

**Deskripsi:** Cegah penggunaan mode penyimpanan yang tidak layak di stage serius.

**Task teknis:**

- Fail startup jika `PERSISTENCE_MODE=MEMORY` pada `staging/preprod/production`.
- Fail startup jika `EVIDENCE_STORAGE_MODE=LOCAL` pada `production`.
- Tandai mode non-production pada log startup dengan severity jelas.
- Tambahkan tests untuk mode persistence/storage.

**Acceptance criteria:**

- Mode memory/local tidak lolos ke environment serius.
- Log startup menyatakan mode yang aktif dan status kelayakannya.

**Estimasi:** 2 poin
**Owner:** Backend Engineer
**Prioritas:** P0

### Story 1.4 — Integration mode gating

**Deskripsi:** Cegah gateway integrasi berjalan dalam mode mock di environment target.

**Task teknis:**

- Validasi `NOTIFICATION_GATEWAY_MODE`.
- Validasi `OFFICIAL_SYSTEM_GATEWAY_MODE`.
- Validasi mode provider video/sandbox sesuai target env.
- Fail startup untuk kombinasi yang dilarang.
- Tambahkan tests.

**Acceptance criteria:**

- Semua mode mock/local yang tidak layak diblok oleh startup.
- Matrix env terdokumentasi.

**Estimasi:** 2 poin
**Owner:** Integration Engineer
**Prioritas:** P0

### Story 1.5 — Database transport enforcement

**Deskripsi:** Pastikan koneksi database memakai konfigurasi transport yang layak.

**Task teknis:**

- Validasi `DB_SSL=true` untuk env selain local.
- Verifikasi env sertifikat bila diperlukan.
- Tambahkan check startup dan logging.
- Tambahkan tests untuk fallback yang tidak valid.

**Acceptance criteria:**

- Non-local env tidak bisa start tanpa SSL DB yang valid.

**Estimasi:** 2 poin
**Owner:** Platform Engineer
**Prioritas:** P0

### Story 1.6 — Production gates documentation

**Deskripsi:** Dokumentasikan aturan minimum deploy.

**Task teknis:**

- Buat `production-gates.md`.
- Dokumentasikan matrix env yang diizinkan.
- Dokumentasikan alasan tiap gate.
- Tambahkan contoh konfigurasi valid dan invalid.

**Acceptance criteria:**

- Tim dapat memakai dokumen ini saat code review dan release review.

**Estimasi:** 1 poin
**Owner:** Engineering Lead
**Prioritas:** P1

## Epic 2 — IAM Hardening Phase 1

### Tujuan

Menguatkan baseline autentikasi dan otorisasi agar tidak ada jalur akses longgar di non-dev.

### Story 2.1 — Audit and harden auth guard

**Deskripsi:** Review `auth.guard.ts` dan pastikan jalur auth dev tidak dapat lolos ke non-dev.

**Task teknis:**

- Audit behavior `AUTH_MODE=DEV`.
- Pastikan branch dev dibatasi keras ke development saja.
- Tambahkan structured logging untuk auth mode aktif.
- Tambahkan unit tests untuk dev/non-dev auth branch.

**Acceptance criteria:**

- `AUTH_MODE=DEV` tidak dapat dipakai di non-dev.
- Semua cabang auth penting memiliki test.

**Estimasi:** 3 poin
**Owner:** Security Engineer
**Prioritas:** P0

### Story 2.2 — Audit OIDC token verification path

**Deskripsi:** Tinjau verifier token agar baseline validasi OIDC layak untuk environment serius.

**Task teknis:**

- Audit issuer/audience validation.
- Audit JWKS URL usage dan cache behavior.
- Audit expiry, nbf, skew, invalid signature handling.
- Dokumentasikan gap yang belum ditutup pada fase ini.
- Tambahkan tests minimal untuk invalid token cases.

**Acceptance criteria:**

- Ada daftar perilaku verifier yang tervalidasi.
- Invalid token cases penting ter-cover test.

**Estimasi:** 5 poin
**Owner:** Security Engineer
**Prioritas:** P0

### Story 2.3 — Initial cross-agency role matrix

**Deskripsi:** Definisikan matriks role dan permission baseline untuk lintas instansi.

**Task teknis:**

- Inventarisasi role utama: pengadilan, kejaksaan, pemasyarakatan, governance, auditor, liaison, operator terbatas.
- Petakan permission minimum untuk endpoint kritis.
- Validasi dengan owner domain/regulasi.
- Simpan sebagai dokumen kerja dan referensi test.

**Acceptance criteria:**

- Ada matriks role baseline yang disetujui internal.
- Matriks dapat dipakai untuk penulisan authz tests.

**Estimasi:** 3 poin
**Owner:** Compliance Lead + Security Engineer
**Prioritas:** P0

### Story 2.4 — Policy coverage for critical endpoints

**Deskripsi:** Pastikan endpoint kritis benar-benar dilindungi oleh auth dan policy guard.

**Scope endpoint prioritas:**

- `appeal-decision`
- `notices`
- `scheduling`
- `participants`
- `custody`
- `governance`
- `compliance`
- `legacy-proxy`
- `provider-webhooks` untuk jalur yang relevan

**Task teknis:**

- Audit decorator dan guard pada endpoint prioritas.
- Tandai endpoint yang belum memiliki permission requirement eksplisit.
- Tambahkan policy requirement yang hilang.
- Tambahkan baseline integration test untuk allow/deny.

**Acceptance criteria:**

- Tidak ada endpoint kritis yang hanya mengandalkan login tanpa policy.
- Ada daftar coverage endpoint kritis.

**Estimasi:** 5 poin
**Owner:** Backend Lead
**Prioritas:** P0

### Story 2.5 — Disable dev identity outside development

**Deskripsi:** Pastikan `dev-identity.interceptor` tidak aktif di luar development.

**Task teknis:**

- Audit wiring `dev-identity.interceptor`.
- Tambahkan bootstrap assertion atau conditional registration yang aman.
- Tambahkan test untuk memastikan interceptor tidak aktif di non-dev.

**Acceptance criteria:**

- Dev identity path mustahil aktif di staging/preprod/production.

**Estimasi:** 2 poin
**Owner:** Backend Engineer
**Prioritas:** P0

### Story 2.6 — Authz test matrix baseline

**Deskripsi:** Buat baseline automated tests untuk role x endpoint x action.

**Task teknis:**

- Pilih minimal 10 endpoint paling kritis.
- Susun test case allow/deny per role.
- Integrasikan ke CI.
- Pastikan output test mudah dibaca saat gagal.

**Acceptance criteria:**

- Ada baseline authz matrix tests untuk endpoint prioritas.
- CI gagal bila terjadi regression otorisasi.

**Estimasi:** 5 poin
**Owner:** QA Engineer + Security Engineer
**Prioritas:** P1

## Epic 3 — CI Hardening Minimum

### Tujuan

Menjamin perubahan yang masuk tidak menurunkan baseline kualitas dan keamanan dasar.

### Story 3.1 — Add lint gate

**Deskripsi:** Tambahkan lint sebagai gate wajib bila belum aktif di CI.

**Task teknis:**

- Standarkan lint command root/workspace.
- Tambahkan lint ke workflow CI.
- Fail build bila lint gagal.

**Acceptance criteria:**

- Semua PR menjalankan lint.

**Estimasi:** 2 poin
**Owner:** Platform Engineer
**Prioritas:** P1

### Story 3.2 — Add dependency vulnerability scan

**Deskripsi:** Tambahkan scan dependency ke jalur CI.

**Task teknis:**

- Pilih tool scan yang sesuai.
- Tambahkan severity threshold.
- Simpan hasil sebagai artifact.
- Definisikan kebijakan fail/warn.

**Acceptance criteria:**

- Dependency scan berjalan otomatis di PR/main.
- Temuan severity tinggi terlihat jelas.

**Estimasi:** 3 poin
**Owner:** Security Engineer
**Prioritas:** P1

### Story 3.3 — Add secret scan

**Deskripsi:** Cegah secret hardcoded lolos ke branch utama.

**Task teknis:**

- Tambahkan tool secret scanning.
- Konfigurasikan baseline/allowlist jika diperlukan.
- Simpan hasil scan sebagai artifact.
- Fail workflow pada temuan valid.

**Acceptance criteria:**

- CI memeriksa secret leakage pada PR.

**Estimasi:** 3 poin
**Owner:** Security Engineer
**Prioritas:** P1

### Story 3.4 — Add migration verification

**Deskripsi:** Pastikan perubahan schema/migration tidak merusak jalur build.

**Task teknis:**

- Tambahkan job verifikasi migration.
- Jalankan dry-run atau apply pada test database ephemeral.
- Simpan log hasil migrasi.

**Acceptance criteria:**

- PR yang merusak migrasi gagal di CI.

**Estimasi:** 3 poin
**Owner:** Platform Engineer
**Prioritas:** P1

### Story 3.5 — Add critical integration lane

**Deskripsi:** Tambahkan jalur test integrasi minimum untuk modul kritis.

**Task teknis:**

- Pilih subset modul prioritas: auth, notices, scheduling, appeal-decision.
- Jalankan integration tests pada environment CI.
- Pastikan output mudah digunakan untuk debugging.

**Acceptance criteria:**

- Ada satu lane integration test minimum untuk modul kritis.

**Estimasi:** 5 poin
**Owner:** QA Engineer
**Prioritas:** P1

### Story 3.6 — CI artifact and evidence retention

**Deskripsi:** Simpan hasil test/scan sebagai bukti readiness.

**Task teknis:**

- Simpan artifact lint/test/scan.
- Tetapkan retention policy minimum.
- Standarkan nama artifact agar mudah ditelusuri.

**Acceptance criteria:**

- Hasil CI dapat dipakai untuk review mingguan.

**Estimasi:** 1 poin
**Owner:** Platform Engineer
**Prioritas:** P2

## Daftar Deliverable Sprint

Pada akhir sprint, tim harus menghasilkan artefak berikut:

- Environment validator implementation
- Forbidden environment matrix
- `production-gates.md`
- Role matrix baseline lintas instansi
- Auth/policy coverage report untuk endpoint kritis
- Baseline authz test matrix
- Workflow CI yang diperkuat
- Artifact hasil lint/test/scan
- Sprint review note yang mencatat residual risks

## Rekomendasi Breakdown Mingguan

### Hari 1–2

- Finalisasi scope sprint
- Inventarisasi env kritis
- Audit auth guard dan wiring dev identity
- Audit workflow CI saat ini

### Hari 3–4

- Implementasi env validator
- Implementasi fail-fast auth/storage/integration/DB gates
- Draft role matrix awal
- Tambahkan lint + secret scan ke CI

### Hari 5–6

- Audit dan perbaiki OIDC verification path
- Tambahkan authz matrix test awal
- Tambahkan dependency scan dan migration verification

### Hari 7–8

- Audit policy coverage endpoint kritis
- Tambahkan integration lane minimum
- Lengkapi dokumen `production-gates.md`

### Hari 9–10

- Hardening sisa bug/regression
- Jalankan sprint review readiness
- Dokumentasikan residual risk dan carry-over ke Sprint 2

## Usulan Board Status

Gunakan status board berikut agar eksekusi rapi:

- Backlog
- Ready
- In Progress
- In Review
- Ready for QA
- Done
- Blocked

## Dependency Penting

- Persetujuan awal role matrix dari owner domain/regulasi
- Akses ke konfigurasi IdP/OIDC yang dipakai
- Kesepakatan severity threshold untuk scan dependency
- Ketersediaan test database untuk migration verification

## Risiko Sprint

- Role matrix lintas instansi bisa melambat karena butuh sinkronisasi bisnis.
- OIDC verifier mungkin membuka gap yang lebih besar dari perkiraan.
- Penambahan CI gate bisa memunculkan technical debt lama dan memperlambat merge awal.

## Mitigasi Sprint

- Timebox role matrix versi 1, jangan menunggu sempurna.
- Pisahkan fix blocker dari refactor besar.
- Terapkan threshold bertahap untuk CI jika technical debt terlalu tinggi, tetapi tetap fail untuk temuan kritis.

## Prioritas Eksekusi Harian

Urutan kerja paling disarankan:

1. Story 1.1
2. Story 1.2
3. Story 2.1
4. Story 2.5
5. Story 3.1
6. Story 3.3
7. Story 2.3
8. Story 2.4
9. Story 2.2
10. Story 3.2
11. Story 3.4
12. Story 2.6
13. Story 3.5
14. Story 1.3
15. Story 1.4
16. Story 1.5
17. Story 1.6
18. Story 3.6

## Exit Criteria Sprint 1

Sprint 1 dinyatakan berhasil bila:

- Tidak ada startup pada environment serius yang lolos dengan auth dev, mock gateway, atau persistence memory.
- Endpoint prioritas punya baseline auth dan policy coverage.
- CI memiliki gate minimum yang konsisten.
- Tim memiliki dokumen yang cukup untuk memulai Sprint 2 tanpa ambiguity besar.

## Rekomendasi Langkah Setelah Sprint 1

Jika sprint ini selesai sesuai target, Sprint 2 langsung fokus pada:

- Notification & official gateway hardening
- Secrets & crypto hardening
- Evidence storage hardening awal
- Zoom / virtual session hardening tahap awal
