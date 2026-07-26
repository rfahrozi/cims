# CIMS (Court Intelligence Management System)

**Versi:** v0.20.0 MVP (Preproduction Baseline)

Sistem Koordinasi Persidangan Pidana Elektronik Lintas Instansi (Pengadilan, Kejaksaan, dan Pemasyarakatan) yang mengedepankan **Compliance-First Architecture**. Sistem ini tidak menggantikan register resmi perkara (SIPP / e-Berpadu), melainkan bertindak sebagai **lapisan orkestrasi dan koordinasi** untuk operasional sidang virtual.

Sistem ini didesain 100% mematuhi **SOP/CIMS/PPE/001/2026**.

## ⚖️ Prinsip Dasar & Arsitektur

- **Domain-Driven Design (DDD):** Aturan hukum dan _gate_ alur kerja diisolasi di `packages/domain`, terpisah dari implementasi _framework_.
- **Compliance & Hard Gates:** Penyediaan ruang virtual Zoom **TIDAK MUNGKIN** dilakukan jika Penetapan Hakim (`APPROVED`), Jadwal, Bukti Pemberitahuan, dan Ceklist Kesiapan dari ketiga instansi belum terpenuhi.
- **Immutable Audit Trail:** Setiap aksi dicatat menggunakan rantai HMAC (_blockchain-lite_) yang tidak dapat diubah oleh _sysadmin_ sekalipun, memastikan akuntabilitas (M-13).
- **Transactional Outbox:** Menjamin notifikasi (Email, WA, dll) dan sinkronisasi lintas-sistem selalu terkirim, tahan terhadap _downtime_ pihak ketiga.
- **Role-Based & Attribute-Based Access Control (RBAC & ABAC):** Keamanan otorisasi ketat hingga ke tingkat perkara. Hak akses dibatasi per pengadilan, kejaksaan, dan rutan.
- **Provider-Agnostic Video:** Arsitektur modular yang memfasilitasi penggantian Zoom dengan WebEx atau provider mandiri pengadilan.

## 🚀 Fitur Utama (v0.20.0 MVP)

- **Alur 7-Langkah Sidang Elektronik:** Data Perkara → Penetapan Hakim → Jadwal → Pemberitahuan Ber-SLA → Kesiapan Instansi → Ruang Virtual → Kontrol Sidang.
- **Dashboard Per-Peran:** UI/UX khusus untuk Hakim, Panitera, Penuntut Umum, dan Petugas Pemasyarakatan dengan _Empty States_ & panduan (Agile/Lean UX).
- **Modul Putusan Banding (SOP 10.15):** Eksekusi pembacaan putusan di Pengadilan Tinggi, publikasi _same-day_, dan transmisi berkas 7-hari.
- **Pejabat Penghubung / Liaison Officer (SOP 7 & 8):** Manajemen pendelegasian, komunikasi, dan eskalasi hambatan persidangan.
- **Mutasi Tahanan & Perlindungan Saksi (SOP 10.14 & 10.9):** Integrasi alur pengalihan akses lokasi terdakwa, serta _auto-masking_ identitas untuk advokat/saksi rentan.
- **Konsultasi Privat (SOP 10.8):** Enforced _No-Recording Policy_ dan pemisahan _Breakout Room_ otomatis.

---

## 🛠️ Stack Teknologi

- **Backend:** Node.js (v22), NestJS, Fastify, TypeScript.
- **Frontend:** React, Vite, Tailwind CSS v4, Radix UI, shadcn/ui.
- **Database:** PostgreSQL 17 (dengan Row-Level Security).
- **Identity:** OIDC / Keycloak (dengan fallback Header HTTP via `AUTH_MODE=DEV`).
- **Monorepo:** npm workspaces (`apps/api`, `apps/web`, `services/zoom-provider`, `packages/domain`).

---

## 🐳 Menjalankan Local Preproduction (Docker)

Semua layanan dapat dijalankan dalam _Local Docker_ yang meniru lingkungan _Production_.

### 1. Inisialisasi Secrets Lokal

Jalankan skrip berikut untuk membuat kredensial, enkripsi kunci, dan parameter keamanan ke direktori `infra/secrets`. Direktori ini dikecualikan dari _git_.

```bash
bash scripts/setup-preproduction.sh
```

### 2. Jalankan Container

Sistem di-_build_ dengan mode _Multi-stage_ yang menghasilkan _image_ `alpine` berukuran sangat kecil tanpa menyertakan `node_modules` _development_.

```bash
# Pastikan dependency tervalidasi bersih
npm ci
npm run build

# Bangun container & jalankan (API, Web Nginx, Worker, Zoom-Provider, PostgreSQL)
docker compose -f infra/docker-compose.preproduction.yml up --build -d
```

### 3. Migrasi Schema & Seeding Data

Suntikkan tabel-tabel PostgreSQL dan masukkan data percobaan (_3 organisasi, 3 perkara demo_).

```bash
docker compose -f infra/docker-compose.preproduction.yml exec api node tools/migrate-postgres.mjs
```

### 4. Akses Aplikasi

- **Frontend Web UI:** [http://localhost:8080](http://localhost:8080)
- **API & Swagger UI:** [http://localhost:3000/docs](http://localhost:3000/docs)

_(Tip: Gunakan **Persona Switcher** di sidebar kiri bawah UI Web untuk mensimulasikan login sebagai Panitera, Hakim, atau Jaksa)._

---

## 🧪 Validasi Kepatuhan & Pengujian

Sebelum merilis _Pull Request_ atau _Deploy_ ke _Production_, selalu jalankan _test suite_ yang memvalidasi _Domain Logic_ (_Gate_, _Conflict Detection_, HMAC).

```bash
# Uji Test Driven Development pada rule hukum
npm run test:domain

# Typechecking seluruh Monorepo
npm run typecheck

# Cek kelayakan Production Baseline (SOP Compliance Checker)
npm run check:phase6
```

## ⚠️ Transisi Menuju Production

Lingkungan _Production_ dan _Real Case Data_ **TIDAK DIIZINKAN** (_NO-GO_) hingga:

1. Skema peran OIDC (`OIDC_ISSUER`) dan _Role Mapping_ (`CIMS_ROLES`) dikonfigurasi melalui Identity Provider eksternal.
2. _Secret Keys_ KMS/HSM (Vault) menggantikan file teks lokal `/run/secrets`.
3. Koneksi API ke _Gateway Notifikasi Resmi_ (SIPP/e-Berpadu) tersedia dan SSL dipaksakan `DB_SSL=true`.
4. Uji Coba Lintas Instansi (UAT) selesai diotorisasi oleh pejabat _Liaison_.

--
🤖 _Dibangun & diaudit secara kolaboratif menggunakan metodologi Lean MVP._
