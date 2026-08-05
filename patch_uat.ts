import fs from 'fs';

let content = fs.readFileSync('docs/UAT_SCENARIOS.md', 'utf8');

const s1Old = `4. Pindah ke tab **Input Manual**, pastikan data draf muncul, lalu lengkapi Nama Terdakwa, dan tekan **"Ajukan review"** (SUBMITTED).
5. Ganti peran sebagai **Panitera (Court Clerk)**.
6. Pada tabel Respons, setujui data dengan menekan **"Aktifkan"** (ACTIVE).
   - _Verifikasi 1.1:_ Perkara akan terpilih secara otomatis pada "Active Hearing Bar" (Header Atas).`;

const s1New = `4. Pindah ke tab **Input Manual**, pastikan data draf muncul, lalu lengkapi Nama Terdakwa, dan tekan **"Ajukan review"** (SUBMITTED).
5. Ganti peran sebagai **Panitera (Court Clerk)**.
6. Pada tabel Review, lakukan validasi administrasi dengan menekan **"Verifikasi Administrasi"** (ADMIN_VERIFIED).
7. Ganti peran sebagai **Hakim (Judge)**.
8. Lakukan validasi data persidangan dan tekan **"Setujui Data"** (DATA_APPROVED), lalu **"Aktifkan"** (ACTIVE).
   - _Verifikasi 1.1:_ Alur validasi berjenjang (Panitera -> Hakim) selesai dan Perkara terpilih secara otomatis pada "Active Hearing Bar" (Header Atas).`;

content = content.replace(s1Old, s1New);

const s2Old = `## 🟩 Skenario 2: Penetapan Hakim, Penjadwalan & Multi-Agenda

**Aktor:** Hakim (\`judge\`) & Panitera (\`court-clerk\`)

1. Login sebagai **Hakim**.
2. Masuk ke **Penetapan Hakim**. Pilih "Setujui" (APPROVED) pada status izin persidangan elektronik, dan mode \`ELEKTRONIK\`. Isi referensi penetapan, lalu "Simpan".
3. Ganti peran sebagai **Panitera**.
4. Masuk ke **Jadwal Sidang**.
5. Di Tab **Rincian Agenda**, susun dua agenda: (1) PEMBACAAN_DAKWAAN dan (2) PEMERIKSAAN_SAKSI, lalu simpan.
6. Di Tab **Jadwal Sidang**, pilih Ruang Sidang, lalu buat "Proposal Jadwal".
7. Tekan **"Cek Konflik"**, dan jika Hijau (CLEAR), tekan **"Setujui Jadwal"**.
   - _Verifikasi 2.1:_ Tab "Riwayat Perubahan" menyimpan histori penjadwalan tersebut.`;

const s2New = `## 🟩 Skenario 2: Penjadwalan, Penetapan Hakim & Multi-Agenda

**Aktor:** Hakim (\`judge\`) & Panitera (\`court-clerk\`)

1. Login sebagai **Panitera**.
2. Masuk ke **Jadwal Sidang**.
3. Di Tab **Rincian Agenda**, susun dua agenda: (1) PEMBACAAN_DAKWAAN dan (2) PEMERIKSAAN_SAKSI, lalu simpan.
4. Di Tab **Jadwal Sidang**, pilih Ruang Sidang, lalu buat "Proposal Jadwal" (Set Jadwal Sidang > 7 Hari ke depan).
5. Tekan **"Cek Konflik"**, dan jika Hijau (CLEAR), tekan **"Setujui Jadwal"**.
   - _Verifikasi 2.1:_ Tab "Riwayat Perubahan" menyimpan histori penjadwalan tersebut.
6. Ganti peran sebagai **Hakim**.
7. Masuk ke **Penetapan Pemberitahuan**. Berdasarkan jadwal yang sudah aktif, pilih "Setujui" (APPROVED) pada status izin persidangan elektronik, dan mode \`ELEKTRONIK\`. 
8. Isi referensi penetapan, lalu klik **Simpan & Hasilkan Format Baku**.
9. Lakukan Upload ulang dokumen Surat Penetapan yang telah ditandatangani.
   - _Verifikasi 2.2:_ Sistem memvalidasi dokumen penetapan di-upload minimal H-7 sebelum jadwal sidang.`;

content = content.replace(s2Old, s2New);

const s3Old = `2. Masuk ke **Pemberitahuan**. Buat _Notice_ dengan tipe \`AGENDA_SIDANG\`.
3. Kosongkan field "Subjek" dan "Isi Pesan" (agar sistem menggunakan Template Otomatis dari Admin Console).
4. Tambahkan penerima: Kejaksaan (Role: PROSECUTOR) dengan batas ACK default.
5. Klik **Kirim**.
6. Ganti peran sebagai **Penuntut Umum**.
7. Buka Dashboard, lihat ada peringatan "Tunggu Acknowledgment".
8. Buka menu **Pemberitahuan**, pada pemberitahuan masuk, klik **"Tandai Telah Diterima (ACK)"**.
   - _Verifikasi 3.1:_ Notifikasi _real-time_ SSE akan memperbarui tabel di sisi Panitera menjadi "ACKNOWLEDGED".`;

const s3New = `2. Masuk ke **Pemberitahuan**. Buat _Notice_ dengan tipe \`AGENDA_SIDANG\`.
3. Kosongkan field "Subjek" dan "Isi Pesan" (agar sistem menggunakan Template Otomatis dari Admin Console).
4. Tambahkan penerima: Kejaksaan (Role: PROSECUTOR) dengan batas ACK default. Klik **Kirim**.
5. Ganti peran sebagai **Penuntut Umum**.
6. Buka Dashboard, lihat ada peringatan "Tunggu Acknowledgment".
7. Buka menu **Pemberitahuan**, pada pemberitahuan masuk, klik **"Tandai Telah Diterima (ACK)"**.
8. Lakukan **Upload Dokumen Pemberitahuan ke Rutan**. (Wajib diupload minimal H-3 sebelum sidang).
   - _Verifikasi 3.1:_ Sistem SSE (_Server-Sent Events_) memperbarui tabel di sisi Panitera menjadi "ACKNOWLEDGED" dan memvalidasi SLA H-3 untuk Notice Gate Rutan.`;

content = content.replace(s3Old, s3New);

const s4Old = `## 🟩 Skenario 4: Checklist Kesiapan (Readiness)

**Aktor:** Petugas Pemasyarakatan / Rutan (\`corrections\`) & Panitera (\`court-clerk\`)

1. Login sebagai **Petugas Pemasyarakatan**.
2. Masuk ke **Kesiapan**.
3. Sistem akan meminta konfirmasi. Pastikan mencentang "Identitas Terdakwa Cocok" dan "Ruangan Sidang Steril" (Wajib untuk Rutan - SOP 10.7).
4. Klik **Nyatakan Siap**.
5. Ganti peran ke **Panitera**. Lakukan hal yang sama untuk Pengadilan.
   - _Verifikasi 4.1:_ Workflow Stepper di header atas pada langkah 'Kesiapan' berubah menjadi warna hijau (PASS).`;

const s4New = `## 🟩 Skenario 4: Checklist Kesiapan (Readiness) & Auto-Force Bypass

**Aktor:** Petugas Pemasyarakatan / Rutan (\`corrections\`) & Panitera (\`court-clerk\`)

1. Login sebagai **Petugas Pemasyarakatan**.
2. Masuk ke **Kesiapan**. Sistem meminta konfirmasi (dilakukan H-1). 
3. _Skenario Opsional/Edge Case:_ Biarkan status tidak diisi hingga jadwal sidang tersisa < 2 jam.
4. Ganti peran ke **Panitera** / **Operator IT**.
   - _Verifikasi 4.1:_ Workflow Stepper akan memberikan peringatan merah "AUTO_FORCED" (Bypass Kesiapan) karena waktu sidang tersisa kurang dari 2 jam.
5. (Kembali ke Normal Flow) Sebagai **Petugas Pemasyarakatan**, pastikan mencentang "Identitas Terdakwa Cocok" dan "Ruangan Sidang Steril" (Wajib untuk Rutan - SOP 10.7).
6. Klik **Nyatakan Siap**. Lakukan hal yang sama untuk Kejaksaan.
   - _Verifikasi 4.2:_ Workflow Stepper di header atas pada langkah 'Kesiapan' berubah menjadi warna hijau (READY).`;

content = content.replace(s4Old, s4New);

fs.writeFileSync('docs/UAT_SCENARIOS.md', content);
