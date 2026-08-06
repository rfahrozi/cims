const fs = require('fs');

// 1. Update sop.md
let sop = fs.readFileSync('./sop.md', 'utf8');

sop = sop.replace(
  /\| 7 \| Ruang sidang virtual \| Hanya diprovisioning bila status ALL_READY atau AUTO_FORCED yang sah \|/,
  '| 7 | Ruang sidang virtual | Diprovisioning otomatis saat penjadwalan agar link masuk ke Penetapan, aktivasi/akses hanya bila status ALL_READY atau AUTO_FORCED sah |'
);

const table2Old = `| 1 | Menetapkan jadwal sidang / pembacaan putusan | Hakim / Panitera | Jadwal sah dan tidak bentrok | Kalender sidang, conflict check, data perkara | Sebelum H-7 | Jadwal aktif | Dasar penerbitan penetapan |
| 2 | Menyusun dan menandatangani penetapan pemberitahuan sidang pembacaan putusan | Hakim / Panitera | Dokumen sah dan lengkap | Draft penetapan, tanda tangan, metadata sidang | Minimal H-7 | Penetapan siap unggah | Harus sesuai format yang berlaku |
| 3 | Upload penetapan ke CIMS | Panitera / Operator | Tersedia di sistem tepat waktu | File penetapan final | Minimal H-7 | Penetapan terunggah | Hard gate wajib |
| 4 | Kirim notifikasi lintas instansi | CIMS / Panitera / Liaison Officer | Pemberitahuan terkirim dan tercatat | Kanal notifikasi, daftar penerima, status kirim | Setelah upload penetapan | Log notifikasi | Dapat memakai email, WhatsApp, SMS, in-app |
| 5 | Reminder dan acknowledgment | Sistem / instansi penerima | Ada pencatatan acknowledgment bila diwajibkan | Konfigurasi notifikasi, reminder | Mengikuti konfigurasi aktif CIMS | Status penerimaan | Parameter default mengikuti konfigurasi sistem yang berlaku |`;

const table2New = `| 1 | Menetapkan jadwal sidang / pembacaan putusan | Hakim / Panitera | Jadwal sah dan tidak bentrok | Kalender sidang, conflict check, data perkara | Sebelum H-7 | Jadwal aktif | Dasar penerbitan penetapan |
| 2 | Provisioning ruang sidang virtual (Zoom) | Sistem CIMS / Operator IT | Link Zoom dibuat otomatis sesuai jadwal | API Key Zoom, Data Jadwal | Saat jadwal disimpan | Link Zoom Tersedia | Link disematkan ke Penetapan |
| 3 | Menyusun dan menandatangani penetapan pemberitahuan sidang pembacaan putusan | Hakim / Panitera | Dokumen sah, lengkap, memuat link Zoom | Draft penetapan, tanda tangan, metadata sidang, link Zoom | Minimal H-7 | Penetapan siap unggah | Harus sesuai format yang berlaku |
| 4 | Upload penetapan ke CIMS | Panitera / Operator | Tersedia di sistem tepat waktu | File penetapan final | Minimal H-7 | Penetapan terunggah | Hard gate wajib |
| 5 | Kirim notifikasi lintas instansi | CIMS / Panitera / Liaison Officer | Pemberitahuan terkirim dan tercatat | Kanal notifikasi, daftar penerima, status kirim | Setelah upload penetapan | Log notifikasi | Dapat memakai email, WhatsApp, SMS, in-app |
| 6 | Reminder dan acknowledgment | Sistem / instansi penerima | Ada pencatatan acknowledgment bila diwajibkan | Konfigurasi notifikasi, reminder | Mengikuti konfigurasi aktif CIMS | Status penerimaan | Parameter default mengikuti konfigurasi sistem yang berlaku |`;

sop = sop.replace(table2Old, table2New);

sop = sop.replace(
  /\| 4 \| Review status readiness \| Sistem CIMS \/ Operator \| Status ALL_READY atau belum \| Semua checklist dari pihak terkait \| H-1 sampai sebelum sidang \| Status readiness \| Syarat provisioning ruang virtual \|/,
  '| 4 | Review status readiness | Sistem CIMS / Operator | Status ALL_READY atau belum | Semua checklist dari pihak terkait | H-1 sampai sebelum sidang | Status readiness | Syarat aktivasi/pembukaan ruang virtual |'
);

sop = sop.replace(
  /### 5\. Auto-Forced Bypass dan Provisioning Ruang Virtual/,
  '### 5. Auto-Forced Bypass dan Aktivasi Ruang Virtual'
);

sop = sop.replace(
  /\| 4 \| Provisioning ruang sidang virtual \| Operator IT \/ Sistem \| Hanya saat ALL_READY atau AUTO_FORCED sah \| Status readiness, akun platform VC \| Setelah syarat terpenuhi \| Ruang sidang virtual aktif \| Tidak boleh diprovisioning sebelum hard gate sah \|/,
  '| 4 | Aktivasi / Pembukaan ruang sidang virtual | Operator IT / Sistem | Hanya saat ALL_READY atau AUTO_FORCED sah | Status readiness, Link Zoom yang telah diprovisioning | Setelah syarat terpenuhi | Ruang sidang virtual aktif/terbuka | Tidak boleh diaktivasi/diakses sebelum hard gate sah |'
);

sop = sop.replace(
  /\| 7 \| Provisioning Ruang Virtual \| ALL_READY atau AUTO_FORCED sah \| Ruang sidang tidak dapat dibuat \|/,
  '| 7 | Aktivasi Ruang Virtual | ALL_READY atau AUTO_FORCED sah | Ruang sidang (link Zoom) tidak dapat diaktivasi/dibuka |'
);

sop = sop.replace(
  /\| 13 \| Provisioning ruang sidang virtual \| Operator IT \/ sistem \| Sistem membuat meeting room \/ ruang sidang virtual \| Ruang hanya dibuat jika status ALL_READY atau AUTO_FORCED yang sah \| Setelah hard gate readiness terpenuhi \| Ruang virtual aktif \| Tidak boleh lebih awal \|/,
  '| 13 | Aktivasi / Pembukaan ruang sidang virtual | Operator IT / sistem | Membuka akses meeting room / ruang sidang virtual yang telah dibuat | Ruang hanya dibuka jika status ALL_READY atau AUTO_FORCED yang sah | Setelah hard gate readiness terpenuhi | Ruang virtual dapat diakses | Tidak boleh diakses lebih awal |'
);

const detilRow3 =
  '| 3 | Aktivasi jadwal sidang | Panitera / Hakim / admin jadwal | Menetapkan agenda sidang/pembacaan putusan setelah conflict check | Tidak ada benturan jadwal dan agenda sah | Sebelum H-7 | Jadwal aktif | Dasar pembentukan penetapan |';
const detilRow3WithProvisioning =
  detilRow3 +
  '\n| 3.1 | Provisioning ruang sidang virtual | Sistem CIMS / Operator IT | Sistem membuat meeting room Zoom berdasarkan jadwal | Link Zoom berhasil di-generate secara otomatis | Bersamaan dengan jadwal aktif | Link Zoom | Link disematkan ke dalam surat penetapan |';
sop = sop.replace(detilRow3, detilRow3WithProvisioning);

fs.writeFileSync('./sop.md', sop);

// 2. Update CIMS_PROJECT_DESCRIPTION.html (Mermaid diagram and steps)
let htmlDesc = fs.readFileSync('./docs/CIMS_PROJECT_DESCRIPTION.html', 'utf8');

htmlDesc = htmlDesc.replace(
  'ALL_READY --> PROVISIONING : Hard Gate H-1 / Bypass < 2 Jam Terpenuhi',
  'ALL_READY --> READY : Hard Gate H-1 / Bypass < 2 Jam Terpenuhi'
);

htmlDesc = htmlDesc.replace(
  'PROVISIONING --> READY : Ruang Virtual Siap\n    READY --> STARTED : Hakim Mulai Sidang',
  'READY --> STARTED : Hakim Membuka Sidang di Ruang Virtual'
);

htmlDesc = htmlDesc.replace(
  'SCHEDULE_ACTIVE --> CREATE_DETERMINATION : Pembuatan Penetapan',
  'SCHEDULE_ACTIVE --> PROVISIONING : Sistem Generate Link Zoom\n    PROVISIONING --> CREATE_DETERMINATION : Link Masuk ke Penetapan'
);

htmlDesc = htmlDesc.replace(
  '        Ruang virtual hanya dapat\n        dibuat setelah seluruh\n        hard gate terpenuhi.',
  '        Ruang virtual dibuat\n        otomatis setelah jadwal\n        bebas konflik agar tautan\n        masuk ke Penetapan.'
);

htmlDesc = htmlDesc.replace(
  'Panitera menyusun jadwal dan agenda sidang berdasarkan data persidangan yang telah\n                tervalidasi. Sistem melakukan pemeriksaan konflik terhadap sumber daya persidangan\n                sebelum jadwal ditetapkan.',
  'Panitera menyusun jadwal dan agenda sidang berdasarkan data persidangan yang telah\n                tervalidasi. Sistem melakukan pemeriksaan konflik terhadap sumber daya persidangan\n                sebelum jadwal ditetapkan. Setelah jadwal sah, Sistem otomatis melakukan <strong>Provisioning Ruang Sidang Virtual (Zoom)</strong>.'
);

htmlDesc = htmlDesc.replace(
  'Berdasarkan jadwal sidang yang telah ditetapkan, Hakim membuat Penetapan',
  'Berdasarkan jadwal sidang yang telah ditetapkan dan tautan Zoom yang telah diprovisioning, Hakim membuat Penetapan'
);
