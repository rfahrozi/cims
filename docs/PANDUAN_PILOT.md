# PANDUAN PENGGUNA PILOT — CIMS v0.19.0
## Sistem Koordinasi Persidangan Pidana Elektronik Lintas Instansi

> **Dokumen ini untuk:** Pengguna pilot awal (Panitera, Hakim, Penuntut Umum, Petugas Pemasyarakatan)  
> **Versi:** 0.19.0 | **Lingkungan:** Preproduction — data demo, bukan perkara nyata  
> **URL Aplikasi:** http://localhost:8080 | **API Docs:** http://localhost:3000/docs

---

## SEBELUM MULAI

### Yang Perlu Anda Ketahui

1. **CIMS adalah sistem koordinasi** — bukan pengganti sistem administrasi perkara resmi (SIPP, e-Berpadu)
2. **Setiap aksi dicatat** dalam audit trail yang tidak dapat diubah
3. **Peran menentukan akses** — tidak semua tombol tersedia untuk semua pengguna
4. **Data di lingkungan pilot adalah data demo** — tidak ada dampak hukum

### Cara Ganti Persona (Simulasi Peran)

Di **sidebar kiri bawah**, terdapat tombol **Persona Switcher**. Klik untuk berganti peran:

| Persona | Peran | Aksi Utama |
|---------|-------|-----------|
| `substitute-clerk` | Panitera Pengganti | Input data perkara, draf pemberitahuan |
| `court-clerk` | Panitera | Aktivasi perkara, approve jadwal, kirim pemberitahuan |
| `judge` | Hakim | Penetapan elektronik, buka/tutup/skors sidang |
| `prosecutor` | Penuntut Umum | Acknowledgment pemberitahuan, submit kesiapan |
| `corrections` | Petugas Pemasyarakatan | Verifikasi terdakwa, submit kesiapan |
| `it-operator` | Tim TI | Provisioning ruang virtual |
| `auditor` | Auditor | Lihat audit trail, governance |

> **Catatan:** Di lingkungan preproduction, persona switcher menggunakan header HTTP untuk simulasi. Di produksi, peran ditentukan oleh OIDC/login resmi.

### Pilih Perkara Aktif

Di **sidebar kiri bawah**, di bawah persona switcher, terdapat **Hearing Selector**. Pilih perkara yang ingin dikerjakan. Semua halaman akan menampilkan data perkara yang dipilih.

---

## ALUR KERJA SIDANG ELEKTRONIK (7 Langkah)

```
[1] Input Data → [2] Penetapan → [3] Jadwal → [4] Pemberitahuan
                                                        ↓
[7] Sidang Selesai ← [6] Kontrol Sidang ← [5] Kesiapan & Ruang Virtual
```

---

## LANGKAH 1: Input Data Perkara

**Menu:** Data Persidangan | **Persona:** Panitera Pengganti → Panitera

### 1a. Panitera Pengganti — Buat Draf

1. Buka menu **Data Persidangan**
2. Klik tab **Buat Data Baru**
3. Isi semua field yang wajib (tandai `*`):
   - Nomor Perkara (mis: `1/Pid.Sus/2026/PN.Jkt.Sel`)
   - Jenis Klasifikasi: `SPECIAL_CRIMINAL` atau `GENERAL_CRIMINAL`
   - Judul Perkara
   - Jenis Persidangan (mis: `PEMERIKSAAN_SAKSI`)
   - Pengadilan, Kejaksaan, Pemasyarakatan (pilih dari daftar)
   - Data terdakwa (nama, status penahanan)
4. Klik **Buat Data** → status menjadi `DRAFT`
5. Klik **Ajukan untuk Review** → status menjadi `SUBMITTED`

### 1b. Panitera — Aktivasi (Maker-Checker)

> ⚠️ Panitera yang mengaktifkan **harus berbeda** dari yang membuat draf.

1. **Ganti persona** ke `court-clerk`
2. Di tab **Daftar**, pilih perkara dengan status `SUBMITTED`
3. Review data
4. Klik **Aktivasi** → status menjadi `ACTIVE`
   - Atau klik **Kembalikan** jika ada koreksi

**Setelah langkah ini:** Perkara siap untuk penetapan hakim.

---

## LANGKAH 2: Penetapan Hakim

**Menu:** Penetapan Hakim | **Persona:** Hakim

> Penetapan hakim adalah **gerbang wajib** — tidak ada langkah selanjutnya tanpa ini.

1. **Ganti persona** ke `judge`
2. Pastikan perkara yang benar sudah dipilih di Hearing Selector
3. Buka menu **Penetapan Hakim**
4. Isi form:
   - **Referensi Penetapan Resmi** (nomor penetapan hakim)
   - **Mode Persidangan:** Langsung / Elektronik / Hybrid
   - **Keputusan:** APPROVED (setujui elektronik) atau REJECTED
   - **Alasan** (minimal 10 karakter)
5. Klik **Simpan Penetapan**

**Setelah langkah ini:** Penjadwalan sidang bisa dilakukan.

---

## LANGKAH 3: Penjadwalan Sidang

**Menu:** Jadwal Sidang | **Persona:** Panitera

1. **Ganti persona** ke `court-clerk`
2. Buka menu **Jadwal Sidang**
3. Klik **Buat Proposal**:
   - Tanggal dan waktu sidang
   - Timezone: `Asia/Jakarta`
   - Tambah resource: Hakim, Ruang, Penuntut Umum, Pemasyarakatan
4. Klik **Buat Proposal** → proposal tersimpan
5. Klik **Check Conflict** → sistem cek konflik jadwal
   - Jika ada konflik `BLOCKED`: ubah waktu atau resource
   - Jika `CLEAR` atau `WARNING`: lanjut ke approve
6. Klik **Approve** → jadwal menjadi aktif

**Setelah langkah ini:** Pemberitahuan resmi bisa dikirim.

---

## LANGKAH 4: Pemberitahuan Resmi & Acknowledgment

**Menu:** Pemberitahuan | **Persona:** Panitera → Penuntut Umum → Petugas Pemasyarakatan

### 4a. Panitera — Buat dan Kirim Pemberitahuan

1. **Persona:** `court-clerk`
2. Buka menu **Pemberitahuan**
3. Isi **Referensi Resmi** (nomor surat pemberitahuan)
4. Klik **Buat Notice** → notice tersimpan dengan status `DRAFT`
5. Klik **Kirim** → notice masuk antrian pengiriman

### 4b. Penuntut Umum — Acknowledgment

1. **Ganti persona** ke `prosecutor`
2. Di daftar pemberitahuan, lihat notice yang diterima
3. Klik **Acknowledgment persona aktif** → status recipient berubah ke `ACKNOWLEDGED`

### 4c. Petugas Pemasyarakatan — Acknowledgment

1. **Ganti persona** ke `corrections`
2. Ulangi langkah acknowledgment seperti di atas

**Syarat lanjut:** Semua penerima wajib (`required_ack: true`) harus sudah `ACKNOWLEDGED`.

---

## LANGKAH 5: Kesiapan & Ruang Virtual

**Menu:** Kesiapan → Ruang Virtual | **Persona:** Panitera, Penuntut Umum, Petugas Pemasyarakatan, Tim TI

### 5a. Submit Checklist Kesiapan (per instansi)

Setiap instansi (Pengadilan, Kejaksaan, Pemasyarakatan) harus submit checklist kesiapannya masing-masing.

**Untuk Pemasyarakatan (wajib verifikasi dulu):**

1. **Ganti persona** ke `corrections`
2. Buka menu **Kesiapan**
3. Klik tab **Verifikasi Identitas** → isi data verifikasi terdakwa
4. Klik tab **Inspeksi Ruang** → isi status kamera, sterilitas, kerahasiaan
5. Kembali ke tab utama → isi semua checklist item → klik **Submit Kesiapan**

**Untuk Pengadilan dan Kejaksaan:**

1. Ganti persona → isi checklist item → submit

### 5b. Provisioning Ruang Virtual

Setelah semua instansi submit dengan status `READY`:

1. **Ganti persona** ke `it-operator`
2. Buka menu **Ruang Virtual**
3. Klik **Provision Ruang** → sistem membuat ruang virtual (Zoom/mock)
4. Status berubah ke `READY`

---

## LANGKAH 6: Kontrol Sidang

**Menu:** Kontrol Sidang | **Persona:** Hakim

1. **Ganti persona** ke `judge`
2. Buka menu **Kontrol Sidang**
3. **Buka Sidang** → status `STARTED`
4. Saat break: **Skors** → status `SUSPENDED`
5. Lanjut: **Lanjutkan** → kembali ke `STARTED`
6. Jika ada insiden: buka menu **Insiden** → catat gangguan
7. **Tutup Sidang** → status `ENDED`

> ⚠️ Hanya Hakim yang bisa membuka, menskors, melanjutkan, dan menutup sidang.

---

## LANGKAH 7: Pasca Sidang

### Insiden (jika ada gangguan)

**Menu:** Insiden | **Persona:** Semua peran

| Jenis Insiden | Deadline Notifikasi |
|---------------|-------------------|
| Gangguan Teknis | — |
| Insiden Siber | 1×24 jam |
| Keadaan Kahar | 3×24 jam |

1. Klik **Laporkan Insiden**
2. Pilih jenis dan tingkat keparahan
3. Sistem otomatis hitung deadline notifikasi
4. Update status saat insiden teratasi

### Putusan Banding (untuk perkara tingkat banding)

**Menu:** Putusan Banding | **Persona:** Panitera

Lihat panduan 5-tab di halaman **Putusan Banding** untuk:
1. Buat jadwal pembacaan
2. Kirim rantai pemberitahuan (PT → Jaksa → Pemasyarakatan → Terdakwa/Advokat)
3. Catat kehadiran
4. Unggah petikan (hari yang sama)
5. Kirim berkas ke PT1 (7 hari)

---

## SKENARIO EDGE CASE UMUM

### "Saya tidak bisa membuat jadwal"
**Penyebab:** Penetapan hakim belum ada atau statusnya REJECTED  
**Solusi:** Minta Hakim buat penetapan baru dengan keputusan APPROVED

### "Pemberitahuan belum terpenuhi (gate merah)"
**Penyebab:** Salah satu penerima belum ACK  
**Solusi:** Ganti persona ke penerima yang belum ACK → klik Acknowledgment

### "Ruang virtual tidak bisa dibuat"
**Penyebab:** Salah satu gate belum terpenuhi (penetapan/jadwal/notice/kesiapan)  
**Solusi:** Cek halaman **Dashboard** → lihat gate mana yang masih merah

### "Saya dapat error 403"
**Penyebab:** Persona aktif tidak memiliki izin untuk aksi tersebut  
**Solusi:** Ganti ke persona yang sesuai (lihat tabel peran di atas)

### "Data perkara tidak muncul"
**Penyebab:** Hearing Selector belum dipilih  
**Solusi:** Klik dropdown di sidebar kiri bawah dan pilih perkara

---

## CARA MELAPORKAN BUG / MASUKAN

Saat menemukan bug atau ada masukan, catat:

1. **Langkah yang dilakukan** (persona apa, menu apa, tombol apa)
2. **Yang diharapkan** terjadi
3. **Yang sebenarnya** terjadi
4. **Screenshot** jika memungkinkan
5. **Pesan error** yang muncul (copy dari layar)

Kirim ke tim pengembang melalui kanal yang disepakati.

---

## CATATAN KEAMANAN

- ✅ Semua data di lingkungan pilot adalah **data demo** — tidak ada data perkara nyata
- ✅ Sistem menggunakan **DEV auth mode** — tidak memerlukan login/password di pilot lokal
- ⚠️ Jangan masukkan data identitas nyata (nama, NIK, alamat sesungguhnya) ke sistem pilot
- ⚠️ Lingkungan preproduction tidak memiliki enkripsi penuh — hanya untuk pengujian internal

---

*Dokumen ini akan diperbarui seiring perkembangan sistem. Versi terakhir selalu tersedia di `docs/PANDUAN_PILOT.md`*
