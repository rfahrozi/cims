-- NONPRODUCTION ONLY — Synthetic seed for DEV/SIT/Preproduction.
-- Jangan dijalankan di production atau lingkungan dengan data perkara nyata.
-- Data ini digunakan untuk pilot pertama CIMS sesuai PANDUAN_PILOT.md

-- =============================================================================
-- 1. Organisasi (3 instansi)
-- =============================================================================
insert into organizations(id, organization_code, name, organization_type, active)
values
  ('pt-kepri',         'PT-KEPRI',    'Pengadilan Tinggi Kepulauan Riau',   'COURT',       true),
  ('pn-tanjungpinang', 'PN-TPI',      'Pengadilan Negeri Tanjungpinang',    'COURT',       true),
  ('pn-batam',         'PN-BTM',      'Pengadilan Negeri Batam',            'COURT',       true),
  ('pn-karimun',       'PN-TBK',      'Pengadilan Negeri Tanjung Balai Karimun', 'COURT',       true),
  ('pn-natuna',        'PN-NTN',      'Pengadilan Negeri Natuna',           'COURT',       true),
  ('kejati-kepri', 'KEJATI-KEPRI', 'Kejaksaan Tinggi Kepulauan Riau', 'PROSECUTION', true),
  ('kejari-tanjungpinang', 'KEJARI-TPI', 'Kejaksaan Negeri Tanjungpinang', 'PROSECUTION', true),
  ('kejari-batam', 'KEJARI-BTM', 'Kejaksaan Negeri Batam', 'PROSECUTION', true),
  ('kejari-bintan', 'KEJARI-BTN', 'Kejaksaan Negeri Bintan', 'PROSECUTION', true),
  ('kejari-lingga', 'KEJARI-LGA', 'Kejaksaan Negeri Lingga', 'PROSECUTION', true),
  ('kejari-karimun', 'KEJARI-KRM', 'Kejaksaan Negeri Karimun', 'PROSECUTION', true),
  ('kejari-natuna', 'KEJARI-NTN', 'Kejaksaan Negeri Natuna', 'PROSECUTION', true),
  ('kejari-anambas', 'KEJARI-ANB', 'Kejaksaan Negeri Kepulauan Anambas', 'PROSECUTION', true),
  ('cabjari-moro', 'CABJARI-MRO', 'Cabang Kejaksaan Negeri Karimun di Moro', 'PROSECUTION', true),
  ('cabjari-tanjungbatu', 'CABJARI-TBT', 'Cabang Kejaksaan Negeri Karimun di Tanjungbatu', 'PROSECUTION', true),
  ('lapas-batam', 'LAPAS-BTM', 'Lapas Kelas IIA Batam', 'CORRECTIONS', true),
  ('lapas-tanjungpinang', 'LAPAS-TPI', 'Lapas Kelas IIA Tanjungpinang', 'CORRECTIONS', true),
  ('lapas-perempuan-batam', 'LAPAS-PR-BTM', 'Lapas Perempuan Kelas IIB Batam', 'CORRECTIONS', true),
  ('lapas-narkotika-tanjungpinang', 'LAPAS-N-TPI', 'Lapas Narkotika Kelas IIA Tanjungpinang', 'CORRECTIONS', true),
  ('lapas-dabo-singkep', 'LAPAS-DBS', 'Lapas Kelas III Dabo Singkep', 'CORRECTIONS', true),
  ('lpka-batam', 'LPKA-BTM', 'LPKA Kelas II Batam', 'CORRECTIONS', true),
  ('rutan-tanjungpinang', 'RUTAN-TPI', 'Rutan Kelas I Tanjungpinang', 'CORRECTIONS', true),
  ('rutan-batam', 'RUTAN-BTM', 'Rutan Kelas IIA Batam', 'CORRECTIONS', true),
  ('rutan-karimun', 'RUTAN-KRM', 'Rutan Kelas IIB Tanjung Balai Karimun', 'CORRECTIONS', true)
on conflict (id) do update
  set name = excluded.name,
      organization_type = excluded.organization_type,
      active = excluded.active,
      updated_at = now();

-- =============================================================================
-- 2. Perkara demo — 3 perkara dalam status berbeda untuk pengujian lengkap
-- =============================================================================

insert into court_cases(id, case_number, normalized_case_number, official_case_reference, case_classification, case_type_code, case_title, court_organization_id, prosecution_organization_id, data_source, created_by, updated_by)
values
  ('case-demo-001', '364/Pid.Sus/2026/PN Btm', '364/PID.SUS/2026/PN BTM', '369/PID.SUS/2026/PT TPG', 'SPECIAL_CRIMINAL', 'PID.SUS', 'Perkara Narkotika', 'pn-batam', 'kejari-batam', 'MANUAL', 'system', 'system'),
  ('case-demo-002', '384/PID.SUS/2026/PT TPG', '384/PID.SUS/2026/PT TPG', '409/Pid.Sus/2026/PN Btm', 'SPECIAL_CRIMINAL', 'PID.SUS',   'Perkara Narkotika (Banding)', 'pt-kepri', 'kejati-kepri', 'MANUAL', 'system', 'system'),
  ('case-demo-003', '74/Pid.B/2026/PN Tpg', '74/PID.B/2026/PN TPG', '356/PID/2026/PT TPG', 'GENERAL_CRIMINAL', 'PID.B', 'Perkara Pembunuhan',   'pn-tanjungpinang', 'kejari-tanjungpinang', 'MANUAL', 'system', 'system')
on conflict (id) do update
  set case_number = excluded.case_number,
      case_title  = excluded.case_title,
      updated_at  = now();

insert into hearings(id, case_id, case_number, hearing_sequence, hearing_type, state, intake_status, data_source, court_organization_id, prosecution_organization_id, defendant_custody_status, created_by, updated_by)
values
  ('hearing-demo-001', 'case-demo-001', '364/Pid.Sus/2026/PN Btm', 1, 'Pemeriksaan Saksi', 'DRAFT', 'ACTIVE', 'MANUAL', 'pn-batam', 'kejari-batam', 'UNKNOWN', 'system', 'system'),
  ('hearing-demo-002', 'case-demo-002', '384/PID.SUS/2026/PT TPG', 1, 'Pemeriksaan Ahli', 'DRAFT', 'ACTIVE', 'MANUAL', 'pt-kepri', 'kejati-kepri', 'UNKNOWN', 'system', 'system'),
  ('hearing-demo-003', 'case-demo-003', '74/Pid.B/2026/PN Tpg', 1, 'Pembacaan Putusan', 'DRAFT', 'ACTIVE', 'MANUAL', 'pn-tanjungpinang', 'kejari-tanjungpinang', 'UNKNOWN', 'system', 'system')
on conflict (id) do update
  set hearing_type = excluded.hearing_type,
      state       = excluded.state,
      updated_at   = now();

-- =============================================================================
-- 3. Assignment instansi ke perkara
-- =============================================================================
insert into hearing_assignments(hearing_id, organization_id, assignment_type)
values
  -- Perkara 001
  ('hearing-demo-001', 'pn-batam', 'PRIMARY_COURT'),
  ('hearing-demo-001', 'kejari-batam', 'PARTICIPATING'),
  ('hearing-demo-001', 'lapas-batam', 'PARTICIPATING'),

  -- Perkara 002
  ('hearing-demo-002', 'pt-kepri', 'PRIMARY_COURT'),
  ('hearing-demo-002', 'kejati-kepri', 'PARTICIPATING'),
  ('hearing-demo-002', 'rutan-batam', 'PARTICIPATING'),

  -- Perkara 003
  ('hearing-demo-003', 'pn-tanjungpinang', 'PRIMARY_COURT'),
  ('hearing-demo-003', 'kejari-tanjungpinang', 'PARTICIPATING'),
  ('hearing-demo-003', 'rutan-tanjungpinang', 'PARTICIPATING')
on conflict (hearing_id, organization_id) do nothing;

-- =============================================================================
-- 4. User demo (5 persona sesuai PANDUAN_PILOT.md)
-- =============================================================================
-- Catatan: tabel users mungkin belum ada di TypeScript schema (dikelola via OIDC).
-- Insert ini hanya untuk sistem yang memiliki tabel users lokal.
-- Di DEV mode dengan PersonaSwitcher, user dibuat secara in-memory oleh DevIdentityInterceptor.

-- =============================================================================
-- 5. Susunan Majelis Hakim Demo
-- =============================================================================
-- Hakim Ketua selalu urutan pertama (sequence 1).
-- Hakim Anggota urutan berikutnya sesuai komposisi Majelis.
-- user_id merujuk ke NIP persona DEV riil.
--
-- Komposisi Majelis untuk masing-masing perkara demo:
--   hearing-demo-001 (Pemeriksaan Saksi)  : 3 Hakim (Arifin + Zulfahmi + Eliwarti)
--   hearing-demo-002 (Pemeriksaan Ahli)   : 3 Hakim (Wendra + Estiono + Bagus)
--   hearing-demo-003 (Pembacaan Putusan)  : 3 Hakim (Elfian + Morgan + Dahlia)

insert into hearing_user_assignments(hearing_id, user_id, assignment_role, active)
values
  -- Perkara 001: 123/Pid.Sus/2026/PN.Demo — Pemeriksaan Saksi
  ('hearing-demo-001', '196005031988041001', 'HAKIM_KETUA',    true),
  ('hearing-demo-001', '196105171988031008', 'HAKIM_ANGGOTA',  true),
  ('hearing-demo-001', '196303121985032003', 'HAKIM_ANGGOTA',  true),

  -- Perkara 002: 456/Pid.B/2026/PN.Demo — Pemeriksaan Ahli
  ('hearing-demo-002', '196506301992121001', 'HAKIM_KETUA',    true),
  ('hearing-demo-002', '196503151992121001', 'HAKIM_ANGGOTA',  true),
  ('hearing-demo-002', '196308261988031003', 'HAKIM_ANGGOTA',  true),

  -- Perkara 003: 789/Pid.Sus/2026/PN.Demo — Pembacaan Putusan
  ('hearing-demo-003', '196512111992121001', 'HAKIM_KETUA',    true),
  ('hearing-demo-003', '196209221992121001', 'HAKIM_ANGGOTA',  true),
  ('hearing-demo-003', '196301101991032002', 'HAKIM_ANGGOTA',  true)
on conflict (hearing_id, user_id) do update
  set assignment_role = excluded.assignment_role,
      active          = excluded.active;

-- =============================================================================
-- 6. Susunan Panitera Demo
-- =============================================================================
-- Panitera (COURT_CLERK): SAPTA PUTRA, S.H. — NIP 196809011996031001
-- Panitera Pengganti (SUBSTITUTE_CLERK):
--   1. AGUSMAN, S.H., M.H.     — NIP 196908201993031005
--   2. NURLAILI, S.H., M.H.    — NIP 196505281994032001
--   3. SYAIFUL ISLAMI, S.H.    — NIP 198409022009041004
--   4. SUPRIADI, S.H.          — NIP 196511281993031003

insert into hearing_user_assignments(hearing_id, user_id, assignment_role, active)
values
  -- Perkara 001 — Panitera & Panitera Pengganti
  ('hearing-demo-001', '196809011996031001', 'PANITERA',           true),
  ('hearing-demo-001', '196908201993031005', 'PANITERA_PENGGANTI', true),

  -- Perkara 002 — Panitera & Panitera Pengganti
  ('hearing-demo-002', '196809011996031001', 'PANITERA',           true),
  ('hearing-demo-002', '196505281994032001', 'PANITERA_PENGGANTI', true),

  -- Perkara 003 — Panitera & Panitera Pengganti
  ('hearing-demo-003', '196809011996031001', 'PANITERA',           true),
  ('hearing-demo-003', '198409022009041004', 'PANITERA_PENGGANTI', true)
on conflict (hearing_id, user_id) do update
  set assignment_role = excluded.assignment_role,
      active          = excluded.active;

-- =============================================================================
-- 7. Verifikasi seed berhasil
-- =============================================================================
do $$
declare
  org_count   int;
  hear_count  int;
  assign_count int;
begin
  select count(*) into org_count   from organizations   where id like '%-demo%';
  select count(*) into hear_count  from hearings         where id like 'hearing-demo-%';
  select count(*) into assign_count from hearing_assignments where hearing_id like 'hearing-demo-%';

  raise notice '=== CIMS Demo Seed Verification ===';
  raise notice 'Organizations: % (expected: 3)',  org_count;
  raise notice 'Hearings:      % (expected: 3)',  hear_count;
  raise notice 'Assignments:   % (expected: 9)',  assign_count;

  if org_count < 3 or hear_count < 3 or assign_count < 9 then
    raise warning 'Seed mungkin tidak lengkap — periksa log di atas.';
  else
    raise notice 'Seed berhasil. Jalankan aplikasi dan gunakan Hearing Selector untuk memilih perkara.';
  end if;
end;
$$;
