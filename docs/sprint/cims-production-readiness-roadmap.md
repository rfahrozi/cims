# CIMS Production Readiness Roadmap

**Tujuan:** Memandu transisi CIMS dari status _Feature Complete (MVP)_ menuju _Production Ready_ dengan fokus pada ketahanan sistem (Resilience), keamanan (Security), dan stabilitas operasi (Ops).

---

## Tahap 1: Hardening & Concurrency (Sprint X)

**Fokus:** Menangani temuan kritis dari _Load Test_ dan _Chaos Probe_.

- **[BE-05] DB Connection Pool Optimization:** Audit inisialisasi ORM, pastikan _singleton_, set _max connections_, dan _timeout_ yang masuk akal.
- **[BE-04] Transaction Boundaries:** Pisahkan panggilan API eksternal (Zoom) dari blok transaksi database (hindari _lock_ panjang).
- **[BE-02 & BE-03] Atomicity:** Implementasi mekanisme antrean atau _lock_ (misal: Redis lock) untuk mencegah _double provisioning_ dan penggunaan ganda _join token_.
- **[BE-06] Circuit Breaker:** Implementasi _Circuit Breaker_ (misal: _Opossum_ atau polifil NestJS) pada adapter Video Provider untuk mewujudkan _fail-fast_.
- **[QA-01 & QA-02] Validation:** Jalankan ulang skenario uji `tests/cims_load_mix.js` dan pastikan metrik _Failure Rate_ < 3%.

## Tahap 2: Observability & Error Taxonomy (Sprint Y)

**Fokus:** Memberikan visibilitas penuh kepada tim operasional.

- **[BE-01] Structured Logging:** Tambahkan log berformat JSON yang menyertakan `correlationId`, durasi, dan nama rute.
- **[BE-07] Error Standardization:** Refaktor Global Exception Filter agar 500 generik terkonversi menjadi 429 (Rate Limit) atau 503 (Dependency Down) dengan payload yang jelas.
- **[INF-01] Monitoring Dashboards:** Setup dasbor Grafana (atau setara) untuk memantau metrik HTTP (Prometheus) dan kesehatan _event loop_ Node.js.

## Tahap 3: Security & Compliance (Sprint Z)

**Fokus:** Memenuhi standar keamanan instansi peradilan.

- **[SEC-01] Penetration Testing Prep:** Pastikan seluruh payload tervalidasi (XSS/SQLi prevention).
- **[SEC-02] Token Security:** Review masa berlaku JWT, _rotation_, dan mekanisme pencabutan (revocation) bila terjadi kompromi.
- **[SEC-03] Audit Trails:** Pastikan semua perubahan _state_ penting memicu _event_ audit yang tidak bisa diubah (_immutable_).

## Tahap 4: Pre-Production & SIT (System Integration Testing)

**Fokus:** Gladi bersih dengan lingkungan yang mendekati produksi.

- **[OPS-01] Data Seeding & Migration:** Skrip migrasi teruji.
- **[OPS-02] Chaos SIT:** Jalankan ulang skenario _Chaos Probe_ (matikan DB dan provider video secara real-time) dalam _environment_ SIT.
- **[OPS-03] Sign-off:** Persetujuan akhir dari _Architect_, _Security_, dan _Product Owner_.
