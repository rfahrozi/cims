-- Migration 0014: Notification Templates + SLA Configs
-- GAP-02: Template notifikasi per notice_type×channel (tidak perlu deploy ulang untuk ubah teks)
-- GAP-06: SLA config per notice_type (ack_deadline dan reminder schedule dari DB)
-- Referensi: PRD EPIC-13 US-13.3, PRD Sek. 10.5, PRD Sek. 19 KPI/SLA

-- ─── 1. Tabel notification_templates ──────────────────────────────────────────
create table if not exists notification_templates (
  id            text primary key default gen_random_uuid()::text,
  notice_type   text not null,
  channel       text not null check (channel in ('EMAIL','WHATSAPP','SMS','IN_APP')),
  subject       text not null,
  message_body  text not null,
  is_active     boolean not null default true,
  updated_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (notice_type, channel)
);

create index if not exists idx_notification_templates_type_channel
  on notification_templates (notice_type, channel)
  where is_active = true;

comment on table  notification_templates is 'Template teks default per jenis pemberitahuan dan channel — dapat diubah admin tanpa deploy ulang';
comment on column notification_templates.message_body is 'Template dengan placeholder {recipient_name}, {case_number}, {scheduled_at}, {start_time}, {hearing_mode}, {change_reason}, {official_reference}';

-- ─── 2. Tabel sla_configs ─────────────────────────────────────────────────────
create table if not exists sla_configs (
  id                   text primary key default gen_random_uuid()::text,
  notice_type          text not null unique,
  ack_deadline_hours   integer not null default 24 check (ack_deadline_hours > 0),
  reminder_hours       integer[] not null default '{}',
  is_active            boolean not null default true,
  updated_by           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table  sla_configs is 'Konfigurasi SLA (batas waktu ACK dan jadwal reminder) per jenis pemberitahuan';
comment on column sla_configs.ack_deadline_hours  is 'Batas waktu acknowledgment dalam jam sejak notice dikirim';
comment on column sla_configs.reminder_hours      is 'Array jam sebelum deadline untuk kirim reminder otomatis, contoh: {24,2}';

-- Trigger auto-update updated_at
create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_notification_templates_updated'
  ) then
    create trigger trg_notification_templates_updated
      before update on notification_templates
      for each row execute function fn_set_updated_at();
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_sla_configs_updated'
  ) then
    create trigger trg_sla_configs_updated
      before update on sla_configs
      for each row execute function fn_set_updated_at();
  end if;
end $$;

-- ─── 3. Seed data notification_templates ──────────────────────────────────────
insert into notification_templates (notice_type, channel, subject, message_body) values

-- AGENDA_SIDANG
('AGENDA_SIDANG', 'EMAIL',
 '[CIMS] Pemberitahuan Jadwal Persidangan Elektronik',
 'Yth. {recipient_name},

Dengan hormat diberitahukan bahwa persidangan pidana secara elektronik dijadwalkan sebagai berikut:

  Nomor Perkara : {case_number}
  Hari/Tanggal  : {scheduled_at}
  Waktu Mulai   : {start_time} WIB
  Moda Sidang   : {hearing_mode}

Harap melakukan konfirmasi penerimaan (acknowledgment) melalui sistem CIMS selambat-lambatnya sesuai batas waktu yang ditentukan.

Referensi resmi : {official_reference}

Hormat kami,
Tim Koordinasi Persidangan Elektronik
(Pesan ini dikirim otomatis oleh sistem CIMS — jangan membalas email ini.)'),

('AGENDA_SIDANG', 'WHATSAPP',
 '[CIMS] Jadwal Sidang',
 'Pemberitahuan Persidangan Elektronik 📋

Perkara : {case_number}
Jadwal  : {scheduled_at} pukul {start_time} WIB
Moda    : {hearing_mode}
Ref     : {official_reference}

Harap konfirmasi penerimaan melalui sistem CIMS.'),

('AGENDA_SIDANG', 'SMS',
 '[CIMS] Jadwal Sidang',
 'CIMS: Sidang {case_number} dijadwalkan {scheduled_at} {start_time} WIB. Ref:{official_reference}. Konfirmasi via CIMS.'),

('AGENDA_SIDANG', 'IN_APP',
 'Pemberitahuan Jadwal Sidang',
 'Sidang perkara {case_number} dijadwalkan pada {scheduled_at} pukul {start_time} WIB ({hearing_mode}). Ref: {official_reference}'),

-- PERUBAHAN_JADWAL
('PERUBAHAN_JADWAL', 'EMAIL',
 '[CIMS] Perubahan Jadwal Persidangan Elektronik',
 'Yth. {recipient_name},

Diberitahukan bahwa jadwal persidangan elektronik untuk perkara berikut telah diubah:

  Nomor Perkara : {case_number}
  Jadwal Baru   : {scheduled_at} pukul {start_time} WIB
  Alasan        : {change_reason}

Harap melakukan konfirmasi penerimaan perubahan jadwal ini melalui sistem CIMS.

Referensi resmi : {official_reference}

Hormat kami,
Tim Koordinasi Persidangan Elektronik'),

('PERUBAHAN_JADWAL', 'WHATSAPP',
 '[CIMS] Perubahan Jadwal Sidang',
 '⚠️ PERUBAHAN JADWAL SIDANG

Perkara     : {case_number}
Jadwal Baru : {scheduled_at} {start_time} WIB
Alasan      : {change_reason}
Ref         : {official_reference}

Konfirmasi via CIMS.'),

('PERUBAHAN_JADWAL', 'SMS',
 '[CIMS] Perubahan Jadwal',
 'CIMS: Jadwal sidang {case_number} DIUBAH ke {scheduled_at} {start_time} WIB. Alasan:{change_reason}. Ref:{official_reference}'),

('PERUBAHAN_JADWAL', 'IN_APP',
 'Perubahan Jadwal Sidang',
 'Jadwal sidang perkara {case_number} diubah ke {scheduled_at} pukul {start_time} WIB. Alasan: {change_reason}. Ref: {official_reference}'),

-- PEMBACAAN_PUTUSAN_BANDING
('PEMBACAAN_PUTUSAN_BANDING', 'EMAIL',
 '[CIMS] Pemberitahuan Pembacaan Putusan Tingkat Banding',
 'Yth. {recipient_name},

Diberitahukan bahwa pembacaan putusan tingkat banding untuk perkara {case_number} dijadwalkan pada:

  Tanggal : {scheduled_at}
  Waktu   : {start_time} WIB

Kehadiran Anda diperlukan sesuai ketentuan yang berlaku.

Referensi resmi : {official_reference}'),

('PEMBACAAN_PUTUSAN_BANDING', 'WHATSAPP',
 '[CIMS] Putusan Banding',
 'Pemberitahuan pembacaan putusan banding perkara {case_number} pada {scheduled_at} {start_time} WIB. Ref:{official_reference}'),

-- PERMOHONAN_ELEKTRONIK
('PERMOHONAN_ELEKTRONIK', 'EMAIL',
 '[CIMS] Pemberitahuan Permohonan Persidangan Elektronik',
 'Yth. {recipient_name},

Diberitahukan bahwa permohonan persidangan secara elektronik untuk perkara {case_number} telah diajukan dan memerlukan tindak lanjut Anda.

Referensi resmi : {official_reference}

Harap melakukan konfirmasi melalui sistem CIMS.'),

('PERMOHONAN_ELEKTRONIK', 'WHATSAPP',
 '[CIMS] Permohonan Sidang Elektronik',
 'Permohonan sidang elektronik perkara {case_number} memerlukan tindak lanjut. Ref:{official_reference}. Konfirmasi via CIMS.'),

-- PEMBERITAHUAN_GANGGUAN
('PEMBERITAHUAN_GANGGUAN', 'EMAIL',
 '[CIMS] Pemberitahuan Gangguan Teknis Persidangan',
 'Yth. {recipient_name},

Diberitahukan bahwa telah terjadi gangguan teknis pada persidangan elektronik perkara {case_number}.

Referensi insiden : {official_reference}

Tim teknis sedang menangani gangguan ini. Harap memantau pembaruan status melalui sistem CIMS.'),

('PEMBERITAHUAN_GANGGUAN', 'WHATSAPP',
 '[CIMS] Gangguan Teknis',
 '⚠️ Gangguan teknis sidang perkara {case_number}. Ref insiden:{official_reference}. Pantau status di CIMS.'),

-- PEMBERITAHUAN_UMUM
('PEMBERITAHUAN_UMUM', 'EMAIL',
 '[CIMS] Pemberitahuan Persidangan Elektronik',
 'Yth. {recipient_name},

Diberitahukan informasi penting mengenai persidangan elektronik perkara {case_number}.

Referensi : {official_reference}

Harap melakukan konfirmasi penerimaan melalui sistem CIMS.'),

('PEMBERITAHUAN_UMUM', 'WHATSAPP',
 '[CIMS] Pemberitahuan',
 'Informasi persidangan perkara {case_number}. Ref:{official_reference}. Konfirmasi via CIMS.')

on conflict (notice_type, channel) do nothing;

-- ─── 4. Seed data sla_configs ─────────────────────────────────────────────────
insert into sla_configs (notice_type, ack_deadline_hours, reminder_hours) values
  ('AGENDA_SIDANG',              48, array[24, 2]),
  ('PERUBAHAN_JADWAL',           24, array[12, 1]),
  ('PEMBACAAN_PUTUSAN_BANDING',  48, array[24, 6]),
  ('PERMOHONAN_ELEKTRONIK',      72, array[48, 24]),
  ('PEMBERITAHUAN_GANGGUAN',     24, array[12, 1]),
  ('PEMBERITAHUAN_UMUM',         72, array[24])
on conflict (notice_type) do nothing;
