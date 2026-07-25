-- CIMS v0.20.0 — Compliance fixes berdasarkan evaluasi SOP/CIMS/PPE/001/2026
-- Perubahan ini memperkuat kepatuhan terhadap SOP tanpa mengubah perilaku data lama.
-- Apply hanya setelah backup dan konfirmasi migration 0005 sudah berhasil.

-- =============================================================================
-- 1. Tambah kolom hearing_mode di judicial_determinations
-- =============================================================================
-- SOP 10.2: penetapan hakim wajib memuat mode persidangan secara eksplisit
-- (LANGSUNG / ELEKTRONIK / HYBRID). Kolom nullable agar kompatibel dengan
-- data lama yang belum memiliki nilai ini.
alter table judicial_determinations
  add column if not exists hearing_mode text
    check (hearing_mode in ('LANGSUNG', 'ELEKTRONIK', 'HYBRID'));

comment on column judicial_determinations.hearing_mode
  is 'Mode persidangan yang ditetapkan hakim per SOP 10.2: LANGSUNG, ELEKTRONIK, atau HYBRID.';

-- =============================================================================
-- 2. Tambah constraint notice_type di official_notices
-- =============================================================================
-- SOP 10.5: jenis pemberitahuan harus terdefinisi dan tidak boleh bebas.
-- Gunakan do-nothing approach agar idempotent jika constraint sudah ada.
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'chk_official_notices_notice_type'
  ) then
    alter table official_notices
      add constraint chk_official_notices_notice_type
      check (notice_type in (
        'AGENDA_SIDANG',
        'PERUBAHAN_JADWAL',
        'PEMBACAAN_PUTUSAN_BANDING',
        'PERMOHONAN_ELEKTRONIK',
        'PEMBERITAHUAN_GANGGUAN',
        'PEMBERITAHUAN_UMUM'
      ));
  end if;
end;
$$;

comment on column official_notices.notice_type
  is 'Jenis pemberitahuan resmi per SOP 10.5. Nilai yang valid: AGENDA_SIDANG, PERUBAHAN_JADWAL, PEMBACAAN_PUTUSAN_BANDING, PERMOHONAN_ELEKTRONIK, PEMBERITAHUAN_GANGGUAN, PEMBERITAHUAN_UMUM.';
