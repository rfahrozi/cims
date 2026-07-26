-- Migration 0013: Tambah state DOCUMENTATION_PENDING pada hearing_runtime
-- Sesuai PRD EPIC-08 US-8.3 AC: "Status DOCUMENTATION_PENDING muncul bila evidence belum lengkap"
-- dan PRD Sek. 12 State Machine: "DOCUMENTATION_PENDING — Dokumentasi atau sinkronisasi belum lengkap"
--
-- Desain: ENDED → FLAG_DOCUMENTATION → DOCUMENTATION_PENDING → COMPLETE_DOCUMENTATION → ENDED
-- State ini tidak mengganggu alur sidang yang sudah ENDED — hanya menambah jalur opsional.

-- 1. Perluas constraint CHECK pada kolom state di hearing_runtime
alter table hearing_runtime
  drop constraint if exists hearing_runtime_state_check;

alter table hearing_runtime
  add constraint hearing_runtime_state_check
  check (state in (
    'READY',
    'STARTED',
    'SUSPENDED',
    'ENDED',
    'POSTPONED',
    'DOCUMENTATION_PENDING'
  ));

-- 2. Tambah kolom untuk mencatat siapa yang menandai dan kapan
alter table hearing_runtime
  add column if not exists documentation_flagged_by  uuid references users(id),
  add column if not exists documentation_flagged_at  timestamptz,
  add column if not exists documentation_flagged_note text,
  add column if not exists documentation_completed_by uuid references users(id),
  add column if not exists documentation_completed_at timestamptz;

-- 3. Tambah event type baru ke hearing_control_events (append-only — tidak perlu constraint)
-- Event types yang valid: HEARING_DOCUMENTATION_FLAGGED, HEARING_DOCUMENTATION_COMPLETED
-- (Tidak ada constraint CHECK pada event_type — open untuk extensibility)

-- 4. Index untuk query filter DOCUMENTATION_PENDING yang efisien
create index if not exists idx_hearing_runtime_doc_pending
  on hearing_runtime(state)
  where state = 'DOCUMENTATION_PENDING';

comment on column hearing_runtime.documentation_flagged_by  is 'User yang menandai sidang butuh dokumentasi tambahan (FLAG_DOCUMENTATION)';
comment on column hearing_runtime.documentation_flagged_at  is 'Waktu penandaan dokumentasi tertunda';
comment on column hearing_runtime.documentation_flagged_note is 'Catatan apa yang masih perlu dilengkapi';
comment on column hearing_runtime.documentation_completed_by is 'User yang menyatakan dokumentasi lengkap (COMPLETE_DOCUMENTATION)';
comment on column hearing_runtime.documentation_completed_at is 'Waktu dokumentasi dinyatakan lengkap';
