# CIMS v1.0.0-RC1 - Skenario UAT Lintas Instansi

**Versi CIMS:** v1.0.0-RC1 (Release Candidate)  
**Tujuan Tes:** Validasi fungsionalitas dan alur kerja End-to-End oleh pengguna dari Pengadilan, Kejaksaan, dan Pemasyarakatan.  
**Tanggal Eksekusi:** _[Diisi Saat UAT]_  
**Tester:** _[Nama dan Instansi]_

---

## 🔐 Data Akun Pengujian (Login)

Pastikan Anda berada di environment `cims_dev` (Preproduction/UAT). Autentikasi menggunakan metode Login Standar (JWT). Gunakan kredensial berikut untuk melakukan perpindahan peran dalam skenario uji:

| Peran / Role          | Username                  | Password    |
| :-------------------- | :------------------------ | :---------- |
| Panitera Pengganti    | `panitera-pengganti-demo` | `Cims@2026` |
| Panitera (Checker)    | `panitera-demo`           | `Cims@2026` |
| Hakim Ketua           | `hakim-demo`              | `Cims@2026` |
| Penuntut Umum (Jaksa) | `jaksa-demo`              | `Cims@2026` |
| Petugas Rutan/Lapas   | `rutan-demo`              | `Cims@2026` |
| Operator TI           | `it-demo`                 | `Cims@2026` |
| Pejabat Penghubung    | `liaison-demo`            | `Cims@2026` |
| System Admin          | `admin-demo`              | `Cims@2026` |

---

## 🟩 Skenario 1: Penerimaan Data Awal (Hearing Intake) & Rekonsiliasi

**Aktor:** Panitera Pengganti (`substitute-clerk`) & Panitera (`court-clerk`)

1. Login sebagai `panitera-pengganti-demo`.
2. Masuk ke halaman **Data Persidangan**.
3. Di tab **Impor dari SIPP**, ketik Nomor Perkara (Misal: `123/Pid/2026/PN.Demo`) lalu klik **Tarik & Bandingkan Data**.
4. Pindah ke tab **Input Manual**, pastikan data draf muncul, lalu lengkapi Nama Terdakwa, dan tekan **"Ajukan review"** (SUBMITTED).
5. Log out, lalu login sebagai `panitera-demo`.
6. Pada tabel Review, lakukan validasi administrasi dengan menekan **"Verifikasi Administrasi"** (ADMIN_VERIFIED).
7. Log out, lalu login sebagai `hakim-demo`.
8. Lakukan validasi data persidangan dan tekan **"Setujui Data"** (DATA_APPROVED), lalu **"Aktifkan"** (ACTIVE).
   - _Verifikasi 1.1:_ Alur validasi berjenjang (Panitera -> Hakim) selesai dan Perkara terpilih secara otomatis pada "Active Hearing Bar" (Header Atas).

---

## 🟩 Skenario 2: Penjadwalan, Penetapan Hakim & Multi-Agenda

**Aktor:** Hakim (`judge`) & Panitera (`court-clerk`)

1. Login sebagai `panitera-demo`.
2. Masuk ke **Jadwal Sidang**.
3. Di Tab **Rincian Agenda**, susun dua agenda: (1) PEMBACAAN_DAKWAAN dan (2) PEMERIKSAAN_SAKSI, lalu simpan.
4. Di Tab **Jadwal Sidang**, pilih Ruang Sidang, lalu buat "Proposal Jadwal" (Set Jadwal Sidang > 7 Hari ke depan).
5. Tekan **"Cek Konflik"**, dan jika Hijau (CLEAR), tekan **"Setujui Jadwal"**.
   - _Verifikasi 2.1:_ Tab "Riwayat Perubahan" menyimpan histori penjadwalan tersebut.
6. Log out, lalu login sebagai `hakim-demo`.
7. Masuk ke **Penetapan Pemberitahuan**. Berdasarkan jadwal yang sudah aktif, pilih "Setujui" (APPROVED) pada status izin persidangan elektronik, dan mode `ELEKTRONIK`.
8. Isi referensi penetapan, lalu klik **Simpan & Hasilkan Format Baku**.
9. Lakukan Upload ulang dokumen Surat Penetapan yang telah ditandatangani.
   - _Verifikasi 2.2:_ Sistem memvalidasi dokumen penetapan di-upload minimal H-7 sebelum jadwal sidang.

---

## 🟩 Skenario 3: Pemberitahuan Lintas Instansi (Notices)

**Aktor:** Panitera (`court-clerk`) & Penuntut Umum (`prosecutor`)

1. Login sebagai `panitera-demo`.
2. Masuk ke **Pemberitahuan**. Buat _Notice_ dengan tipe `AGENDA_SIDANG`.
3. Kosongkan field "Subjek" dan "Isi Pesan" (agar sistem menggunakan Template Otomatis dari Admin Console).
4. Tambahkan penerima: Kejaksaan (Role: PROSECUTOR) dengan batas ACK default. Klik **Kirim**.
5. Log out, lalu login sebagai `jaksa-demo`.
6. Buka Dashboard, lihat ada peringatan "Tunggu Acknowledgment".
7. Buka menu **Pemberitahuan**, pada pemberitahuan masuk, klik **"Tandai Telah Diterima (ACK)"**.
8. Lakukan **Upload Dokumen Pemberitahuan ke Rutan**. (Wajib diupload minimal H-3 sebelum sidang).
   - _Verifikasi 3.1:_ Sistem SSE (_Server-Sent Events_) memperbarui tabel di sisi Panitera menjadi "ACKNOWLEDGED" dan memvalidasi SLA H-3 untuk Notice Gate Rutan.

---

## 🟩 Skenario 4: Checklist Kesiapan (Readiness) & Auto-Force Bypass

**Aktor:** Petugas Pemasyarakatan / Rutan (`corrections`) & Panitera (`court-clerk`)

1. Login sebagai `rutan-demo`.
2. Masuk ke **Kesiapan**. Sistem meminta konfirmasi (dilakukan H-1).
3. _Skenario Opsional/Edge Case:_ Biarkan status tidak diisi hingga jadwal sidang tersisa < 2 jam.
4. Log out, lalu login sebagai `panitera-demo` / `it-demo`.
   - _Verifikasi 4.1:_ Workflow Stepper akan memberikan peringatan merah "AUTO_FORCED" (Bypass Kesiapan) karena waktu sidang tersisa kurang dari 2 jam.
5. (Kembali ke Normal Flow) Log out, lalu login sebagai `rutan-demo` kembali, pastikan mencentang "Identitas Terdakwa Cocok" dan "Ruangan Sidang Steril" (Wajib untuk Rutan - SOP 10.7).
6. Klik **Nyatakan Siap**. Lakukan hal yang sama untuk Kejaksaan.
   - _Verifikasi 4.2:_ Workflow Stepper di header atas pada langkah 'Kesiapan' berubah menjadi warna hijau (READY).

---

## 🟩 Skenario 5: Pendaftaran Saksi & Ruang Virtual

**Aktor:** Panitera (`court-clerk`) & Operator IT (`it-operator`)

1. Login sebagai `panitera-demo`.
2. Masuk ke menu **Peserta**. Daftarkan peserta dengan peran **Saksi (WITNESS)**.
3. Di field baru "Kaitkan ke Agenda", pilih agenda ke-(2) Pemeriksaan Saksi yang dibuat tadi.
4. Centang **"Identitas Dilindungi"** dan berikan Alias (contoh: "Saksi Mahkota").
5. Log out, lalu login sebagai `it-demo`.
6. Buka **Ruang Virtual**, lalu klik tombol **Provisikan Ruangan (Zoom)**.
   - _Verifikasi 5.1:_ Ruang virtual sukses diprovisikan, dan Status Workflow berubah menjadi "READY" sepenuhnya.

---

## 🟩 Skenario 6: Eksekusi & Kontrol Sidang (Hard Gates)

**Aktor:** Hakim (`judge`) & Panitera (`court-clerk`)

1. Login sebagai `hakim-demo`.
2. Buka **Kontrol Sidang**. Saat ini status adalah `READY`.
3. Klik tombol **Buka Sidang** (START). Status berubah menjadi `STARTED`.
4. Pilih **Skors Sidang** (SUSPEND). Dialog merah akan muncul untuk meminta alasan/konfirmasi. Ketik alasan: "Ishoma", lalu setujui.
5. Lanjutkan kembali sidang, dan kemudian pilih **Tutup Sidang** (END).
6. Log out, lalu login sebagai `panitera-demo` (atau tetap sebagai `hakim-demo`).
7. Karena berkas berita acara belum di-upload, klik **Tandai Dokumentasi Tertunda** (FLAG DOCUMENTATION).
   - _Verifikasi 6.1:_ Banner kuning peringatan Dokumentasi Tertunda akan muncul.
8. Lengkapi form dan setelah selesai, klik **Selesaikan Dokumentasi** (COMPLETE DOCUMENTATION).

---

## 🟩 Skenario 7: Audit Log & Resolusi Mismatch (Eskalasi)

**Aktor:** Auditor (`auditor`) / Administrator Sistem (`system-admin`)

1. Login sebagai `admin-demo`.
2. Buka menu **Rekonsiliasi SIPP** (di bawah).
3. Masukkan ID Perkara `mismatch-test-123` untuk memicu Mode Simulasi UAT. Tarik Data.
4. Akan muncul tabel komparasi CIMS vs SIPP dengan indikator MERAH/KUNING.
5. Tekan tombol **Terapkan Sinkronisasi (Override)** pada salah satu field yang berbeda.
6. Log out, lalu login sebagai `admin-demo` (Atau role Auditor jika disiapkan). Buka halaman tersembunyi `http://localhost:8080/audit`.
   - _Verifikasi 7.1:_ Periksa riwayat. Semua kejadian dari _Intake_ (Skenario 1) hingga _Rekonsiliasi Override_ (Skenario 7) tercetak abadi di Log dengan integritas hash "Valid".

---

_Tanda Tangan Tanda Terima UAT:_

**Penguji Pengadilan:** **\*\*\*\***\_\_**\*\*\*\*** ( )  
**Penguji Kejaksaan:** **\*\*\*\***\_\_**\*\*\*\*** ( )  
**Penguji Pemasyarakatan:** **\*\*\*\***\_\_**\*\*\*\*** ( )
