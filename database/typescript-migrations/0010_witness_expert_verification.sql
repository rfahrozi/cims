-- CIMS v0.20.0 — Verifikasi Saksi, Ahli, Penerjemah (SOP 10.9)
-- H-05: Verifikasi per-individu peserta dengan petugas pengawas.

-- Tambah informasi pengawas dan lokasi pada verifikasi identitas (SOP 10.9)
alter table identity_verifications
  add column if not exists participant_role text,
  add column if not exists location_code text,
  add column if not exists supervisor_officer_id text,
  add column if not exists supervisor_officer_name text;

comment on column identity_verifications.supervisor_officer_id is 'Petugas yang mengawasi saksi/ahli saat memberikan keterangan secara elektronik (SOP 10.9).';

-- =============================================================================
-- Tabel participant_locations (M-02) — Dasar penetapan lokasi saksi/ahli/advokat
-- =============================================================================
create table if not exists participant_locations (
  id                       text primary key default gen_random_uuid()::text,
  hearing_id               text not null references hearings(id) on delete cascade,
  participant_reference    text not null,
  participant_role         text not null,

  -- Lokasi pemeriksaan
  location_type            text not null check (location_type in (
    'COURT',               -- Di pengadilan yang sama
    'PROSECUTION',         -- Di kejaksaan negeri
    'CORRECTIONS',         -- Di Rutan/Lapas
    'OTHER_COURT',         -- Pengadilan negeri lain
    'EMBASSY',             -- Perwakilan RI di luar negeri (SOP 10.9)
    'REMOTE'               -- Lokasi lain yang diizinkan hakim
  )),
  location_name            text not null,

  -- SOP 10.8 dan 10.9: Penempatan selain di court/corrections standar harus ada penetapan
  determination_reference  text,

  recorded_by              text not null,
  recorded_at              timestamptz not null default now(),

  unique (hearing_id, participant_reference)
);

create index if not exists idx_participant_locations_hearing
  on participant_locations(hearing_id, participant_role);

comment on table participant_locations
  is 'Mencatat lokasi fisik di mana peserta (terutama saksi, ahli, advokat) akan mengikuti persidangan elektronik beserta dasar penetapannya.';
