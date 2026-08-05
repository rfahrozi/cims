import fs from 'fs';

let content = fs.readFileSync('docs/CIMS_PROJECT_DESCRIPTION.html', 'utf8');

// Update Diagram Mermaid
const oldDiagram = `    SUBMITTED --> ADMIN_VERIFIED : Panitera Validasi Administrasi
    ADMIN_VERIFIED --> REVISION : Data Tidak Sesuai
    REVISION --> DRAFT : Perbaikan Data

    ADMIN_VERIFIED --> JUDGE_VALIDATION : Hakim Validasi Data Persidangan
    JUDGE_VALIDATION --> DATA_APPROVED : Data Valid
    JUDGE_VALIDATION --> REVISION : Perlu Perbaikan

    DATA_APPROVED --> SCHEDULE_DRAFT : Validasi Selesai

    SCHEDULE_DRAFT --> CONFLICT_CHECK : Penyusunan Jadwal
    CONFLICT_CHECK --> SCHEDULE_ACTIVE : Tidak Ada Konflik
    CONFLICT_CHECK --> SCHEDULE_REVISION : Konflik Jadwal
    SCHEDULE_REVISION --> SCHEDULE_DRAFT

    SCHEDULE_ACTIVE --> CREATE_DETERMINATION : Pembuatan Penetapan
    CREATE_DETERMINATION --> SIGNED : Penetapan Ditandatangani
    SIGNED --> UPLOAD_DETERMINATION : Upload Dokumen CIMS

    UPLOAD_DETERMINATION --> COURT_NOTICE : Minimal H-7
    COURT_NOTICE --> PROSECUTOR_RECEIVE : Kejaksaan Menerima
    PROSECUTOR_RECEIVE --> RUTAN_NOTICE : Kejaksaan Upload Pemberitahuan Rutan

    RUTAN_NOTICE --> READINESS : Minimal H-3 Terpenuhi

    READINESS --> PROSECUTOR_READY : Checklist Kejaksaan
    READINESS --> RUTAN_READY : Checklist Rutan
    PROSECUTOR_READY --> ALL_READY : Validasi Kesiapan
    RUTAN_READY --> ALL_READY : Validasi Kesiapan

    ALL_READY --> PROVISIONING : Hard Gate H-1 Terpenuhi`;

const newDiagram = `    SUBMITTED --> ADMIN_VERIFIED : Panitera Validasi Administrasi
    ADMIN_VERIFIED --> REVISION : Data Tidak Sesuai
    REVISION --> DRAFT : Perbaikan Data

    ADMIN_VERIFIED --> JUDGE_VALIDATION : Hakim Validasi Data Persidangan
    JUDGE_VALIDATION --> DATA_APPROVED : Data Valid
    JUDGE_VALIDATION --> REVISION : Perlu Perbaikan

    DATA_APPROVED --> SCHEDULE_DRAFT : Validasi Selesai

    SCHEDULE_DRAFT --> CONFLICT_CHECK : Penyusunan Jadwal
    CONFLICT_CHECK --> SCHEDULE_ACTIVE : Tidak Ada Konflik
    CONFLICT_CHECK --> SCHEDULE_REVISION : Konflik Jadwal
    SCHEDULE_REVISION --> SCHEDULE_DRAFT

    SCHEDULE_ACTIVE --> CREATE_DETERMINATION : Pembuatan Penetapan
    CREATE_DETERMINATION --> SIGNED : Penetapan Ditandatangani
    SIGNED --> UPLOAD_DETERMINATION : Upload Dokumen CIMS

    UPLOAD_DETERMINATION --> COURT_NOTICE : Minimal H-7
    COURT_NOTICE --> PROSECUTOR_RECEIVE : Kejaksaan Menerima
    PROSECUTOR_RECEIVE --> RUTAN_NOTICE : Kejaksaan Upload Pemberitahuan Rutan

    RUTAN_NOTICE --> READINESS : Minimal H-3 Terpenuhi

    READINESS --> PROSECUTOR_READY : Checklist Kejaksaan
    READINESS --> RUTAN_READY : Checklist Rutan
    PROSECUTOR_READY --> ALL_READY : Validasi Kesiapan
    RUTAN_READY --> ALL_READY : Validasi Kesiapan
    READINESS --> AUTO_FORCED : Waktu Sidang < 2 Jam (Sistem Paksa Bypass)
    AUTO_FORCED --> ALL_READY : Bypass Hard Gate

    ALL_READY --> PROVISIONING : Hard Gate H-1 / Bypass < 2 Jam Terpenuhi`;

content = content.replace(oldDiagram, newDiagram);

const oldChecklist = `Kejaksaan dan Rutan melakukan pengisian kesiapan pelaksanaan sidang elektronik maksimal H-1
sebelum agenda sidang.
</div>

<div class="checklist">
Checklist meliputi kesiapan perangkat, jaringan, personel, ruang sidang, dan verifikasi identitas
terdakwa.`;

const newChecklist = `Kejaksaan dan Rutan melakukan pengisian kesiapan pelaksanaan sidang elektronik maksimal H-1
sebelum agenda sidang. Jika waktu pelaksanaan sidang tersisa kurang dari 2 Jam dan instansi belum mengisi kesiapan, sistem akan mem-bypass checklist (Auto-Forced) agar ruang sidang tetap dapat dibuka.
</div>

<div class="checklist">
Checklist meliputi kesiapan perangkat, jaringan, personel, ruang sidang, dan verifikasi identitas
terdakwa. (Auto-forced ditandai dengan peringatan warna merah).`;

content = content.replace(oldChecklist, newChecklist);

fs.writeFileSync('docs/CIMS_PROJECT_DESCRIPTION.html', content);
