# Gaps Report from Reconstructed TODOLIST Coverage

Dokumen ini merangkum area yang masih **Partial** atau **Not covered** ketika Sprint 1–5 digunakan sebagai source of truth pengganti `TODOLIST.md` yang tidak tersedia.

## 1. Partial Coverage

### 1.1 Environment setup dan baseline konfigurasi
**Gap:** belum terlihat sebagai paket checklist operasional yang eksplisit.

**Risiko:** environment drift, konfigurasi tidak konsisten, defect yang sulit direproduksi.

**Rekomendasi:**
- Buat checklist environment preprod/prod
- Tetapkan owner secrets, config, dan deployment variables
- Tambahkan exit criteria Sprint 1 untuk readiness environment

### 1.2 UI flow refinement dan usability
**Gap:** alur inti kemungkinan sudah ada, tetapi acceptance criteria UX belum tentu eksplisit.

**Risiko:** fitur lolos secara teknis tetapi tidak efisien dipakai user.

**Rekomendasi:**
- Tambahkan review usability per flow utama
- Tetapkan daftar perbaikan UX prioritas tinggi
- Masukkan ke Sprint 3 atau Sprint 4 sebagai polishing terukur

### 1.3 Integrasi eksternal
**Gap:** integrasi mungkin tercakup secara garis besar, tetapi fallback, error handling, dan credential readiness belum tentu terdokumentasi.

**Risiko:** integrasi menjadi blocker utama menjelang SIT/UAT.

**Rekomendasi:**
- Pecah per endpoint/integration point
- Tambahkan retry, timeout, dan fallback behavior
- Wajibkan sandbox validation sebelum SIT

### 1.4 Reporting, export, audit trail, notification
**Gap:** area ini biasanya tersentuh, tetapi sering tidak dipaku sebagai deliverable minimum yang jelas.

**Risiko:** ekspektasi stakeholder tidak selaras saat UAT dan handover.

**Rekomendasi:**
- Definisikan report minimum viable
- Definisikan event audit minimum wajib
- Pisahkan notification wajib vs opsional

### 1.5 Security hardening
**Gap:** permission mungkin ada, tetapi checklist hardening belum tentu eksplisit.

**Risiko:** akses tidak sesuai peran, celah keamanan dasar lolos ke UAT/go-live.

**Rekomendasi:**
- Tambahkan checklist security review dasar
- Verifikasi authorization per role dan per action
- Tambahkan review sensitive endpoints sebelum release

### 1.6 Performance tuning dan stabilization
**Gap:** hardening performa biasanya muncul di akhir, tetapi tanpa target ukur yang tegas.

**Risiko:** aplikasi lolos fungsional tetapi lambat saat dipakai secara riil.

**Rekomendasi:**
- Tetapkan SLA internal sederhana
- Uji response time pada flow kritikal
- Catat bottleneck dan ticket tuning terpisah

### 1.7 Release readiness, cutover, dokumentasi, migration, release notes
**Gap:** elemen-elemen ini sering dianggap implisit menjelang go-live dan akhirnya tidak selesai rapi.

**Risiko:** deployment kacau, handover lemah, transisi ke operasional tidak mulus.

**Rekomendasi:**
- Buat cutover checklist
- Buat runbook dan SOP admin/user
- Lakukan dry-run migration
- Wajibkan release notes dan known issues list

## 2. Not Covered

### 2.1 Monitoring, observability, dan alerting
**Status:** Not covered

**Dampak:** setelah rilis, tim tidak punya visibility yang cukup terhadap error, latensi, dan kegagalan proses.

**Rekomendasi backlog:**
- Tambah epic **Observability & Monitoring**
- Task: application logging baseline, dashboard error, alert kritikal, ownership incident
- Target: Sprint 5 atau fase hypercare setelah Sprint 5

### 2.2 Backup, rollback, dan disaster recovery
**Status:** Not covered

**Dampak:** risiko operasional tinggi saat deployment atau saat terjadi insiden produksi.

**Rekomendasi backlog:**
- Tambah epic **Release Safety & Recovery**
- Task: rollback plan, restore validation, backup schedule, approval matrix
- Target: wajib selesai sebelum produksi penuh

### 2.3 Training user/admin dan change management
**Status:** Not covered

**Dampak:** adopsi rendah walau sistem sudah siap teknis.

**Rekomendasi backlog:**
- Tambah epic **Training & Adoption**
- Task: quick guide, admin SOP, sesi training, FAQ, communication plan
- Target: paralel dengan Sprint 5

### 2.4 Post-go-live support / hypercare model
**Status:** Not covered

**Dampak:** isu pasca rilis tidak tertangani cepat, ownership kabur.

**Rekomendasi backlog:**
- Tambah epic **Hypercare & Support Readiness**
- Task: support channel, SLA triage, incident owner, defect prioritization
- Target: aktif pada 1–2 minggu pertama setelah go-live

### 2.5 KPI adoption, analytics, continuous improvement
**Status:** Not covered

**Dampak:** tidak ada mekanisme formal untuk mengevaluasi keberhasilan implementasi.

**Rekomendasi backlog:**
- Tambah epic **Adoption & Optimization**
- Task: KPI dashboard, usage tracking, backlog optimization, review bulanan
- Target: fase setelah stabilisasi awal

## 3. Prioritas Tindak Lanjut

Urutan prioritas yang paling aman adalah:
1. **Release safety items**: rollback, backup, cutover checklist
2. **Operational readiness**: monitoring, alerting, hypercare ownership
3. **Business readiness**: training, SOP, release notes, known issues
4. **Quality uplift**: security hardening, performance threshold, audit trail minimum
5. **Optimization**: analytics, adoption metrics, improvement backlog

## 4. Rekomendasi Eksekusi

Agar Sprint 1–5 tetap menjadi basis utama namun lebih siap dieksekusi, saya sarankan:
- item **Partial** dikonversi menjadi subtask eksplisit pada sprint yang paling dekat
- item **Not covered** dimasukkan sebagai epic tambahan di **Sprint 5** atau **post-Sprint 5 / hypercare backlog**
- semua item di atas diberi **owner tunggal**, definisi selesai, dan dependency yang jelas

## 5. Kesimpulan

Kerangka Sprint 1–5 sudah cukup kuat untuk menutup delivery inti. Gap terbesar ada pada **operational readiness** dan **post-release readiness**, bukan pada implementasi fitur inti. Karena itu, backlog berikutnya sebaiknya fokus pada penguatan area operasional agar transisi dari preproduction ke rilis berjalan aman dan terukur.
