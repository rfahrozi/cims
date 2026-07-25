-- CIMS v0.20.0 — Perbaikan Data Model (M-01 & M-04)
-- Memperkuat integritas dokumen dengan merekam sumber data eksternal
-- dan dokumentasi spesifik untuk rekaman audiovisual sidang elektronik.

-- =============================================================================
-- M-04: Referensi Sistem Resmi Eksternal (Official System References)
-- =============================================================================
-- Saat ini CIMS hanya menyimpan `official_case_reference` sebagai string flat.
-- Padahal data CIMS dapat ditautkan ke SIPP, e-Berpadu, maupun register Lapas.

create table if not exists official_system_refs (
  id                  text primary key default gen_random_uuid()::text,
  case_id             text not null references court_cases(id) on delete cascade,

  system_code         text not null check (system_code in (
    'SIPP',              -- Sistem Informasi Penelusuran Perkara (MA)
    'E_BERPADU',         -- Aplikasi e-Berpadu (MA)
    'CMS_KEJAKSAAN',     -- Case Management System Kejaksaan
    'SDP_PAS',           -- Sistem Database Pemasyarakatan
    'OTHER'
  )),

  external_id         text not null,
  external_url        text,
  verified_at         timestamptz not null default now(),
  verified_by         text not null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Satu perkara (case_id) tidak boleh memiliki referensi duplikat ke sistem (system_code) yang sama
  unique (case_id, system_code)
);

create index if not exists idx_official_system_refs_case
  on official_system_refs(case_id);

comment on table official_system_refs
  is 'Referensi multi-sistem untuk satu perkara agar dapat disinkronisasi dengan berbagai sistem instansi (M-04).';


-- =============================================================================
-- M-01: Metadata Rekaman Sidang (Recordings & Evidence)
-- =============================================================================
-- Menyimpan chain_of_custody, status retensi, dan signature rekaman sidang.
-- Menggantikan fungsionalitas dummy dari sistem virtual session lama.

create table if not exists recordings (
  id                  text primary key default gen_random_uuid()::text,
  hearing_id          text not null references hearings(id) on delete restrict,
  session_id          text, -- reference to virtual_sessions(id)

  started_at          timestamptz not null,
  ended_at            timestamptz,
  duration_seconds    integer check (duration_seconds >= 0),

  -- Lokasi penyimpanan rekaman
  storage_reference   text not null,

  -- Integrasi Keamanan & Integritas Dokumen (Chain of Custody)
  content_hash        text,             -- SHA-256 dari file rekaman
  chain_of_custody    jsonb not null default '[]'::jsonb,

  access_log_enabled  boolean not null default true,
  retention_policy_id text references retention_policies(id),

  recorded_by         text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_recordings_hearing
  on recordings(hearing_id, started_at desc);

create index if not exists idx_recordings_session
  on recordings(session_id) where session_id is not null;

comment on table recordings
  is 'Mencatat metadata rekaman persidangan elektronik beserta chain of custody dan nilai hash (M-01).';
