# CIMS Production Readiness Roadmap
**Tujuan:** Memandu transisi CIMS dari status *Feature Complete (MVP)* menuju *Production Ready* dengan fokus pada ketahanan sistem (Resilience), keamanan (Security), dan stabilitas operasi (Ops).

---

## Tahap 1: Hardening & Concurrency (Sprint X)
**Fokus:** Menangani temuan kritis dari *Load Test* dan *Chaos Probe*.

*   **[BE-05] DB Connection Pool Optimization:** Audit inisialisasi ORM, pastikan *singleton*, set *max connections*, dan *timeout* yang masuk akal.
*   **[BE-04] Transaction Boundaries:** Pisahkan panggilan API eksternal (Zoom) dari blok transaksi database (hindari *lock* panjang).
*   **[BE-02 & BE-03] Atomicity:** Implementasi mekanisme antrean atau *lock* (misal: Redis lock) untuk mencegah *double provisioning* dan penggunaan ganda *join token*.
*   **[BE-06] Circuit Breaker:** Implementasi *Circuit Breaker* (misal: *Opossum* atau polifil NestJS) pada adapter Video Provider untuk mewujudkan *fail-fast*.
*   **[QA-01 & QA-02] Validation:** Jalankan ulang skenario uji `tests/cims_load_mix.js` dan pastikan metrik *Failure Rate* < 3%.

## Tahap 2: Observability & Error Taxonomy (Sprint Y)
**Fokus:** Memberikan visibilitas penuh kepada tim operasional.

*   **[BE-01] Structured Logging:** Tambahkan log berformat JSON yang menyertakan `correlationId`, durasi, dan nama rute.
*   **[BE-07] Error Standardization:** Refaktor Global Exception Filter agar 500 generik terkonversi menjadi 429 (Rate Limit) atau 503 (Dependency Down) dengan payload yang jelas.
*   **[INF-01] Monitoring Dashboards:** Setup dasbor Grafana (atau setara) untuk memantau metrik HTTP (Prometheus) dan kesehatan *event loop* Node.js.

## Tahap 3: Security & Compliance (Sprint Z)
**Fokus:** Memenuhi standar keamanan instansi peradilan.

*   **[SEC-01] Penetration Testing Prep:** Pastikan seluruh payload tervalidasi (XSS/SQLi prevention).
*   **[SEC-02] Token Security:** Review masa berlaku JWT, *rotation*, dan mekanisme pencabutan (revocation) bila terjadi kompromi.
*   **[SEC-03] Audit Trails:** Pastikan semua perubahan *state* penting memicu _event_ audit yang tidak bisa diubah (*immutable*).

## Tahap 4: Pre-Production & SIT (System Integration Testing)
**Fokus:** Gladi bersih dengan lingkungan yang mendekati produksi.

*   **[OPS-01] Data Seeding & Migration:** Skrip migrasi teruji.
*   **[OPS-02] Chaos SIT:** Jalankan ulang skenario *Chaos Probe* (matikan DB dan provider video secara real-time) dalam *environment* SIT.
*   **[OPS-03] Sign-off:** Persetujuan akhir dari *Architect*, *Security*, dan *Product Owner*.
