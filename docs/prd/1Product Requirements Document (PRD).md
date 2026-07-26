# Product Requirements Document (PRD)

## CIMS (Court Intelligence Management System) MVP

Versi: 1.0  
Tanggal: 2026-07-26  
Status: Draft untuk review  
Dokumen ini disusun sebagai turunan implementasi dari SOP Persidangan Pidana Elektronik dengan dukungan CIMS, diperkuat oleh kebutuhan koordinasi lintas instansi, pengendalian persidangan elektronik, dan kewajiban administratif yang relevan.

## 1. Ringkasan Produk

CIMS adalah aplikasi orkestrasi lintas instansi untuk mendukung koordinasi dan pelaksanaan persidangan pidana secara elektronik. CIMS tidak menggantikan register resmi perkara maupun sistem resmi administrasi peradilan, melainkan berfungsi sebagai orchestration, notification, readiness, monitoring, evidence, dan audit layer.

Produk ini dirancang untuk memastikan bahwa setiap tahapan persidangan elektronik dapat dikendalikan, ditelusuri, diverifikasi, dan dievaluasi. CIMS menghubungkan data perkara, penetapan, penjadwalan, notifikasi, kesiapan teknis, ruang sidang virtual, status sidang, insiden, dan tindak lanjut administratif dalam satu alur kerja yang terdokumentasi.

Pada fase MVP, CIMS berfokus pada alur minimum yang wajib tersedia agar persidangan elektronik dapat dikelola secara tertib, aman, akuntabel, dan siap diaudit. Area lanjutan yang belum diotomasi penuh dapat dipenuhi melalui kontrol manual terdokumentasi selama disetujui sebagai controlled limitation dan tidak mengganggu kewajiban minimum.

## 2. Latar Belakang dan Masalah yang Diselesaikan

Pelaksanaan persidangan elektronik melibatkan banyak pihak, sistem, dan titik koordinasi. Risiko utama yang muncul tanpa sistem orkestrasi adalah keterlambatan pemberitahuan, konflik jadwal, ketidakjelasan peran, lemahnya audit trail, ketidaksiapan teknis saat sidang, lemahnya bukti acknowledgment, dan sulitnya evaluasi kepatuhan operasional.

CIMS dibutuhkan untuk menjawab masalah tersebut melalui pengendalian proses berbasis status, hard gate, checklist kesiapan, notifikasi resmi dan pengingat, integrasi ruang sidang virtual, pemantauan SLA, serta penyediaan bukti administratif dan jejak audit.

## 3. Tujuan Produk

Tujuan utama CIMS adalah menyediakan platform yang dapat:

- mengorkestrasi alur persidangan elektronik dari pra-sidang sampai pasca-sidang,
- memastikan penjadwalan, notifikasi, readiness, dan pelaksanaan sidang berjalan sesuai peran dan kewenangan,
- menyediakan audit trail dan evidence log untuk seluruh aktivitas penting,
- mendukung integrasi ruang sidang virtual berbasis Zoom dengan arsitektur adapter,
- memantau kepatuhan operasional, SLA, insiden, dan tindak lanjut administratif,
- mendukung pengambilan keputusan readiness dan go-live secara berbasis bukti.

## 4. Sasaran Keberhasilan Produk

Produk dinilai berhasil bila:

- proses penetapan, penjadwalan, notifikasi, readiness, dan pelaksanaan sidang dapat dikelola end-to-end dalam sistem,
- semua aktivitas penting meninggalkan bukti yang dapat ditelusuri,
- konflik jadwal dan keterlambatan acknowledgment berkurang secara signifikan,
- kesiapan teknis sebelum sidang dapat diverifikasi dengan checklist dan hard gate,
- integrasi ruang sidang virtual tersedia dan dapat dipantau statusnya,
- laporan monitoring dan evaluasi dapat dihasilkan tanpa rekonsiliasi manual yang berat,
- kewajiban administratif pasca-putusan yang termasuk scope dapat dipantau melalui SLA dan evidence tracking.

## 5. Scope Produk

### 5.1 In Scope MVP

MVP mencakup:

- registrasi referensi perkara dan data dasar sidang,
- pencatatan referensi penetapan persidangan elektronik,
- penjadwalan sidang dan pengelolaan perubahan jadwal,
- integrasi ruang sidang virtual dengan provider video conference default yang disetujui,
- notifikasi, acknowledgment, reminder, dan eskalasi,
- checklist kesiapan administratif, teknis, dan operasional,
- verifikasi identitas dan status kehadiran,
- kontrol status sidang dan pencatatan kejadian penting,
- pencatatan gangguan teknis, insiden siber, dan keadaan kahar,
- pencatatan metadata dokumen dan metadata rekaman,
- dashboard monitoring, KPI, dan laporan evaluasi dasar,
- dukungan alur pembacaan putusan tingkat banding dan kewajiban administratif terkait jika termasuk scope implementasi.

### 5.2 Out of Scope MVP

Area berikut dapat dinyatakan di luar scope MVP kecuali diputuskan lain:

- penggantian penuh register resmi perkara,
- penerbitan seluruh dokumen resmi langsung dari CIMS tanpa sistem resmi,
- pengambilan keputusan yudisial oleh sistem,
- analitik prediktif kompleks,
- orkestrasi lintas wilayah skala nasional tanpa kesiapan integrasi institusional,
- otomatisasi penuh seluruh proses retensi dan arsip tanpa keputusan kebijakan resmi.

## 6. Prinsip Produk

CIMS dibangun dengan prinsip berikut:

- compliance-by-design,
- human decision supremacy,
- least privilege access,
- evidence-first workflow,
- provider-adapter architecture,
- interoperability with official systems,
- auditable by default,
- configurable but policy-bound.

## 7. Persona Pengguna

### 7.1 Hakim

Mengakses informasi perkara yang relevan, memeriksa status kesiapan, melihat bukti readiness, menetapkan atau memvalidasi langkah tertentu sesuai kewenangan, dan memonitor status sidang.

### 7.2 Panitera

Mengelola referensi perkara, referensi penetapan, jadwal, notifikasi, daftar peserta, readiness, tindak lanjut administratif, dan dokumentasi operasional.

### 7.3 Penuntut Umum

Menerima pemberitahuan, memberikan acknowledgment, memantau agenda sidang, mengikuti sidang, dan melakukan tindak lanjut yang menjadi kewenangannya.

### 7.4 Petugas Pemasyarakatan / Rutan / Lapas

Menerima pemberitahuan, mengoordinasikan kehadiran terdakwa, mengisi checklist kesiapan lokasi, melakukan verifikasi identitas terdakwa, dan melaporkan kendala lapangan.

### 7.5 Advokat / Penasihat Hukum

Menerima pemberitahuan, acknowledgment, mengakses sidang yang relevan, dan menggunakan ruang konsultasi privat bila termasuk implementasi.

### 7.6 Tim TI

Mengelola konfigurasi teknis, integrasi provider, dukungan insiden, pemulihan, dan kesehatan sistem tanpa mengubah substansi perkara.

### 7.7 Administrator Sistem

Mengelola akun, organisasi, role, permission, konfigurasi integrasi, dan parameter sistem.

### 7.8 Pejabat Penghubung

Memantau alur lintas instansi, follow-up acknowledgment, dan eskalasi koordinasi.

## 8. Problem Statement per Persona

| Persona             | Masalah utama                                            | Solusi dalam CIMS                          |
| ------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Hakim               | Informasi kesiapan tersebar dan tidak ringkas            | Dashboard readiness dan status perkara     |
| Panitera            | Koordinasi manual banyak titik rawan terlambat           | Workflow terpusat, notifikasi, audit log   |
| Penuntut Umum       | Bukti penerimaan dan tindak lanjut tidak konsisten       | ACK tracking dan history notifikasi        |
| Petugas Rutan/Lapas | Kesiapan lokasi dan verifikasi terdakwa sulit dibuktikan | Checklist readiness dan verifikasi digital |
| Advokat             | Informasi perubahan sidang tidak selalu cepat            | Notifikasi dan akses status sidang         |
| Tim TI              | Sulit membedakan gangguan operasional dan insiden kritis | Incident module dan escalation path        |
| Administrator       | Hak akses dan konfigurasi kompleks                       | Admin console berbasis role                |

## 9. Arsitektur Konseptual Produk

CIMS terdiri dari lapisan berikut:

- user interface untuk role operasional,
- workflow and orchestration engine,
- business rules and hard gate engine,
- notification and acknowledgment service,
- readiness and hearing control service,
- video provider adapter,
- document and evidence reference layer,
- audit and monitoring layer,
- integration layer ke sistem resmi dan kanal eksternal.

CIMS bukan system of record utama untuk perkara. CIMS adalah system of coordination and evidence.

## 10. Modul Produk

### 10.1 Reference Case Module

Mengelola referensi perkara dari sumber resmi, sinkronisasi data minimum, riwayat perubahan, dan keterhubungan dengan proses sidang elektronik.

### 10.2 Determination Module

Mencatat referensi penetapan persidangan elektronik, status sah, metadata dokumen, hash referensi, dan hard gate terhadap langkah berikutnya.

### 10.3 Scheduling Module

Menyusun jadwal sidang, mendeteksi konflik, melakukan reschedule, mencatat alasan perubahan, dan menghasilkan histori perubahan jadwal.

### 10.4 Virtual Courtroom Module

Membuat dan mengelola ruang sidang virtual, menyimpan meeting metadata, memisahkan hak host dan peserta, dan memantau status meeting.

### 10.5 Notification and ACK Module

Mengirim pemberitahuan, mencatat bukti kirim dan terima, acknowledgment, reminder, fallback, dan eskalasi.

### 10.6 Readiness Module

Mengelola checklist kesiapan administratif, teknis, lokasi, operator, dan peserta; serta menerapkan hard gate READY.

### 10.7 Identity and Room Verification Module

Mencatat verifikasi identitas, kehadiran, sterilitas ruang, dan kesiapan kamera/ruangan.

### 10.8 Hearing Control Module

Mengelola status sidang, join/leave peserta, kejadian penting, suspend/postpone/complete, dan hasil sidang.

### 10.9 Incident and Continuity Module

Mencatat gangguan teknis, insiden siber, keadaan kahar, mutasi tahanan, tindakan korektif, dan owner eskalasi.

### 10.10 Appeal Verdict Module

Mengelola pembacaan putusan tingkat banding, hadir/tidak hadir, perubahan tanggal pembacaan, petikan same-day, dan 7-day transfer tracking bila termasuk scope.

### 10.11 Evidence and Document Reference Module

Menyimpan referensi dokumen, hash, versi, lokasi dokumen resmi, metadata rekaman, dan chain of custody event.

### 10.12 Monitoring and Reporting Module

Menghasilkan dashboard status, SLA, KPI, exception summary, dan laporan periodik.

### 10.13 Security and Access Module

Mengelola akun, MFA, RBAC/ABAC, access review, session control, dan audit keamanan.

### 10.14 Admin and Configuration Module

Mengelola role, organisasi, provider, channel resmi, parameter SLA, template notifikasi, dan konfigurasi global.

## 11. Alur Produk End-to-End

1. Data perkara direferensikan dari sistem resmi atau diinput oleh petugas berwenang.
2. Referensi penetapan persidangan elektronik dicatat dan divalidasi.
3. Jadwal disusun berdasarkan ketersediaan pihak, ruang, dan kebutuhan perkara.
4. Ruang sidang virtual dibuat setelah hard gate terpenuhi.
5. Notifikasi resmi dikirim dan acknowledgment dilacak.
6. Checklist readiness dan uji teknis dilaksanakan.
7. Sidang masuk status READY lalu IN_PROGRESS.
8. Sistem mencatat kehadiran, peristiwa penting, dan status sidang.
9. Bila terjadi gangguan atau insiden, incident workflow diaktifkan.
10. Setelah sidang selesai, dokumentasi dan tindak lanjut administratif dicatat.
11. Dashboard, KPI, dan laporan monitoring diperbarui.
12. Proses ditutup setelah evidence dan dokumentasi lengkap.

## 12. State Machine Proses

| Status                         | Deskripsi                                   |
| ------------------------------ | ------------------------------------------- |
| DRAFT                          | Data awal belum lengkap atau belum diajukan |
| WAITING_JUDICIAL_DETERMINATION | Menunggu referensi penetapan sah            |
| ELECTRONIC_TRIAL_DETERMINED    | Penetapan sah tercatat                      |
| COORDINATION                   | Proses koordinasi pihak dan jadwal          |
| WAITING_ACKNOWLEDGMENT         | Menunggu konfirmasi penerimaan              |
| READINESS_CHECK                | Checklist kesiapan sedang diisi             |
| TECHNICAL_TEST                 | Uji teknis dilaksanakan                     |
| READY                          | Seluruh syarat minimum terpenuhi            |
| IN_PROGRESS                    | Sidang sedang berjalan                      |
| SUSPENDED                      | Sidang diskors                              |
| POSTPONED                      | Sidang ditunda                              |
| COMPLETED                      | Sidang selesai                              |
| DOCUMENTATION_PENDING          | Dokumentasi atau sinkronisasi belum lengkap |
| CLOSED                         | Seluruh evidence lengkap dan proses ditutup |

## 13. Requirement Fungsional

### 13.1 Registrasi dan Referensi Perkara

- Sistem harus menerima referensi perkara dari sumber resmi atau input oleh petugas berwenang.
- Sistem harus menyimpan nomor perkara, jenis perkara, satuan kerja, status perkara, daftar pihak, dan referensi sumber resmi.
- Sistem harus mencatat cap waktu, sumber data, dan riwayat sinkronisasi.
- Sistem tidak boleh bertindak sebagai register induk perkara bila register resmi tersedia.

### 13.2 Penetapan Persidangan Elektronik

- Sistem harus mencatat referensi penetapan yang sah.
- Sistem harus menyimpan nomor penetapan, tanggal, pihak terkait, mode persidangan, alasan, hash referensi, dan lokasi dokumen.
- Sistem harus menolak pembuatan ruang sidang virtual sebelum penetapan sah tercatat.
- Sistem tidak boleh membuat keputusan yudisial otomatis.

### 13.3 Penjadwalan Sidang

- Sistem harus menyusun jadwal berdasarkan ketersediaan hakim, panitera, penuntut umum, lokasi terdakwa, saksi, ahli, dan fasilitas virtual.
- Sistem harus mendeteksi konflik jadwal.
- Sistem harus mendukung perubahan jadwal, pembatalan, dan pencatatan alasannya.
- Sistem harus menyimpan histori jadwal dan siapa yang mengubah.

### 13.4 Integrasi Ruang Sidang Virtual

- Sistem harus membuat rapat Zoom atau provider lain melalui adapter.
- Sistem harus menyimpan meeting ID, passcode, join URL, host URL bila relevan, status meeting, dan metadata lainnya.
- Sistem harus mendukung pemisahan akses host dan peserta.
- Sistem harus mendukung ruang atau konfigurasi untuk saksi, terdakwa, dan konsultasi privat bila berlaku.

### 13.5 Notifikasi dan Acknowledgment

- Sistem harus mendukung notifikasi resmi kepada pihak terkait.
- Sistem harus mencatat waktu kirim, bukti kirim, waktu terima, acknowledgment, dan status keterlambatan.
- Sistem harus menyediakan reminder otomatis dan jalur eskalasi.
- Sistem harus mendukung pemberitahuan perubahan jadwal dan pembacaan putusan banding bila termasuk scope.

### 13.6 Readiness dan Uji Teknis

- Sistem harus menyediakan checklist kesiapan per sidang.
- Sistem harus menandai item wajib dan item kondisional.
- Sistem harus mencegah status READY bila item wajib belum terpenuhi.
- Sistem harus mencatat internet utama/cadangan, audio, video, ruang, operator, dan kesiapan lokasi.

### 13.7 Verifikasi Identitas dan Kehadiran

- Sistem harus mencatat verifikasi identitas peserta sebelum sidang.
- Sistem harus mencatat status kehadiran, waktu hadir, dan pihak yang memverifikasi.
- Sistem harus membatasi pengumpulan data identitas hanya pada metadata yang diperlukan.

### 13.8 Pelaksanaan Sidang

- Sistem harus mendukung status IN_PROGRESS, SUSPENDED, POSTPONED, dan COMPLETED.
- Sistem harus mencatat waktu masuk/keluar peserta dan kejadian penting.
- Sistem harus mencatat hasil sidang dan tindak lanjut administratif yang relevan.

### 13.9 Exception Handling

- Sistem harus membedakan gangguan teknis, insiden siber, dan keadaan kahar.
- Sistem harus mendukung pelaporan insiden siber dalam 1x24 jam.
- Sistem harus mendukung pelaporan keadaan kahar dalam 3x24 jam.
- Sistem harus mendukung alur mutasi atau perpindahan tahanan dengan re-check readiness.

### 13.10 Putusan Banding dan Administrasi Lanjutan

- Sistem harus mendukung pencatatan pembacaan putusan tingkat banding bila scope mencakup area tersebut.
- Sistem harus mencatat hadir/tidak hadir terdakwa dan/atau penuntut umum secara langsung atau elektronik.
- Sistem harus mendukung pelacakan pengunggahan petikan putusan pada hari yang sama.
- Sistem harus mendukung pelacakan penyampaian salinan putusan dan berkas perkara dalam 7 hari.

### 13.11 Monitoring dan Pelaporan

- Sistem harus menyediakan dashboard status proses.
- Sistem harus menampilkan KPI dan SLA operasional.
- Sistem harus menghasilkan laporan monitoring dan evaluasi periodik.
- Sistem harus dapat mengekspor data untuk review lintas instansi.

## 14. Requirement Nonfungsional

### 14.1 Keamanan

- Semua akun harus menggunakan identitas resmi.
- MFA wajib untuk peran internal utama dan administrator.
- Enkripsi wajib untuk data sensitif saat transit dan untuk area simpan yang relevan.
- Access control harus menerapkan least privilege.
- Seluruh perubahan konfigurasi dan akses ditulis ke audit log.

### 14.2 Ketersediaan

- Sistem harus mendukung backup dan pemulihan.
- Sistem harus dapat beroperasi dengan koneksi cadangan untuk area kritis operasional.
- Monitoring kesehatan layanan harus tersedia.

### 14.3 Integritas dan Auditability

- Aktivitas penting harus tercatat dengan timestamp, actor, action, object, result.
- Dokumen referensi harus mendukung hash atau version reference.
- Riwayat perubahan harus tidak mudah dihapus atau ditimpa.

### 14.4 Privasi dan Minimalisasi Data

- Data pribadi hanya dikumpulkan sesuai kebutuhan operasional.
- Duplikasi salinan identitas harus dihindari jika metadata sudah cukup.
- Visibilitas perkara dan data harus dibatasi per role dan per kewenangan.

### 14.5 Interoperabilitas

- Sistem harus mendukung integrasi dengan sistem resmi dan provider eksternal melalui adapter.
- Kontrak data dan event harus dapat dikembangkan tanpa mengubah logika inti produk.

## 15. Role dan Permission Tingkat Tinggi

| Peran                  | Hak inti                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| Hakim                  | melihat kesiapan, validasi tahapan sesuai kewenangan, memonitor sidang     |
| Panitera               | mengelola perkara, jadwal, notifikasi, readiness, administrasi operasional |
| Penuntut Umum          | menerima notifikasi, acknowledgment, ikut sidang, akses perkara terkait    |
| Petugas Pemasyarakatan | acknowledgment, checklist lokasi, verifikasi terdakwa, pelaporan kendala   |
| Advokat                | menerima notifikasi, acknowledgment, akses sidang yang relevan             |
| Tim TI                 | konfigurasi teknis, dukungan, monitoring, incident response                |
| Administrator          | akun, role, konfigurasi, integrasi, parameter sistem                       |
| Pejabat Penghubung     | koordinasi, follow-up, eskalasi                                            |

Catatan: field-level permission matrix akan dibuat pada dokumen lanjutan.

## 16. Data Model Inti

| Entitas               | Atribut utama                                                        |
| --------------------- | -------------------------------------------------------------------- |
| CaseReference         | nomorPerkara, jenisPerkara, satuanKerja, status, sourceRef           |
| JudicialDetermination | nomorPenetapan, tanggal, mode, alasan, statusSah, hashRef            |
| Schedule              | agenda, tanggal, waktu, durasi, lokasi, konflik, status              |
| Participant           | nama, peran, instansi, statusHadir, lokasi, acknowledgment           |
| Notification          | jenis, pengirim, penerima, kanal, waktuKirim, waktuTerima, ackStatus |
| ReadinessChecklist    | item, mandatory, status, verifier, waktuVerifikasi                   |
| HearingSession        | provider, meetingId, joinUrl, hostUrl, statusMeeting                 |
| Incident              | jenis, tingkat, dampak, waktu, tindakan, owner                       |
| AppealVerdictFlow     | tanggalBaca, hadirStatus, petikanUploadedAt, transferDueDate         |
| DocumentReference     | jenisDokumen, hash, versi, lokasi, sourceSystem                      |
| AuditLog              | actor, role, waktu, objectType, objectId, action, result             |
| SLAConfig             | jenisSLA, target, aturanEskalasi                                     |

## 17. Integrasi yang Dibutuhkan

### 17.1 Integrasi Sistem Resmi

- referensi perkara,
- referensi dokumen resmi,
- sinkronisasi status tertentu,
- verifikasi keterhubungan dokumen.

### 17.2 Integrasi Video Conference

- pembuatan ruang Zoom,
- pembaruan status meeting,
- penyimpanan metadata rapat,
- kemungkinan webhook status meeting.

### 17.3 Integrasi Kanal Notifikasi

- email resmi,
- kanal internal instansi,
- reminder channel tambahan seperti SMS/WhatsApp bila diizinkan.

### 17.4 Integrasi Monitoring dan Security

- log keamanan,
- alerting,
- audit export,
- monitoring kesehatan layanan.

## 18. Audit Trail Wajib

Audit log minimal harus mencakup:

- create/update/sync perkara,
- referensi penetapan,
- create/update/cancel jadwal,
- send/receive/ack notifikasi,
- update readiness item,
- verifikasi identitas,
- pembuatan dan aktivasi ruang sidang virtual,
- join/leave peserta,
- perubahan status sidang,
- upload referensi dokumen,
- insiden teknis dan keamanan,
- perubahan role dan konfigurasi,
- login, logout, MFA, access denied.

## 19. KPI dan SLA

Sistem harus mampu mengukur KPI berikut:

| KPI / SLA                             | Definisi                                           |
| ------------------------------------- | -------------------------------------------------- |
| Persentase pemberitahuan berhasil     | notifikasi sukses dibanding total notifikasi wajib |
| Persentase acknowledgment tepat waktu | ack tepat waktu dibanding total ack wajib          |
| Kesiapan sebelum sidang               | sidang yang mencapai READY sebelum waktu mulai     |
| Ketepatan waktu mulai sidang          | sidang yang dimulai sesuai jadwal                  |
| Jumlah gangguan teknis                | jumlah incident teknis per periode                 |
| Durasi pemulihan gangguan             | waktu dari insiden hingga pulih                    |
| Kepatuhan pelaporan insiden siber     | insiden dilaporkan dalam 1x24                      |
| Kepatuhan keadaan kahar               | pelaporan dilakukan dalam 3x24                     |
| Kepatuhan dokumentasi                 | persentase sidang dengan evidence lengkap          |
| Kepatuhan putusan banding             | same-day upload dan 7-day transfer bila berlaku    |

Nilai target numerik KPI akan ditetapkan pada lampiran SLA terpisah.

## 20. Readiness dan Go-Live Criteria

Go-live hanya dapat dilakukan jika:

- batas CIMS dan sistem resmi telah disepakati,
- role dan kewenangan lintas instansi telah diformalisasi,
- alur penetapan hingga penutupan sidang telah diuji,
- modul notifikasi dan acknowledgment berjalan,
- readiness checklist dan technical test berjalan,
- integrasi ruang sidang virtual aktif,
- audit trail lengkap,
- kontrol keamanan minimum aktif,
- incident workflow tersedia,
- laporan monitoring dasar tersedia,
- gap kritis yang tersisa telah diputuskan sebagai blocker atau controlled limitation.

## 21. Prioritas MVP dan Fase Pembangunan

### Fase 1 - Core Orchestration

- Reference Case Module
- Determination Module
- Scheduling Module
- Virtual Courtroom Module
- Notification and ACK Module
- Status process dan audit log dasar

### Fase 2 - Operational Readiness

- Readiness Module
- Identity Verification Module
- Hearing Control Module
- Incident basic logging
- Dashboard dasar

### Fase 3 - Compliance Hardening

- MFA dan security controls lanjutan
- Cyber incident workflow
- Force majeure workflow
- Document reference hashing/versioning
- Advanced monitoring and reporting

### Fase 4 - Appeal and Advanced Administration

- Appeal Verdict Module
- same-day upload tracking
- 7-day transfer tracking
- annual evaluation reporting

## 22. Backlog Epics

| Epic                             | Hasil yang diharapkan                           |
| -------------------------------- | ----------------------------------------------- |
| EPIC-01 Case Intake              | perkara dapat direferensikan dan dilacak        |
| EPIC-02 Determination Gate       | tidak ada sidang elektronik tanpa penetapan sah |
| EPIC-03 Smart Scheduling         | jadwal tersusun dan konflik terdeteksi          |
| EPIC-04 Virtual Courtroom        | ruang sidang virtual tersedia dan terlacak      |
| EPIC-05 Notification Reliability | notifikasi dan ACK dapat dibuktikan             |
| EPIC-06 Readiness Assurance      | sidang hanya berjalan jika siap                 |
| EPIC-07 Hearing Execution        | pelaksanaan sidang dapat dipantau               |
| EPIC-08 Incident Continuity      | exception dapat ditangani dan diaudit           |
| EPIC-09 Evidence and Audit       | seluruh proses meninggalkan evidence            |
| EPIC-10 Monitoring and Reporting | kepatuhan dan performa dapat diukur             |

## 23. Risiko Produk

| Risiko                                   | Dampak                                   | Mitigasi                                    |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Ketidakjelasan batas dengan sistem resmi | duplikasi fungsi dan sengketa kewenangan | definisikan boundary dan source of truth    |
| Role matrix belum rinci                  | akses berlebihan atau kurang             | susun permission matrix sebelum UAT         |
| Integrasi eksternal belum stabil         | jadwal/meeting tidak sinkron             | adapter, retry, fallback manual             |
| SLA numerik belum diputuskan             | dashboard tidak punya target             | lampiran SLA sebelum go-live                |
| Evidence tidak lengkap                   | evaluasi kepatuhan lemah                 | wajibkan audit log pada semua event penting |
| Data sensitif tersebar                   | risiko keamanan dan privasi              | encryption, RBAC, minimization              |

## 24. Asumsi dan Dependensi

- ada sistem resmi sebagai sumber perkara dan dokumen resmi,
- ada keputusan institusi untuk provider video conference default,
- kanal resmi notifikasi telah ditetapkan,
- organisasi menyetujui controlled limitation untuk area yang belum otomatis,
- tim legal, operasional, dan TI tersedia untuk validasi dan UAT.

## 25. Hal yang Masih Perlu Diformalisasi

Sebelum pembangunan produksi penuh, organisasi masih perlu melengkapi:

- data dictionary lengkap,
- permission matrix detail per modul,
- nilai target SLA/KPI,
- kontrak integrasi teknis,
- kebijakan retensi per kategori data,
- klasifikasi data dan treatment per level,
- acceptance criteria per modul,
- daftar provider dan channel resmi yang disetujui,
- template digital untuk formulir wajib.

## 26. Definisi Selesai (Definition of Done) untuk MVP

MVP dianggap selesai bila:

- modul inti fase 1 dan fase 2 tersedia,
- seluruh hard gate minimum berjalan,
- audit log dasar aktif,
- role dasar dapat diuji,
- integrasi Zoom dasar bekerja melalui backend aman atau simulator integrasi yang tervalidasi,
- dashboard monitoring dasar tersedia,
- dokumentasi admin dan user guide dasar tersedia,
- UAT lintas peran menunjukkan alur utama berjalan end-to-end,
- gap yang tersisa telah diklasifikasikan secara resmi.

## 27. Lampiran Implementasi yang Disarankan

Dokumen ini perlu dilengkapi oleh artefak berikut:

- SRS per modul,
- data dictionary,
- permission matrix,
- API and integration contract,
- security specification,
- UAT checklist,
- readiness checklist digital,
- SLA annex,
- operational playbook untuk incident dan continuity.

## 28. Penutup

PRD ini menetapkan fondasi produk CIMS sebagai aplikasi orkestrasi persidangan pidana elektronik yang siap diturunkan ke desain sistem, backlog engineering, dan rencana implementasi. Fokus utama MVP adalah memastikan bahwa alur persidangan elektronik tidak hanya dapat dijalankan, tetapi juga dapat dikendalikan, dibuktikan, dan dievaluasi secara konsisten.

CIMS harus diposisikan sebagai alat bantu kepatuhan dan kontrol operasional yang kuat. Keberhasilan implementasinya bergantung pada kualitas desain workflow, ketegasan hard gate, disiplin evidence logging, kesiapan integrasi, dan kejelasan batas kewenangan antara sistem dan aktor manusia yang berwenang.
