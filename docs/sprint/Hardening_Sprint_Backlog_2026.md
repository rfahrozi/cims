# CIMS Hardening Sprint Backlog: Resilience & Concurrency
**Tujuan Sprint:** Mengubah CIMS dari sistem yang sekadar *feature-complete* (lulus edge-case secara fungsional) menjadi sistem yang *production-ready* dan tahan banting terhadap beban tinggi (*concurrency*) serta kegagalan dependensi eksternal (*chaos*).

---

## Rincian Task Per Item

### BE-01 — Observability per-route dan per-dependency
**Deskripsi:** Tambahkan logging terstruktur dan metrik dasar di seluruh request lifecycle, terutama untuk endpoint kritis.
**Cakupan minimum:**
- `requestId`, `hearingId`, `participantId`, `orgId`, route, method, status
- Durasi total request
- Nama exception dan stack ringkas
- Dependency call summary (DB, provider video, notification)
- Hasil auth/guard bila relevan
- Pemisahan timeout vs business rejection

**Acceptance criteria:**
- Setiap 5xx bisa ditelusuri ke route dan exception class.
- Log membedakan error domain vs error infrastruktur.
- Instrumentasi terpasang di endpoint kritis: `/virtual-session/provision`, `/join-token`, `/exchange`, dan `/runtime`.

### BE-02 — Idempotency dan atomicity virtual-session/provision
**Deskripsi:** Lindungi endpoint dari duplikasi akibat request paralel (*double provisioning*).
**Implementasi:**
- Gunakan *idempotency key* atau `requestId`.
- Terapkan *unique constraint* atau *uniqueness policy* per `hearingId`.
- Pengecekan dan commit state secara atomik.

**Acceptance criteria:**
- 20 request paralel untuk `hearingId` yang sama hanya menghasilkan maksimal 1 sesi aktif (respons: 201), sisa request mendapat existing result (200) atau 409 Conflict.
- Tidak ada orphan record/partial row saat provider eksternal gagal.

### BE-03 — Atomic consume untuk join-token
**Deskripsi:** Pastikan token hanya bisa dipakai sekali di bawah balapan request (*race condition*).
**Implementasi:**
- Simpan token dalam bentuk hash.
- Gunakan update atomik satu langkah (jangan pola "cek dulu, update nanti").
- Token expired/reused harus mengembalikan error domain (bukan 500).

**Acceptance criteria:**
- Dua request paralel untuk token yang sama menghasilkan tepat satu sukses.
- Replay token selalu ditolak (4xx).
- Tidak ada kondisi multi-login dari satu token tunggal.

### BE-04 — Audit transaction boundary
**Deskripsi:** Pastikan transaksi database tidak membungkus *external network call* (contoh: panggilan API Zoom di dalam blok transaksi aktif).
**Hal yang harus diperiksa:**
- Provisioning session
- Issue/exchange join token
- Notices/send
- Reconciliation run
- Runtime state changes

**Acceptance criteria:**
- Tidak ada external HTTP call di dalam transaksi DB terbuka.
- Transaction duration dan timeout/lock count menurun saat load test.
- Boundary tegas antara domain write dan external side effect.

### BE-05 — Tuning DB pool dan lifecycle ORM
**Deskripsi:** Audit konfigurasi pool, connection timeout, query timeout, dan instansiasi ORM client (menjawab tingginya 5xx saat load-test).

**Acceptance criteria:**
- Client ORM tidak dibuat berulang secara liar per-request.
- Pool memiliki *max size* dan *timeout* yang eksplisit.
- Load test 50 VUs tidak menghasilkan spike 5xx karena kehabisan koneksi.

### BE-06 — Timeout budget dan circuit breaker provider
**Deskripsi:** Lindungi API utama dari lambat atau matinya layanan pihak ketiga (Video Provider).
**Implementasi:**
- Timeout eksplisit (budget response time).
- Circuit breaker untuk failure beruntun.
- Pola *fast-fail* 503 Service Unavailable.

**Acceptance criteria:**
- Saat provider mati, endpoint `/provision` tidak menggantung.
- Error yang muncul berstatus 503 (atau custom domain error), bukan 500 generik.
- Logging jelas terkait state *open/half-open/closed*.

### BE-07 — Error taxonomy
**Deskripsi:** Bersihkan klasifikasi error supaya monitoring dan tim on-call tidak buta.
**Pemetaan:**
- `409` untuk conflict/idempotency.
- `422` untuk payload valid format tapi langgar aturan bisnis.
- `429` untuk overload/rate limiting.
- `503` untuk dependency unavailable.
- `500` *Hanya* untuk bug tak terduga.

**Acceptance criteria:**
- Error beban tinggi ter-log sebagai 429 atau 503, meminimalisir 500.

---

### QA & INFRA Tasks
* **QA-01:** Breakdown load test per endpoint. (Memilah metrik per route dan read vs side-effect).
* **QA-02:** Regression concurrency tests. (Automated tests tajam spesifik untuk race condition utama, harus lulus di CI).
* **INF-01:** Dashboard metrik dasar. (5xx per route, DB connections/timeout, provider timeout, event loop lag).

---

## Target Metrik Hardening Sprint
| Metrik | Baseline saat ini (Sprint 0) | Target Hardening Sprint |
| --- | --- | --- |
| Proporsi 5xx saat load test | > 60% (Sangat Tinggi) | < 1%–3% |
| p95 latency route read | ~4 ms (Sangat Rendah) | tetap < 300 ms |
| p95 latency route side effect | Belum Stabil (Gagal) | < 1000 ms |
| Duplicate virtual session | Berisiko Tinggi | 0 (Nol) |
| Double join-token exchange | Berisiko Tinggi | 0 (Nol) |
| Controlled dependency failure | Parsial / Lemah | 100% route kritis fail-fast (503/409) |

---

## Definition of Done (DoD)
Sprint ini dianggap selesai jika:
1. Load test ulang pada 50 VUs menunjukkan penurunan signifikan 5xx (<3%).
2. *Duplicate virtual-session* terbukti tidak terjadi pada hit paralel.
3. *Join-token* single-use anti-race condition.
4. Provider failure (mati/down) ter-handle dengan 503 *fail-fast* (tidak hang/timeout berkepanjangan).
5. Dashboard & instrumentasi mencukupi untuk RCA di bawah 10 menit.
