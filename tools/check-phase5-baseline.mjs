import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const required = [
  'database/typescript-migrations/0004_phase5_manual_hearing_intake.sql',
  'apps/api/src/modules/hearing-intake/hearing-intake.module.ts',
  'apps/api/src/modules/hearing-intake/hearing-intake.controller.ts',
  'apps/api/src/modules/hearing-intake/hearing-intake.service.ts',
  'apps/api/src/modules/hearing-intake/hearing-import.gateway.ts',
  'apps/api/src/infrastructure/repositories/hearing-intake.repository.ts',
  'apps/api/src/infrastructure/hearing-access.service.ts',
  'apps/web/src/pages/hearing-intake.tsx',
  'apps/web/src/lib/hearing-context.tsx',
  'apps/web/src/components/hearing-selector.tsx',
  'packages/domain/src/hearing-intake.ts',
  'packages/domain/test/hearing-intake.test.mjs',
  'packages/contracts/openapi-cims-production-v0.18.yaml',
  'docs/MANUAL_HEARING_INTAKE_0.18.md',
  'docs/FUTURE_DATABASE_IMPORT_0.18.md',
  'docs/DATA_DICTIONARY_HEARING_INTAKE_0.18.md',
  'docs/PRODUCTION_RUNBOOK_HEARING_INTAKE_0.18.md',
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('Missing Phase 5 files:', missing);
  process.exit(1);
}

const migration = readFileSync('database/typescript-migrations/0004_phase5_manual_hearing_intake.sql', 'utf8').toLowerCase();
for (const marker of [
  'court_cases', 'hearing_sequence', 'intake_status', 'data_source',
  'hearing_user_assignments', 'hearing_intake_parties', 'hearing_data_revisions',
  'hearing_import_sources', 'hearing_import_jobs', 'hearing_import_staging',
  'enable row level security', 'cims_hearing_allowed',
]) {
  if (!migration.includes(marker)) throw new Error(`Phase 5 migration marker missing: ${marker}`);
}

const service = readFileSync('apps/api/src/modules/hearing-intake/hearing-intake.service.ts', 'utf8');
for (const marker of ['SUBSTITUTE_CLERK', 'MAKER_CHECKER_REQUIRED', 'assertCourtScope']) {
  if (!service.includes(marker)) throw new Error(`Hearing intake service marker missing: ${marker}`);
}

const repository = readFileSync('apps/api/src/infrastructure/repositories/hearing-intake.repository.ts', 'utf8');
for (const marker of ['OPTIMISTIC_CONCURRENCY_CONFLICT', 'HEARING_INTAKE_DUPLICATE', 'hearing_data_revisions', 'syncPgAssignments']) {
  if (!repository.includes(marker)) throw new Error(`Hearing intake repository marker missing: ${marker}`);
}

const gateway = readFileSync('apps/api/src/modules/hearing-intake/hearing-import.gateway.ts', 'utf8');
for (const marker of ['readOnly: true', 'IDEMPOTENT_COMMIT', 'HEARING_IMPORT_NOT_ENABLED']) {
  if (!gateway.includes(marker)) throw new Error(`Future import gateway marker missing: ${marker}`);
}

const gates = readFileSync('packages/domain/src/gates.ts', 'utf8');
if (!gates.includes("return 'HEARING_DATA'")) throw new Error('HEARING_DATA is not the first workflow gate.');

const app = readFileSync('apps/web/src/app.tsx', 'utf8');
for (const marker of ['/hearing-intake', 'HearingSelector', '0.18.0']) {
  if (!app.includes(marker)) throw new Error(`Frontend shell marker missing: ${marker}`);
}

const version = readFileSync('VERSION', 'utf8').trim();
if (version !== '0.18.0') throw new Error(`Unexpected VERSION: ${version}`);
for (const packageFile of ['package.json','apps/api/package.json','apps/web/package.json','services/zoom-provider/package.json','packages/domain/package.json','packages/contracts/package.json']) {
  const packageVersion = JSON.parse(readFileSync(packageFile, 'utf8')).version;
  if (packageVersion !== version) throw new Error(`Package version mismatch in ${packageFile}: ${packageVersion}`);
}

const forbidden = [/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/, /HEARING_IMPORT_DATABASE_URL\s*=\s*\S+/i];
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const candidate = path.join(dir, name);
    if (statSync(candidate).isDirectory()) walk(candidate);
    else files.push(candidate);
  }
}
for (const root of ['apps','packages','services','database','docs','tools']) if (existsSync(root)) walk(root);
for (const file of files) {
  if (file.includes('tools/check-')) continue;
  const text = readFileSync(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(text) && !file.endsWith('.env.example')) throw new Error(`Potential secret in ${file}`);
}

console.log(`PASS Phase 5 baseline: ${required.length} required files and ${files.length} files scanned`);
