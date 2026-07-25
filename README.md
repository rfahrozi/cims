# CIMS (Court Intelligence Management System) 
**Versi:** v0.20.0 MVP (Preproduction Baseline)

Sistem Koordinasi Persidangan Pidana Elektronik Lintas Instansi (Pengadilan, Kejaksaan, dan Pemasyarakatan) yang mengedepankan **Compliance-First Architecture**. Sistem ini tidak menggantikan register resmi perkara (SIPP / e-Berpadu), melainkan bertindak sebagai **lapisan orkestrasi dan koordinasi** untuk operasional sidang virtual.

Sistem ini didesain 100% mematuhi **SOP/CIMS/PPE/001/2026**.

## ⚖️ Prinsip Dasar & Arsitektur
*   **Domain-Driven Design (DDD):** Aturan hukum dan *gate* alur kerja diisolasi di `packages/domain`, terpisah dari implementasi *framework*.
*   **Compliance & Hard Gates:** Penyediaan ruang virtual Zoom **TIDAK MUNGKIN** dilakukan jika Penetapan Hakim (`APPROVED`), Jadwal, Bukti Pemberitahuan, dan Ceklist Kesiapan dari ketiga instansi belum terpenuhi.
*   **Immutable Audit Trail:** Setiap aksi dicatat menggunakan rantai HMAC (*blockchain-lite*) yang tidak dapat diubah oleh *sysadmin* sekalipun, memastikan akuntabilitas (M-13).
*   **Transactional Outbox:** Menjamin notifikasi (Email, WA, dll) dan sinkronisasi lintas-sistem selalu terkirim, tahan terhadap *downtime* pihak ketiga.
*   **Role-Based & Attribute-Based Access Control (RBAC & ABAC):** Keamanan otorisasi ketat hingga ke tingkat perkara. Hak akses dibatasi per pengadilan, kejaksaan, dan rutan.
*   **Provider-Agnostic Video:** Arsitektur modular yang memfasilitasi penggantian Zoom dengan WebEx atau provider mandiri pengadilan.

## 🚀 Fitur Utama (v0.20.0 MVP)
*   **Alur 7-Langkah Sidang Elektronik:** Data Perkara → Penetapan Hakim → Jadwal → Pemberitahuan Ber-SLA → Kesiapan Instansi → Ruang Virtual → Kontrol Sidang.
*   **Dashboard Per-Peran:** UI/UX khusus untuk Hakim, Panitera, Penuntut Umum, dan Petugas Pemasyarakatan dengan *Empty States* & panduan (Agile/Lean UX).
*   **Modul Putusan Banding (SOP 10.15):** Eksekusi pembacaan putusan di Pengadilan Tinggi, publikasi *same-day*, dan transmisi berkas 7-hari.
*   **Pejabat Penghubung / Liaison Officer (SOP 7 & 8):** Manajemen pendelegasian, komunikasi, dan eskalasi hambatan persidangan.
*   **Mutasi Tahanan & Perlindungan Saksi (SOP 10.14 & 10.9):** Integrasi alur pengalihan akses lokasi terdakwa, serta *auto-masking* identitas untuk advokat/saksi rentan.
*   **Konsultasi Privat (SOP 10.8):** Enforced *No-Recording Policy* dan pemisahan *Breakout Room* otomatis.

---

## 🛠️ Stack Teknologi
*   **Backend:** Node.js (v22), NestJS, Fastify, TypeScript.
*   **Frontend:** React, Vite, Tailwind CSS v4, Radix UI, shadcn/ui.
*   **Database:** PostgreSQL 17 (dengan Row-Level Security).
*   **Identity:** OIDC / Keycloak (dengan fallback Header HTTP via `AUTH_MODE=DEV`).
*   **Monorepo:** npm workspaces (`apps/api`, `apps/web`, `services/zoom-provider`, `packages/domain`).

---

## 🐳 Menjalankan Local Preproduction (Docker)

Semua layanan dapat dijalankan dalam _Local Docker_ yang meniru lingkungan *Production*.

### 1. Inisialisasi Secrets Lokal
Jalankan skrip berikut untuk membuat kredensial, enkripsi kunci, dan parameter keamanan ke direktori `infra/secrets`. Direktori ini dikecualikan dari *git*.
```bash
bash scripts/setup-preproduction.sh
```

### 2. Jalankan Container
Sistem di-*build* dengan mode *Multi-stage* yang menghasilkan *image* `alpine` berukuran sangat kecil tanpa menyertakan `node_modules` *development*.
```bash
# Pastikan dependency tervalidasi bersih
npm ci
npm run build

# Bangun container & jalankan (API, Web Nginx, Worker, Zoom-Provider, PostgreSQL)
docker compose -f infra/docker-compose.preproduction.yml up --build -d
```

### 3. Migrasi Schema & Seeding Data
Suntikkan tabel-tabel PostgreSQL dan masukkan data percobaan (*3 organisasi, 3 perkara demo*).
```bash
docker compose -f infra/docker-compose.preproduction.yml exec api node tools/migrate-postgres.mjs
```

### 4. Akses Aplikasi
*   **Frontend Web UI:** [http://localhost:8080](http://localhost:8080)
*   **API & Swagger UI:** [http://localhost:3000/docs](http://localhost:3000/docs)

*(Tip: Gunakan **Persona Switcher** di sidebar kiri bawah UI Web untuk mensimulasikan login sebagai Panitera, Hakim, atau Jaksa).*

---

## 🧪 Validasi Kepatuhan & Pengujian

Sebelum merilis *Pull Request* atau *Deploy* ke _Production_, selalu jalankan *test suite* yang memvalidasi *Domain Logic* (*Gate*, *Conflict Detection*, HMAC).

```bash
# Uji Test Driven Development pada rule hukum
npm run test:domain

# Typechecking seluruh Monorepo
npm run typecheck

# Cek kelayakan Production Baseline (SOP Compliance Checker)
npm run check:phase6
```

## ⚠️ Transisi Menuju Production
Lingkungan *Production* dan *Real Case Data* **TIDAK DIIZINKAN** (*NO-GO*) hingga:
1. Skema peran OIDC (`OIDC_ISSUER`) dan *Role Mapping* (`CIMS_ROLES`) dikonfigurasi melalui Identity Provider eksternal.
2. *Secret Keys* KMS/HSM (Vault) menggantikan file teks lokal `/run/secrets`.
3. Koneksi API ke *Gateway Notifikasi Resmi* (SIPP/e-Berpadu) tersedia dan SSL dipaksakan `DB_SSL=true`.
4. Uji Coba Lintas Instansi (UAT) selesai diotorisasi oleh pejabat *Liaison*.

--
🤖 *Dibangun & diaudit secara kolaboratif menggunakan metodologi Lean MVP.*