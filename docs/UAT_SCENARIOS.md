# CIMS — User Acceptance Test (UAT) Scenarios

**Versi CIMS:** v0.20.0 MVP (Preproduction)  
**Tujuan Tes:** Validasi fungsionalitas dan alur kerja End-to-End oleh pengguna dari Pengadilan, Kejaksaan, dan Pemasyarakatan.  
**Tanggal Eksekusi:** _[Diisi Saat UAT]_  
**Tester:** _[Nama dan Instansi]_

_Sebelum memulai, pastikan Anda menggunakan "Persona Switcher" di sidebar kiri bawah (Atau SSO Keycloak pada mode Production) untuk berganti antar Peran pengguna._

---

## 🟩 Skenario 1: Penerimaan Data Awal (Hearing Intake) & Rekonsiliasi

**Aktor:** Panitera Pengganti (`substitute-clerk`) & Panitera (`court-clerk`)

1. Login sebagai **Panitera Pengganti**.
2. Masuk ke halaman **Data Persidangan**.
3. Di tab **Impor dari SIPP**, ketik Nomor Perkara (Misal: `123/Pid/2026/PN.Demo`) lalu klik **Tarik & Bandingkan Data**.
4. Pindah ke tab **Input Manual**, pastikan data draf muncul, lalu lengkapi Nama Terdakwa, dan tekan **"Ajukan review"** (SUBMITTED).
5. Ganti peran sebagai **Panitera (Court Clerk)**.
6. Pada tabel Respons, setujui data dengan menekan **"Aktifkan"** (ACTIVE).
   - _Verifikasi 1.1:_ Perkara akan terpilih secara otomatis pada "Active Hearing Bar" (Header Atas).

---

## 🟩 Skenario 2: Penetapan Hakim, Penjadwalan & Multi-Agenda

**Aktor:** Hakim (`judge`) & Panitera (`court-clerk`)

1. Login sebagai **Hakim**.
2. Masuk ke **Penetapan Hakim**. Pilih "Setujui" (APPROVED) pada status izin persidangan elektronik, dan mode `ELEKTRONIK`. Isi referensi penetapan, lalu "Simpan".
3. Ganti peran sebagai **Panitera**.
4. Masuk ke **Jadwal Sidang**.
5. Di Tab **Rincian Agenda**, susun dua agenda: (1) PEMBACAAN_DAKWAAN dan (2) PEMERIKSAAN_SAKSI, lalu simpan.
6. Di Tab **Jadwal Sidang**, pilih Ruang Sidang, lalu buat "Proposal Jadwal".
7. Tekan **"Cek Konflik"**, dan jika Hijau (CLEAR), tekan **"Setujui Jadwal"**.
   - _Verifikasi 2.1:_ Tab "Riwayat Perubahan" menyimpan histori penjadwalan tersebut.

---

## 🟩 Skenario 3: Pemberitahuan Lintas Instansi (Notices)

**Aktor:** Panitera (`court-clerk`) & Penuntut Umum (`prosecutor`)

1. Login sebagai **Panitera**.
2. Masuk ke **Pemberitahuan**. Buat _Notice_ dengan tipe `AGENDA_SIDANG`.
3. Kosongkan field "Subjek" dan "Isi Pesan" (agar sistem menggunakan Template Otomatis dari Admin Console).
4. Tambahkan penerima: Kejaksaan (Role: PROSECUTOR) dengan batas ACK default.
5. Klik **Kirim**.
6. Ganti peran sebagai **Penuntut Umum**.
7. Buka Dashboard, lihat ada peringatan "Tunggu Acknowledgment".
8. Buka menu **Pemberitahuan**, pada pemberitahuan masuk, klik **"Tandai Telah Diterima (ACK)"**.
   - _Verifikasi 3.1:_ Notifikasi _real-time_ SSE akan memperbarui tabel di sisi Panitera menjadi "ACKNOWLEDGED".

---

## 🟩 Skenario 4: Checklist Kesiapan (Readiness)

**Aktor:** Petugas Pemasyarakatan / Rutan (`corrections`) & Panitera (`court-clerk`)

1. Login sebagai **Petugas Pemasyarakatan**.
2. Masuk ke **Kesiapan**.
3. Sistem akan meminta konfirmasi. Pastikan mencentang "Identitas Terdakwa Cocok" dan "Ruangan Sidang Steril" (Wajib untuk Rutan - SOP 10.7).
4. Klik **Nyatakan Siap**.
5. Ganti peran ke **Panitera**. Lakukan hal yang sama untuk Pengadilan.
   - _Verifikasi 4.1:_ Workflow Stepper di header atas pada langkah 'Kesiapan' berubah menjadi warna hijau (PASS).

---

## 🟩 Skenario 5: Pendaftaran Saksi & Ruang Virtual

**Aktor:** Panitera (`court-clerk`) & Operator IT (`it-operator`)

1. Login sebagai **Panitera**.
2. Masuk ke menu **Peserta**. Daftarkan peserta dengan peran **Saksi (WITNESS)**.
3. Di field baru "Kaitkan ke Agenda", pilih agenda ke-(2) Pemeriksaan Saksi yang dibuat tadi.
4. Centang **"Identitas Dilindungi"** dan berikan Alias (contoh: "Saksi Mahkota").
5. Ganti peran sebagai **Operator TI**.
6. Buka **Ruang Virtual**, lalu klik tombol **Provisikan Ruangan (Zoom)**.
   - _Verifikasi 5.1:_ Ruang virtual sukses diprovisikan, dan Status Workflow berubah menjadi "READY" sepenuhnya.

---

## 🟩 Skenario 6: Eksekusi & Kontrol Sidang (Hard Gates)

**Aktor:** Hakim (`judge`) & Panitera (`court-clerk`)

1. Login sebagai **Hakim**.
2. Buka **Kontrol Sidang**. Saat ini status adalah `READY`.
3. Klik tombol **Buka Sidang** (START). Status berubah menjadi `STARTED`.
4. Pilih **Skors Sidang** (SUSPEND). Dialog merah akan muncul untuk meminta alasan/konfirmasi. Ketik alasan: "Ishoma", lalu setujui.
5. Lanjutkan kembali sidang, dan kemudian pilih **Tutup Sidang** (END).
6. Ganti peran sebagai **Panitera** (atau tetap sebagai Hakim).
7. Karena berkas berita acara belum di-upload, klik **Tandai Dokumentasi Tertunda** (FLAG DOCUMENTATION).
   - _Verifikasi 6.1:_ Banner kuning peringatan Dokumentasi Tertunda akan muncul.
8. Lengkapi form dan setelah selesai, klik **Selesaikan Dokumentasi** (COMPLETE DOCUMENTATION).

---

## 🟩 Skenario 7: Audit Log & Resolusi Mismatch (Eskalasi)

**Aktor:** Auditor (`auditor`) / Administrator Sistem (`system-admin`)

1. Login sebagai **System Administrator**.
2. Buka menu **Rekonsiliasi SIPP** (di bawah).
3. Masukkan ID Perkara `mismatch-test-123` untuk memicu Mode Simulasi UAT. Tarik Data.
4. Akan muncul tabel komparasi CIMS vs SIPP dengan indikator MERAH/KUNING.
5. Tekan tombol **Terapkan Sinkronisasi (Override)** pada salah satu field yang berbeda.
6. Login sebagai **Auditor**. Buka halaman tersembunyi `http://localhost:8080/audit`.
   - _Verifikasi 7.1:_ Periksa riwayat. Semua kejadian dari _Intake_ (Skenario 1) hingga _Rekonsiliasi Override_ (Skenario 7) tercetak abadi di Log dengan integritas hash "Valid".

---

_Tanda Tangan Tanda Terima UAT:_

**Penguji Pengadilan:** ********\_\_******** ( )  
**Penguji Kejaksaan:** ********\_\_******** ( )  
**Penguji Pemasyarakatan:** ********\_\_******** ( )
