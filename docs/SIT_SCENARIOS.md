# CIMS — System Integration Test (SIT) Scenarios

**Versi CIMS:** v0.20.0 MVP (Preproduction)  
**Lingkungan:** Local Docker Compose / Staging  
**Tanggal:** 26 Juli 2026

Dokumen ini ditujukan bagi tim QA dan DevOps untuk menguji ketahanan (resilience), integrasi sistem eksternal, performa latar belakang, dan lapisan keamanan infrastruktur CIMS sebelum diserahkan pada pengguna (UAT).

---

## 1. Infrastruktur & Konfigurasi (Health Checks)

| ID      | Deskripsi Tes              | Langkah Pengujian                                                                           | Kriteria Lulus (Expected Result)                                                                                                                |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| SIT-1.1 | Liveness & Readiness Probe | 1. `curl http://localhost:3000/health/live`<br>2. `curl http://localhost:3000/health/ready` | 1. Status 200 `{"status": "UP"}`<br>2. Status 200 `{"status": "UP", "decision": "GO"}` beserta daftar dependencies (postgres, circuit breakers) |
| SIT-1.2 | Docker Network & Services  | Jalankan `docker compose ps`                                                                | Semua kontainer (api, worker, web, minio, zoom, brevo) berstatus `Up (healthy)`.                                                                |

---

## 2. Penyimpanan Bukti & Object Storage (S3 / MinIO)

| ID      | Deskripsi Tes        | Langkah Pengujian                                                                                                                                                 | Kriteria Lulus (Expected Result)                                                                            |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| SIT-2.1 | Konektivitas Mode S3 | Cek log API Service di kontainer                                                                                                                                  | Tidak ada error `EVIDENCE_STORAGE_CONFIG_INVALID` saat inisialisasi awal.                                   |
| SIT-2.2 | Upload Bukti Dokumen | 1. Eksekusi publikasi _Petikan Putusan_ atau submit _Checklist Readiness_<br>2. Akses MinIO Console pada `http://localhost:9001` (login dengan `cims-admin-****`) | Bucket `cims-evidence` ada, dan di dalamnya terdapat _file object_ dengan metadata hash (x-content-sha256). |

---

## 3. Komunikasi Latar Belakang & Sinkronisasi (Worker & SSE)

| ID      | Deskripsi Tes                      | Langkah Pengujian                                                                                                                                                       | Kriteria Lulus (Expected Result)                                                                                                         |
| ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| SIT-3.1 | Transactional Outbox (Brevo Email) | 1. Buat Notifikasi pada sistem (Pastikan `BREVO_API_KEY` terisi) dan tekan "Kirim".<br>2. Buka dashboard Brevo / Mailcatcher.                                           | 1. Worker akan mengklaim tugas dari tabel `outbox_events`.<br>2. Email dengan isi template notifikasi berhasil terkirim.                 |
| SIT-3.2 | Real-time SSE Streams              | 1. Login sebagai `court-clerk` pada Browser A (biarkan di tab "Pemberitahuan").<br>2. Login sebagai `prosecutor` di Browser B dan klik "Acknowledge" salah satu Notice. | Daftar pemberitahuan pada Browser A _ter-refresh_ otomatis (indikator loading kilat) tanpa perlu di F5. Notifikasi Toast mungkin muncul. |

---

## 4. Integritas Data & Keamanan (MFA & HMAC)

| ID      | Deskripsi Tes                      | Langkah Pengujian                                                                                                                               | Kriteria Lulus (Expected Result)                                                                                                  |
| ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| SIT-4.1 | Verifikasi Rantai HMAC Audit       | 1. Buka halaman `/audit`.<br>2. Perhatikan banner status verifikasi di bagian atas halaman.                                                     | Banner berwarna hijau "Integritas Rantai Audit Valid". Jumlah log sesuai dengan tindakan mutasi di database.                      |
| SIT-4.2 | Simulasi Manipulasi DB             | Buka CLI PostgreSQL dan paksa ubah salah satu _payload_ (atau hash) `hearing_control_events`. Refresh halaman `/audit`.                         | Banner merah "Peringatan Integritas Audit: Terjadi Kerusakan/Manipulasi Data" dan menampilkan _sequence_ (sekuens) yang rusak.    |
| SIT-4.3 | Sensitve Endpoint Rate Limit (DLP) | Refresh terus-menerus (F5 bertubi-tubi) pada halaman `/admin` (Template List) atau `/compliance-dashboard` lebih dari 15-30 kali dalam semenit. | Sistem mengembalikan `HTTP 429 Too Many Requests` "Terlalu banyak akses ke endpoint sensitif".                                    |
| SIT-4.4 | MFA Enforcement                    | Bypass `AUTH_MODE=OIDC` dengan mengirim JWT statis untuk role `JUDGE` (Hakim) tanpa memuat claim `amr: ['mfa']` atau `acr: '2'`.                | API mengembalikan `HTTP 401 UnauthorizedException` dengan pesan "MFA_REQUIRED: Multi-Factor Authentication is strictly required". |

---

## 5. Gateway Eksternal & Circuit Breaker

| ID      | Deskripsi Tes               | Langkah Pengujian                                                                                         | Kriteria Lulus (Expected Result)                                                                                                                                                 |
| ------- | --------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SIT-5.1 | Zoom Timeout & Circuit Open | 1. Stop service `zoom-provider` (`docker stop`).<br>2. Coba Generate Virtual Room (Provisioning) di CIMS. | Setelah beberapa kegagalan/timeout, `health/ready` akan menunjukkan Circuit Breaker "OPEN" untuk dependency `video-provider`. Sistem mengembalikan error `PROVIDER_UNAVAILABLE`. |
| SIT-5.2 | Mock Mismatch SIPP          | Masukkan "mismatch-1" di Hearing Intake lalu coba Rekonsiliasi.                                           | Pekerja akan mensimulasikan kegagalan komparasi dan menampilkan perbandingan _side-by-side_ di UI secara deterministik.                                                          |
