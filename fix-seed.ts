import fs from 'fs';

const file = 'database/seeds/0001_demo_nonproduction.sql';
let content = fs.readFileSync(file, 'utf8');

// The original seed inserts hearings with status 'DRAFT' but intake_status 'ACTIVE' which is an invalid state combo
// In the revised flow, it should probably be 'DRAFT' and 'DRAFT'
// Let's replace 'ACTIVE', 'MANUAL' with 'DRAFT', 'MANUAL' for the intake_status

const seedOld = `
  ('hearing-demo-001', 'case-demo-001', '123/Pid.Sus/2026/PN.Demo', 'PEMERIKSAAN_SAKSI',  'DRAFT', 'SIPP-DEMO-001', 1, 'ACTIVE', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system'),
  ('hearing-demo-002', 'case-demo-002', '456/Pid.B/2026/PN.Demo',   'PEMERIKSAAN_AHLI',   'DRAFT', 'SIPP-DEMO-002', 2, 'ACTIVE', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system'),
  ('hearing-demo-003', 'case-demo-003', '789/Pid.Sus/2026/PN.Demo', 'PEMBACAAN_PUTUSAN',  'DRAFT', 'SIPP-DEMO-003', 3, 'ACTIVE', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system')
`;

const seedNew = `
  ('hearing-demo-001', 'case-demo-001', '123/Pid.Sus/2026/PN.Demo', 'PEMERIKSAAN_SAKSI',  'NOT_READY', 'SIPP-DEMO-001', 1, 'DRAFT', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system'),
  ('hearing-demo-002', 'case-demo-002', '456/Pid.B/2026/PN.Demo',   'PEMERIKSAAN_AHLI',   'NOT_READY', 'SIPP-DEMO-002', 2, 'DRAFT', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system'),
  ('hearing-demo-003', 'case-demo-003', '789/Pid.Sus/2026/PN.Demo', 'PEMBACAAN_PUTUSAN',  'NOT_READY', 'SIPP-DEMO-003', 3, 'DRAFT', 'MANUAL', 'court-demo', 'prosecution-demo', 'corrections-demo', 'system', 'system')
`;

content = content.replace(seedOld, seedNew);

fs.writeFileSync(file, content);
