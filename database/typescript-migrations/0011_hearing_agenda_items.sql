-- CIMS v0.20.0 — Agenda Sidang Multi-Item
-- H-03: Dukungan untuk beberapa item agenda dalam satu sesi persidangan.

-- Tabel hearing_agenda_items menyimpan daftar kegiatan spesifik dalam satu sidang.
-- Saat ini hearing_type hanya menyimpan satu nilai (misal PEMERIKSAAN_SAKSI),
-- dengan tabel ini, satu sidang bisa memiliki agenda:
-- 1. PEMBACAAN_DAKWAAN (30 menit)
-- 2. PEMERIKSAAN_SAKSI (60 menit)
-- 3. PEMERIKSAAN_TERDAKWA (60 menit)

create table if not exists hearing_agenda_items (
  id                          text primary key default gen_random_uuid()::text,
  hearing_id                  text not null references hearings(id) on delete cascade,
  sequence_number             integer not null,

  -- Tipe item agenda (menggunakan enum yang sama dengan hearing_type)
  item_type                   text not null,
  item_description            text not null,

  -- Estimasi waktu dalam menit untuk penjadwalan
  estimated_duration_minutes  integer not null default 30,

  -- Status eksekusi saat sidang berlangsung (Hearing Control)
  status                      text not null default 'PENDING'
                                check (status in ('PENDING','IN_PROGRESS','COMPLETED','SKIPPED')),

  -- Audit
  created_by                  text not null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Urutan harus unik dalam satu sidang
  unique (hearing_id, sequence_number)
);

create index if not exists idx_hearing_agenda_items_hearing
  on hearing_agenda_items(hearing_id, sequence_number);

comment on table hearing_agenda_items
  is 'Daftar item agenda spesifik dalam satu sesi persidangan.';

-- Fungsi trigger untuk otomatis memperbarui updated_at
create or replace function update_agenda_item_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_hearing_agenda_items_updated
before update on hearing_agenda_items
for each row execute function update_agenda_item_timestamp();
