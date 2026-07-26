-- NONPRODUCTION ONLY — Synthetic seed for DEV/SIT/Preproduction.
-- Jangan dijalankan di production atau lingkungan dengan data perkara nyata.
-- Data ini digunakan untuk pilot pertama CIMS sesuai PANDUAN_PILOT.md

-- =============================================================================
-- 1. Organisasi (3 instansi)
-- =============================================================================
insert into organizations(id, organization_code, name, organization_type, active)
values
  ('court-demo',       'PN-DEMO',     'Pengadilan Negeri Demo',    'COURT',       true),
  ('prosecution-demo', 'KEJARI-DEMO', 'Kejaksaan Negeri Demo',     'PROSECUTION', true),
  ('corrections-demo', 'RUTAN-DEMO',  'Rutan Demo',                'CORRECTIONS', true),
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
  ('case-demo-001', '123/Pid.Sus/2026/PN.Demo', '123/PID.SUS/2026/PN.DEMO', 'SIPP-DEMO-001', 'SPECIAL_CRIMINAL', 'PID.SUS', 'Perkara Narkotika', 'court-demo', 'prosecution-demo', 'MANUAL', 'system', 'system'),
  ('case-demo-002', '456/Pid.B/2026/PN.Demo',   '456/PID.B/2026/PN.DEMO',   'SIPP-DEMO-002', 'GENERAL_CRIMINAL', 'PID.B',   'Perkara Pencurian', 'court-demo', 'prosecution-demo', 'MANUAL', 'system', 'system'),
  ('case-demo-003', '789/Pid.Sus/2026/PN.Demo', '789/PID.SUS/2026/PN.DEMO', 'SIPP-DEMO-003', 'SPECIAL_CRIMINAL', 'PID.SUS', 'Perkara Tipikor',   'court-demo', 'prosecution-demo', 'MANUAL', 'system', 'system')
on conflict (id) do update
  set case_number = excluded.case_number,
      case_title  = excluded.case_title,
      updated_at  = now();

-- Perkara A: Status DRAFT — untuk mulai dari langkah 1
insert into hearings(id, case_id, case_number, hearing_type, state, official_case_reference, hearing_sequence, intake_status, data_source, court_organization_id, prosecution_organization_id, corrections_organization_id, created_by, updated_by)
values
  ('hearing-demo-001', 'case-demo-001', '123/Pid.Sus/2026/PN.Demo', 'PEMERIKSAAN_SAKSI',  'DRAFT', 'SIPP-DEMO-001', 1, 'ACTIVE', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system'),
  ('hearing-demo-002', 'case-demo-002', '456/Pid.B/2026/PN.Demo',   'PEMERIKSAAN_AHLI',   'DRAFT', 'SIPP-DEMO-002', 2, 'ACTIVE', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system'),
  ('hearing-demo-003', 'case-demo-003', '789/Pid.Sus/2026/PN.Demo', 'PEMBACAAN_PUTUSAN',  'DRAFT', 'SIPP-DEMO-003', 3, 'ACTIVE', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system')
on conflict (id) do update
  set case_number    = excluded.case_number,
      hearing_type   = excluded.hearing_type,
      state          = excluded.state,
      updated_at     = now();

-- =============================================================================
-- 3. Assignment instansi ke perkara
-- =============================================================================
insert into hearing_assignments(hearing_id, organization_id)
values
  ('hearing-demo-001', 'court-demo'),
  ('hearing-demo-001', 'prosecution-demo'),
  ('hearing-demo-001', 'corrections-demo'),
  ('hearing-demo-002', 'court-demo'),
  ('hearing-demo-002', 'prosecution-demo'),
  ('hearing-demo-002', 'corrections-demo'),
  ('hearing-demo-003', 'court-demo'),
  ('hearing-demo-003', 'prosecution-demo'),
  ('hearing-demo-003', 'corrections-demo')
on conflict do nothing;

-- =============================================================================
-- 4. User demo (5 persona sesuai PANDUAN_PILOT.md)
-- =============================================================================
-- Catatan: tabel users mungkin belum ada di TypeScript schema (dikelola via OIDC).
-- Insert ini hanya untuk sistem yang memiliki tabel users lokal.
-- Di DEV mode dengan PersonaSwitcher, user dibuat secara in-memory oleh DevIdentityInterceptor.

-- =============================================================================
-- 5. Verifikasi seed berhasil
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
