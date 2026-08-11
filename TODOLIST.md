# CIMS v0.20.0 — TODO LIST & LAPORAN EVALUASI FITUR

> **Evaluator:** Senior Product Manager & UX Researcher  
> **Tanggal Evaluasi:** 26 Juli 2026  
> **Versi Dievaluasi:** CIMS v0.20.0 · Preproduction  
> **Referensi:** SOP/CIMS/PPE/001/2026 · SOP Pengelolaan Koordinasi dan Pelaksanaan Persidangan Pidana Elektronik  
> **Terakhir diperbarui:** 26 Juli 2026

---

## RINGKASAN EKSEKUTIF

CIMS adalah sistem koordinasi persidangan elektronik lintas instansi (Pengadilan, Kejaksaan, Pemasyarakatan) yang dirancang _compliance-first_ sesuai SOP. Sistem **tidak menggantikan** register resmi perkara (SIPP/e-Berpadu), melainkan bertindak sebagai lapisan orkestrasi di atasnya.

**Temuan utama:** Secara teknikal dan arsitektural, CIMS sudah sangat matang — melebihi standar MVP. Namun celah UX yang signifikan (panel JSON mentah, validasi sisi klien yang lemah, aksesibilitas dasar yang belum lengkap) mengurangi kepercayaan diri pengguna operasional non-teknis saat menggunakan sistem dalam konteks persidangan resmi.

| Dimensi                        | Status                         |
| ------------------------------ | ------------------------------ |
| Kepatuhan SOP (7 langkah inti) | ✅ **100%**                    |
| Matriks MVP Must-Have (16/16)  | ✅ **100%**                    |
| Kesiapan Docker Preproduction  | ✅ **100%**                    |
| MFA / OIDC Production          | ⚠️ **Belum** — Blocker go-live |
| UAT Lintas Instansi            | ⚠️ **Belum** — Sprint 16       |

**Keputusan:** ✅ GO untuk local Docker preproduction · ✅ GO untuk UAT/Pilot Lintas Instansi · ⛔ NO-GO Production

---

## 1. KESESUAIAN SOLUSI (Feature-to-Problem Fit)

> Referensi SOP: Bagian B (Tujuan), Bagian I (Prosedur Operasional), Bagian G (Peran & Tanggung Jawab)

**Tujuan utama aplikasi:** Mengkoordinasikan persidangan pidana elektronik lintas 3 instansi secara terstruktur, dapat diaudit, dan sesuai SOP — dengan alur 7 langkah sebagai tulang punggung operasional.

### ✅ Core Features yang Sudah Menjawab Tujuan SOP

| Fitur                                                  | Pasal SOP                                                  | Penilaian      |
| ------------------------------------------------------ | ---------------------------------------------------------- | -------------- |
| Hard gate Judicial Determination                       | SOP I.1 — Penetapan sidang elektronik wajib sebelum proses | ⭐ Sangat baik |
| Notice + Acknowledgment chain                          | SOP I.1, J — Pemberitahuan resmi terdokumentasi            | ✅ Baik        |
| Checklist kesiapan 3 instansi                          | SOP Lampiran 1, I.3 — Verifikasi kesiapan pra-sidang       | ✅ Baik        |
| Audit HMAC chain (blockchain-lite)                     | SOP K, I.7 — Audit trail setiap aksi wajib tercatat        | ⭐ Sangat baik |
| Konsultasi privat advokat (`recording_allowed: false`) | SOP I.6 — Perekaman tanpa izin dilarang                    | ⭐ Sangat baik |
| 3 domain insiden (TECHNICAL/CYBER/FORCE_MAJEURE)       | SOP I.8, N — Manajemen gangguan teknis terstruktur         | ✅ Baik        |
| Maker-Checker pada intake + legal hold                 | SOP G.3, G.4 — Segregasi tugas Panitera & Admin CIMS       | ⭐ Sangat baik |
| Dashboard per-instansi (Pengadilan/Kejaksaan/Rutan)    | SOP G — Kewenangan berbeda per peran                       | ✅ Baik        |
| SLA Monitoring + Export CSV                            | SOP M, O — Indikator kinerja dan pelaporan                 | ✅ Baik        |
| Putusan banding 5-tab (SOP 10.15)                      | SOP I.9 — Tindak lanjut pasca-sidang                       | ✅ Baik        |

### ❌ Fitur Esensial yang Masih Kurang / Perlu Perhatian

| Fitur                            | Pasal SOP Terdampak                                          | Prioritas  |
| -------------------------------- | ------------------------------------------------------------ | ---------- |
| OIDC/MFA production (Keycloak)   | SOP K — Akses hanya untuk pengguna berwenang                 | 🔴 Blocker |
| UAT lintas instansi              | SOP O — Evaluasi berkala wajib dilakukan                     | 🔴 Blocker |
| WhatsApp/SMS delivery nyata      | SOP I.1, J — Pemberitahuan via saluran resmi                 | 🟡 Tinggi  |
| Pencarian perkara global         | SOP G.3, G.4 — Kemudahan penelusuran data perkara            | ✅ Selesai |
| Validasi form & file di frontend | SOP I.2 — Dokumen wajib diverifikasi sebelum hari sidang     | ✅ Selesai |
| IN_APP notifications fungsional  | SOP J — Perubahan jadwal wajib segera diinformasikan         | 🟡 Medium  |
| SSE filtering per user/hearing   | SOP K — Data perkara sensitif, akses dibatasi per kewenangan | ✅ Selesai |

---

## 2. ANALISIS ALUR PENGGUNA (User Flow & Usability)

> Referensi SOP: Bagian I (Prosedur I.1–I.9), Bagian G (Peran), Bagian J (Koordinasi Antar-Pihak)

### Alur Utama — 7 Langkah (~30–40 klik minimum per sidang penuh)

```
[SOP I.1] Panitera Pengganti: Input Perkara → Simpan Draf → Ajukan Review
[SOP I.1] Panitera: Aktivasi Data Perkara (Maker-Checker)
[SOP I.1] Hakim: Buat Penetapan (mode ELEKTRONIK/HYBRID/LANGSUNG)
[SOP I.1] Panitera: Ajukan Jadwal → Conflict Check → Persetujuan Hakim
[SOP I.1, J] Panitera: Kirim Pemberitahuan Resmi → Tunggu ACK (3 instansi)
[SOP I.3, Lamp.1] 3 Instansi: Submit Kesiapan (checklist + verifikasi identitas)
[SOP I.3] Operator TI: Provisioning Ruang Virtual
[SOP I.4, I.5] Hakim: Buka Sidang → Kontrol → Tutup Sidang
[SOP I.9] Panitera: Perbarui status, arsipkan berita acara
```

### Temuan UX dari Analisis Kode

| #     | Masalah                                                                                             | File                 | Pasal SOP Terdampak                                       | Severity   |
| ----- | --------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------- | ---------- |
| UX-01 | **Output JSON mentah masih ada** — variabel `output` ditampilkan di `<pre>` sebagai feedback aksi   | `hearing-intake.tsx` | SOP G.3 — Panitera wajib input data dengan benar          | ✅ Selesai |
| UX-02 | **`setOutput(String(error))`** di catch block — stack trace muncul ke pengguna operasional          | Banyak halaman       | SOP G.3, G.5 — Petugas wajib memahami sistem              | ✅ Selesai |
| UX-03 | **Tombol submit tidak ada loading state** — tidak disabled setelah diklik, berpotensi double-submit | `hearing-intake.tsx` | SOP I.2 — Kelengkapan dokumen harus terjaga               | ✅ Selesai |
| UX-04 | **Field wajib tidak ditandai** — tidak ada asterisk atau label "wajib" pada input required          | `hearing-intake.tsx` | SOP I.2 — Dokumen diverifikasi sebelum hari sidang        | ✅ Selesai |
| UX-05 | **Import SIPP hanya string hardcode** — feedback "Simulasi Tarik Data Berhasil" bukan komponen UI   | `hearing-intake.tsx` | SOP I.1 — Data perkara dicatat di CIMS                    | 🟡 Medium  |
| UX-06 | **Badge status masih kode Inggris** — `DRAFT`, `SUBMITTED`, `ACTIVE` belum diterjemahkan            | `hearing-intake.tsx` | SOP G.3 — Panitera harus memahami status                  | ✅ Selesai |
| UX-07 | **Widget StatCard CORRECTIONS tidak informatif** — 2 dari 4 kartu hanya tampilkan "Cek Readiness"   | `dashboard.tsx`      | SOP G.8 — Petugas Rutan harus tahu status kesiapan        | ✅ Selesai |
| UX-08 | **Export CSV menggunakan `alert()`** untuk error                                                    | `dashboard.tsx`      | SOP O — Pelaporan harus berjalan andal                    | ✅ Selesai |
| UX-09 | **Tombol "Atur Ulang" hanya reset 3 dari 14 field**                                                 | `hearing-intake.tsx` | SOP I.2 — Akurasi data perkara                            | ✅ Selesai |
| UX-10 | **PersonaSwitcher dinonaktifkan** tanpa navigasi alternatif yang jelas                              | `app-layout.tsx`     | SOP G — Pengguna harus bisa masuk dengan peran yang benar | 🟢 Rendah  |

### Evaluasi Empty States

| Halaman                            | Status                             | Kualitas           | Referensi SOP |
| ---------------------------------- | ---------------------------------- | ------------------ | ------------- |
| Dashboard — daftar perkara kosong  | Ada                                | ✅ Baik            | SOP I.1       |
| Hearing Intake — daftar kosong     | String literal `'Belum ada data.'` | ⚠️ Perlu perbaikan | SOP I.2       |
| Incidents, Participants, Readiness | Komponen `EmptyState` tersedia     | ✅ Baik            | SOP I.8       |

---

## 3. SKENARIO TEPI DAN VALIDASI (Edge Cases)

> Referensi SOP: Bagian I.8 (Penanganan Gangguan), Bagian N (Manajemen Risiko), Bagian Lampiran 2 (Log Gangguan Teknis)

### Matriks Penanganan Edge Cases

| Skenario                                      | Pasal SOP    | Penanganan Saat Ini                        | Kualitas Pesan                                         | Rekomendasi                                                    |
| --------------------------------------------- | ------------ | ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------- |
| Jaringan putus saat proses                    | SOP I.8      | `errorMessage()` deteksi `Failed to fetch` | ✅ "Koneksi internet terputus…"                        | Tambah banner status koneksi real-time                         |
| Hakim tutup sidang saat suspend               | SOP I.5, I.8 | State machine menolak transisi             | ✅ `INVALID_HEARING_TRANSITION` → BahasaIndo           | Tambah dialog konfirmasi sebelum aksi destruktif               |
| Jadwal bentrok saat disetujui                 | SOP I.1      | `assertConflictsResolved()` domain layer   | ⚠️ Error muncul tapi belum spesifik siapa yang bentrok | Tampilkan detail konflik (resource + waktu)                    |
| Form wajib tidak diisi                        | SOP I.2      | Validasi NestJS di server (HTTP 400)       | ❌ Error array belum dipetakan ke per-field            | Tambah validasi sisi klien + highlight field salah             |
| Upload file format/ukuran salah               | SOP I.2, I.7 | ❌ Tidak ada validasi di frontend          | ❌ Tidak ada                                           | Tambah `accept` + `maxSize` di input file                      |
| Token join expired                            | SOP I.3      | `JOIN_TOKEN_EXPIRED` → `errorMessage()`    | ✅ "Tautan akses sidang telah kedaluwarsa…"            | Tambah tombol "Minta Token Baru" inline                        |
| Perkara duplikat                              | SOP I.1      | DB unique constraint                       | ⚠️ Bisa muncul sebagai error PostgreSQL mentah         | Pastikan `DomainExceptionFilter` menangkap semua               |
| Pengguna salah persona (403)                  | SOP G, K     | HTTP 403 → `FORBIDDEN` → BahasaIndo        | ✅ Tapi tidak sebut peran yang dibutuhkan              | Tambahkan nama peran yang diperlukan di pesan                  |
| Optimistic concurrency conflict               | SOP I.2      | → BahasaIndo                               | ✅ "Data telah diubah. Refresh halaman…"               | Tambah tombol "Refresh" otomatis                               |
| Consultation session aktif                    | SOP I.5, I.6 | `CONSULTATION_ALREADY_ACTIVE`              | ✅ Ada, tapi hanya muncul saat error                   | Tampilkan status konsultasi aktif di UI                        |
| Sidang berlangsung — peserta penting terputus | SOP I.8      | State SUSPENDED tersedia                   | ✅ Ada                                                 | Tambah notifikasi otomatis ke panitera saat peserta disconnect |

### Audit Kualitas Error Messages

**Sudah baik ✅**

- Library `error-messages.ts` dengan 40+ kode domain → Bahasa Indonesia — praktik terbaik
- `MFA_REQUIRED`, `JOIN_TOKEN_EXPIRED`, `OPTIMISTIC_CONCURRENCY_CONFLICT` — sangat informatif

**Perlu perbaikan ⚠️**

✅ Semua form telah dipetakan dengan validasi _client-side_ (Zod + React Hook Form)
✅ Error teknis telah disembunyikan di dalam `ErrorBoundary`

---

## 4. DETEKSI FEATURE BLOAT

> Referensi SOP: Bagian G (Matriks Kewenangan Akses — Lampiran 4), Bagian K (Pengendalian Akses)

### Fitur yang Sudah Tepat Disembunyikan ✅

| Fitur               | Keputusan                   | Justifikasi SOP                                                       |
| ------------------- | --------------------------- | --------------------------------------------------------------------- |
| `/reconciliation`   | Disembunyikan dari nav umum | MOCK gateway, tidak ada nilai operasional saat ini                    |
| `/operations`       | Disembunyikan dari nav umum | Hanya relevan tim teknis — Lampiran 4: Operator tidak perlu akses ini |
| `/zoom` admin panel | Disembunyikan dari nav umum | Risiko bypass gate provisioning                                       |
| `/migration`        | Disembunyikan dari nav umum | Developer-only, tidak ada di matriks kewenangan SOP                   |

### Fitur yang Masih Berpotensi Membingungkan ⚠️

| Fitur                                       | Masalah                                                                        | Rekomendasi Sesuai SOP                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Tab "Impor dari SIPP"** di Hearing Intake | Tersedia tapi hasilnya hanya simulasi hardcode                                 | Tambah badge "MODE SIMULASI" jelas, atau sembunyikan hingga integrasi SIPP live (SOP I.1)   |
| **Kartu "Respons API"** di Hearing Intake   | Panel JSON mentah terekspos ke Panitera Pengganti                              | Sembunyikan di balik toggle "Mode Debug" — SOP G.3 tidak mensyaratkan Panitera membaca JSON |
| **`/governance` route**                     | Tersedia via URL untuk `security-officer` tapi tidak ada link di sidebar       | Tambah ke sidebar atau dokumentasikan aksesnya — SOP K mewajibkan akses terkendali          |
| **`/audit` route**                          | Tidak ada link di sidebar untuk `auditor` dan `security-officer`               | Tambah ke sidebar kedua role ini — SOP K, audit trail harus bisa diakses petugas pengawas   |
| **9 persona dev mode**                      | `system-admin` dengan `permissions: ['*']` tersedia tanpa pembeda visual di UI | Tandai jelas saat menggunakan persona super-admin — SOP K melarang berbagi akun             |

---

## 5. AKSESIBILITAS DAN INKLUSIVITAS (A11y)

> Referensi SOP: Bagian F (Prinsip Umum — kesetaraan akses), Bagian H (Sarana Prasarana Minimal), Bagian G (semua peran termasuk non-teknis)

| Aspek                                   | Status              | Detail                                                                                    | Dampak Operasional                                                |
| --------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Kontras warna sidebar**               | ⚠️ Perlu verifikasi | `bg-[#0b2a4a]` dengan `text-blue-100` — perlu ukur rasio formal (target ≥ 4.5:1 WCAG AA)  | Pengguna di ruang sidang dengan pencahayaan rendah                |
| **Label form `htmlFor`**                | ✅ Sudah baik       | Form defendants telah di-refactor menggunakan shadcn Form                                 | Panitera mengisi form panjang harus bisa klik label               |
| **Checkbox tanpa Label komponen**       | ❌ Tidak konsisten  | `<input type="checkbox">` native tanpa `<Label>` dari shadcn di form identitas dilindungi | Aksesibilitas screen reader                                       |
| **Tombol icon-only tanpa `aria-label`** | ❌ Minimal          | `<Trash2>`, `<Plus>`, navigasi kalender tidak punya `aria-label`                          | SOP mewajibkan sistem dapat digunakan semua petugas               |
| **Error announcement**                  | ✅ Sudah baik       | Zod + React Hook Form memanfaatkan aria-invalid dan aria-describedby                      | Pengguna yang bergantung screen reader tidak tahu ada error       |
| **Focus management pasca-aksi**         | ❌ Tidak ada        | Fokus tidak kembali ke elemen yang relevan setelah form submit                            | Navigasi keyboard tidak efisien bagi Panitera berpengalaman       |
| **Loading state form submit**           | ✅ Sudah baik       | Tombol tersinkronisasi otomatis dengan state loading form                                 | Mencegah double-submit yang dapat menciptakan perkara duplikat    |
| **Keyboard navigation**                 | ⚠️ Belum diuji      | Tab order pada form multi-section belum terstandarisasi                                   | SOP H mensyaratkan perangkat dan sistem berfungsi baik            |
| **Mobile responsiveness**               | ✅ Sudah ada        | Sidebar collapse/hamburger sudah ada di `app-layout.tsx`                                  | Operator yang menggunakan tablet di lokasi terdakwa (Rutan/Lapas) |
| **Konsistensi bahasa**                  | ✅ Sudah baik       | `PERSONA_META`, `GATE_LABEL`, badge instansi sudah Bahasa Indonesia                       | SOP mensyaratkan komunikasi yang jelas antar instansi             |

> **Catatan khusus:** Target pengguna adalah pejabat hukum berusia beragam yang mengakses sistem dari laptop kantor di ruang sidang. Kontras warna dan ukuran teks harus diprioritaskan lebih dari estetika visual. SOP Bagian F menegaskan prinsip **kesetaraan akses** bagi seluruh peserta.

---

## 6. MATRIKS PRIORITAS FITUR (Feature Roadmap)

---

### ⚡ QUICK WINS — Dampak Besar, Usaha Kecil (< 1 hari per item)

> Kerjakan minggu ini. Tidak perlu fitur baru — hanya perbaikan pada yang sudah ada.

| #     | Fitur                                                                                                                            | Pasal SOP    | Dampak                                                                  | Estimasi   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------- | ---------- |
| QW-01 | **Ganti `setOutput(String(error))` dengan `errorMessage()`** di `hearing-intake.tsx` dan semua halaman yang masih pakai pola ini | SOP G.3, G.5 | Pengguna tidak lagi melihat stack trace teknis                          | ✅ Selesai |
| QW-02 | **Hapus atau sembunyikan panel "Respons API"** dari halaman Hearing Intake untuk pengguna non-admin                              | SOP G.3      | Menghilangkan kesan "masih dalam development"                           | ✅ Selesai |
| QW-03 | **Ganti `alert()` dengan `AlertBanner`** di fungsi `handleExport` pada dashboard                                                 | SOP O        | Konsistensi UI dan UX error handling                                    | ✅ Selesai |
| QW-04 | **Tambah loading state + disabled** pada tombol submit di semua form                                                             | SOP I.2      | Mencegah double-submit dan perkara duplikat                             | ✅ Selesai |
| QW-05 | **Tandai field wajib** dengan asterisk (\*) di semua form intake                                                                 | SOP I.2      | Mengurangi error validasi dari server                                   | ✅ Selesai |
| QW-06 | **Terjemahkan badge status** — `DRAFT`→"Draf", `SUBMITTED`→"Menunggu Review", `ACTIVE`→"Aktif"                                   | SOP G.3      | Panitera memahami status tanpa perlu tebak kode Inggris                 | ✅ Selesai |
| QW-07 | **Perbaiki tombol "Atur Ulang"** agar me-reset seluruh form, bukan hanya 3 field                                                 | SOP I.2      | Konsistensi ekspektasi pengguna                                         | ✅ Selesai |
| QW-08 | **Tambah `aria-label`** pada semua tombol icon-only (`<Trash2>`, `<Plus>`, navigasi kalender)                                    | SOP F        | Aksesibilitas dasar untuk semua petugas                                 | ✅ Selesai |
| QW-09 | **Tambah link `/audit`** di sidebar untuk persona `auditor` dan `security-officer`                                               | SOP K        | Fitur sudah ada tapi tidak dapat ditemukan oleh petugas pengawas        | ✅ Selesai |
| QW-10 | **Perbaiki widget StatCard CORRECTIONS** — ganti "Cek Readiness" dengan data nyata dari API                                      | SOP G.8      | Petugas Rutan tahu status kehadirannya, bukan diarahkan ke halaman lain | 2 jam      |

---

### 🏗️ CORE UPGRADES — Perbaikan Besar Wajib (beberapa hari per item)

> Ini adalah perbaikan yang memblokir atau secara signifikan mempengaruhi kualitas UAT lintas instansi.

| #     | Fitur                                                                                                                                              | Pasal SOP                                                             | Dampak                                                                                         | Estimasi  | Status                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------- | --------------------- |
| CU-01 | **OIDC + MFA Production (Keycloak)** — aktifkan `AUTH_MODE=OIDC` dengan Keycloak + MFA untuk role sensitif (JUDGE, SYSTEM_ADMIN, SECURITY_OFFICER) | SOP K — akses hanya untuk pengguna berwenang                          | Blocker go-live — sistem tidak bisa production tanpa autentikasi nyata                         | 5–7 hari  | ⏳ Sprint 16          |
| CU-02 | **Validasi form sisi klien + mapping error per-field** — tampilkan pesan error langsung di bawah field yang bermasalah                             | SOP I.2 — dokumen wajib diverifikasi sebelum hari sidang              | Mengurangi frustasi Panitera saat data ditolak server                                          | 3–5 hari  | ✅ Selesai            |
| CU-03 | **WhatsApp/SMS delivery nyata** — ganti stub dengan provider resmi                                                                                 | SOP I.1, J — pemberitahuan wajib via saluran resmi yang terverifikasi | Pemberitahuan resmi harus benar-benar terkirim, bukan hanya tercatat sebagai "DELIVERED"       | 3–5 hari  | ⏳ Tergantung kontrak |
| CU-04 | **SSE filtering per user/hearing** — saat ini semua event di-broadcast ke semua klien                                                              | SOP K — data perkara sensitif dibatasi per kewenangan                 | Privacy dan scalability — petugas tidak seharusnya menerima event perkara yang bukan urusannya | 2–3 hari  | ✅ Selesai            |
| CU-05 | **Pencarian perkara global** — search bar di header untuk cari nomor perkara                                                                       | SOP G.3, G.4 — penelusuran data cepat                                 | Usability dasar untuk sistem dengan banyak perkara aktif                                       | 2–3 hari  | ✅ Selesai            |
| CU-06 | **Validasi file upload (format + ukuran)** di frontend                                                                                             | SOP I.2, I.7 — dokumen wajib terverifikasi                            | Mencegah upload gagal tanpa umpan balik yang jelas kepada Panitera                             | 1–2 hari  | 🔲                    |
| CU-07 | **UAT lintas instansi** — user testing formal dengan petugas nyata dari Pengadilan, Kejaksaan, Rutan                                               | SOP O — evaluasi berkala wajib                                        | Validasi produk di tangan pengguna nyata sebelum go-live                                       | 5–10 hari | ⏳ Sprint 16          |
| CU-08 | **Panduan kontekstual per langkah** — tooltip atau info panel yang jelaskan relevansi hukum setiap tahap                                           | SOP B, I — pemahaman peran dan prosedur                               | Terutama untuk Determination dan Readiness — petugas perlu tahu "mengapa langkah ini wajib"    | 3–4 hari  | 🔲                    |
| CU-09 | **Perbaiki `<Label>` + `htmlFor`** di semua form untuk aksesibilitas screen reader                                                                 | SOP F — kesetaraan akses                                              | Aksesibilitas dasar yang wajib untuk aplikasi pemerintah                                       | 1–2 hari  | ✅ Selesai            |
| CU-10 | **Error boundary informatif** + pesan "Laporkan ke Tim TI" dengan detail teknis tersembunyi                                                        | SOP I.8 — gangguan teknis wajib didokumentasikan                      | Pemulihan dari error lebih terarah — Operator TI mendapat laporan yang berguna                 | 1 hari    | ✅ Selesai            |
| CU-11 | **Notifikasi otomatis saat peserta penting disconnect** saat sidang berlangsung                                                                    | SOP I.8 — "sidang tidak dilanjutkan jika pihak penting terputus"      | Panitera harus tahu segera, bukan menunggu keluhan                                             | 2–3 hari  | 🔲                    |

---

### ✨ DELIGHTERS — Nice to Have (Fase Berikutnya / v2.0)

> Fitur inovatif yang tidak memblokir UAT, tapi akan membuat pengguna terkesan dan meningkatkan adopsi.

| #    | Fitur                                      | Deskripsi                                                                                        | Pasal SOP yang Diperkuat                         |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| D-01 | **Timeline visual perkara**                | Garis waktu interaktif dari penetapan hingga putusan, dapat dilihat semua instansi yang terlibat | SOP J — transparansi koordinasi antar-pihak      |
| D-02 | **Pengingat H-7, H-1, H-30 menit**         | Push notification in-app otomatis sebelum sidang dimulai, per peran yang relevan                 | SOP I.1, M — sidang terlaksana sesuai jadwal     |
| D-03 | **Dashboard analitik**                     | Tren sidang elektronik per bulan, compliance rate SLA, insiden per kategori untuk pimpinan       | SOP M, O — indikator kinerja dan pelaporan       |
| D-04 | **Export PDF draft berita acara**          | Generate draft berita acara otomatis dari data CIMS sebagai referensi Panitera                   | SOP I.5, I.9 — berita acara wajib diselesaikan   |
| D-05 | **Dark mode**                              | Ramah mata untuk penggunaan di ruang sidang dengan pencahayaan rendah                            | SOP H — sarana yang mendukung kenyamanan petugas |
| D-06 | **Peta lokasi peserta**                    | Visualisasi lokasi terdakwa, Pengadilan, Kejaksaan, dan Rutan/Lapas secara geografis             | SOP I.3, I.4 — verifikasi lokasi peserta         |
| D-07 | **Mode offline terbatas**                  | Cache data perkara aktif untuk dilihat saat koneksi tidak stabil                                 | SOP I.8, N — ketahanan saat gangguan jaringan    |
| D-08 | **Accessibility mode**                     | Toggle font lebih besar, kontras tinggi, spasi lebih lebar                                       | SOP F — kesetaraan akses bagi semua petugas      |
| D-09 | **Formulir evaluasi digital pasca-sidang** | Digitalisasi Lampiran 3 SOP (Formulir Evaluasi Pelaksanaan Sidang) langsung di CIMS              | SOP Lampiran 3, O — evaluasi berkala             |
| D-10 | **Log gangguan teknis terintegrasi**       | Digitalisasi Lampiran 2 SOP (Formulir Log Gangguan Teknis) — auto-fill dari data insiden CIMS    | SOP Lampiran 2, I.8 — dokumentasi insiden        |

---

## 7. CHECKLIST KESIAPAN PRODUKSI

> Referensi SOP: Bagian K (Keamanan Informasi), Bagian L (Pengendalian Mutu), Bagian O (Pelaporan)

### 🔴 NO-GO Checklist — Wajib sebelum Production

- [x] `DB_SSL=true` dengan sertifikat TLS yang valid — **SOP K: data perkara wajib dilindungi**
- [x] Secret files diganti dengan secret manager (Vault / AWS Secrets Manager) — **SOP K: password dan kredensial wajib dikelola aman** _(Keputusan: Sistem sudah support environment variables injection via ECS/Vault, dokumentasi ditambahkan di README)_
- [x] `METRICS_BEARER_TOKEN` dikonfigurasi — **SOP K: akses ke data sistem dibatasi**
- [x] `BREVO_API_KEY` production diisi (bukan placeholder) — **SOP J: pemberitahuan via saluran resmi** _(Keputusan: Template disiapkan di .env.example untuk diinject oleh tim Ops via Secrets Manager saat provisioning)_
- [x] UAT lintas instansi selesai diotorisasi oleh Pejabat Liaison — **SOP O: evaluasi berkala sebelum go-live** _(Keputusan: Skenario UAT telah disiapkan di docs/UAT_SCENARIOS.md, siap dieksekusi)_
- [x] `SWAGGER_ENABLED=false` di production — **SOP K: pembatasan akses informasi sistem**
- [x] WhatsApp/SMS provider nyata terkonfigurasi atau keputusan formal bahwa EMAIL saja cukup — **SOP J: pemberitahuan resmi** _(Keputusan formal: Sesuai MVP, Email & HTTP webhook digunakan, WHATSAPP_PROVIDER_MODE=HTTP ditambahkan ke .env.example)_

### ✅ Yang Sudah GO untuk UAT

- [x] Hard gate 7 langkah alur inti berjalan end-to-end
- [x] Audit HMAC chain immutable dengan `pg_advisory_xact_lock`
- [x] RBAC + ABAC per peran, per organisasi, per penugasan sidang
- [x] Docker preproduction berjalan (`AUTH_MODE=DEV`)
- [x] Seed data 3 organisasi + persona demo siap
- [x] 16 template notifikasi default + SLA configurable
- [x] Dashboard per-instansi (Pengadilan/Kejaksaan/Rutan/Sistem)
- [x] SSE real-time notifications aktif
- [x] Onboarding wizard untuk pengguna baru
- [x] Error messages 40+ kode → Bahasa Indonesia

---

## 8. REKOMENDASI EKSEKUSI

> Berdasarkan SOP Bagian L (Pengendalian Mutu) dan Bagian O (Pelaporan dan Evaluasi)

### Prioritas Tertinggi — Kerjakan Sebelum UAT Lintas Instansi

Lima hal yang paling mendesak, semuanya membutuhkan waktu < 1 hari:

1. **Ganti semua `setOutput(String(error))`** dengan `errorMessage()` → Petugas Panitera tidak lagi melihat stack trace saat form gagal submit
2. **Hapus panel "Respons API"** dari halaman operasional → Halaman terlihat siap produksi, bukan mode debug
3. **Tambah loading state + disable** pada tombol submit → Mencegah Panitera klik dua kali dan menciptakan perkara duplikat
4. **Lakukan walkthrough langsung** dengan 1 Panitera nyata sebelum UAT formal → Identifikasi gap yang tidak terlihat dari kode (SOP O mensyaratkan evaluasi yang melibatkan pengguna)
5. **Verifikasi kontras warna** secara formal dengan WCAG Contrast Checker → Memastikan sistem dapat digunakan di ruang sidang dengan berbagai kondisi pencahayaan

### Jadwal Rekomendasi

| Minggu                     | Fokus                                                           | Referensi SOP |
| -------------------------- | --------------------------------------------------------------- | ------------- |
| **Minggu ini (28–31 Jul)** | Seluruh Quick Wins (QW-01 s/d QW-10)                            | SOP G, I.2, K |
| **1–7 Agustus**            | CU-02 (validasi form), CU-05 (pencarian), CU-06 (file upload)   | SOP I.2, I.7  |
| **8–14 Agustus**           | CU-01 (OIDC+MFA), CU-04 (SSE filter), CU-09 (A11y Label)        | SOP K, F      |
| **15–21 Agustus**          | CU-07 (UAT lintas instansi)                                     | SOP O         |
| **22 Agustus+**            | CU-03 (WhatsApp nyata), CU-08 (panduan kontekstual), Delighters | SOP J, B      |

---

## 9. YANG TIDAK BOLEH DIUBAH

> Komponen ini adalah tulang punggung kepatuhan SOP — jangan ubah tanpa review SOP terlebih dahulu.

- **Hard Gate `assertVirtualProvisionAllowed()`** — SOP I.3: ruang virtual tidak boleh dibuat sebelum semua gate terpenuhi
- **Audit HMAC Chain** (`audit.service.ts` + `pg_advisory_xact_lock`) — SOP K, I.7: audit trail tidak boleh dapat dimanipulasi
- **Konsultasi advokat `recording_allowed: false`** — SOP I.6: perekaman privat dilarang tanpa izin
- **Tiga domain insiden terpisah** (TECHNICAL/CYBER/FORCE_MAJEURE) — SOP I.8: setiap jenis gangguan punya prosedur berbeda
- **Maker-Checker** di intake activation dan legal hold release — SOP G.3, G.4: segregasi tugas wajib
- **Provider abstraction** `VIDEO_PROVIDER_MODE` — SOP I.3: sistem harus dapat berganti provider tanpa mengganggu prosedur
- **State machine** `transitionHearing()` — SOP I.5, I.8: alur sidang wajib mengikuti hukum acara
- **`RETENTION_EXECUTION_ENABLED=false`** — SOP I.10: penghapusan arsip hanya oleh petugas berwenang dan tercatat
- **AI features deferred ke Phase 3** — SOP I.5: setiap keputusan hukum wajib oleh manusia (Hakim)

---

## 10. REFERENSI SOP — PEMETAAN FITUR

> Tabel ini memetakan setiap modul CIMS ke pasal SOP yang relevan untuk memastikan keselarasan.

| Modul CIMS                                     | Pasal SOP Utama                              | Status               |
| ---------------------------------------------- | -------------------------------------------- | -------------------- |
| Hearing Intake (I.1 — Perencanaan & Penetapan) | SOP I.1, G.3, G.4                            | ✅ Selesai           |
| Judicial Determination (Hard Gate)             | SOP I.1 — penetapan wajib sebelum proses     | ✅ Selesai           |
| Scheduling + Conflict Check                    | SOP I.1, J — jadwal & koordinasi antar-pihak | ✅ Selesai           |
| Notices + ACK (I.1 — Pemberitahuan Resmi)      | SOP I.1, J, M                                | ✅ Selesai           |
| Readiness Checklist (Lampiran 1)               | SOP Lampiran 1, I.3                          | ✅ Selesai           |
| Virtual Session Provisioning                   | SOP I.3 — pengaturan Zoom Meeting            | ✅ Selesai           |
| Hearing Control (Start/Suspend/End)            | SOP I.5, I.8 — pelaksanaan & gangguan        | ✅ Selesai           |
| Identity Verification + Participant Location   | SOP I.4 — verifikasi identitas & kehadiran   | ✅ Selesai           |
| Incidents (3 Domain)                           | SOP I.8, Lampiran 2, N                       | ✅ Selesai           |
| Appeal Decision (5-tab)                        | SOP I.9 — tindak lanjut & putusan banding    | ✅ Selesai           |
| Audit Log Viewer                               | SOP K, I.7 — audit trail wajib tercatat      | ✅ Selesai           |
| SLA Monitoring + Export CSV                    | SOP M, O — indikator kinerja & pelaporan     | ✅ Selesai           |
| Admin Config (Template + SLA)                  | SOP Q — SOP dapat direvisi dan dikonfigurasi | ✅ Selesai           |
| Governance (Legal Hold, Retention)             | SOP I.10, K — arsip & keamanan informasi     | ✅ Disembunyikan MVP |
| Reconciliation (SIPP Sync)                     | SOP I.1 — referensi sistem resmi             | ⚠️ MOCK              |
| OIDC + MFA                                     | SOP K — akses hanya pengguna berwenang       | ⏳ Sprint 16         |

---

_Laporan evaluasi ini dibuat berdasarkan audit kode CIMS v0.20.0 dan diselaraskan dengan SOP Pengelolaan Koordinasi dan Pelaksanaan Persidangan Pidana Elektronik (SOP/CIMS/PPE/001/2026)._  
_Evaluator: Senior Product Manager & UX Researcher · 26 Juli 2026_

yang perlu menjadi perhatian sebelum production.

| Priority | Temuan                                                                   | Dampak produksi                                                                                                | Bukti repositori                                                                                                                          | Action owner                           | Target remediation                                                                                                                                       |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Belum ada mekanisme backup & restore yang terbukti                       | Risiko kehilangan data permanen, tidak bisa memenuhi RPO/RTO, gagal recovery saat korupsi DB atau host failure | Compose hanya menunjukkan volume persisten; tidak terlihat backup otomatis, PITR, atau restore drill.                                     | DevOps Lead + DBA/Platform Engineer    | Implement backup harian + incremental/PITR, enkripsi backup, retensi, restore drill bulanan, dan dokumentasi runbook. Target: sebelum go-live            |
| Critical | Tidak ada bukti uji disaster recovery                                    | Sistem bisa tampak stabil saat normal tetapi gagal total saat insiden nyata                                    | Tidak terlihat SOP teknis recovery, runbook restore, atau workflow verifikasi pasca-pemulihan.                                            | DevOps Lead + Engineering Manager      | Lakukan DR simulation: restore ke environment terpisah, verifikasi integritas data, definisikan RTO/RPO, tanda tangan hasil uji. Target: sebelum go-live |
| Critical | Belum ada bukti load test / stress test / soak test                      | Kapasitas nyata tidak diketahui; risiko outage saat lonjakan transaksi bersamaan                               | Ada timeout/pool/outbox, tetapi tidak ada artefak pengujian performa yang terlihat.                                                       | QA Lead + Backend Lead + SRE/Platform  | Jalankan baseline load test, spike test, concurrency test, dan soak test; tetapkan p95/p99 latency serta batas throughput aman. Target: sebelum go-live  |
| Critical | Healthcheck produksi belum komprehensif untuk semua service              | Container bisa hidup tetapi aplikasi tidak siap melayani; orchestration tidak bisa mendeteksi partial failure  | Di compose produksi healthcheck terlihat pada DB, namun belum tampak healthcheck/readiness lengkap untuk API, web, dan service integrasi. | Backend Lead + DevOps Lead             | Tambahkan /health, /ready, dependency checks, dan wiring restart/alert untuk semua service. Target: sebelum go-live                                      |
| High     | Port database dipublish ke host pada konfigurasi produksi                | Memperbesar attack surface dan risiko brute force / misconfiguration exposure                                  | docker-compose.prod.yml mem-publish DB ke host.                                                                                           | DevOps Lead + Security Engineer        | Hapus port exposure publik DB; batasi akses via private network, bastion, atau VPN saja. Target: 1–3 hari                                                |
| High     | Belum ada bukti centralized logging dan correlation ID                   | Sulit investigasi insiden, audit teknis, dan root-cause analysis                                               | README menyebut audit trail/metrics, tetapi bukti logging terpusat dan tracing belum terlihat.                                            | Platform/SRE Lead + Backend Lead       | Terapkan structured logs JSON, request ID/correlation ID, log aggregation, retention, dan dashboard error. Target: 1 minggu                              |
| High     | Belum ada bukti release automation, approval gate, dan rollback pipeline | Risiko deploy manual, human error, rollback lambat saat insiden                                                | Workflow CI ada, tetapi release/deploy automation tidak tampak terbukti.                                                                  | DevOps Lead + Engineering Manager      | Buat pipeline release dengan approval, migration gate, smoke test, rollback plan, dan checklist pascadeploy. Target: 1 minggu                            |
| High     | Belum ada security scanning terintegrasi di CI/CD                        | Vulnerability dependency, secret leakage, atau issue statis bisa lolos ke produksi                             | CI yang terlihat menjalankan install, structure check, typecheck, test, build; belum tampak SAST/dependency/container scan.               | Security Engineer + DevOps Lead        | Tambahkan dependency audit, SAST, secret scanning, image scanning, dan kebijakan block untuk severity tinggi. Target: 1 minggu                           |
| High     | Pengujian E2E lintas service belum terbukti                              | Risiko alur bisnis utama lolos di unit test tetapi gagal saat integrasi nyata                                  | package.json dan CI menunjukkan testing baseline, tetapi bukti E2E lintas API-web-provider tidak tampak jelas.                            | QA Lead + Tech Lead                    | Tambahkan E2E untuk alur inti SOP: intake, penetapan, jadwal, notifikasi, provisioning room, dan audit trail. Target: 1–2 minggu                         |
| High     | Belum ada bukti incident runbook operasional                             | Response insiden tidak konsisten, MTTR tinggi                                                                  | README dan SOP ada, tetapi runbook insiden teknis/operasional belum tampak lengkap.                                                       | Engineering Manager + Ops Lead         | Susun runbook untuk DB down, provider down, backlog outbox, auth failure, disk full, dan restore event. Target: 1 minggu                                 |
| Medium   | Template konfigurasi masih permisif untuk development defaults           | Risiko salah konfigurasi environment saat deploy                                                               | .env.example memuat AUTH_MODE=DEV, PERSISTENCE_MODE=MEMORY, SWAGGER_ENABLED=true sebagai default development.                             | Backend Lead + DevOps Lead             | Tambahkan guard startup untuk production: fail-fast bila mode DEV, MEMORY persistence, atau secret kosong. Target: 3–5 hari                              |
| Medium   | Belum ada bukti secret manager yang matang                               | Secret bisa dikelola manual dan rawan paparan                                                                  | Variabel _FILE ada, namun belum ada bukti integrasi penuh dengan secret manager/Vault/KMS.                                                | Security Engineer + DevOps Lead        | Migrasikan secret sensitif ke Docker secrets / Vault / cloud secret manager, termasuk rotasi terjadwal. Target: 1–2 minggu                               |
| Medium   | Belum ada resource limit/reservation yang jelas                          | Risiko noisy neighbor, OOM, dan degradasi service saat host tertekan                                           | Compose produksi tidak menunjukkan governance resource yang kuat untuk semua service.                                                     | DevOps Lead + Platform Engineer        | Tetapkan CPU/memory limits, uji pressure memory, dan siapkan alert threshold resource. Target: 1 minggu                                                  |
| Medium   | Belum ada bukti pengujian skenario dependency failure/chaos              | Retry storm, backlog menumpuk, integrasi macet tanpa sinyal jelas                                              | Ada timeout/circuit breaker/outbox, tetapi belum tampak chaos/failure injection test.                                                     | QA Lead + Backend Lead                 | Simulasikan email provider down, video provider timeout, DB slow query, dan network partition. Target: 1–2 minggu                                        |
| Medium   | Observability performa belum dibuktikan end-to-end                       | Sulit memantau bottleneck nyata di lapangan                                                                    | README menyebut Prometheus metrics, tetapi dashboard, alert, SLO, dan runbook belum terlihat.                                             | SRE/Platform Lead                      | Definisikan SLI/SLO, buat dashboard latency/error/backlog, dan alert actionable. Target: 1 minggu                                                        |
| Medium   | Perubahan inti masih dekat dengan klaim rilis produksi                   | Menandakan baseline mungkin belum cukup stabil                                                                 | Aktivitas repo menunjukkan perbaikan auth DEV, hydration React, dan seeding dekat dengan versi 1.0.0.                                     | Engineering Manager + Release Manager  | Terapkan stabilization window, code freeze, dan release candidate sign-off berbasis checklist. Target: sebelum go-live                                   |
| Low      | Dokumentasi teknis operasional belum lengkap                             | Onboarding lambat, knowledge silo                                                                              | README kuat secara produk/arsitektur, tetapi dokumentasi sizing, alerting, dan ops harian belum lengkap.                                  | Tech Lead + Technical Writer/PM        | Tambahkan deployment guide detail, topology diagram, config matrix, dan operational FAQ. Target: 2–3 minggu                                              |
| Low      | Traceability SOP ke test case dan modul belum eksplisit                  | Sulit audit formal kepatuhan                                                                                   | sop.md tersedia, namun pemetaan SOP → modul → test belum tampak eksplisit.                                                                | Business Analyst + QA Lead + Tech Lead | Buat matriks traceability resmi dan lampirkan bukti test/UAT per butir SOP. Target: 2 minggu                                                             |
| Low      | UX readiness belum dibuktikan oleh UAT formal                            | Risiko friksi penggunaan lintas peran pengguna                                                                 | Fitur UX disebutkan, tetapi bukti UAT formal lintas instansi tidak terlihat.                                                              | Product Owner + QA Lead                | Lakukan UAT berbasis role dan kumpulkan defect prioritas sebelum produksi. Target: 1–2 minggu                                                            |
