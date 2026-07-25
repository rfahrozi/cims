-- CIMS v0.20.0 — Modul Pembacaan Putusan Tingkat Banding
-- SOP/CIMS/PPE/001/2026 Bagian 10.15 — berlaku mulai 1 Agustus 2026
-- Matriks MVP: M-15 MUST HAVE · AC-09
--
-- Semua id menggunakan text (gen_random_uuid()::text) konsisten dengan
-- TypeScript migration 0003–0006. Tidak ada FK ke tabel legacy UUID.
-- Apply setelah 0006_compliance_fixes.sql berhasil.

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. Tabel utama pembacaan putusan banding
-- =============================================================================
-- Satu perkara (hearing) dapat memiliki beberapa pembacaan (versi), tetapi
-- hanya boleh satu yang berstatus SCHEDULED pada satu waktu.
create table if not exists appeal_decision_readings (
  id                       text primary key default gen_random_uuid()::text,
  hearing_id               text not null references hearings(id) on delete restrict,
  version                  integer not null default 1,

  -- Jadwal pembacaan (bisa berubah karena penetapan perubahan tanggal)
  scheduled_at             timestamptz not null,
  display_timezone         text not null default 'Asia/Jakarta',

  -- Mode kehadiran sesuai SOP 10.15
  delivery_mode            text not null check (delivery_mode in ('LANGSUNG','ELEKTRONIK','HYBRID')),

  -- Referensi penetapan majelis hakim PT
  determination_reference  text not null,

  -- Referensi sesi virtual jika mode ELEKTRONIK/HYBRID
  virtual_session_reference text,

  -- Status lifecycle
  status                   text not null default 'SCHEDULED'
                             check (status in ('SCHEDULED','SUPERSEDED','READ','POSTPONED','CANCELLED')),

  -- Alasan jika jadwal berubah atau ditunda
  reschedule_reason        text,

  -- Waktu aktual pembacaan (diisi saat status = READ)
  read_at                  timestamptz,

  -- Keterbukaan sidang sesuai SOP (default terbuka kecuali perkara tertutup)
  open_to_public           boolean not null default true,

  -- Tenggang kasasi 14 hari (SOP 10.15 poin 10) — ditampilkan, bukan dihitung otomatis
  cassation_deadline_at    timestamptz,
  cassation_deadline_note  text default 'Tenggang 14 hari dihitung panitera — ditampilkan sebagai referensi.',

  -- Audit
  created_by               text not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  row_version              bigint not null default 1,

  -- Hanya satu jadwal aktif per hearing
  unique (hearing_id, version)
);

create unique index if not exists uq_active_appeal_reading_per_hearing
  on appeal_decision_readings(hearing_id)
  where status = 'SCHEDULED';

create index if not exists idx_appeal_readings_hearing_status
  on appeal_decision_readings(hearing_id, status, scheduled_at desc);

comment on table appeal_decision_readings
  is 'Pembacaan putusan tingkat banding per SOP 10.15. Berlaku mulai 1 Agustus 2026.';

-- =============================================================================
-- 2. Rantai pemberitahuan pembacaan putusan (SOP 10.15 poin 3–6)
-- =============================================================================
-- Urutan rantai: PT → Kejaksaan → Pemasyarakatan → Terdakwa & Advokat
create table if not exists appeal_notice_steps (
  id                       text primary key default gen_random_uuid()::text,
  reading_id               text not null references appeal_decision_readings(id) on delete cascade,

  -- Kode langkah (PT_TO_PROSECUTION, PROSECUTION_TO_CORRECTIONS, dll.)
  step_code                text not null check (step_code in (
    'PT_TO_PROSECUTION',
    'PROSECUTION_TO_CORRECTIONS',
    'CORRECTIONS_TO_DEFENDANT',
    'PROSECUTION_TO_ADVOCATE'
  )),

  -- Pengirim dan penerima
  sender_organization_id   text not null references organizations(id),
  recipient_reference      text not null, -- user_id atau organization_id penerima
  recipient_name           text not null,
  channel                  text not null check (channel in ('EMAIL','WHATSAPP','SMS','IN_APP','OFFICIAL')),
  official_reference       text not null, -- nomor surat/dokumen resmi

  -- Status pengiriman
  status                   text not null default 'PENDING'
                             check (status in ('PENDING','SENT','DELIVERED','ACKNOWLEDGED','FAILED')),

  -- Bukti pengiriman
  sent_at                  timestamptz,
  delivered_at             timestamptz,
  acknowledged_at          timestamptz,
  receipt_reference        text, -- nomor tanda terima / ACK reference

  -- Audit
  created_by               text not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Satu langkah per reading per penerima
  unique (reading_id, step_code, recipient_reference)
);

create index if not exists idx_appeal_notice_steps_reading
  on appeal_notice_steps(reading_id, step_code, status);

-- =============================================================================
-- 3. Rekam kehadiran (SOP 10.15 poin 7 — hadir/tidak hadir di berita acara)
-- =============================================================================
create table if not exists appeal_presence_records (
  id                       text primary key default gen_random_uuid()::text,
  reading_id               text not null references appeal_decision_readings(id) on delete cascade,

  party_role               text not null check (party_role in (
    'DEFENDANT','ADVOCATE','PROSECUTOR','CORRECTIONS_OFFICER'
  )),
  party_reference          text not null, -- participant_id atau nama
  party_name               text not null,

  -- Status kehadiran
  attendance_status        text not null check (attendance_status in ('PRESENT','ABSENT','EXCUSED')),
  attendance_mode          text not null check (attendance_mode in ('LANGSUNG','ELEKTRONIK','NOT_APPLICABLE')),

  notes                    text,

  -- Petugas yang memverifikasi
  verified_by              text not null,
  verified_at              timestamptz not null default now(),

  unique (reading_id, party_role, party_reference)
);

create index if not exists idx_appeal_presence_reading
  on appeal_presence_records(reading_id, party_role);

-- =============================================================================
-- 4. Publikasi petikan putusan (SOP 10.15 poin 8 — hari yang sama)
-- =============================================================================
create table if not exists appeal_publications (
  id                       text primary key default gen_random_uuid()::text,
  reading_id               text not null unique references appeal_decision_readings(id) on delete restrict,

  -- Referensi dokumen petikan di sistem resmi
  excerpt_reference        text not null,
  source_system_code       text not null default 'OFFICIAL_CASE_SYSTEM',
  document_hash            text, -- SHA-256 opsional untuk integritas

  -- Kepatuhan "hari yang sama" (SOP 10.15 poin 8)
  published_at             timestamptz not null,
  same_day_compliant       boolean not null, -- dihitung saat insert

  published_by             text not null,
  notes                    text,

  created_at               timestamptz not null default now()
);

-- =============================================================================
-- 5. Transmisi ke pengadilan tingkat pertama (SOP 10.15 poin 9 — 7 hari)
-- =============================================================================
create table if not exists appeal_transmissions (
  id                       text primary key default gen_random_uuid()::text,
  reading_id               text not null unique references appeal_decision_readings(id) on delete restrict,

  -- Pengadilan tingkat pertama tujuan
  destination_court_id     text references organizations(id),
  destination_court_name   text not null, -- fallback jika bukan di CIMS
  transmission_reference   text not null, -- nomor surat transmisi

  -- Kepatuhan "7 hari" (SOP 10.15 poin 9)
  transmitted_at           timestamptz not null,
  seven_day_compliant      boolean not null, -- dihitung saat insert
  document_hash            text,

  transmitted_by           text not null,
  notes                    text,

  created_at               timestamptz not null default now()
);

-- =============================================================================
-- 6. Index untuk dashboard kepatuhan
-- =============================================================================
create index if not exists idx_appeal_publications_compliance
  on appeal_publications(same_day_compliant, published_at desc);

create index if not exists idx_appeal_transmissions_compliance
  on appeal_transmissions(seven_day_compliant, transmitted_at desc);
