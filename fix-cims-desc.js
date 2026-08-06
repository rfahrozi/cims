const fs = require('fs');
let html = fs.readFileSync('./docs/CIMS_PROJECT_DESCRIPTION.html', 'utf8');

// Update text in Section 2 (Hard Gates Enforcement)
html = html.replace(
  /Tidak ada ruang Zoom yang terbentuk tanpa APPROVED Determination dari Hakim, tidak ada jadwal tanpa Ceklis Kesiapan \(Readiness\) yang lulus dari ketiga instansi\./,
  'Ruang Zoom dibentuk secara otomatis bersamaan dengan penetapan jadwal, sehingga Link Sidang dapat di-embed langsung ke dalam dokumen Surat Penetapan resmi. Tidak ada jadwal tanpa validasi data dari Hakim, dan sidang tidak dapat dimulai tanpa kelulusan Ceklis Kesiapan (Readiness) dari ketiga instansi.'
);

// Update Mermaid Diagram
html = html.replace(/ALL_READY --> PROVISIONING : Hard Gate H-1 \/ Bypass < 2 Jam Terpenuhi/, '');
html = html.replace(
  /PROVISIONING --> READY : Ruang Virtual Siap\n\s*READY --> STARTED : Hakim Mulai Sidang/,
  'ALL_READY --> READY : Hard Gate H-1 / Bypass < 2 Jam Terpenuhi\n    READY --> STARTED : Hakim Membuka Sidang di Ruang Virtual'
);
html = html.replace(
  /CONFLICT_CHECK --> SCHEDULE_ACTIVE : Tidak Ada Konflik/,
  'CONFLICT_CHECK --> SCHEDULE_ACTIVE : Tidak Ada Konflik\n    SCHEDULE_ACTIVE --> PROVISIONING : Provisioning Ruang Virtual (Zoom)\n    PROVISIONING --> CREATE_DETERMINATION : Link Zoom Tersedia'
);
html = html.replace(/SCHEDULE_ACTIVE --> CREATE_DETERMINATION : Pembuatan Penetapan/, '');
html = html.replace(
  /note right of PROVISIONING\n\s*Ruang virtual hanya dapat\n\s*dibuat setelah seluruh\n\s*hard gate terpenuhi\.\n\s*end note/,
  'note right of PROVISIONING\n        Ruang virtual dibuat\n        secara otomatis setelah\n        jadwal sidang bebas konflik,\n        agar link dapat disematkan\n        ke Penetapan.\n    end note'
);

// Update Workflow Step 3 (Penyusunan Jadwal)
html = html.replace(
  /<div class="workflow-desc">\s*Panitera menyusun jadwal dan agenda sidang berdasarkan data persidangan yang telah\s*tervalidasi\. Sistem melakukan pemeriksaan konflik terhadap sumber daya persidangan\s*sebelum jadwal ditetapkan\.\s*<\/div>\s*<div class="checklist">\s*Jadwal aktif menjadi sumber resmi untuk pembuatan Penetapan Pemberitahuan Sidang\s*Pembacaan Putusan\.\s*<\/div>/,
  `<div class="workflow-desc">
                Panitera menyusun jadwal dan agenda sidang berdasarkan data persidangan yang telah
                tervalidasi. Sistem melakukan pemeriksaan konflik terhadap sumber daya persidangan
                sebelum jadwal ditetapkan. Setelah jadwal dinyatakan bebas konflik, sistem secara otomatis melakukan <strong>Provisioning Ruang Sidang Virtual (Zoom)</strong>.
              </div>

              <div class="checklist">
                Ketersediaan link Zoom menjadi prasyarat (pre-requisite) untuk pembuatan Penetapan Pemberitahuan Sidang Pembacaan Putusan.
              </div>`
);

// Update Workflow Step 4 (Pembuatan Penetapan)
html = html.replace(
  /<span class="badge badge-actor">Panitera<\/span>\s*<\/div>\s*<\/div>\s*<div class="workflow-desc">\s*Berdasarkan jadwal sidang yang telah ditetapkan, Hakim membuat Penetapan/,
  `<span class="badge badge-actor">Panitera</span>
                </div>
              </div>

              <div class="workflow-desc">
                Berdasarkan jadwal sidang yang telah ditetapkan dan link Zoom yang telah tersedia, Hakim / Panitera membuat Penetapan`
);

// Update Workflow Step 7 (Ruang Virtual dan Pelaksanaan Sidang)
html = html.replace(
  /<div class="workflow-title">Ruang Virtual dan Pelaksanaan Sidang<\/div>\s*<div>\s*<span class="badge badge-actor">Operator IT<\/span>/,
  `<div class="workflow-title">Registrasi Kehadiran dan Pelaksanaan Sidang</div>
                <div>`
);
html = html.replace(
  /<div class="workflow-desc">\s*Setelah seluruh persyaratan terpenuhi, Operator IT melakukan provisioning ruang\s*virtual\. Hakim mengendalikan status pelaksanaan sidang melalui sistem CIMS\.\s*<\/div>/,
  `<div class="workflow-desc">
                Setelah seluruh persyaratan readiness terpenuhi, persidangan dapat dimulai. Panitera meregistrasi kehadiran, memverifikasi identitas, dan Hakim mengendalikan status pelaksanaan sidang melalui sistem CIMS.
              </div>`
);

fs.writeFileSync('./docs/CIMS_PROJECT_DESCRIPTION.html', html);
