# CIMS Sprint 2 Issue Breakdown

## Fokus Sprint 2
Sprint 2 memindahkan CIMS dari baseline hardening awal menuju **integrasi yang lebih nyata dan perlindungan data yang lebih layak produksi**. Jika Sprint 1 berfokus pada production gates, IAM baseline, dan CI minimum, maka Sprint 2 berfokus pada empat area berikut:

- Epic D — Notification & Official Gateway Hardening
- Epic E — Secrets & Crypto Hardening
- Epic F — Evidence Storage Hardening
- Epic G — Zoom / Virtual Session Hardening

## Outcome Sprint
Pada akhir Sprint 2, target minimum adalah:

- Gateway notifikasi dan official system tidak lagi hanya bergantung pada mode mock untuk stage uji serius.
- Secret dan field encryption memiliki jalur pengelolaan yang lebih layak produksi.
- Evidence storage memiliki baseline integritas dan arah object storage yang jelas.
- Provider video memiliki baseline security dan failure handling yang lebih kuat.
- Ada evidence teknis yang cukup untuk masuk ke Sprint 3 dengan fokus compliance runtime.

## Label yang Disarankan
- `sprint-2`
- `production-readiness`
- `p0` / `p1` / `p2`
- `integration`
- `security`
- `backend`
- `platform`
- `qa`
- `documentation`

## Epic D — Notification & Official Gateway Hardening

### Issue D1 — Inventory and classify all external gateway flows
**Type:** Analysis / Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-2`, `production-readiness`, `p0`, `integration`

**Description**
Petakan seluruh alur gateway eksternal yang dipakai untuk notifikasi dan official system agar implementasi hardening Sprint 2 punya scope yang jelas.

**Scope**
- Daftar semua outbound flows
- Daftar semua inbound callbacks jika ada
- Klasifikasi criticality tiap flow
- Mapping flow ke modul bisnis terkait
- Identifikasi mode saat ini: mock, sandbox, local, real-http

**Acceptance criteria**
- Ada inventory flow gateway yang dapat dipakai seluruh tim.
- Setiap flow memiliki owner, source module, target system, dan criticality.
- Gap mock vs sandbox terdokumentasi.

**Dependencies**
- Sprint 1 issue terkait production gate env sudah aktif

**Definition of done**
- Inventory merged atau tersedia sebagai artefak sprint
- Disepakati pada review internal

### Issue D2 — Implement HTTP sandbox mode for notification gateway
**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Integration Engineer
**Labels:** `sprint-2`, `production-readiness`, `p0`, `integration`, `backend`

**Description**
Implementasikan mode HTTP sandbox untuk notification gateway sebagai pengganti ketergantungan penuh pada mode mock.

**Scope**
- Tambah adapter HTTP sandbox
- Konfigurasi endpoint, auth, timeout
- Request/response logging terstruktur
- Error classification
- Fallback yang aman bila sandbox tidak tersedia

**Acceptance criteria**
- Notification gateway dapat berjalan pada mode sandbox HTTP.
- Error dari gateway tercatat dengan correlation id.
- Tidak ada silent failure untuk request notifikasi.

**Dependencies**
- D1

**Definition of done**
- Adapter merged
- Minimal smoke test lulus
- Konfigurasi env terdokumentasi

### Issue D3 — Implement HTTP sandbox mode for official-system gateway
**Type:** Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Integration Engineer
**Labels:** `sprint-2`, `production-readiness`, `p0`, `integration`, `backend`

**Description**
Tambahkan mode HTTP sandbox untuk official-system gateway agar integrasi lintas sistem resmi bisa diuji lebih realistis.

**Scope**
- Tambah adapter HTTP sandbox
- Konfigurasi auth/headers/payload contract
- Response/error normalization
- Correlation logging
- Handling untuk upstream unavailable

**Acceptance criteria**
- Official gateway dapat dijalankan pada sandbox HTTP.
- Contract dasar request/response tervalidasi.
- Kegagalan upstream dapat dibedakan dari validasi internal.

**Dependencies**
- D1

**Definition of done**
- Adapter merged
- Minimal smoke test lulus
- Kontrak integrasi terdokumentasi secara ringkas

### Issue D4 — Add timeout, retry, and backoff policy to external gateways
**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `integration`, `backend`

**Description**
Tambahkan reliability policy dasar untuk request ke sistem eksternal.

**Scope**
- Timeout per flow
- Retry policy
- Exponential backoff atau fixed backoff yang eksplisit
- Pembatasan retry untuk error yang tidak retriable
- Logging attempt count

**Acceptance criteria**
- Setiap gateway kritis memiliki timeout dan retry policy eksplisit.
- Error retriable dan non-retriable dibedakan.
- Retry behavior dapat diamati dari log atau metrics.

**Dependencies**
- D2
- D3

**Definition of done**
- Policy merged
- Test untuk retry dan timeout lulus

### Issue D5 — Add idempotency and delivery-state tracking
**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `integration`, `backend`

**Description**
Tambahkan baseline idempotency dan pelacakan status pengiriman agar sistem dapat merekonsiliasi pengiriman keluar dengan lebih aman.

**Scope**
- Idempotency key strategy
- Delivery state model
- Deduplication handling
- Failure state classification
- Status transitions terdokumentasi

**Acceptance criteria**
- Duplicate send dapat diidentifikasi atau dicegah.
- Status delivery minimal mencakup queued, sent, failed, acknowledged jika relevan.
- Ada bukti state transition pada log atau storage.

**Dependencies**
- D2
- D3

**Definition of done**
- State model merged
- Test transisi utama lulus

### Issue D6 — Build reconciliation job for outbound gateway flows
**Type:** Engineering / QA
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-2`, `production-readiness`, `p1`, `integration`, `qa`

**Description**
Bangun reconciliation job minimum untuk mendeteksi perbedaan antara status internal dan status gateway eksternal.

**Scope**
- Tentukan kandidat flow untuk reconciliation
- Tambah worker/job dasar
- Definisikan hasil reconciliation: match, pending, mismatch
- Tambah log dan summary output

**Acceptance criteria**
- Minimal satu flow kritis memiliki reconciliation job.
- Mismatch dapat diidentifikasi dengan output yang bisa ditindaklanjuti.

**Dependencies**
- D5

**Definition of done**
- Job merged
- Minimal test atau dry-run evidence tersedia

### Issue D7 — Add gateway integration test pack
**Type:** QA / Integration
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `qa`, `integration`

**Description**
Buat baseline integration tests untuk notification dan official gateway pada mode sandbox/stub yang realistis.

**Scope**
- Success case
- Timeout case
- Upstream 4xx/5xx case
- Duplicate request case
- Retry behavior case

**Acceptance criteria**
- Minimal 5 skenario integrasi diuji otomatis.
- Hasil test dapat dipakai pada sprint review.

**Dependencies**
- D2
- D3
- D4
- D5

**Definition of done**
- Suite test merged
- Terintegrasi dengan CI bila memungkinkan

## Epic E — Secrets & Crypto Hardening

### Issue E1 — Inventory secrets and classify management strategy
**Type:** Analysis / Security
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Security Lead
**Labels:** `sprint-2`, `production-readiness`, `p0`, `security`

**Description**
Inventarisasi seluruh secret dan klasifikasikan strategi pengelolaannya sebagai dasar integrasi KMS/HSM/Vault.

**Scope**
- Daftar secret aplikasi, gateway, DB, webhook, crypto
- Klasifikasi sensitivity
- Klasifikasi rotation frequency
- Identifikasi secret yang masih file-based/local

**Acceptance criteria**
- Ada secret inventory dengan owner dan tingkat sensitivitas.
- Secret yang paling kritis teridentifikasi jelas.

**Dependencies**
- Tidak ada

**Definition of done**
- Inventory tersedia sebagai artefak sprint

### Issue E2 — Design production secret management target architecture
**Type:** Design / Documentation
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Security Lead + Platform Engineer
**Labels:** `sprint-2`, `production-readiness`, `p0`, `security`, `platform`, `documentation`

**Description**
Rancang arsitektur target untuk secret management production-grade.

**Scope**
- Pilihan KMS/HSM/Vault
- Secret loading pattern
- Bootstrap dependency strategy
- Access control model
- Rotation model awal

**Acceptance criteria**
- Ada dokumen arsitektur singkat yang dapat dieksekusi.
- Keputusan tooling dan boundary tanggung jawab jelas.

**Dependencies**
- E1

**Definition of done**
- Dokumen disetujui internal

### Issue E3 — Integrate external secret provider for one critical path
**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `security`, `platform`

**Description**
Implementasikan integrasi secret provider eksternal pada satu jalur paling kritis sebagai baseline.

**Suggested critical path**
- OIDC verifier secret/config
- Gateway credentials
- Webhook verification secret

**Acceptance criteria**
- Minimal satu jalur kritis mengambil secret dari provider eksternal.
- Ada fallback behavior yang aman dan eksplisit.
- Error loading secret tercatat dengan jelas.

**Dependencies**
- E2

**Definition of done**
- Integrasi merged
- Smoke test tersedia

### Issue E4 — Audit and harden field crypto implementation
**Type:** Security Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `security`, `backend`

**Description**
Audit implementasi field encryption untuk memastikan algoritma, nonce/IV, dan metadata kunci layak untuk tahap berikutnya.

**Scope**
- Audit algorithm choice
- Audit IV/nonce handling
- Audit AEAD/authenticated encryption usage
- Audit metadata key version support
- Identifikasi gap yang harus ditutup pada Sprint 3/4

**Acceptance criteria**
- Ada hasil audit singkat terhadap field crypto.
- Gap prioritas tinggi teridentifikasi.
- Minimal satu perbaikan langsung diterapkan bila ditemukan masalah mendasar.

**Dependencies**
- Tidak ada

**Definition of done**
- Audit selesai
- Temuan terdokumentasi
- Fix minimum merged bila diperlukan

### Issue E5 — Add key versioning metadata support
**Type:** Engineering
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `security`, `backend`

**Description**
Tambahkan dukungan metadata versi kunci untuk mempermudah rotasi pada fase berikutnya.

**Scope**
- Tambah model metadata key version
- Update encrypt/decrypt path
- Tambah compatibility test

**Acceptance criteria**
- Data terenkripsi menyimpan atau merujuk key version.
- Jalur decrypt tetap kompatibel pada data lama jika relevan.

**Dependencies**
- E4

**Definition of done**
- Kode merged
- Test lulus

### Issue E6 — Draft key rotation procedure and test plan
**Type:** Documentation / Security
**Priority:** P2
**Estimate:** 2 points
**Suggested owner:** Security Lead
**Labels:** `sprint-2`, `production-readiness`, `p2`, `security`, `documentation`

**Description**
Susun prosedur awal untuk rotasi kunci dan rencana pengujiannya agar Sprint berikutnya tidak mulai dari nol.

**Scope**
- Rotate strategy
- Rollback note
- Re-encryption strategy high level
- Audit evidence yang dibutuhkan

**Acceptance criteria**
- Ada draft prosedur rotasi kunci.
- Ada daftar keputusan yang masih terbuka.

**Dependencies**
- E4
- E5

**Definition of done**
- Dokumen tersedia

## Epic F — Evidence Storage Hardening

### Issue F1 — Inventory evidence flows and storage touchpoints
**Type:** Analysis / Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Backend Lead
**Labels:** `sprint-2`, `production-readiness`, `p0`, `backend`, `integration`

**Description**
Petakan seluruh alur evidence/dokumen perkara agar hardening storage tidak melewatkan jalur penting.

**Scope**
- Daftar jenis evidence
- Upload path dan retrieval path
- Storage touchpoints
- Metadata yang disimpan
- Risiko integritas dan akses

**Acceptance criteria**
- Ada peta alur evidence end-to-end.
- Touchpoint kritis teridentifikasi.

**Dependencies**
- Tidak ada

**Definition of done**
- Inventory tersedia

### Issue F2 — Define target object storage contract
**Type:** Design / Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-2`, `production-readiness`, `p0`, `platform`, `backend`, `documentation`

**Description**
Definisikan kontrak object storage target agar implementasi adapter tidak ambigu.

**Scope**
- Upload contract
- Download/read contract
- Metadata contract
- Checksum contract
- Error contract
- Retention/legal-hold compatibility notes

**Acceptance criteria**
- Ada kontrak target yang bisa dipakai implementasi adapter.
- Kebutuhan integritas dan metadata terdokumentasi.

**Dependencies**
- F1

**Definition of done**
- Dokumen disetujui internal

### Issue F3 — Implement production-grade object storage adapter baseline
**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Platform Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `platform`, `backend`

**Description**
Implementasikan adapter object storage baseline untuk menggantikan ketergantungan pada storage lokal pada jalur target.

**Acceptance criteria**
- Minimal satu jalur evidence dapat menggunakan object storage adapter.
- Adapter memiliki error handling yang eksplisit.
- Konfigurasi env untuk adapter terdokumentasi.

**Dependencies**
- F2

**Definition of done**
- Adapter merged
- Smoke test tersedia

### Issue F4 — Add checksum and manifest verification baseline
**Type:** Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `backend`, `security`

**Description**
Tambahkan verifikasi integritas dasar untuk evidence dan manifest-nya.

**Scope**
- Checksum generation
- Checksum verification
- Manifest linkage
- Error path bila mismatch
- Logging integrity failures

**Acceptance criteria**
- Minimal satu alur evidence memiliki checksum verification.
- Integrity mismatch menghasilkan error yang eksplisit.

**Dependencies**
- F3

**Definition of done**
- Kode merged
- Test mismatch lulus

### Issue F5 — Validate legal-hold and retention compatibility assumptions
**Type:** Analysis / Compliance
**Priority:** P2
**Estimate:** 2 points
**Suggested owner:** Compliance Lead
**Labels:** `sprint-2`, `production-readiness`, `p2`, `documentation`

**Description**
Validasi apakah storage target dan metadata evidence sudah kompatibel dengan kebutuhan legal hold dan retention yang direncanakan.

**Acceptance criteria**
- Ada daftar asumsi yang tervalidasi atau gap yang harus dibawa ke sprint berikutnya.

**Dependencies**
- F2

**Definition of done**
- Hasil review tercatat

### Issue F6 — Add evidence storage integration test pack
**Type:** QA / Engineering
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `qa`, `backend`

**Description**
Buat baseline integration tests untuk upload, retrieval, dan integrity check evidence.

**Acceptance criteria**
- Ada test untuk success path, missing object, dan checksum mismatch.
- Hasil test dapat dipakai pada sprint review.

**Dependencies**
- F3
- F4

**Definition of done**
- Test suite merged

## Epic G — Zoom / Virtual Session Hardening

### Issue G1 — Inventory video provider lifecycle and webhook events
**Type:** Analysis / Engineering
**Priority:** P0
**Estimate:** 3 points
**Suggested owner:** Integration Lead
**Labels:** `sprint-2`, `production-readiness`, `p0`, `integration`

**Description**
Petakan seluruh lifecycle video provider dan event webhook yang relevan untuk sidang elektronik.

**Scope**
- Meeting creation/update/cancel flow
- Participant lifecycle
- Webhook event list
- Mapping ke modul internal
- Failure points utama

**Acceptance criteria**
- Ada inventory lifecycle provider dan event webhook.
- Event penting dan missing event teridentifikasi.

**Dependencies**
- Tidak ada

**Definition of done**
- Artefak inventory tersedia

### Issue G2 — Add webhook signature validation baseline
**Type:** Security Engineering
**Priority:** P0
**Estimate:** 5 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-2`, `production-readiness`, `p0`, `security`, `integration`

**Description**
Tambahkan verifikasi signature webhook provider sebagai baseline keamanan minimum.

**Scope**
- Verifikasi signature
- Validasi timestamp jika tersedia
- Error handling untuk invalid webhook
- Audit log untuk invalid attempt

**Acceptance criteria**
- Webhook tanpa signature valid ditolak.
- Invalid webhook attempt tercatat.
- Ada test untuk valid dan invalid signature.

**Dependencies**
- G1

**Definition of done**
- Kode merged
- Test lulus

### Issue G3 — Add anti-replay protection for webhook events
**Type:** Security Engineering
**Priority:** P1
**Estimate:** 3 points
**Suggested owner:** Security Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `security`, `integration`

**Description**
Tambahkan perlindungan dasar terhadap replay pada event webhook provider.

**Scope**
- Replay key strategy
- Time window validation
- Duplicate event handling
- Logging replay detection

**Acceptance criteria**
- Event replay dapat dideteksi dan ditolak atau ditandai.
- Ada test duplicate event/replay case.

**Dependencies**
- G2

**Definition of done**
- Kode merged
- Test lulus

### Issue G4 — Build meeting reconciliation baseline
**Type:** Engineering / QA
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** Integration Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `integration`, `qa`

**Description**
Bangun baseline reconciliation untuk lifecycle meeting agar perbedaan status internal dan provider dapat dideteksi.

**Scope**
- Tentukan state mapping internal vs provider
- Reconciliation job atau command
- Summary output mismatch
- Operator-facing log yang cukup jelas

**Acceptance criteria**
- Minimal satu flow meeting memiliki reconciliation baseline.
- Mismatch penting dapat diidentifikasi.

**Dependencies**
- G1

**Definition of done**
- Implementasi merged
- Dry-run evidence tersedia

### Issue G5 — Add orphan-room cleanup and timeout handling
**Type:** Engineering
**Priority:** P2
**Estimate:** 3 points
**Suggested owner:** Backend Engineer
**Labels:** `sprint-2`, `production-readiness`, `p2`, `integration`, `backend`

**Description**
Tambahkan baseline cleanup untuk room yang tercipta tetapi tidak lagi valid secara bisnis, serta timeout handling untuk provider operation.

**Acceptance criteria**
- Ada mekanisme identifikasi orphan room.
- Ada kebijakan timeout yang eksplisit untuk operasi provider.

**Dependencies**
- G4

**Definition of done**
- Kode merged
- Jalur log tersedia

### Issue G6 — Add virtual-session integration test pack
**Type:** QA / Engineering
**Priority:** P1
**Estimate:** 5 points
**Suggested owner:** QA Engineer
**Labels:** `sprint-2`, `production-readiness`, `p1`, `qa`, `integration`

**Description**
Tambahkan integration tests minimum untuk create meeting, invalid webhook, duplicate webhook, dan provider timeout.

**Acceptance criteria**
- Minimal 4 skenario utama diuji otomatis.
- Hasil test dapat dipakai untuk review kesiapan Sprint 2.

**Dependencies**
- G2
- G3
- G4

**Definition of done**
- Test suite merged

## Issue Tambahan untuk Sprint Governance

### Issue M2 — Publish Sprint 2 integration readiness review template
**Type:** Documentation / Process
**Priority:** P1
**Estimate:** 1 point
**Suggested owner:** Engineering Lead
**Labels:** `sprint-2`, `production-readiness`, `p1`, `documentation`

**Description**
Buat template review Sprint 2 yang fokus pada integrasi, crypto, evidence, dan provider readiness.

**Acceptance criteria**
- Ada template review yang memuat status integrasi, evidence test, residual risks, dan keputusan carry-over.

**Dependencies**
- Tidak ada

**Definition of done**
- Template tersedia dan dipakai minimal sekali

## Rekomendasi Urutan Pembuatan Issue di Board
1. D1
2. E1
3. F1
4. G1
5. D2
6. D3
7. E2
8. F2
9. G2
10. E4
11. F3
12. D4
13. D5
14. G3
15. G4
16. F4
17. E3
18. D6
19. D7
20. F6
21. G6
22. E5
23. F5
24. G5
25. E6
26. M2

## Rekomendasi Milestone
### Milestone 1 — External Integration Baseline
- D1
- D2
- D3
- D4
- D5

### Milestone 2 — Secret & Crypto Baseline
- E1
- E2
- E3
- E4
- E5
- E6

### Milestone 3 — Evidence Integrity Baseline
- F1
- F2
- F3
- F4
- F5
- F6

### Milestone 4 — Virtual Session Security Baseline
- G1
- G2
- G3
- G4
- G5
- G6

### Milestone 5 — Sprint Governance
- M2

## Exit Criteria Sprint 2
Sprint 2 bisa ditutup dengan hasil baik bila:
- Notification dan official gateway memiliki baseline sandbox HTTP yang nyata.
- Secret inventory dan target architecture selesai, serta minimal satu critical path memakai external secret provider atau jalur setara.
- Object storage baseline dan integrity verification awal tersedia untuk evidence.
- Provider webhook tervalidasi dan memiliki baseline anti-replay.
- Minimal satu reconciliation flow tersedia untuk gateway atau provider video.
- Tersedia integration test packs yang cukup untuk dibawa ke Sprint 3.

## Catatan Handoff ke Sprint 3
Jika Sprint 2 selesai sesuai target, Sprint 3 dapat fokus pada **compliance runtime** untuk modul kritis berikut:
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
