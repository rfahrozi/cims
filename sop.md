# STANDAR OPERASIONAL PROSEDUR

## Pengelolaan Koordinasi dan Pelaksanaan Persidangan Pidana Umum dan Pidana Khusus Secara Elektronik melalui Platform Video Conference Terintegrasi CIMS di Tingkat Banding

### A. Identitas Dokumen

| Unsur               | Keterangan                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nama SOP            | SOP Pengelolaan Koordinasi dan Pelaksanaan Persidangan Pidana Umum dan Pidana Khusus Secara Elektronik melalui Platform Video Conference Terintegrasi CIMS Tingkat Banding |
| Kode Dokumen        | SOP/CIMS/PPE/001/2026                                                                                                                                                      |
| Versi               | 1.1                                                                                                                                                                        |
| Status              | Draft Siap Review / Siap Pakai Internal                                                                                                                                    |
| Unit Pemilik        | [Diisi unit pemilik]                                                                                                                                                       |
| Tanggal Efektif     | [Diisi saat pengesahan]                                                                                                                                                    |
| Tanggal Reviu       | [Diisi sesuai jadwal reviu]                                                                                                                                                |
| Klasifikasi Dokumen | Internal / Terbatas sesuai kebijakan                                                                                                                                       |

### B. Dasar Hukum

| No  | Dasar Hukum / Acuan                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ketentuan hukum acara pidana yang berlaku                                                                                                                                                                      |
| 2   | Undang-Undang Nomor 20 Tahun 2025 tentang Kitab Undang-Undang Hukum Acara Pidana, khususnya ketentuan yang relevan dengan Pasal 298 dan Pasal 300                                                              |
| 3   | Surat Edaran Mahkamah Agung Nomor 2 Tahun 2026 tentang Pedoman Pengajuan Kasasi                                                                                                                                |
| 4   | Perjanjian Kerja Sama antara Mahkamah Agung Republik Indonesia, Kejaksaan Republik Indonesia, dan Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia tentang Pelaksanaan Persidangan Secara Elektronik |
| 5   | Peraturan Sekretaris Mahkamah Agung Republik Indonesia Nomor 002 Tahun 2012 tentang Pedoman Penyusunan Standar Operasional Prosedur di Lingkungan Mahkamah Agung dan Badan Peradilan yang Berada di Bawahnya   |
| 6   | Pedoman teknis internal, kebijakan keamanan informasi, dan ketentuan penggunaan CIMS yang berlaku                                                                                                              |

### C. Tujuan

| No  | Tujuan                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------- |
| 1   | Menjamin persidangan elektronik berjalan tertib, sah, aman, akuntabel, dan terdokumentasi             |
| 2   | Menyelaraskan pelaksanaan persidangan elektronik dengan workflow CIMS                                 |
| 3   | Menjamin kepatuhan terhadap tenggat hukum dan administratif, termasuk ketentuan SEMA No. 2 Tahun 2026 |
| 4   | Menegaskan pembagian tugas, tanggung jawab, dan koordinasi antar-instansi sesuai PKS                  |
| 5   | Menjadi pedoman baku untuk pengendalian mutu, audit trail, dan evaluasi pelaksanaan sidang elektronik |

### D. Ruang Lingkup

| No  | Cakupan                                                                |
| --- | ---------------------------------------------------------------------- |
| 1   | Registrasi perkara dan verifikasi data                                 |
| 2   | Penjadwalan sidang dan pembacaan putusan                               |
| 3   | Penetapan pemberitahuan sidang dan pemberitahuan lintas instansi       |
| 4   | Upload surat pemberitahuan Kejaksaan kepada Rutan/Lapas                |
| 5   | Pengisian checklist kesiapan sidang                                    |
| 6   | Provisioning ruang sidang virtual                                      |
| 7   | Registrasi kehadiran, verifikasi identitas, dan pelaksanaan sidang     |
| 8   | Unggah petikan putusan serta pengiriman salinan putusan dan berkas     |
| 9   | Audit trail, pengendalian mutu, pelaporan, evaluasi, dan tindak lanjut |

### E. Definisi Singkat

| Istilah                   | Definisi                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CIMS                      | Court Intelligence Management System yang mengorkestrasi proses, status perkara, notifikasi, audit trail, dan koordinasi lintas instansi                         |
| Platform Video Conference | Media konferensi video yang disetujui dan digunakan untuk sidang elektronik, tidak terbatas hanya pada satu provider                                             |
| Hard Gate                 | Titik kendali wajib yang harus terpenuhi sebelum proses lanjut ke tahap berikutnya                                                                               |
| Auto-Forced Bypass        | Mekanisme sistem yang secara terkontrol memaksa status kesiapan agar sidang tetap dapat berjalan ketika checklist belum lengkap dan sisa waktu kurang dari 2 jam |
| RBAC/ABAC                 | Mekanisme kontrol akses berbasis peran dan atribut                                                                                                               |
| Metadata Sidang           | Data terstruktur mengenai jadwal, kehadiran, waktu, status, putusan, dan tindak lanjut sidang                                                                    |
| Catatan Merah             | Penanda deviasi kritis dalam sistem akibat bypass, keterlambatan, atau pelanggaran SLA yang wajib dievaluasi                                                     |

### F. Pelaksana

| No  | Pelaksana                                     | Peran Utama                                                                      |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Ketua Pengadilan / Pimpinan Satker            | Pengendali kebijakan, persetujuan strategis, dan eskalasi lintas instansi        |
| 2   | Majelis Hakim / Hakim                         | Memimpin sidang, mengonfirmasi kehadiran, legalitas, dan pembacaan putusan       |
| 3   | Panitera / Panitera Pengganti                 | Administrasi perkara, metadata sidang, unggah dokumen, monitoring tenggat        |
| 4   | Jaksa / Penuntut Umum                         | Koordinasi dokumen kejaksaan, kehadiran, dan upload pemberitahuan ke Rutan/Lapas |
| 5   | Petugas Rutan/Lapas / Instansi Pemasyarakatan | Kesiapan terdakwa, sarana, keamanan, dan kehadiran elektronik                    |
| 6   | Admin CIMS / Admin Sistem                     | Pengelolaan akun, akses, workflow, logging, dan notifikasi sistem                |
| 7   | Operator Sidang / Operator Teknis             | Kesiapan teknis, provisioning ruang virtual, bantuan teknis saat sidang          |
| 8   | Petugas Keamanan / Verifikator                | Verifikasi identitas dan pengamanan akses fisik maupun virtual                   |
| 9   | Liaison Officer / Pejabat Penghubung          | Koordinasi, eskalasi, dan sinkronisasi antar-instansi                            |

### G. Mutu Baku Utama

| No  | Objek Kendali                                | Mutu Baku                                                                            |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Data perkara                                 | Seluruh field wajib terisi dan tervalidasi                                           |
| 2   | Hak akses                                    | Tidak ada pengguna aktif tanpa kewenangan yang sah                                   |
| 3   | Penetapan sidang                             | Tersedia di CIMS minimal H-7                                                         |
| 4   | Surat pemberitahuan Kejaksaan ke Rutan/Lapas | Tersedia di CIMS minimal H-3                                                         |
| 5   | Checklist kesiapan                           | Lengkap maksimal H-1                                                                 |
| 6   | Auto-forced bypass                           | Hanya berlaku bila sisa waktu kurang dari 2 jam, wajib catatan merah dan audit trail |
| 7   | Ruang sidang virtual                         | Hanya diprovisioning bila status ALL_READY atau AUTO_FORCED yang sah                 |
| 8   | Kehadiran pihak                              | Tercatat jelas langsung / elektronik / tidak hadir                                   |
| 9   | Petikan putusan                              | Diunggah pada hari yang sama                                                         |
| 10  | Salinan putusan dan berkas                   | Terkirim paling lambat 7 hari                                                        |
| 11  | Audit trail                                  | Event minimum tercatat lengkap, utuh, dan dapat ditelusuri                           |
| 12  | Evaluasi deviasi                             | Setiap catatan merah menghasilkan tindak lanjut                                      |

### H. Sarana dan Prasarana

| No  | Sarana / Prasarana                         | Keterangan                                     |
| --- | ------------------------------------------ | ---------------------------------------------- |
| 1   | Komputer / laptop                          | Untuk akses CIMS dan dokumen sidang            |
| 2   | Kamera, mikrofon, speaker / headset        | Untuk pelaksanaan sidang elektronik            |
| 3   | Internet utama dan cadangan                | Menjamin kontinuitas sidang                    |
| 4   | Akun platform video conference             | Provider yang disetujui                        |
| 5   | Akses CIMS dan sistem informasi pengadilan | Untuk workflow, dokumen, dan logging           |
| 6   | Listrik dan cadangan daya                  | Menjamin keberlangsungan proses                |
| 7   | Ruang sidang / ruang terdakwa              | Aman, terkendali, dan sesuai kebutuhan perkara |
| 8   | Kontak eskalasi teknis dan operasional     | Untuk penyelesaian kendala secara cepat        |

## I. Tabel SOP Utama

### 1. Registrasi Perkara dan Verifikasi Awal

| No  | Kegiatan                            | Pelaksana                      | Mutu Baku                  | Kelengkapan                                                      | Waktu                                | Output                                | Keterangan                               |
| --- | ----------------------------------- | ------------------------------ | -------------------------- | ---------------------------------------------------------------- | ------------------------------------ | ------------------------------------- | ---------------------------------------- |
| 1   | Input / verifikasi data perkara     | Panitera / Operator CIMS       | Data lengkap dan valid     | Nomor perkara, jenis perkara, identitas para pihak, dokumen awal | Segera setelah perkara siap diproses | Data perkara aktif di CIMS            | Menjadi dasar seluruh alur               |
| 2   | Verifikasi kewenangan dan hak akses | Admin CIMS / pejabat berwenang | Hak akses sesuai RBAC/ABAC | Akun, role, atribut perkara, persetujuan akses                   | Sebelum penjadwalan aktif            | User berwenang dapat mengakses proses | Jika gagal, proses berhenti di hard gate |

### 2. Penjadwalan, Penetapan, dan Pemberitahuan

| No  | Kegiatan                                                                     | Pelaksana                         | Mutu Baku                                     | Kelengkapan                                     | Waktu                            | Output                | Keterangan                                                  |
| --- | ---------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- | ----------------------------------------------- | -------------------------------- | --------------------- | ----------------------------------------------------------- |
| 1   | Menetapkan jadwal sidang / pembacaan putusan                                 | Hakim / Panitera                  | Jadwal sah dan tidak bentrok                  | Kalender sidang, conflict check, data perkara   | Sebelum H-7                      | Jadwal aktif          | Dasar penerbitan penetapan                                  |
| 2   | Menyusun dan menandatangani penetapan pemberitahuan sidang pembacaan putusan | Hakim / Panitera                  | Dokumen sah dan lengkap                       | Draft penetapan, tanda tangan, metadata sidang  | Minimal H-7                      | Penetapan siap unggah | Harus sesuai format yang berlaku                            |
| 3   | Upload penetapan ke CIMS                                                     | Panitera / Operator               | Tersedia di sistem tepat waktu                | File penetapan final                            | Minimal H-7                      | Penetapan terunggah   | Hard gate wajib                                             |
| 4   | Kirim notifikasi lintas instansi                                             | CIMS / Panitera / Liaison Officer | Pemberitahuan terkirim dan tercatat           | Kanal notifikasi, daftar penerima, status kirim | Setelah upload penetapan         | Log notifikasi        | Dapat memakai email, WhatsApp, SMS, in-app                  |
| 5   | Reminder dan acknowledgment                                                  | Sistem / instansi penerima        | Ada pencatatan acknowledgment bila diwajibkan | Konfigurasi notifikasi, reminder                | Mengikuti konfigurasi aktif CIMS | Status penerimaan     | Parameter default mengikuti konfigurasi sistem yang berlaku |

### 3. Upload Surat Pemberitahuan oleh Kejaksaan kepada Rutan/Lapas

| No  | Kegiatan                                        | Pelaksana                         | Mutu Baku                           | Kelengkapan                                            | Waktu                      | Output                       | Keterangan                                                       |
| --- | ----------------------------------------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------ | -------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| 1   | Menyusun surat pemberitahuan kepada Rutan/Lapas | Kejaksaan                         | Dokumen sesuai kebutuhan perkara    | Surat pemberitahuan, identitas terdakwa, jadwal sidang | Setelah menerima penetapan | Dokumen siap unggah          | Harus mengacu pada agenda resmi                                  |
| 2   | Upload surat pemberitahuan ke CIMS              | Kejaksaan                         | Dokumen tersedia di sistem          | File surat, identitas pengunggah, waktu unggah         | Minimal H-3                | Surat pemberitahuan tersedia | Menjadi dasar kesiapan Rutan/Lapas                               |
| 3   | Verifikasi ketersediaan dokumen                 | Liaison Officer / petugas terkait | Tidak ada dokumen wajib yang hilang | Surat pemberitahuan, log unggah                        | H-3 sampai H-1             | Status verifikasi            | Bila terlambat, sistem memberi status keterlambatan dan eskalasi |

### 4. Checklist Kesiapan Sidang

| No  | Kegiatan                           | Pelaksana                      | Mutu Baku                   | Kelengkapan                                              | Waktu                     | Output                        | Keterangan                                       |
| --- | ---------------------------------- | ------------------------------ | --------------------------- | -------------------------------------------------------- | ------------------------- | ----------------------------- | ------------------------------------------------ |
| 1   | Isi checklist kesiapan pengadilan  | Operator Pengadilan / Panitera | Checklist lengkap           | Ruang sidang, jaringan, perangkat, akun VC, personel     | Maksimal H-1              | Checklist pengadilan lengkap  | Bagian dari hard gate readiness                  |
| 2   | Isi checklist kesiapan kejaksaan   | Petugas Kejaksaan              | Checklist lengkap           | Perangkat, jaringan, petugas, dokumen                    | Maksimal H-1              | Checklist kejaksaan lengkap   | Sistem memberi reminder bila belum lengkap       |
| 3   | Isi checklist kesiapan Rutan/Lapas | Petugas Rutan/Lapas            | Checklist lengkap           | Ruang, perangkat, jaringan, keamanan, identitas terdakwa | Maksimal H-1              | Checklist Rutan/Lapas lengkap | Sangat penting untuk validasi kehadiran terdakwa |
| 4   | Review status readiness            | Sistem CIMS / Operator         | Status ALL_READY atau belum | Semua checklist dari pihak terkait                       | H-1 sampai sebelum sidang | Status readiness              | Syarat provisioning ruang virtual                |

### 5. Auto-Forced Bypass dan Provisioning Ruang Virtual

| No  | Kegiatan                               | Pelaksana            | Mutu Baku                                 | Kelengkapan                                           | Waktu                    | Output                     | Keterangan                                       |
| --- | -------------------------------------- | -------------------- | ----------------------------------------- | ----------------------------------------------------- | ------------------------ | -------------------------- | ------------------------------------------------ |
| 1   | Evaluasi keterlambatan checklist       | Sistem CIMS          | Deviasi terdeteksi tepat waktu            | Status checklist, waktu sidang                        | Saat mendekati sidang    | Status deviasi             | Trigger menuju bypass bila syarat terpenuhi      |
| 2   | Menjalankan auto-forced bypass         | Sistem CIMS          | Hanya saat sisa waktu kurang dari 2 jam   | Status checklist belum lengkap, log waktu             | Saat sisa waktu < 2 jam  | Status AUTO_FORCED         | Wajib menimbulkan catatan merah                  |
| 3   | Mencatat catatan merah dan audit trail | Sistem CIMS / Admin  | Seluruh bypass terekam                    | Identitas perkara, waktu, instansi yang belum lengkap | Seketika                 | Log catatan merah          | Wajib dievaluasi pasca-sidang                    |
| 4   | Provisioning ruang sidang virtual      | Operator IT / Sistem | Hanya saat ALL_READY atau AUTO_FORCED sah | Status readiness, akun platform VC                    | Setelah syarat terpenuhi | Ruang sidang virtual aktif | Tidak boleh diprovisioning sebelum hard gate sah |

### 6. Registrasi Kehadiran dan Verifikasi Identitas

| No  | Kegiatan                  | Pelaksana                      | Mutu Baku              | Kelengkapan                                           | Waktu                   | Output                | Keterangan                          |
| --- | ------------------------- | ------------------------------ | ---------------------- | ----------------------------------------------------- | ----------------------- | --------------------- | ----------------------------------- |
| 1   | Registrasi peserta sidang | Operator Sidang / Panitera     | Seluruh pihak tercatat | Daftar peserta, peran, media kehadiran                | Sebelum sidang dimulai  | Data peserta sidang   | Termasuk pihak dari lokasi berbeda  |
| 2   | Verifikasi identitas      | Hakim / Panitera / Verifikator | Identitas valid        | Kartu identitas, data perkara, bukti visual           | Sebelum sidang dibuka   | Identitas tervalidasi | Untuk terdakwa harus lebih ketat    |
| 3   | Pencatatan cara kehadiran | Panitera                       | Kehadiran jelas        | Status langsung / elektronik / tidak hadir / diwakili | Sebelum dan saat sidang | Metadata kehadiran    | Penting untuk implikasi hukum acara |

### 7. Pelaksanaan Sidang Elektronik

| No  | Kegiatan                  | Pelaksana                          | Mutu Baku                          | Kelengkapan                                     | Waktu              | Output                                  | Keterangan                           |
| --- | ------------------------- | ---------------------------------- | ---------------------------------- | ----------------------------------------------- | ------------------ | --------------------------------------- | ------------------------------------ |
| 1   | Membuka sidang            | Hakim                              | Sidang dibuka sesuai hukum acara   | Kehadiran, ruang virtual aktif, kesiapan teknis | Pada jadwal sidang | Sidang dimulai                          | Hakim memastikan prasyarat terpenuhi |
| 2   | Menjaga stabilitas teknis | Operator Teknis                    | Kualitas audio-video layak         | Koneksi, perangkat, dukungan teknis             | Selama sidang      | Sidang berjalan stabil                  | Gangguan harus dicatat               |
| 3   | Mencatat jalannya sidang  | Panitera / petugas pencatat        | Metadata lengkap dan akurat        | Waktu mulai, pihak hadir, kejadian penting      | Selama sidang      | Catatan persidangan                     | Menjadi bagian audit trail           |
| 4   | Menangani gangguan        | Hakim / Operator / Liaison Officer | Gangguan ditangani sesuai prosedur | Log gangguan, keputusan hakim, notifikasi       | Jika terjadi       | Keputusan lanjut / tunda / jadwal ulang | Harus terdokumentasi                 |

### 8. Pembacaan Putusan dan Kepatuhan SEMA

| No  | Kegiatan                                    | Pelaksana        | Mutu Baku                              | Kelengkapan                                      | Waktu                    | Output                       | Keterangan                           |
| --- | ------------------------------------------- | ---------------- | -------------------------------------- | ------------------------------------------------ | ------------------------ | ---------------------------- | ------------------------------------ |
| 1   | Mencatat waktu pembacaan putusan            | Panitera         | Waktu tercatat tepat                   | Agenda, jam pembacaan, identitas perkara         | Saat putusan dibacakan   | Data waktu pembacaan         | Penting untuk tenggang waktu kasasi  |
| 2   | Mencatat kehadiran terdakwa dan/atau JPU    | Panitera / Hakim | Kehadiran tercatat jelas               | Status hadir langsung / elektronik / tidak hadir | Saat putusan dibacakan   | Metadata kehadiran putusan   | Harus jelas untuk kepatuhan SEMA     |
| 3   | Verifikasi kelengkapan metadata hukum acara | Panitera         | Tidak ada data hukum acara yang hilang | Waktu pembacaan, kehadiran, dokumen terkait      | Segera setelah pembacaan | Metadata hukum acara lengkap | Mendukung perhitungan tenggang waktu |

### 9. Unggah Petikan Putusan dan Pengiriman Salinan / Berkas

| No  | Kegiatan                                              | Pelaksana                          | Mutu Baku                                   | Kelengkapan                                       | Waktu                | Output                   | Keterangan                     |
| --- | ----------------------------------------------------- | ---------------------------------- | ------------------------------------------- | ------------------------------------------------- | -------------------- | ------------------------ | ------------------------------ |
| 1   | Upload petikan putusan ke sistem informasi pengadilan | Panitera                           | Diunggah pada hari yang sama                | Petikan putusan final, metadata unggah            | Hari yang sama       | Petikan putusan tersedia | Wajib sesuai SEMA              |
| 2   | Catat bukti unggah                                    | Panitera / Operator                | Bukti unggah lengkap                        | Waktu unggah, identitas pengunggah, status sukses | Seketika             | Log unggah               | Masuk audit trail              |
| 3   | Mengirim salinan putusan dan berkas perkara           | Panitera / unit administrasi       | Terkirim tepat waktu                        | Salinan putusan, berkas perkara, bukti pengiriman | Paling lambat 7 hari | Salinan/berkas terkirim  | Bila terlambat, eskalasi wajib |
| 4   | Monitoring keterlambatan                              | Liaison Officer / Pimpinan terkait | Tidak ada keterlambatan tanpa tindak lanjut | Status pengiriman, log reminder                   | Sampai selesai       | Status monitoring        | Menjadi bahan evaluasi         |

### 10. Penutupan, Audit Trail, dan Evaluasi

| No  | Kegiatan                           | Pelaksana                       | Mutu Baku                            | Kelengkapan                                                | Waktu                           | Output                | Keterangan                     |
| --- | ---------------------------------- | ------------------------------- | ------------------------------------ | ---------------------------------------------------------- | ------------------------------- | --------------------- | ------------------------------ |
| 1   | Menutup status sidang              | Panitera / Admin                | Tidak ada item wajib tertinggal      | Metadata, dokumen, catatan sidang                          | Setelah seluruh dokumen lengkap | Status sidang closed  | Menutup workflow               |
| 2   | Menyimpan audit trail              | Sistem CIMS / Admin             | Event minimum lengkap dan utuh       | Log perubahan data, notifikasi, bypass, kehadiran, putusan | Berjalan terus                  | Audit trail tersimpan | Tidak boleh diubah sembarangan |
| 3   | Evaluasi deviasi dan catatan merah | QA / Pimpinan / Liaison Officer | Setiap catatan merah ditindaklanjuti | Laporan insiden, log bypass, keterlambatan, gangguan       | Pasca-sidang / berkala          | Laporan evaluasi      | Wajib ada tindakan korektif    |
| 4   | Monitoring KPI                     | Pimpinan / QA / Admin           | KPI terukur dan dilaporkan           | Data jadwal, notifikasi, upload, pengiriman, gangguan      | Berkala                         | Laporan KPI           | Dasar perbaikan SOP dan sistem |

### 11. Skenario Khusus: Penanganan Insiden, Mutasi Tahanan, dan Putusan Banding

| No  | Kejadian / Skenario Khusus     | Pelaksana              | Tindakan Administratif / Sistem                                                                                                                   | Keterangan Tambahan                                 |
| --- | ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Insiden Teknis / Siber / Kahar | Operator IT / Keamanan | Mencatat insiden (SOP 10.11-10.13). Jika `CRITICAL`/`HIGH`, status sidang diubah menjadi `SUSPENDED`.                                             | Wajib lapor 1x24 jam (Siber) atau 3x24 jam (Kahar). |
| 2   | Mutasi / Perpindahan Tahanan   | Pejabat Penghubung     | Mendaftarkan Mutasi (SOP 10.14). Sistem membatalkan kesiapan Rutan sebelumnya dan mewajibkan _re-checklist_ serta _re-verifikasi_ di tempat baru. | Bersifat membatalkan kelayakan (Force re-eval).     |
| 3   | Pembacaan Putusan Banding      | Panitera               | Generate Surat Penetapan (SOP 10.15) dengan link Zoom, cetak, tanda tangan, lalu unggah pindai PDF-nya ke `EvidenceStorageGateway`.               | Sesuai lampiran form SEMA No. 2/2026.               |

| Gate | Nama Gate                              | Syarat Lulus                           | Konsekuensi jika Tidak Lulus               |
| ---- | -------------------------------------- | -------------------------------------- | ------------------------------------------ |
| 1    | Registrasi Perkara Lengkap             | Data perkara dan dokumen awal lengkap  | Tidak bisa lanjut penjadwalan              |
| 2    | Verifikasi Akses                       | Role dan atribut akses sah             | User dibatasi dari proses lanjutan         |
| 3    | Penetapan Pemberitahuan                | Penetapan terunggah minimal H-7        | Notifikasi resmi belum dapat dijalankan    |
| 4    | Pemberitahuan Kejaksaan ke Rutan/Lapas | Surat terunggah minimal H-3            | Status terlambat dan eskalasi              |
| 5    | Checklist Kesiapan                     | Semua checklist lengkap maksimal H-1   | Sistem menahan readiness                   |
| 6    | Auto-Forced Bypass                     | Hanya jika sisa waktu < 2 jam          | Muncul catatan merah dan audit trail wajib |
| 7    | Provisioning Ruang Virtual             | ALL_READY atau AUTO_FORCED sah         | Ruang sidang tidak dapat dibuat            |
| 8    | Dokumentasi Sidang                     | Metadata dan log lengkap               | Penutupan sidang tertunda                  |
| 9    | Tindak Lanjut Administratif            | Petikan dan pengiriman berkas dipenuhi | Status deviasi administratif               |

## K. Event Audit Trail Minimum

| No  | Event Wajib Dicatat                                     |
| --- | ------------------------------------------------------- |
| 1   | Pembuatan, perubahan, dan penutupan data perkara        |
| 2   | Aktivasi atau perubahan jadwal sidang                   |
| 3   | Upload penetapan pemberitahuan sidang                   |
| 4   | Pengiriman notifikasi dan status acknowledgment         |
| 5   | Upload surat pemberitahuan Kejaksaan ke Rutan/Lapas     |
| 6   | Pengisian dan perubahan checklist kesiapan              |
| 7   | Auto-forced bypass dan catatan merah                    |
| 8   | Provisioning ruang sidang virtual                       |
| 9   | Registrasi kehadiran dan verifikasi identitas           |
| 10  | Pembukaan, pelaksanaan, dan penutupan sidang            |
| 11  | Pencatatan waktu pembacaan putusan                      |
| 12  | Upload petikan putusan                                  |
| 13  | Pengiriman salinan putusan dan berkas                   |
| 14  | Insiden teknis, insiden keamanan, dan tindakan korektif |

## L. Indikator Kinerja

| No  | Indikator                                                      | Target Minimum                    |
| --- | -------------------------------------------------------------- | --------------------------------- |
| 1   | Persentase sidang berjalan sesuai jadwal                       | [Diisi target internal]           |
| 2   | Persentase penetapan terunggah minimal H-7                     | 100%                              |
| 3   | Persentase surat pemberitahuan Kejaksaan terunggah minimal H-3 | 100%                              |
| 4   | Persentase checklist lengkap maksimal H-1                      | [Diisi target internal]           |
| 5   | Persentase petikan putusan diunggah di hari yang sama          | 100%                              |
| 6   | Persentase salinan/berkas terkirim paling lambat 7 hari        | 100%                              |
| 7   | Jumlah catatan merah per periode                               | Semakin rendah semakin baik       |
| 8   | Jumlah insiden akses tidak sah                                 | 0 atau sesuai toleransi kebijakan |
| 9   | Waktu respons eskalasi                                         | [Diisi target internal]           |
| 10  | Persentase tindak lanjut evaluasi yang selesai                 | [Diisi target internal]           |

## M. Ketentuan Khusus

| No  | Ketentuan                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------- |
| 1   | Untuk perkara pidana khusus, hak akses, pengamanan, dan verifikasi dapat diperketat sesuai kewenangan |
| 2   | Provider video conference dapat berubah sepanjang disetujui dan tetap terintegrasi dengan CIMS        |
| 3   | Auto-forced bypass tidak menghapus tanggung jawab instansi yang terlambat mengisi checklist           |
| 4   | Setiap deviasi SLA wajib dievaluasi dan dapat menjadi dasar tindakan pembinaan atau perbaikan proses  |

## N. Penutup

SOP ini merupakan dokumen operasional baku untuk pengelolaan koordinasi dan pelaksanaan persidangan pidana secara elektronik berbasis CIMS. Seluruh pihak wajib melaksanakan SOP ini secara konsisten, menjaga keamanan informasi, memenuhi tenggat waktu, dan memastikan setiap deviasi tercatat serta ditindaklanjuti.

## O. Lampiran yang Disarankan

| No  | Lampiran                                              |
| --- | ----------------------------------------------------- |
| 1   | Form checklist kesiapan pengadilan                    |
| 2   | Form checklist kesiapan kejaksaan                     |
| 3   | Form checklist kesiapan Rutan/Lapas                   |
| 4   | Form log gangguan teknis                              |
| 5   | Form log insiden keamanan                             |
| 6   | Matriks RBAC/ABAC                                     |
| 7   | Daftar liaison officer dan escalation path            |
| 8   | Form monitoring upload petikan putusan                |
| 9   | Form monitoring pengiriman salinan putusan dan berkas |
| 10  | Form evaluasi catatan merah dan auto-forced bypass    |

---

DETIL SOP

Berikut penjabaran SOP persidangan elektronik berbasis CIMS dalam bentuk tabel yang diselaraskan dengan Peraturan Sekretaris Mahkamah Agung RI Nomor 002 Tahun 2012 tentang Pedoman Penyusunan SOP. Dari dokumen peraturan yang Anda kirim, jelas bahwa regulasi itu memang menjadi pedoman penyusunan SOP di lingkungan Mahkamah Agung dan badan peradilan, dan dalam praktik format SOP-nya menekankan unsur prosedur, pelaksana, mutu baku, serta dokumen/kelengkapan pendukung.

Agar mudah dipakai untuk review pimpinan, saya susun dalam dua lapis. Tabel pertama menjelaskan kesesuaian struktur SOP terhadap kerangka Persekma 002/2012. Tabel kedua menjabarkan alur SOP operasional dalam format yang lebih dekat dengan tabel SOP formal: kegiatan, pelaksana, mutu baku, waktu, output, dan keterangan.

1. Tabel kesesuaian struktur SOP dengan Persekma 002 Tahun 2012
   | Komponen menurut pedoman SOP MA | Makna dalam pedoman | Sudah ada di sop-revisi.md | Penjelasan rinci | Status |
   | --- | --- | --- | --- | --- |
   | Judul SOP | Harus menunjukkan objek dan proses yang diatur | Ada | Judul sudah spesifik: pengelolaan koordinasi dan pelaksanaan persidangan pidana umum dan pidana khusus secara elektronik melalui platform video conference terintegrasi CIMS. Ini sudah memenuhi asas kejelasan objek dan ruang kerja. | Sesuai |
   | Identitas dokumen | Memuat nama dokumen, kode, versi, status, unit pemilik, tanggal efektif | Ada | Bagian A sudah memuat identitas dokumen, versi, status berlaku, unit pemilik, dan peninjauan berkala. Ini sesuai praktik SOP formal di lingkungan peradilan. | Sesuai |
   | Tujuan | Menjelaskan kenapa SOP dibuat dan hasil yang ingin dicapai | Ada | Bagian B menjelaskan tujuan hukum, operasional, orkestrasi CIMS, kepatuhan SEMA, dan sinkronisasi PKS. Ini cukup kuat karena tidak hanya administratif, tetapi juga compliance-oriented. | Sesuai |
   | Ruang lingkup | Menentukan batas proses yang diatur | Ada | Bagian C sudah mencakup pra-persidangan, verifikasi, penjadwalan, pelaksanaan, dokumen, audit trail, evaluasi, dan tindak lanjut. Ruang lingkupnya lengkap dan jelas. | Sesuai |
   | Dasar hukum | Menyebut regulasi yang menjadi landasan | Ada | Bagian D sudah memuat KUHAP, SEMA No. 2 Tahun 2026, PKS, dan acuan internal. Namun, jika ingin benar-benar formal menurut tata naskah SOP MA, Persekma 002 Tahun 2012 itu sendiri perlu ditambahkan eksplisit ke daftar dasar hukum/acuan. | Perlu penambahan kecil |
   | Definisi | Menyamakan pengertian istilah | Ada | Bagian E sudah baik karena mendefinisikan istilah teknis seperti CIMS, hard gate, immutable audit trail, RBAC/ABAC, dan metadata sidang. Ini penting untuk menghindari multi-tafsir. | Sesuai |
   | Prinsip SOP | Menegaskan nilai dasar pelaksanaan | Ada | Bagian F sudah memuat legalitas, akuntabilitas, efisiensi, keamanan, keterlacakan, kesetaraan akses, koordinasi, dan fallback. Ini memperkuat legitimasi SOP. | Sesuai |
   | Pelaksana | Menentukan siapa yang melakukan tiap langkah | Ada | Bagian G sudah memetakan Ketua Pengadilan, Hakim, Panitera, Jaksa, petugas pemasyarakatan/imigrasi, admin sistem, operator, keamanan, dan liaison officer. Ini sangat penting untuk format SOP formal. | Sesuai |
   | Sarana/perlengkapan | Menjelaskan kebutuhan alat dan media | Ada | Bagian H sudah memuat perangkat, koneksi, akun video conference, akses CIMS, listrik cadangan, ruang aman, dan kontak eskalasi. Ini sesuai unsur perlengkapan dalam SOP. | Sesuai |
   | Prosedur/langkah kerja | Inti SOP berupa urutan kegiatan | Ada | Bagian I dan J sudah memuat hard gate, timeline, penetapan, notifikasi, upload surat, checklist kesiapan, auto-forced bypass, sidang, putusan, dan pasca-sidang. | Sesuai |
   | Mutu baku | Ukuran keberterimaan proses/hasil | Ada, tapi belum diformat tabel SOP murni | Dalam sop-revisi.md, mutu baku tersebar di hard gate, SLA H-7/H-3/H-1, auto-forced <2 jam, unggah putusan di hari yang sama, dan pengiriman berkas 7 hari. Agar lebih sesuai gaya Persekma, mutu baku ini idealnya dipindahkan juga ke tabel prosedur formal. | Parsial |
   | Waktu penyelesaian | Batas waktu tiap tahapan | Ada | Sudah ada timeline H-7, H-3, H-1, <2 jam, same day, dan 7 hari. Ini salah satu penguatan terbesar pada SOP revisi. | Sesuai |
   | Output | Hasil dari tiap langkah | Ada secara substantif, belum dipisah konsisten | Output sudah tersirat, seperti penetapan terunggah, surat pemberitahuan tersedia, checklist lengkap, ruang virtual siap, metadata lengkap, petikan putusan terunggah. Supaya lebih formal, output sebaiknya dibuat kolom khusus. | Parsial |
   | Peringatan/eskalasi | Apa yang dilakukan jika terjadi deviasi | Ada | Sudah ada auto-forced bypass, catatan merah, eskalasi ke liaison officer, dan tindak lanjut korektif. Ini sangat baik untuk kontrol operasional. | Sesuai |
   | Pencatatan dan pendataan | Bukti proses dan arsip | Ada | Bagian audit trail, metadata sidang, log insiden, dan evaluasi sudah memenuhi unsur pencatatan. | Sesuai |
   | Evaluasi dan pengendalian | Menilai mutu pelaksanaan SOP | Ada | Bagian M, N, O, P sudah memuat audit trail, indikator kinerja, manajemen risiko, pelaporan, dan evaluasi kesiapan operasional. | Sesuai |

2. Penjelasan rinci SOP dalam format tabel operasional
   Tabel ini saya susun agar lebih dekat dengan model SOP formal yang lazim dipakai di lingkungan Mahkamah Agung: ada kegiatan, pelaksana, mutu baku, waktu, output, dan keterangan.

| No  | Tahap/Kegiatan                                               | Pelaksana                              | Uraian rinci                                                                                                                 | Mutu baku / standar hasil                                                       | Batas waktu                           | Output                                 | Keterangan                                                                 |
| --- | ------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Registrasi perkara                                           | Panitera / Operator CIMS               | Data pokok perkara, jenis perkara, pihak terkait, dan dokumen awal dimasukkan ke CIMS                                        | Data perkara lengkap dan tervalidasi, tidak ada field wajib kosong              | Sejak perkara siap dijadwalkan        | Data perkara aktif di CIMS             | Menjadi dasar seluruh tahapan berikutnya                                   |
| 2   | Verifikasi akses dan kewenangan                              | Admin CIMS / pejabat berwenang         | Memastikan user, role, dan atribut akses sesuai perkara                                                                      | Hak akses valid sesuai RBAC/ABAC; tidak ada user tanpa otorisasi                | Sebelum penjadwalan aktif             | Hak akses tervalidasi                  | Jika gagal, proses berhenti di hard gate                                   |
| 3   | Aktivasi jadwal sidang                                       | Panitera / Hakim / admin jadwal        | Menetapkan agenda sidang/pembacaan putusan setelah conflict check                                                            | Tidak ada benturan jadwal dan agenda sah                                        | Sebelum H-7                           | Jadwal aktif                           | Dasar pembentukan penetapan                                                |
| 4   | Pembuatan dan unggah penetapan pemberitahuan sidang          | Hakim / Panitera                       | Penetapan dibuat, ditandatangani, dan diunggah ke CIMS                                                                       | Dokumen resmi tersedia dan dapat diakses pihak berwenang                        | Minimal H-7                           | Penetapan pemberitahuan terunggah      | Ini harus menjadi hard gate formal                                         |
| 5   | Pengiriman notifikasi lintas instansi                        | CIMS / Panitera / liaison officer      | Sistem mengirim pemberitahuan ke pengadilan, kejaksaan, dan instansi terkait                                                 | Notifikasi terkirim, tercatat statusnya, dan ada acknowledgment bila diwajibkan | Setelah penetapan tersedia            | Log notifikasi                         | Default SLA notifikasi mengikuti konfigurasi sistem                        |
| 6   | Upload surat pemberitahuan oleh kejaksaan kepada Rutan/Lapas | Kejaksaan                              | Kejaksaan mengunggah surat/dokumen pemberitahuan ke Rutan/Lapas melalui mekanisme resmi                                      | Dokumen tersedia di CIMS, asal instansi dan waktu unggah tercatat               | Minimal H-3                           | Surat pemberitahuan kejaksaan tersedia | Bila lewat H-3, sistem harus beri status terlambat dan eskalasi            |
| 7   | Verifikasi penerimaan lintas instansi                        | Liaison officer / operator instansi    | Memastikan pihak penerima mengetahui agenda, dokumen, dan tanggung jawabnya                                                  | Tidak ada pihak kritikal yang belum menerima pemberitahuan                      | H-3 sampai H-1                        | Status penerimaan tervalidasi          | Penting untuk mencegah sidang gagal karena miskomunikasi                   |
| 8   | Pengisian checklist kesiapan pengadilan                      | Operator pengadilan                    | Mengecek ruang sidang, perangkat, jaringan, akun VC, akses CIMS, personel                                                    | Semua item checklist terisi lengkap                                             | Maksimal H-1                          | Checklist pengadilan lengkap           | Idealnya dibuat checklist terpisah sebagai lampiran                        |
| 9   | Pengisian checklist kesiapan kejaksaan                       | Petugas kejaksaan                      | Memastikan perangkat, jaringan, petugas, dan dokumen siap                                                                    | Semua item wajib terisi                                                         | Maksimal H-1                          | Checklist kejaksaan lengkap            | Jika belum lengkap, sistem harus beri reminder                             |
| 10  | Pengisian checklist kesiapan Rutan/Lapas                     | Petugas Rutan/Lapas                    | Memastikan ruang, perangkat, jaringan, keamanan, dan identifikasi terdakwa siap                                              | Semua item wajib terisi, identitas terdakwa tervalidasi                         | Maksimal H-1                          | Checklist Rutan/Lapas lengkap          | Ini sangat krusial karena menyangkut kehadiran terdakwa                    |
| 11  | Evaluasi readiness                                           | Sistem CIMS / operator                 | Sistem membaca status seluruh checklist dan hard gate                                                                        | Status readiness mencapai ALL_READY                                             | H-1 sampai sebelum sidang             | Status readiness                       | Menjadi syarat provisioning ruang virtual                                  |
| 12  | Auto-forced bypass checklist                                 | Sistem CIMS                            | Jika sisa waktu kurang dari 2 jam dan checklist belum lengkap, sistem memaksa status bypass agar sidang tetap dapat diproses | Status berubah ke AUTO_FORCED, muncul catatan merah, audit trail tercatat       | Saat sisa waktu < 2 jam               | Bypass readiness sah                   | Ini bukan penghapusan kewajiban, melainkan pengecualian yang harus diaudit |
| 13  | Provisioning ruang sidang virtual                            | Operator IT / sistem                   | Sistem membuat meeting room / ruang sidang virtual                                                                           | Ruang hanya dibuat jika status ALL_READY atau AUTO_FORCED yang sah              | Setelah hard gate readiness terpenuhi | Ruang virtual aktif                    | Tidak boleh lebih awal                                                     |
| 14  | Registrasi kehadiran para pihak                              | Operator sidang / Panitera             | Seluruh pihak yang hadir dicatat, termasuk media kehadirannya                                                                | Klasifikasi kehadiran jelas: langsung, elektronik, tidak hadir, diwakili        | Sebelum sidang dibuka                 | Data kehadiran                         | Penting untuk kepatuhan SEMA                                               |
| 15  | Verifikasi identitas                                         | Hakim / Panitera / petugas verifikator | Memastikan identitas hakim, jaksa, terdakwa, penasihat hukum, saksi, ahli                                                    | Identitas tervalidasi dan terekam                                               | Tepat sebelum sidang                  | Bukti verifikasi identitas             | Untuk terdakwa harus sangat ketat                                          |
| 16  | Pelaksanaan sidang elektronik                                | Hakim / Panitera / operator teknis     | Sidang berjalan sesuai hukum acara dan SOP                                                                                   | Audio-video layak, jalannya sidang terdokumentasi, gangguan dicatat             | Pada jadwal sidang                    | Persidangan terlaksana                 | Jika ada gangguan substansial, bisa ditunda atau dijadwal ulang            |
| 17  | Pencatatan metadata sidang                                   | Panitera / petugas pencatat            | Mencatat waktu mulai, pihak hadir, kejadian penting, status perkara                                                          | Metadata lengkap dan dapat diaudit                                              | Selama dan segera setelah sidang      | Metadata sidang                        | Menjadi bagian immutable audit trail                                       |
| 18  | Pembacaan putusan                                            | Hakim / Panitera                       | Mencatat waktu pembacaan putusan dan kehadiran para pihak                                                                    | Waktu pembacaan tepat dan kehadiran terdakwa/JPU tercatat jelas                 | Saat putusan dibacakan                | Data pembacaan putusan                 | Penting untuk implikasi tenggang kasasi                                    |
| 19  | Unggah petikan putusan                                       | Panitera                               | Mengunggah petikan putusan ke sistem informasi pengadilan                                                                    | Petikan terunggah dan bukti unggah tercatat                                     | Hari yang sama                        | Petikan putusan tersedia               | Ini wajib selaras dengan SEMA                                              |
| 20  | Pengiriman salinan putusan dan berkas perkara                | Panitera / unit administrasi           | Mengirim salinan putusan dan berkas perkara ke PN                                                                            | Dokumen terkirim dan termonitor                                                 | Paling lambat 7 hari                  | Salinan/berkas terkirim                | Jika terlambat, harus ada notifikasi eskalasi                              |
| 21  | Penutupan administrasi sidang                                | Panitera / admin sistem                | Menutup status sidang setelah seluruh data, log, dan dokumen lengkap                                                         | Tidak ada item wajib tertinggal                                                 | Setelah sidang selesai                | Status sidang closed                   | Menutup workflow utama                                                     |
| 22  | Audit trail dan logging                                      | Admin CIMS / sistem                    | Menyimpan event penting: perubahan data, notifikasi, akses, readiness, putusan, insiden                                      | Log lengkap, utuh, tidak diubah sembarangan                                     | Berjalan terus                        | Audit trail                            | Wajib untuk pengendalian mutu dan investigasi                              |
| 23  | Evaluasi deviasi dan catatan merah                           | QA / pimpinan / liaison officer        | Meninjau keterlambatan, auto-forced bypass, gangguan teknis, atau pelanggaran akses                                          | Ada tindak lanjut korektif yang jelas                                           | Pasca-sidang / evaluasi berkala       | Laporan evaluasi                       | Catatan merah tidak boleh berhenti di dashboard saja                       |
| 24  | Monitoring KPI                                               | Pimpinan / admin / QA                  | Mengukur ketepatan waktu, kelengkapan metadata, keberhasilan notifikasi, gangguan teknis                                     | KPI tercapai sesuai standar internal                                            | Berkala                               | Laporan KPI                            | Menjadi dasar perbaikan SOP                                                |

3. Tabel “mutu baku” yang paling penting untuk SOP ini
   Karena Persekma 002/2012 menekankan mutu baku sebagai alat kendali mutu prosedur, maka untuk SOP ini mutu baku utamanya menurut saya harus dipaku seperti berikut.

| Objek kontrol                                | Mutu baku yang disarankan                                                |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Registrasi perkara                           | 100% field wajib terisi dan tervalidasi                                  |
| Akses pengguna                               | Tidak ada user aktif tanpa role dan otorisasi yang sah                   |
| Penetapan pemberitahuan sidang               | Dokumen sah tersedia di CIMS minimal H-7                                 |
| Surat pemberitahuan kejaksaan ke Rutan/Lapas | Dokumen tersedia di CIMS minimal H-3                                     |
| Checklist kesiapan                           | Seluruh checklist terisi maksimal H-1                                    |
| Auto-forced bypass                           | Hanya boleh jika sisa waktu < 2 jam; wajib catatan merah dan audit trail |
| Provisioning ruang virtual                   | Hanya jika status ALL_READY atau AUTO_FORCED sah                         |
| Verifikasi kehadiran                         | Cara kehadiran terdakwa dan JPU tercatat tegas                           |
| Unggah petikan putusan                       | 100% diunggah pada hari yang sama                                        |
| Pengiriman salinan/berkas                    | 100% terkirim paling lambat 7 hari                                       |
| Audit trail                                  | Seluruh event minimum terekam utuh                                       |
| Evaluasi deviasi                             | Setiap catatan merah menghasilkan tindak lanjut                          |

4. Catatan penting agar SOP ini benar-benar “sesuai format Persekma”
   Secara substansi, SOP Anda sudah sangat kuat. Tetapi kalau mau dibuat lebih patuh terhadap gaya penyusunan SOP formal di lingkungan Mahkamah Agung, saya sarankan empat penyempurnaan lagi.

| Penyempurnaan                                                            | Kenapa perlu                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Tambahkan Persekma 002 Tahun 2012 secara eksplisit di bagian dasar hukum | Agar SOP ini jelas tunduk pada pedoman penyusunan SOP MA       |
| Pecah prosedur ke dalam tabel SOP resmi per proses utama                 | Supaya formatnya lebih administratif dan mudah disahkan        |
| Tambahkan kolom tetap: Pelaksana, Mutu Baku, Kelengkapan, Waktu, Output  | Ini paling dekat dengan pola SOP formal MA                     |
| Buat lampiran checklist, log, dan form sebagai bagian dari SOP           | Agar SOP tidak berhenti di norma, tetapi langsung bisa dipakai |

5. Kesimpulan
   Secara isi, sop-revisi.md sudah kompatibel dengan kebutuhan operasional persidangan elektronik, CIMS, SEMA, dan PKS. Jika dilihat dengan kacamata Persekma 002 Tahun 2012, SOP ini juga sudah memenuhi unsur pokok, tetapi akan menjadi jauh lebih kuat bila diubah menjadi paket SOP formal berbasis tabel prosedur dan mutu baku.
