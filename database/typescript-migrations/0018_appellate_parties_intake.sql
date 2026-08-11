-- Migration 0018 — Appellate Parties in Hearing Intake

-- Drop existing check constraint for party_type
ALTER TABLE hearing_intake_parties DROP CONSTRAINT IF EXISTS hearing_intake_parties_party_type_check;

-- Add new constraint allowing PROSECUTOR
ALTER TABLE hearing_intake_parties ADD CONSTRAINT hearing_intake_parties_party_type_check 
  CHECK (party_type IN ('DEFENDANT', 'PROSECUTOR'));

-- Add appeal_role column
ALTER TABLE hearing_intake_parties ADD COLUMN IF NOT EXISTS appeal_role text;

-- Add comments
COMMENT ON COLUMN hearing_intake_parties.appeal_role IS 'Status Banding, e.g. Pembanding, Terbanding, Pembanding/Terbanding I';
