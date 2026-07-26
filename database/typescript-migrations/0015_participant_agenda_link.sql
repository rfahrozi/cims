-- Migration 0015: Penautan Peserta ke Agenda Sidang Spesifik (M-06)
-- Sesuai PRD M-06: Mengaitkan kehadiran/kesiapan saksi & ahli spesifik ke item agenda tertentu, bukan hanya secara keseluruhan.
-- Memudahkan pengaturan multi-agenda per sesi (terutama untuk Saksi/Ahli).

ALTER TABLE hearing_participants
  ADD COLUMN IF NOT EXISTS agenda_item_id text REFERENCES hearing_agenda_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN hearing_participants.agenda_item_id IS 'Tautan ke agenda spesifik (khususnya untuk peran WITNESS/EXPERT)';

CREATE INDEX IF NOT EXISTS idx_participant_agenda ON hearing_participants(agenda_item_id) WHERE agenda_item_id IS NOT NULL;
