# CIMS MVP Backlog Breakdown

Versi: 1.0  
Tanggal: 2026-07-26  
Sumber: Turunan dari PRD CIMS MVP

## Tujuan Dokumen

Dokumen ini memecah PRD CIMS menjadi backlog implementasi yang lebih operasional dalam bentuk **epic**, **user story**, dan **acceptance criteria**. Struktur ini dimaksudkan untuk memudahkan prioritisasi produk, perencanaan sprint, grooming engineering, penyusunan test case, dan pelaksanaan UAT lintas peran.

## Format Penulisan

Setiap item menggunakan pola berikut:

- **Epic**: himpunan kapabilitas besar yang memberi nilai bisnis/operasional.
- **User Story**: kebutuhan spesifik dari sudut pandang pengguna atau sistem.
- **Acceptance Criteria**: kondisi yang harus terpenuhi agar story dinyatakan selesai dan dapat diuji.

---

## EPIC-01 Case Intake & Reference Management

### User Story 1.1

Sebagai **panitera**, saya ingin mereferensikan data perkara dari sumber resmi agar proses persidangan elektronik dimulai dari data yang tervalidasi.

**Acceptance Criteria**

- Sistem dapat membuat entri perkara baru dari input manual atau hasil sinkronisasi sumber resmi.
- Sistem menyimpan minimal nomor perkara, jenis perkara, satuan kerja, status awal, dan pihak terkait.
- Sistem mencatat sumber data, waktu input, dan pengguna yang melakukan input.
- Sistem menolak penyimpanan jika nomor perkara kosong atau duplikat pada konteks yang tidak diizinkan.

### User Story 1.2

Sebagai **panitera**, saya ingin melihat riwayat sinkronisasi data perkara agar saya dapat mengetahui apakah data masih sesuai dengan sumber resmi.

**Acceptance Criteria**

- Sistem menampilkan waktu sinkronisasi terakhir.
- Sistem menampilkan status sinkronisasi berhasil, gagal, atau menunggu verifikasi.
- Sistem menyimpan riwayat perubahan data perkara yang berasal dari sinkronisasi.
- Sistem menampilkan perbedaan utama jika ada perubahan pada data penting.

### User Story 1.3

Sebagai **administrator**, saya ingin menandai batas antara data referensi dari sistem resmi dan data operasional CIMS agar tidak terjadi konflik kewenangan.

**Acceptance Criteria**

- Setiap field data memiliki penanda asal data: sistem resmi, input manual, atau sistem internal.
- Field yang berasal dari sistem resmi dapat dibatasi pengubahannya di CIMS.
- Sistem menampilkan informasi source of truth pada halaman detail perkara.
- Audit log menyimpan setiap upaya perubahan terhadap field yang dibatasi.

---

## EPIC-02 Judicial Determination Gate

### User Story 2.1

Sebagai **panitera**, saya ingin mencatat referensi penetapan persidangan elektronik agar proses berikutnya hanya berjalan setelah dasar hukumnya tersedia.

**Acceptance Criteria**

- Sistem menyediakan form pencatatan nomor penetapan, tanggal, mode persidangan, alasan, dan referensi dokumen.
- Sistem memungkinkan unggah metadata atau tautan ke dokumen resmi penetapan.
- Sistem menyimpan hash referensi atau penanda integritas dokumen bila tersedia.
- Status penetapan dapat ditandai sebagai draft, diverifikasi, atau sah.

### User Story 2.2

Sebagai **sistem**, saya harus mencegah pembuatan ruang sidang virtual jika penetapan belum sah agar tidak ada proses yang melompati kewenangan.

**Acceptance Criteria**

- Tombol atau API pembuatan ruang sidang virtual nonaktif bila status penetapan belum sah.
- Sistem menampilkan alasan penolakan yang jelas kepada pengguna.
- Audit log mencatat percobaan membuat ruang sidang sebelum syarat terpenuhi.
- Rule ini berlaku di UI dan backend validation.

### User Story 2.3

Sebagai **hakim** atau **panitera**, saya ingin melihat dasar penetapan pada halaman perkara agar saya dapat memverifikasi legal basis proses elektronik.

**Acceptance Criteria**

- Detail penetapan tampil pada halaman perkara.
- Pengguna yang berwenang dapat membuka referensi dokumen penetapan.
- Sistem menampilkan status sah/tidak sah dengan jelas.
- Riwayat perubahan status penetapan dapat dilihat.

---

## EPIC-03 Smart Scheduling

### User Story 3.1

Sebagai **panitera**, saya ingin membuat jadwal sidang elektronik berdasarkan data perkara dan ketersediaan pihak agar penjadwalan lebih cepat dan tertib.

**Acceptance Criteria**

- Sistem menyediakan form penjadwalan berisi tanggal, waktu, durasi, agenda, dan ruang virtual.
- Sistem dapat mengaitkan jadwal dengan hakim, panitera, penuntut umum, terdakwa, advokat, saksi, dan ahli bila relevan.
- Sistem menyimpan status jadwal: draft, terkonfirmasi, berubah, dibatalkan.
- Sistem menolak penyimpanan jika data minimum belum lengkap.

### User Story 3.2

Sebagai **panitera**, saya ingin sistem mendeteksi konflik jadwal agar benturan sumber daya dapat dicegah.

**Acceptance Criteria**

- Sistem memeriksa konflik berdasarkan hakim, panitera, ruang virtual, dan slot waktu.
- Sistem menandai hasil cek sebagai tersedia, konflik, atau menunggu konfirmasi.
- Sistem menampilkan sumber konflik secara spesifik.
- Pengguna yang berwenang dapat tetap menyimpan dengan override jika kebijakan mengizinkan, dan alasannya tercatat.

### User Story 3.3

Sebagai **panitera**, saya ingin mengubah atau membatalkan jadwal sidang agar penyesuaian operasional dapat dilakukan tanpa kehilangan histori.

**Acceptance Criteria**

- Sistem mendukung reschedule dan cancel.
- Setiap perubahan wajib menyimpan alasan perubahan.
- Sistem menyimpan histori jadwal lama dan jadwal baru.
- Perubahan jadwal memicu notifikasi ulang ke pihak terkait.

### User Story 3.4

Sebagai **hakim** atau **petugas pengadilan**, saya ingin melihat tampilan kalender sidang agar dapat memahami beban jadwal harian dan mingguan.

**Acceptance Criteria**

- Sistem menyediakan tampilan daftar dan kalender.
- Jadwal dapat difilter berdasarkan tanggal, peran, status, atau nomor perkara.
- Warna/status visual membedakan sidang draft, terkonfirmasi, berlangsung, ditunda, dan selesai.
- Klik pada satu item membuka detail jadwal dan perkara.

---

## EPIC-04 Virtual Courtroom Integration

### User Story 4.1

Sebagai **panitera** atau **operator**, saya ingin membuat rapat Zoom otomatis dari jadwal yang sah agar ruang sidang virtual tersedia tanpa input ganda.

**Acceptance Criteria**

- Sistem dapat memanggil layanan integrasi backend untuk membuat meeting.
- Meeting hanya dibuat untuk jadwal yang telah lolos hard gate minimum.
- Sistem menyimpan meeting ID, passcode, join URL, host/start URL bila relevan, dan provider.
- Jika pembuatan gagal, sistem menandai status integrasi gagal dan menyediakan retry/follow-up path.

### User Story 4.2

Sebagai **operator sidang**, saya ingin melihat status rapat virtual agar saya tahu apakah ruang sudah aktif, berlangsung, atau selesai.

**Acceptance Criteria**

- Sistem menampilkan status meeting: scheduled, live, ended, canceled, failed.
- Status dapat diperbarui dari polling API atau webhook.
- Perubahan status tercatat pada audit log.
- Status meeting terkait tampil pada detail jadwal sidang.

### User Story 4.3

Sebagai **administrator**, saya ingin arsitektur provider bersifat adapter-based agar platform tidak terkunci ke satu vendor selamanya.

**Acceptance Criteria**

- Provider meeting disimpan sebagai konfigurasi, bukan hardcoded ke UI bisnis.
- Data hasil integrasi menggunakan model internal standar.
- Switching provider dapat dilakukan tanpa mengubah workflow utama aplikasi.
- Konfigurasi provider terekam dalam modul admin.

---

## EPIC-05 Notification, Acknowledgment & Escalation

### User Story 5.1

Sebagai **panitera**, saya ingin mengirim pemberitahuan resmi jadwal sidang agar seluruh pihak menerima informasi tepat waktu.

**Acceptance Criteria**

- Sistem dapat membuat notifikasi berbasis template.
- Sistem menyimpan penerima, kanal, waktu kirim, dan isi pokok notifikasi.
- Sistem menandai notifikasi terkirim, gagal, atau menunggu konfirmasi.
- Bukti kirim tercatat dan dapat ditinjau.

### User Story 5.2

Sebagai **penuntut umum**, **petugas pemasyarakatan**, atau **advokat**, saya ingin memberikan acknowledgment atas pemberitahuan agar pengadilan mengetahui bahwa informasi telah diterima.

**Acceptance Criteria**

- Sistem menyediakan aksi acknowledgment yang mudah diakses.
- Waktu acknowledgment disimpan otomatis.
- Status ack ditampilkan pada dashboard pengirim.
- Jika ack belum diterima sampai batas waktu, sistem memberi pengingat dan eskalasi.

### User Story 5.3

Sebagai **pejabat penghubung**, saya ingin melihat daftar notifikasi yang belum di-ack agar saya dapat menindaklanjuti keterlambatan.

**Acceptance Criteria**

- Sistem menyediakan daftar notifikasi overdue.
- Daftar dapat difilter per instansi, perkara, dan jenis notifikasi.
- Sistem menunjukkan umur keterlambatan.
- Riwayat follow-up dan hasil eskalasi dapat dicatat.

### User Story 5.4

Sebagai **sistem**, saya ingin mengirim reminder H-1 dan 30 menit sebelum sidang agar risiko keterlambatan berkurang.

**Acceptance Criteria**

- Reminder dapat dikonfigurasi per jenis sidang.
- Reminder tidak menggantikan notifikasi resmi utama.
- Waktu kirim reminder tercatat.
- Pengguna dapat melihat reminder yang sudah dikirim pada timeline perkara.

---

## EPIC-06 Readiness Assurance

### User Story 6.1

Sebagai **petugas pengadilan** atau **petugas rutan/lapas**, saya ingin mengisi checklist kesiapan agar sistem hanya menandai sidang READY bila syarat minimum sudah terpenuhi.

**Acceptance Criteria**

- Sistem menyediakan checklist per sidang.
- Setiap item memiliki status belum diisi, lulus, gagal, atau tidak berlaku.
- Item wajib harus ditandai jelas.
- Sistem menolak transisi ke READY bila item wajib belum lulus.

### User Story 6.2

Sebagai **panitera**, saya ingin melihat ringkasan kesiapan lintas pihak agar saya dapat memutuskan apakah sidang siap dijalankan.

**Acceptance Criteria**

- Dashboard readiness menampilkan progres per instansi/pihak.
- Item yang gagal atau belum diisi ditandai mencolok.
- Sistem menampilkan siapa verifier dan kapan diverifikasi.
- Sistem menampilkan catatan kendala jika ada item tidak lulus.

### User Story 6.3

Sebagai **Tim TI**, saya ingin mencatat hasil uji teknis agar kesiapan jaringan dan perangkat dapat dibuktikan.

**Acceptance Criteria**

- Sistem menyediakan area khusus untuk hasil technical test.
- Hasil test minimal mencakup audio, video, internet utama/cadangan, dan perangkat.
- Sistem menyimpan timestamp, pelaksana test, dan hasil tiap item.
- Hasil test dapat dikaitkan ke readiness checklist sidang terkait.

---

## EPIC-07 Identity, Presence & Room Verification

### User Story 7.1

Sebagai **petugas verifikasi**, saya ingin mencatat verifikasi identitas peserta agar hanya pihak yang sah yang mengikuti sidang.

**Acceptance Criteria**

- Sistem menyediakan form verifikasi identitas per peserta.
- Sistem menyimpan hasil verifikasi, verifier, waktu verifikasi, dan catatan.
- Sistem mendukung pencatatan metadata tanpa menyimpan data berlebihan bila tidak diperlukan.
- Status verifikasi tampil di detail peserta.

### User Story 7.2

Sebagai **operator**, saya ingin mencatat kehadiran dan waktu masuk peserta agar daftar hadir elektronik dapat dipercaya.

**Acceptance Criteria**

- Sistem menyimpan waktu hadir dan waktu keluar peserta.
- Sistem membedakan status hadir, terlambat, tidak hadir, atau hadir elektronik.
- Data kehadiran dapat ditampilkan per sidang dan diekspor.
- Kehadiran penting dapat dihubungkan ke laporan pasca-sidang.

### User Story 7.3

Sebagai **petugas lokasi terdakwa**, saya ingin mencatat kesiapan dan sterilitas ruang agar kondisi ruang dapat dipertanggungjawabkan.

**Acceptance Criteria**

- Sistem menyediakan checklist ruang terdakwa.
- Ada field untuk status sterilitas, kamera ruangan, perangkat komunikasi, dan catatan pengawasan.
- Hasil verifikasi ruang tersimpan sebagai evidence readiness.
- Riwayat perubahan/verifikasi ruang tercatat.

---

## EPIC-08 Hearing Execution & Status Control

### User Story 8.1

Sebagai **operator sidang**, saya ingin mengubah status sidang menjadi berlangsung, diskors, ditunda, atau selesai agar timeline sidang tercatat resmi di sistem.

**Acceptance Criteria**

- Sistem mendukung perubahan status sesuai state machine yang disetujui.
- Setiap perubahan status mencatat actor, waktu, dan alasan.
- Status tertentu hanya dapat diubah oleh role yang berwenang.
- Timeline status tampil di halaman sidang.

### User Story 8.2

Sebagai **panitera**, saya ingin mencatat peristiwa penting selama sidang agar hasil sidang dan kejadian operasional tidak hilang.

**Acceptance Criteria**

- Sistem menyediakan log kejadian sidang.
- Pengguna dapat menambahkan timestamped notes.
- Log kejadian tidak dapat dihapus sembarangan dan seluruh perubahan tercatat.
- Catatan dapat digunakan pada laporan atau dokumentasi lanjutan.

### User Story 8.3

Sebagai **hakim** atau **panitera**, saya ingin mencatat hasil sidang dan tindak lanjut agar proses berikutnya dapat dipersiapkan segera.

**Acceptance Criteria**

- Sistem menyediakan field hasil sidang dan next action.
- Hasil sidang dapat dihubungkan ke kebutuhan penjadwalan berikutnya.
- Pengguna dapat menandai apakah dokumentasi lanjutan masih tertunda.
- Status DOCUMENTATION_PENDING muncul bila evidence belum lengkap.

---

## EPIC-09 Incident, Cybersecurity & Continuity

### User Story 9.1

Sebagai **operator** atau **Tim TI**, saya ingin mencatat gangguan teknis agar dampak dan tindakan pemulihan dapat diaudit.

**Acceptance Criteria**

- Sistem menyediakan form incident teknis.
- Incident memuat jenis gangguan, waktu kejadian, dampak, tindakan, dan status pemulihan.
- Incident dapat dihubungkan ke sidang tertentu.
- Laporan incident dapat ditarik per periode.

### User Story 9.2

Sebagai **Tim TI/Security**, saya ingin membedakan insiden siber dari gangguan teknis biasa agar penanganan dan eskalasinya tepat.

**Acceptance Criteria**

- Sistem memiliki kategori incident: technical, cyber, force majeure, lainnya.
- Insiden siber memiliki field tambahan untuk severity, data terdampak, dan langkah mitigasi.
- Sistem mendukung penandaan kewajiban pelaporan 1x24 jam.
- Audit log dan incident log dapat ditautkan bila relevan.

### User Story 9.3

Sebagai **pejabat penghubung** atau **petugas operasional**, saya ingin mencatat keadaan kahar agar deviasi dari alur normal tetap terdokumentasi.

**Acceptance Criteria**

- Sistem menyediakan form force majeure.
- Form mencatat waktu kejadian, dasar kejadian, dampak, tindakan sementara, dan pihak yang diberitahu.
- Sistem mendukung penandaan kewajiban pelaporan 3x24 jam.
- Status perkara atau sidang terkait dapat dikaitkan ke force majeure event.

### User Story 9.4

Sebagai **petugas pemasyarakatan**, saya ingin mencatat mutasi/perpindahan tahanan agar sistem mewajibkan re-check readiness sebelum sidang berjalan lagi.

**Acceptance Criteria**

- Sistem menyediakan event mutasi/perpindahan lokasi.
- Event mutasi mengubah status workflow kembali ke readiness bila diperlukan.
- Lokasi baru dan penanggung jawab baru dapat dicatat.
- Audit log mencatat perubahan lokasi dan user yang menginput.

---

## EPIC-10 Appeal Verdict & Post-Verdict Administration

### User Story 10.1

Sebagai **panitera**, saya ingin mencatat pembacaan putusan tingkat banding agar kewajiban administratif pasca-putusan dapat ditelusuri.

**Acceptance Criteria**

- Sistem menyediakan flow khusus pembacaan putusan banding.
- Sistem mencatat tanggal pembacaan, perubahan tanggal bila ada, dan dasar perubahan.
- Data flow terhubung ke perkara dan dokumen terkait.
- Riwayat perubahan jadwal pembacaan putusan dapat dilihat.

### User Story 10.2

Sebagai **panitera**, saya ingin mencatat hadir/tidak hadir terdakwa dan/atau penuntut umum secara langsung atau elektronik agar data administratif sesuai kebutuhan lanjutan.

**Acceptance Criteria**

- Sistem menyediakan field hadir/tidak hadir per pihak terkait.
- Moda kehadiran dapat dipilih: langsung atau elektronik.
- Perubahan data kehadiran tercatat pada audit log.
- Data ini dapat muncul dalam laporan administratif yang relevan.

### User Story 10.3

Sebagai **petugas administrasi**, saya ingin melacak pengunggahan petikan putusan pada hari yang sama agar kepatuhan dapat dipantau.

**Acceptance Criteria**

- Sistem menyediakan timestamp upload petikan putusan.
- Sistem menandai on time atau overdue terhadap kewajiban same-day.
- Dashboard menampilkan kasus yang belum memenuhi kewajiban.
- Evidence upload dapat dilampirkan atau direferensikan.

### User Story 10.4

Sebagai **petugas administrasi**, saya ingin melacak penyampaian salinan putusan dan berkas dalam 7 hari agar tidak terjadi keterlambatan tanpa pemantauan.

**Acceptance Criteria**

- Sistem menyimpan due date 7 hari sejak event yang menjadi dasar.
- Sistem menampilkan countdown atau overdue indicator.
- Pengguna dapat menandai bukti penyampaian dan tanggal realisasi.
- Laporan kepatuhan 7 hari tersedia.

---

## EPIC-11 Evidence, Document Reference & Auditability

### User Story 11.1

Sebagai **panitera**, saya ingin mereferensikan dokumen resmi ke dalam perkara agar proses operasional tetap terhubung dengan dasar administrasi yang sah.

**Acceptance Criteria**

- Sistem memungkinkan pencatatan jenis dokumen, nomor, tanggal, hash/versi bila ada, dan lokasi dokumen.
- Dokumen dapat dihubungkan ke perkara, jadwal, atau sidang tertentu.
- Riwayat referensi dokumen tercatat.
- Pengguna yang tidak berwenang tidak dapat melihat dokumen sensitif.

### User Story 11.2

Sebagai **Tim TI** atau **auditor internal**, saya ingin seluruh aktivitas penting meninggalkan audit log agar proses dapat direkonstruksi bila diperlukan.

**Acceptance Criteria**

- Audit log menyimpan actor, role, timestamp, object, action, dan result.
- Audit log tersedia untuk event bisnis dan event keamanan penting.
- Audit log dapat difilter dan dicari.
- Audit log tidak dapat diubah melalui UI biasa.

### User Story 11.3

Sebagai **petugas operasional**, saya ingin metadata rekaman sidang dapat dicatat agar dokumentasi audiovisual dapat ditelusuri.

**Acceptance Criteria**

- Sistem menyediakan field metadata rekaman: waktu mulai, waktu selesai, lokasi penyimpanan, dan pihak berwenang.
- Metadata dikaitkan dengan sidang terkait.
- Riwayat pembaruan metadata tercatat.
- Sistem dapat menyimpan chain of custody event bila diperlukan.

---

## EPIC-12 Monitoring, KPI & Reporting

### User Story 12.1

Sebagai **manajemen operasional**, saya ingin dashboard status proses agar dapat memonitor perkara aktif, sidang siap, sidang terlambat, dan incident utama.

**Acceptance Criteria**

- Dashboard menampilkan ringkasan status per proses.
- Angka dapat difilter berdasarkan periode, satuan kerja, atau jenis perkara.
- Ada widget untuk overdue acknowledgment, readiness pending, dan incident aktif.
- Data dashboard diperbarui dari sumber operasional sistem.

### User Story 12.2

Sebagai **manajemen** atau **PMO**, saya ingin melihat KPI dan SLA agar evaluasi layanan dapat dilakukan berbasis data.

**Acceptance Criteria**

- Sistem menghitung KPI utama yang ditetapkan dalam PRD.
- KPI dapat ditampilkan per periode dan per satuan kerja.
- Overdue atau underperforming metric ditandai jelas.
- Data KPI dapat diekspor.

### User Story 12.3

Sebagai **petugas evaluasi**, saya ingin menghasilkan laporan periodik agar monitoring dan evaluasi lintas instansi dapat dilakukan tanpa kompilasi manual yang berat.

**Acceptance Criteria**

- Sistem dapat menghasilkan laporan terstruktur untuk jadwal, kehadiran, incident, dan kepatuhan SLA.
- Laporan dapat difilter menurut periode dan satuan kerja.
- Laporan dapat diekspor ke format yang disetujui.
- Waktu pembuatan dan pembuat laporan tercatat.

---

## EPIC-13 Security, Access Control & Administration

### User Story 13.1

Sebagai **administrator**, saya ingin mengelola role dan permission agar akses tiap pengguna sesuai kewenangannya.

**Acceptance Criteria**

- Sistem menyediakan manajemen role dan assignment user.
- Permission dasar dapat dikonfigurasi per modul.
- Perubahan role tercatat di audit log.
- Pengguna tanpa hak akses tidak dapat membuka fitur yang dibatasi.

### User Story 13.2

Sebagai **administrator keamanan**, saya ingin MFA aktif untuk role sensitif agar risiko penyalahgunaan akun berkurang.

**Acceptance Criteria**

- Sistem mendukung MFA untuk role yang ditentukan.
- Aktivasi atau penonaktifan MFA tercatat.
- Login tanpa faktor kedua ditolak bila MFA wajib.
- Event login gagal dan access denied tercatat.

### User Story 13.3

Sebagai **administrator**, saya ingin mengelola konfigurasi provider, kanal resmi, template notifikasi, dan parameter SLA agar sistem dapat disesuaikan tanpa mengubah kode inti bisnis.

**Acceptance Criteria**

- Sistem menyediakan halaman konfigurasi admin.
- Parameter kritis dapat diubah oleh role tertentu saja.
- Perubahan konfigurasi terdokumentasi di audit log.
- Nilai konfigurasi aktif dapat dilihat kembali untuk keperluan audit.

---

## Prioritas Implementasi

| Priority | Epic                                        |
| -------- | ------------------------------------------- |
| P0       | EPIC-01, EPIC-02, EPIC-03, EPIC-04, EPIC-05 |
| P1       | EPIC-06, EPIC-07, EPIC-08, EPIC-11          |
| P2       | EPIC-09, EPIC-12, EPIC-13                   |
| P3       | EPIC-10                                     |

## Definition of Ready untuk Story

Sebuah user story siap dikerjakan jika:

- tujuan bisnis/story jelas,
- actor utama diketahui,
- dependency utama diketahui,
- acceptance criteria dapat diuji,
- belum ada keputusan kebijakan yang menggantung untuk story tersebut,
- desain data minimal telah dipahami.

## Definition of Done untuk Story

Sebuah user story dianggap selesai jika:

- seluruh acceptance criteria terpenuhi,
- validasi backend dan UI konsisten,
- audit log untuk event penting tersedia,
- role restriction telah diuji,
- error handling dasar tersedia,
- dokumentasi singkat atau catatan perilaku fitur diperbarui,
- lulus QA/UAT sesuai scope story.

## Catatan Lanjutan

Dokumen ini adalah backlog level produk. Untuk eksekusi engineering penuh, dokumen berikut masih perlu dibuat:

- technical design per epic,
- permission matrix detail,
- data dictionary,
- API contract,
- test scenario & UAT matrix,
- sprint plan dan dependency map.
