# CIMS — Analisis Lean MVP (Agile PO / Lean Startup Lens)
> Tanggal: 25 Juli 2026 | Versi: v0.19.0 | Prinsip: Pareto 80/20

---

## DIAGNOSIS UTAMA

> **Sistem ini sudah terlalu matang untuk MVP, tapi belum cukup matang untuk produksi.**
>
> Paradoks ini adalah "MVP Paradox" yang paling umum terjadi: tim membangun
> terlalu banyak hal sekaligus, sehingga tidak ada satu hal pun yang selesai
> 100% siap diuji pengguna nyata. Prinsip Lean: **ship the skateboard, not
> the half-built car.**

---

## 1. ANALISIS FITUR KRITIS — The "Must-Haves" (20% kode, 80% nilai)

### Alur Inti yang Benar-benar Dibutuhkan Pengguna MVP

Berdasarkan kode `gates.ts` dan `workflow.ts`, alur sidang elektronik
sebenarnya adalah 7 langkah linear:

```
Input Data Perkara → Penetapan Hakim → Jadwal → Kirim Pemberitahuan
→ Checklist Kesiapan → Buka Ruang Virtual → Jalankan Sidang
```

**Fitur yang WAJIB ada dan sudah berjalan dengan baik:**

| # | Fitur | Status | File Kunci |
|---|-------|--------|-----------|
| 1 | Input data perkara manual (Maker-Checker) | ✅ Siap | `hearing-intake.service.ts` |
| 2 | Penetapan hakim sebagai hard gate | ✅ Siap | `gates.ts`, `determinations.service.ts` |
| 3 | Penjadwalan + conflict check + approval | ✅ Siap | `scheduling.service.ts` |
| 4 | Pemberitahuan resmi + acknowledgment | ✅ Siap | `notices.service.ts` |
| 5 | Checklist kesiapan 3 instansi | ✅ Siap | `readiness.service.ts` |
| 6 | Provisioning ruang virtual (Zoom) | ✅ Siap | `virtual-sessions.service.ts` |
| 7 | Kontrol sidang (start/suspend/end) | ✅ Siap | `hearing-control.service.ts` |
| 8 | Insiden (TECHNICAL/CYBER/FORCE_MAJEURE) | ✅ Siap | `incidents.service.ts` |
| 9 | Audit trail HMAC immutable | ✅ Siap | `audit.service.ts` |

**Kesimpulan kritis:** Alur utama (80% nilai) sudah SELESAI 100% secara
fungsional dengan MEMORY mode. Yang menghalangi rilis adalah lapisan-lapisan
infrastruktur kompleks yang **tidak dibutuhkan pengguna MVP**.

### Gap Fondasi yang Masih Kurang untuk Fitur Kritis

Hanya ada **satu gap teknis nyata** yang memblokir:
- `package-lock.json` tidak valid → build Docker tidak bisa berjalan

Semua gap lain (Appeal Banding, Liaison Officer, Custody Transfer) adalah
**fitur baru**, bukan prasyarat alur inti.

---

## 2. IDENTIFIKASI PEMBOROSAN — The "Fat" to Trim

### 🔴 Over-engineered untuk ukuran MVP (trim sekarang)

#### A. `GovernanceModule` — Legal Hold, Retention, Evidence Export, Access Review
**File:** `governance.service.ts`, `governance.controller.ts`
**Masalah:** Ini adalah fitur compliance-grade untuk sistem yang sudah
berjalan bertahun-tahun, bukan untuk pengguna pertama yang belum pernah
mencatat satu sidang pun secara elektronik.
- Legal hold maker-checker: dibutuhkan setelah ada data nyata untuk dihold
- Retention policy preview: dibutuhkan setelah sistem berumur > 1 tahun
- Evidence export dengan SHA-256 manifest: over-kill untuk pilot 3–5 sidang
- Access review campaign: dibutuhkan setelah ada ratusan user

**Rekomendasi:** Disable endpoint di router, sembunyikan menu dari UI.
Kode tetap ada, tidak perlu dihapus.

#### B. `ReconciliationModule` — Sinkronisasi dengan Sistem Resmi
**File:** `reconciliation.service.ts`, outbox handler `reconcile()`
**Masalah:** Reconciliation dengan sistem resmi (SIPP, e-Berpadu) dalam mode
MOCK tidak memberikan nilai apapun ke pengguna MVP. Gateway-nya pun MOCK.
Outbox worker menjalankan reconcile job yang hasilnya selalu "matched"
karena MOCK mengembalikan data yang sama persis.

**Rekomendasi:** Disable reconciliation endpoint. Hapus dari nav UI.
Fokus di fase ini: data CIMS adalah sumber kebenaran sementara.

#### C. `ZoomModule` (Admin panel Zoom) — Duplikasi fungsionalitas
**File:** `zoom.module.ts`, `zoom.controller.ts`
**Masalah:** Ada 2 cara provisioning ruang virtual — via
`VirtualSessionsModule` (yang benar, dengan semua gate) dan via `ZoomModule`
(admin panel langsung tanpa gate). Ini membingungkan dan berisiko bypass gate.

**Rekomendasi:** Hapus `/zoom` dari nav UI. Sembunyikan admin panel Zoom
dari pengguna akhir. Biarkan hanya `VirtualSessionsModule` yang diekspos.

#### D. `MigrationPage` dan `ReconciliationPage` di Frontend
**File:** `apps/web/src/app.tsx` — 17 menu items di sidebar!
**Masalah:** Pengguna MVP melihat 17 menu sekaligus: Migration, Reconciliation,
Operations, Zoom Provider, Governance — semua hal teknis yang tidak relevan
untuk panitera, jaksa, atau petugas pemasyarakatan.

**Rekomendasi:** Sembunyikan 6 menu teknis dari pengguna akhir.

#### E. Transactional Outbox + Worker Process untuk MVP Awal
**Masalah:** Outbox pattern dengan polling setiap 1 detik, claim batch,
dead-letter queue, circuit breaker, metrik — ini infrastruktur production-grade
yang over-engineered untuk 5–10 sidang uji coba pertama.

**Rekomendasi:** Untuk MVP local Docker, set `OUTBOX_WORKER_ENABLED=false`
di API dan jalankan worker terpisah hanya jika diperlukan. Atau gunakan mode
MEMORY yang sudah ada dan sudah berjalan sempurna.

---

### 🟡 Bisa Disederhanakan (simplify, jangan hapus)

#### F. `ProductionReadinessService` — 15 checks yang memblokir
**Masalah:** Sistem menjalankan 15 readiness checks dan mengembalikan 503
jika gagal. Di preproduction dengan DEV auth, banyak check yang selalu FAIL
(OIDC, PERSISTENCE_MODE, dll.) sehingga health/ready selalu NOT_READY.

**Rekomendasi:** Readiness probe hanya block jika DATABASE down. Semua lain
jadi WARNING, bukan FAIL. Ini sudah diimplementasi di H-08 tadi. ✅

#### G. Multiple authentication flows (OIDC + DEV)
**Masalah:** Ada `DevIdentityInterceptor` dengan 7 persona hardcoded. Sudah
cukup untuk MVP, tapi perlu dokumentasi yang jelas agar pengguna pilot tahu
cara pakai persona switcher.

---

## 3. WORKAROUND & SIMPLIFIKASI — Manual beats Automated for MVP

Berikut proses yang bisa disederhanakan tanpa kehilangan nilai inti:

| Proses Saat Ini (Kompleks) | Workaround MVP (Lebih Cepat) |
|---------------------------|------------------------------|
| Outbox → Notification Gateway HTTP → Provider eksternal | MOCK mode sudah cukup: log delivery ke console/DB, anggap "terkirim" |
| Reconciliation dengan SIPP/e-Berpadu via API | Manual: panitera input case number, CIMS hanya simpan sebagai referensi |
| Evidence export dengan SHA-256 + object storage | Audit log yang sudah ada sudah cukup sebagai bukti untuk pilot |
| Legal hold maker-checker dengan access review campaign | Manual: panitera senior review log secara langsung untuk pilot |
| Access Review KEEP/REVOKE campaign | Skip untuk pilot — review manual oleh admin |
| OIDC + KMS secrets | DEV mode + Docker secrets file sudah cukup untuk pilot internal |
| Appeal Decision Reading workflow | Manual: panitera input hasil pembacaan via form biasa (C-04 bisa defer ke post-MVP) |

---

## 4. REKOMENDASI SCOPE MVP — 7 Poin untuk Minggu Ini

### Checklist Final MVP — "Siap Diuji Pengguna Pertama"

- [ ] **MVP-1 · Selesaikan package-lock.json** *(0.5 hari, blocker teknis)*
  Jalankan `npm ci` dengan akses registry, commit hasilnya. Tanpa ini tidak
  ada yang bisa di-build atau di-deploy. **Tidak ada alternatif.**

- [ ] **MVP-2 · Docker preproduction berjalan end-to-end** *(1 hari)*
  ```bash
  bash scripts/setup-preproduction.sh
  docker compose -f infra/docker-compose.preproduction.yml up -d
  docker compose exec api node tools/migrate-postgres.mjs
  ```
  Validasi: `curl http://localhost:3000/health/ready` → `{"status":"READY"}`
  Validasi: buka `http://localhost:8080` → muncul UI.

- [ ] **MVP-3 · Sembunyikan 6 menu teknis dari sidebar** *(2 jam)*
  Hapus dari nav array di `app.tsx`:
  - `/reconciliation` (Rekonsiliasi)
  - `/operations` (Operasional)
  - `/governance` (Tata Kelola)
  - `/zoom` (Zoom Provider)
  - `/migration` (Migration)
  Sisakan 11 menu yang relevan untuk pengguna operasional.

- [ ] **MVP-4 · Buat "Panduan Pengguna Pilot" 1 halaman** *(0.5 hari)*
  Dokumen sederhana (PDF atau Markdown) yang menjelaskan:
  1. Cara ganti persona (court-clerk, judge, prosecutor, corrections)
  2. Urutan 7 langkah alur sidang elektronik di CIMS
  3. Siapa yang harus klik apa di setiap langkah
  4. Cara melaporkan bug/masukan
  Tanpa ini, pengguna pilot tidak tahu harus mulai dari mana.

- [ ] **MVP-5 · Satu skenario sidang demo selesai end-to-end** *(1 hari)*
  Lakukan dry-run lengkap di preproduction:
  1. Buat data perkara (Panitera Pengganti)
  2. Aktivasi data (Panitera)
  3. Catat penetapan hakim (Hakim)
  4. Buat dan approve jadwal (Panitera)
  5. Kirim pemberitahuan → acknowledgment (Penuntut Umum + Pemasyarakatan)
  6. Submit checklist kesiapan 3 instansi
  7. Provisioning ruang virtual
  8. Hakim buka → skors → tutup sidang
  Jika semua ini berhasil tanpa error, MVP siap untuk pengguna pertama.

- [ ] **MVP-6 · Disable endpoint yang belum siap** *(2 jam)*
  Tambah `@FeatureFlag('GOVERNANCE')` atau cukup return 501 di:
  - `POST /hearings/:id/governance/legal-holds`
  - `POST /hearings/:id/governance/evidence-exports`
  - `POST /governance/access-reviews`
  - `POST /hearings/:id/reconciliation`
  Alternatif paling cepat: cukup sembunyikan tombol di UI, endpoint tetap ada.

- [ ] **MVP-7 · Buat seed data 3 organisasi + 5 user demo** *(0.5 hari)*
  Saat ini seed data di `0001_demo_nonproduction.sql` mungkin sudah ada tapi
  perlu divalidasi. Pastikan ada:
  - 1 Pengadilan (court-demo), 1 Kejaksaan (prosecution-demo), 1 Rutan (corrections-demo)
  - User: panitera-pengganti, panitera, hakim, jaksa, petugas-rutan
  - 1 perkara demo dalam status DRAFT
  Tanpa seed data yang jelas, pilot pertama akan menghabiskan waktu setup,
  bukan testing.

---

## VISUALISASI PARETO: APA YANG MEMBERIKAN NILAI

```
Nilai untuk Pengguna MVP
│
100% ┤ ████████████████████████████████████
     │ ████████████████████████████████████
 80% ┤ ████████████████████████████████████
     │
     │                          ░░░░░░░░░░░░
 20% ┤                          ░░░░░░░░░░░░
     │                          ░░░░░░░░░░░░
  0% ┴────────────────────────────────────────
     7 fitur alur inti    10 fitur governance/
     (sudah jalan semua)  infrastruktur lanjutan
                          (defer ke v2.0)
```

---

## KEPUTUSAN FINAL

| Pertanyaan | Jawaban |
|-----------|---------|
| Apakah alur sidang elektronik inti sudah bisa berjalan? | **YA** — semua 7 langkah sudah implemented |
| Apa yang menghalangi rilis ke pengguna pertama? | `package-lock.json` + Docker setup + UI yang terlalu ramai |
| Berapa lama untuk MVP siap pilot? | **3–5 hari kerja** jika fokus hanya MVP-1 s/d MVP-7 |
| Apa yang harus TIDAK dikerjakan minggu ini? | Appeal Banding (C-04), Liaison Officer (C-05), Custody Transfer (C-06), Recording tabel, DLP |
| Apa risiko terbesar jika tetap menambah fitur? | Tidak ada yang diuji pengguna nyata, semua hypothetical |

---

## CATATAN UNTUK TIM

> **"A product that doesn't reach users has zero value, regardless of its quality."**
> — Eric Ries, The Lean Startup

Sistem CIMS sudah memiliki fondasi teknis yang sangat baik — domain logic
yang bersih, audit trail yang kuat, dan gate yang benar. Tapi nilai itu
baru terbukti ketika panitera, jaksa, dan petugas Rutan **sungguh-sungguh
menggunakannya** untuk satu sidang nyata.

**Fokus minggu ini:** bukan menambah fitur baru, tapi **memastikan 7 fitur
yang sudah ada bisa berjalan tanpa hambatan di tangan pengguna pertama.**

