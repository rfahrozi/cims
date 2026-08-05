# SOP Pengelolaan Koordinasi dan Pelaksanaan Persidangan Pidana Umum dan Pidana Khusus Secara Elektronik melalui Platform Video Conference Terintegrasi CIMS

## A. Identitas Dokumen

**Nama Dokumen:** Standar Operasional Prosedur Pengelolaan Koordinasi dan Pelaksanaan Persidangan Pidana Umum dan Pidana Khusus Secara Elektronik melalui Platform Video Conference Terintegrasi CIMS  
**Kode Dokumen:** SOP-CIMS-PE-01  
**Versi:** 1.0 Revisi Selaras CIMS, SEMA 2/2026, dan PKS  
**Status:** Berlaku setelah disahkan  
**Unit Pemilik:** [Unit Kerja/Paniteraan/Tim Transformasi Digital]  
**Tanggal Efektif:** [diisi saat pengesahan]  
**Peninjauan Berkala:** paling sedikit 1 kali dalam 12 bulan atau sewaktu-waktu jika terdapat perubahan regulasi, sistem, atau PKS  
**Dokumen Terkait:** kebijakan internal, perjanjian kerja sama antar-instansi, panduan teknis CIMS, template penetapan dan format putusan yang berlaku

## B. Tujuan

SOP ini bertujuan untuk menjadi pedoman resmi bagi seluruh pihak yang terlibat dalam persidangan pidana umum dan pidana khusus secara elektronik agar proses berjalan tertib, sah, aman, akuntabel, terdokumentasi, dan selaras dengan:

1. kebutuhan operasional persidangan elektronik lintas instansi,
2. mekanisme orkestrasi proses pada CIMS,
3. ketentuan SEMA No. 2 Tahun 2026 terkait pelaksanaan efektif ketentuan kasasi dan persidangan elektronik,
4. pembagian peran, tanggung jawab, perlindungan data, dan evaluasi sebagaimana diatur dalam PKS pelaksanaan persidangan secara elektronik.

## C. Ruang Lingkup

SOP ini berlaku untuk seluruh rangkaian kegiatan persidangan pidana secara elektronik, meliputi:

1. koordinasi pra-persidangan,
2. input, verifikasi, dan validasi data perkara,
3. penjadwalan sidang dan pembacaan putusan,
4. persiapan sarana-prasarana dan konektivitas,
5. pelaksanaan sidang melalui platform video conference yang disetujui,
6. pengelolaan dokumen perkara dan metadata sidang dalam CIMS,
7. pencatatan kehadiran para pihak secara langsung maupun elektronik,
8. unggah petikan putusan dan pengiriman salinan putusan/berkas perkara sesuai tenggat,
9. pengamanan akses, audit trail, notifikasi, dan pengendalian mutu,
10. pelaporan, evaluasi, monitoring, penanganan gangguan, serta tindak lanjut perbaikan.

SOP ini mengikat seluruh peran yang relevan pada pengadilan, kejaksaan, instansi pemasyarakatan/imigrasi, admin sistem, operator sidang, petugas keamanan, serta pejabat penghubung antar-instansi.

## D. Dasar Hukum dan Acuan

SOP ini disusun dengan mengacu pada:

1. ketentuan hukum acara pidana yang berlaku, termasuk ketentuan mengenai kasasi dan persidangan elektronik,
2. Undang-Undang Nomor 20 Tahun 2025 tentang Kitab Undang-Undang Hukum Acara Pidana sebagaimana relevan dengan Pasal 298 dan Pasal 300,
3. SEMA Nomor 2 Tahun 2026 tentang Pedoman Pengajuan Kasasi,
4. PKS pelaksanaan persidangan secara elektronik antara Mahkamah Agung Republik Indonesia, Kejaksaan Republik Indonesia, dan Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia,
5. kebijakan dan petunjuk teknis internal yang mengatur persidangan elektronik, keamanan informasi, serta penggunaan sistem informasi pengadilan dan CIMS,
6. kebutuhan operasional dan kontrol proses pada CIMS versi yang berlaku.

## E. Definisi

Dalam SOP ini yang dimaksud dengan:

1. **Persidangan Elektronik** adalah sidang pidana yang dilaksanakan dengan dukungan teknologi informasi dan komunikasi melalui platform video conference yang disetujui dan terintegrasi dengan CIMS.
2. **CIMS** adalah Court Intelligence Management System yang berfungsi sebagai lapisan orkestrasi proses, pengendalian status perkara, dokumentasi, notifikasi, dan auditabilitas lintas instansi.
3. **Platform Video Conference** adalah sarana konferensi video yang disetujui penyelenggara. Zoom Meeting dapat digunakan sebagai implementasi aktif sepanjang ditetapkan oleh instansi pengelola, tanpa menutup kemungkinan penggunaan penyedia lain yang telah disetujui.
4. **Hard Gate** adalah titik kendali wajib pada alur proses yang harus dipenuhi sebelum perkara dapat melanjutkan ke tahap berikutnya.
5. **Immutable Audit Trail** adalah catatan aktivitas yang lengkap, berurutan, terlindungi integritasnya, dan tidak dapat diubah tanpa otorisasi serta mekanisme pengendalian yang sah.
6. **RBAC** adalah pengendalian akses berbasis peran.
7. **ABAC** adalah pengendalian akses berbasis atribut perkara, status proses, jenis dokumen, dan kewenangan pengguna.
8. **Pejabat Penghubung/Liaison Officer** adalah pejabat yang ditunjuk oleh masing-masing instansi untuk koordinasi pelaksanaan, eskalasi masalah, dan validasi operasional lintas pihak.
9. **Metadata Sidang** adalah data terstruktur yang memuat antara lain nomor perkara, jadwal, status, pihak yang hadir, media kehadiran, waktu pembukaan, waktu pembacaan putusan, waktu unggah petikan putusan, dan status pengiriman dokumen.

## F. Prinsip Umum

Pelaksanaan persidangan elektronik berpedoman pada prinsip:

1. legalitas,
2. akuntabilitas,
3. efisiensi dan efektivitas,
4. keamanan informasi dan perlindungan data,
5. keterlacakan proses melalui audit trail,
6. keterbukaan sesuai ketentuan yang berlaku,
7. kesetaraan akses para pihak,
8. ketertiban persidangan,
9. kesinambungan layanan,
10. koordinasi lintas instansi,
11. kepatuhan pada tenggat hukum dan administratif,
12. ketersediaan prosedur fallback dalam keadaan gangguan atau keadaan kahar.

## G. Peran dan Tanggung Jawab

### 1. Ketua Pengadilan/Pimpinan Satuan Kerja
Menetapkan kebijakan lokal pelaksanaan SOP, memastikan ketersediaan sumber daya, menunjuk pejabat penghubung, serta memutuskan langkah eskalasi strategis apabila terdapat hambatan lintas instansi.

### 2. Majelis Hakim/Hakim
Memimpin persidangan, memastikan tertib acara, mengonfirmasi identitas dan kehadiran para pihak, memastikan kelayakan persidangan elektronik pada saat pelaksanaan, dan memastikan pembacaan putusan serta pencatatan status kehadiran dilakukan dengan benar.

### 3. Panitera/Panitera Pengganti
Mengelola administrasi perkara, verifikasi kelengkapan data, pencatatan metadata sidang, unggah petikan putusan pada hari yang sama sesuai ketentuan, pengendalian salinan putusan, dan monitoring pengiriman berkas perkara.

### 4. Jaksa/Penuntut Umum
Memastikan kesiapan administrasi dan kehadiran pihak kejaksaan, berkoordinasi dengan operator sidang dan pejabat penghubung, serta memastikan dokumen yang menjadi kewenangan kejaksaan disampaikan sesuai prosedur.

### 5. Pejabat/Petugas Instansi Pemasyarakatan atau Imigrasi
Menjamin kesiapan tempat, perangkat, identifikasi terdakwa, keamanan pelaksanaan dari lokasi instansi terkait, dan dukungan kehadiran terdakwa secara elektronik sesuai ketentuan.

### 6. Admin CIMS/Admin Sistem
Mengelola akun, pengaturan peran dan hak akses, ketersediaan sistem, integrasi notifikasi, konfigurasi platform video conference, serta pemeliharaan jejak audit dan log insiden.

### 7. Operator Sidang/Operator Teknis
Melakukan persiapan teknis sebelum sidang, membuka ruang sidang virtual, memverifikasi perangkat dan konektivitas, membantu registrasi peserta, mendokumentasikan gangguan teknis, dan mengeksekusi fallback teknis sesuai eskalasi.

### 8. Petugas Keamanan/Verifikator Identitas
Mendukung pengamanan lokasi fisik maupun akses virtual, melakukan verifikasi identitas sesuai kewenangan, serta memastikan tidak ada akses tidak sah.

### 9. Pejabat Penghubung Antar-Instansi
Menjadi titik kontak resmi untuk koordinasi jadwal, perubahan sidang, gangguan, kebutuhan dokumen, tindak lanjut pasca putusan, dan penyelesaian perbedaan penafsiran operasional melalui musyawarah/mekanisme koordinasi resmi.

## H. Sarana dan Prasarana Minimal

Sarana dan prasarana minimal meliputi:

1. perangkat komputer/laptop operasional,
2. kamera, mikrofon, speaker/headset, dan layar yang memadai,
3. koneksi internet utama yang stabil dan koneksi cadangan bila tersedia,
4. akun platform video conference yang disetujui,
5. akses CIMS dan sistem informasi pengadilan yang relevan,
6. perangkat pemindai/digitalisasi dokumen bila diperlukan,
7. sumber listrik dan cadangan daya,
8. ruang pelaksanaan yang aman dan sesuai kebutuhan keamanan perkara,
9. sarana perekaman/log teknis sesuai kebijakan yang berlaku,
10. daftar kontak eskalasi teknis dan operasional.

Setiap instansi wajib memastikan penyediaan, pemeliharaan, dan kesiapan sarana-prasarana yang menjadi tanggung jawabnya masing-masing sesuai PKS dan penugasan internal.

## I. Hard Gates Wajib dalam Alur Proses dan Timeline Operasional

Perkara tidak boleh berpindah ke tahap berikutnya apabila hard gate pada tahap sebelumnya belum terpenuhi. Timeline operasional di bawah ini mengikuti alur dan batas waktu yang dinyatakan dalam project description CIMS.

1. **Gate 1 - Registrasi Perkara Lengkap:** data pokok perkara, pihak terkait, jenis perkara, dan dokumen awal telah masuk dan tervalidasi.
2. **Gate 2 - Verifikasi Kewenangan dan Akses:** peran pengguna, hak akses, serta atribut perkara telah diverifikasi sesuai RBAC/ABAC.
3. **Gate 3 - Jadwal Aktif dan Penetapan Pemberitahuan:** jadwal sidang/pembacaan putusan telah aktif, tidak ada konflik, dan Penetapan Pemberitahuan Sidang Pembacaan Putusan telah dibuat, ditandatangani, serta diunggah ke CIMS **paling lambat minimal H-7 sebelum agenda sidang**.
4. **Gate 4 - Pemberitahuan Lintas Instansi:** setelah penetapan resmi tersedia di CIMS, pemberitahuan lintas instansi harus dikirim, diterima, dan dokumen pemberitahuan dari Kejaksaan kepada Rutan/Lapas harus sudah tersedia di CIMS **paling lambat minimal H-3 sebelum jadwal sidang**.
5. **Gate 5 - Checklist Kesiapan Sidang:** checklist kesiapan Kejaksaan dan Rutan/Lapas, yang meliputi perangkat, jaringan, personel, ruang sidang, dan verifikasi identitas terdakwa, harus diisi **maksimal H-1 sebelum agenda sidang**.
6. **Gate 6 - Auto-Forced Readiness Bypass:** apabila waktu menuju sidang **kurang dari 2 jam** dan checklist kesiapan dari instansi terkait belum lengkap, sistem dapat menjalankan **auto-forced bypass** agar ruang sidang tetap dapat diprovisioning dan persidangan tetap dapat berjalan. Status bypass wajib diberi **catatan merah/peringatan merah** dalam sistem, tercatat dalam audit trail, dan menjadi bahan evaluasi pasca-sidang.
7. **Gate 7 - Provisioning Ruang Virtual:** ruang sidang virtual hanya dapat dibuat setelah seluruh hard gate readiness terpenuhi, atau setelah bypass sah dilakukan oleh sistem pada kondisi kurang dari 2 jam sebelum sidang.
8. **Gate 8 - Pelaksanaan dan Dokumentasi Sidang:** pelaksanaan sidang tercatat, insiden bila ada didokumentasikan, dan status perkara diperbarui.
9. **Gate 9 - Putusan dan Tindak Lanjut Administratif:** metadata pembacaan putusan, unggah petikan putusan, pengiriman salinan/berkas, dan penutupan administrasi telah dipenuhi.

### Matriks Timeline Minimum

| Tahap | Aktor Utama | Batas Waktu Minimum | Ketentuan |
|---|---|---|---|
| Penetapan Pemberitahuan Sidang Pembacaan Putusan dibuat, ditandatangani, dan diunggah ke CIMS | Hakim, Panitera | **Minimal H-7** | Menjadi dasar pemberitahuan resmi lintas instansi |
| Pemberitahuan lintas instansi dan upload surat pemberitahuan Kejaksaan kepada Rutan/Lapas | Pengadilan, Kejaksaan | **Minimal H-3** | Dokumen pemberitahuan Kejaksaan ke Rutan/Lapas wajib tersedia sebelum sidang |
| Pengisian checklist kesiapan sidang | Kejaksaan, Rutan/Lapas | **Maksimal H-1** | Mencakup perangkat, jaringan, personel, ruang, dan identitas terdakwa |
| Auto-forced bypass readiness | Sistem CIMS | **Saat sisa waktu < 2 jam** | Checklist dapat dipaksa oleh sistem agar sidang tetap berjalan, dengan catatan merah dan audit trail wajib |
| Provisioning ruang virtual | Operator IT / Sistem | Setelah H-1 terpenuhi atau bypass sah | Tidak boleh dilakukan tanpa hard gate readiness atau bypass sistem |

## J. Prosedur Operasional

### 1. Perencanaan dan Koordinasi Pra-Persidangan
1. Panitera/operator melakukan input awal atau verifikasi data perkara dalam CIMS.
2. Pejabat penghubung antar-instansi memastikan titik kontak masing-masing pihak aktif.
3. Penjadwalan sidang dilakukan dengan mempertimbangkan kesiapan pengadilan, kejaksaan, dan instansi tempat terdakwa berada.
4. Jika terdapat perkara pidana khusus atau kebutuhan pengamanan tambahan, status tersebut ditandai sejak awal.

### 2. Verifikasi Data dan Kesiapan Dokumen
1. Data perkara, identitas pihak, dokumen administrasi, dan atribut perkara diverifikasi.
2. Sistem dan petugas memastikan bahwa hanya pengguna berwenang yang dapat mengakses atau mengubah data tertentu.
3. Jika ditemukan data tidak lengkap, proses dihentikan pada hard gate terkait sampai koreksi selesai.

### 3. Penjadwalan, Penetapan, dan Notifikasi
1. Jadwal sidang atau pembacaan putusan ditetapkan oleh pihak berwenang setelah conflict check dinyatakan aman.
2. Berdasarkan jadwal aktif, Penetapan Pemberitahuan Sidang Pembacaan Putusan harus dibuat, ditandatangani, dan diunggah kembali ke CIMS sebagai dokumen resmi **paling lambat minimal H-7 sebelum agenda sidang**.
3. Setelah penetapan tersedia, CIMS mengirim pemberitahuan lintas instansi melalui kanal yang tersedia dan disetujui, seperti email, WhatsApp, SMS, dan/atau in-app notification.
4. Untuk notifikasi yang dikendalikan SLA di database, acknowledgment dan reminder mengikuti konfigurasi aktif pada CIMS. Apabila belum ada perubahan konfigurasi, default minimal mengikuti parameter sistem yang berlaku, termasuk **AGENDA_SIDANG = 48 jam** dan **PERUBAHAN_JADWAL = 24 jam**.
5. Untuk setiap notifikasi penting, sistem atau petugas wajib mencatat waktu pengiriman, target penerima, status terkirim/gagal, acknowledgment, dan tindak lanjut jika gagal.
6. Perubahan jadwal wajib diberitahukan melalui mekanisme yang terdokumentasi dan menggunakan format/templat yang berlaku.

### 4. Pemberitahuan oleh Kejaksaan kepada Rutan/Lapas
1. Setelah menerima pemberitahuan dari pengadilan, Kejaksaan wajib melakukan upload surat/dokumen pemberitahuan kepada Rutan/Lapas melalui mekanisme yang ditetapkan.
2. Dokumen pemberitahuan Kejaksaan kepada Rutan/Lapas harus sudah tersedia di CIMS **paling lambat minimal H-3 sebelum jadwal sidang**.
3. Sistem wajib menandai status keterlambatan apabila dokumen belum tersedia sampai melewati ambang waktu H-3, dan mengirim eskalasi kepada pejabat penghubung.
4. Dokumen yang diunggah harus tercatat waktu unggah, pengunggah, instansi asal, dan status verifikasinya.

### 5. Persiapan Teknis dan Checklist Kesiapan
1. Operator teknis melakukan uji perangkat, audio, video, jaringan, dan akses ke CIMS.
2. Kejaksaan dan Rutan/Lapas wajib mengisi checklist kesiapan sidang elektronik **maksimal H-1 sebelum agenda sidang**.
3. Checklist kesiapan sekurang-kurangnya memuat kesiapan perangkat, jaringan, personel, ruang sidang, serta verifikasi identitas terdakwa.
4. Hasil pengisian checklist dicatat sebagai bagian dari hard gate readiness dan menjadi syarat provisioning ruang virtual.
5. Operator menyiapkan alternatif teknis jika platform utama gagal, sesuai kebijakan instansi.

### 6. Auto-Forced Checklist dan Provisioning Ruang Virtual
1. Apabila waktu pelaksanaan sidang tersisa **kurang dari 2 jam** dan checklist kesiapan belum dilengkapi oleh Kejaksaan dan/atau Rutan/Lapas, sistem CIMS dapat melakukan **auto-forced bypass** terhadap hard gate checklist agar persidangan tetap dapat berjalan.
2. Auto-forced bypass harus dilakukan secara sistematis oleh sistem, bukan dengan menghapus kewajiban checklist, melainkan dengan menandai bahwa kelengkapan tidak dipenuhi tepat waktu dan sidang berjalan dengan pengecualian operasional.
3. Setiap auto-forced bypass wajib menghasilkan **catatan merah/peringatan merah** pada tampilan workflow, audit trail, dan laporan evaluasi.
4. Setelah seluruh hard gate readiness terpenuhi atau bypass sistem sah dilakukan, Operator IT dapat melakukan provisioning ruang sidang virtual.
5. Ruang sidang virtual tidak boleh dibuat sebelum status readiness mencapai **ALL_READY** atau **AUTO_FORCED yang sah**.

### 7. Registrasi Kehadiran dan Verifikasi Identitas
1. Seluruh pihak yang akan mengikuti sidang diregistrasi.
2. Identitas hakim, panitera, jaksa, terdakwa, penasihat hukum, saksi, ahli, dan pihak lain diverifikasi sesuai kebutuhan persidangan.
3. Kehadiran dicatat dengan klasifikasi minimal: hadir langsung, hadir secara elektronik, tidak hadir, atau diwakili sesuai ketentuan.
4. Untuk terdakwa dan/atau penuntut umum, cara kehadiran wajib dicatat secara tegas karena berdampak pada tindak lanjut administratif dan hukum acara.

### 8. Pelaksanaan Sidang Elektronik
1. Hakim membuka sidang dan memastikan seluruh prasyarat terpenuhi.
2. Operator teknis menjaga kestabilan teknis dan mendokumentasikan insiden selama persidangan.
3. Panitera atau petugas yang ditunjuk melakukan pencatatan jalannya sidang dan pembaruan metadata di CIMS.
4. Bila terjadi gangguan teknis yang mengganggu substansi persidangan, hakim dapat menunda, melanjutkan dengan mekanisme fallback yang sah, atau menjadwalkan ulang sesuai berita acara dan notifikasi resmi.

### 9. Pembacaan Putusan dan Kepatuhan SEMA 2/2026
1. Untuk putusan pengadilan tinggi atau tahapan lain yang relevan, waktu pembacaan putusan harus dicatat secara tepat.
2. Kehadiran atau ketidakhadiran terdakwa dan/atau penuntut umum harus dicatat secara jelas, termasuk apakah hadir langsung atau secara elektronik.
3. Apabila redaksi atau metadata putusan memerlukan kejelasan mengenai kehadiran para pihak, panitera/petugas wajib memastikan pencatatan dilakukan secara lengkap untuk mendukung perhitungan tenggang waktu sesuai ketentuan.
4. Ketentuan tenggang waktu kasasi dilaksanakan sesuai peraturan yang berlaku, termasuk ketentuan 14 hari sebagaimana relevan dalam SEMA No. 2 Tahun 2026.

### 10. Unggah Petikan Putusan dan Pengiriman Salinan/Berkas
1. Petikan putusan yang wajib diumumkan melalui sistem informasi pengadilan harus diunggah pada hari yang sama dengan pembacaan putusan.
2. Panitera/petugas yang berwenang mencatat waktu unggah, petugas pengunggah, dan bukti unggah.
3. Salinan putusan beserta berkas perkara yang wajib disampaikan kepada pengadilan negeri harus diproses dan dimonitor agar tersampaikan paling lambat dalam 7 hari setelah putusan dijatuhkan, sesuai ketentuan yang berlaku.
4. Apabila terdapat keterlambatan, pejabat penghubung dan pimpinan terkait wajib menerima notifikasi eskalasi dan tindakan korektif dicatat.

### 11. Penutupan Sidang dan Pasca-Sidang
1. Status sidang ditutup setelah seluruh data wajib, berita acara, dan metadata telah lengkap.
2. Dokumen elektronik diklasifikasikan, disimpan, dan dilindungi sesuai tingkat kerahasiaannya.
3. CIMS memperbarui status proses untuk kebutuhan monitoring, pelaporan, dan audit.
4. Temuan, insiden, deviasi hard gate, dan kejadian auto-forced bypass diteruskan ke proses evaluasi.
## K. Prosedur Koordinasi Antar-Pihak

1. Setiap instansi wajib menunjuk pejabat penghubung utama dan cadangan.
2. Koordinasi rutin dilakukan sebelum sidang, saat terjadi perubahan jadwal, saat terdapat gangguan, dan setelah pembacaan putusan bila ada tindak lanjut administratif.
3. Mekanisme koordinasi minimal harus memuat kanal komunikasi resmi, waktu respons, serta escalation path.
4. Perbedaan penafsiran operasional diselesaikan terlebih dahulu melalui musyawarah antar pihak dan, bila perlu, dinaikkan kepada pimpinan sesuai kewenangan.
5. Hasil koordinasi penting dicatat agar dapat ditelusuri.

## L. Keamanan Informasi dan Pengendalian Akses

1. Akses sistem diberikan berdasarkan prinsip kebutuhan untuk mengetahui dan kewenangan untuk bertindak.
2. Pengendalian akses menerapkan RBAC dan, untuk data/perkara tertentu, ABAC.
3. Perubahan hak akses harus disetujui pejabat berwenang dan tercatat dalam audit trail.
4. Dokumen perkara pidana khusus atau dokumen sensitif diberi pembatasan akses tambahan.
5. Pengguna dilarang membagikan akun, kredensial, atau dokumen di luar kewenangan.
6. Setiap dugaan akses tidak sah, kebocoran, atau penyalahgunaan data wajib dilaporkan sebagai insiden keamanan.

## M. Audit Trail Wajib dan Pengendalian Mutu

### 1. Event minimum yang wajib tercatat
Paling sedikit event berikut harus tercatat dalam audit trail:

1. pembuatan, perubahan, dan penutupan data perkara,
2. perubahan jadwal sidang atau putusan,
3. pemberian, perubahan, atau pencabutan akses pengguna,
4. pengiriman notifikasi penting,
5. verifikasi identitas dan kehadiran,
6. pembukaan dan penutupan sidang,
7. unggah petikan putusan,
8. pencatatan pengiriman salinan putusan dan berkas perkara,
9. insiden teknis, gangguan layanan, dan tindakan korektif,
10. persetujuan atau penolakan pada hard gate.

### 2. Ketentuan mutu
1. Audit trail harus terlindungi integritasnya dan tidak boleh dihapus atau diubah di luar mekanisme resmi.
2. Pengendalian mutu dilakukan melalui review berkala atas kepatuhan SOP, ketepatan data, kelengkapan log, ketepatan waktu, dan kualitas koordinasi.
3. Temuan mutu ditindaklanjuti dengan rencana perbaikan dan pemantauan penyelesaiannya.

## N. Indikator Kinerja

Indikator kinerja minimum meliputi:

1. persentase sidang yang berlangsung sesuai jadwal,
2. persentase hard gate yang lolos tanpa deviasi,
3. tingkat kelengkapan metadata sidang dan data perkara,
4. persentase petikan putusan yang diunggah pada hari yang sama,
5. persentase salinan putusan/berkas yang terkirim sesuai tenggat,
6. jumlah dan tingkat keparahan gangguan teknis,
7. tingkat keberhasilan notifikasi penting,
8. jumlah insiden akses tidak sah atau pelanggaran keamanan,
9. waktu respons eskalasi antar-instansi,
10. tingkat penyelesaian tindakan perbaikan hasil evaluasi.

## O. Manajemen Risiko dan Keadaan Kahar

Risiko utama dan mitigasi minimum meliputi:

1. **kegagalan jaringan atau platform video conference:** gunakan koneksi cadangan, jadwal ulang terkontrol, atau mekanisme fallback yang sah;
2. **kesalahan identifikasi pihak:** lakukan verifikasi berlapis dan dokumentasi bukti verifikasi;
3. **akses tidak sah/kebocoran data:** pembatasan akses, monitoring log, pelaporan insiden, dan tindakan korektif segera;
4. **keterlambatan unggah/pengiriman dokumen:** notifikasi otomatis, eskalasi ke pejabat penghubung, dan pemantauan SLA;
5. **perbedaan penafsiran antar pihak:** gunakan forum koordinasi resmi dan musyawarah sesuai PKS;
6. **keadaan kahar:** pelaksanaan kewajiban disesuaikan berdasarkan pemberitahuan resmi dan keputusan para pihak/pimpinan sesuai ketentuan.

## P. Pelaporan, Evaluasi, dan Kesiapan Operasional

1. Setiap sidang elektronik menghasilkan catatan operasional minimum yang memuat jadwal, pihak hadir, media kehadiran, gangguan, hasil sidang, dan tindak lanjut.
2. Insiden teknis, keamanan, atau keterlambatan administratif wajib dilaporkan dan ditindaklanjuti.
3. Evaluasi berkala dilakukan untuk menilai kepatuhan SOP, efektivitas koordinasi, kualitas layanan, dan kesiapan operasional/pilot.
4. Sebelum implementasi skala lebih luas atau pilot, harus dipenuhi checklist kesiapan minimum meliputi kesiapan sistem, akun, hak akses, perangkat, notifikasi, logging, dan focal point antar-instansi.
5. Hasil evaluasi digunakan untuk revisi SOP, penguatan sistem, dan penyesuaian tata kerja lintas instansi.

## Q. Ketentuan Khusus untuk Pidana Khusus

1. Perkara pidana khusus dapat dikenai pembatasan akses tambahan, kebutuhan verifikasi berlapis, dan pengamanan fisik/virtual yang lebih tinggi.
2. Dokumen tertentu hanya dapat diakses oleh pihak berwenang yang ditetapkan.
3. Koordinasi untuk perkara pidana khusus wajib melibatkan pejabat penghubung yang berwenang dan mengikuti protokol pengamanan tambahan.

## R. Peninjauan dan Revisi SOP

1. SOP ditinjau secara berkala paling sedikit setiap 12 bulan.
2. Peninjauan dipercepat apabila terdapat perubahan regulasi, perubahan PKS, perubahan versi mayor CIMS, temuan audit, hasil evaluasi pilot, atau insiden signifikan.
3. Setiap perubahan SOP harus disahkan oleh pejabat yang berwenang dan disosialisasikan kepada seluruh pihak terkait.

## S. Penutup

SOP ini merupakan pedoman kerja resmi dalam penyelenggaraan persidangan pidana secara elektronik yang terkoordinasi, aman, dan akuntabel. Seluruh pihak wajib mematuhi SOP ini dan melaksanakan tugasnya sesuai kewenangan, tanggung jawab, serta prinsip perlindungan data, ketertiban persidangan, dan kepatuhan hukum yang berlaku.

## Lampiran yang Disarankan

1. checklist hard gate per tahap,
2. matriks RBAC/ABAC dan kewenangan akses dokumen,
3. daftar pejabat penghubung dan jalur eskalasi,
4. template log gangguan teknis dan insiden keamanan,
5. template checklist kesiapan sidang elektronik,
6. matriks notifikasi multi-channel,
7. template monitoring unggah petikan putusan dan pengiriman salinan/berkas,
8. format evaluasi pasca-sidang dan evaluasi berkala,
9. daftar event audit trail minimum,
10. rujukan template/format baku penetapan dan paragraf penutup putusan sesuai ketentuan yang berlaku.