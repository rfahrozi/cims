import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const required = [
  'apps/api/src/common/auth.guard.ts',
  'apps/api/src/common/policy.guard.ts',
  'apps/api/src/common/oidc-token-verifier.service.ts',
  'apps/api/src/modules/participants/participants.module.ts',
  'apps/api/src/modules/incidents/incidents.module.ts',
  'apps/web/src/pages/participants.tsx',
  'apps/web/src/pages/attendance.tsx',
  'apps/web/src/pages/consultation.tsx',
  'apps/web/src/pages/incidents.tsx',
  'database/typescript-migrations/0002_phase3_production.sql',
  'packages/contracts/openapi-cims-production-v0.16.yaml',
  'infra/docker-compose.production-like.yml',
  'infra/k8s/base/api-deployment.yaml',
  'docs/PRODUCTION_READINESS_CHECKLIST.md'
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('Missing production files:', missing);
  process.exit(1);
}
const forbidden = [
  /password\s*=\s*['"][^'"]+['"]/i,
  /ZOOM_CLIENT_SECRET\s*=\s*\S+/i,
  /BEGIN PRIVATE KEY/
];
const roots = ['apps', 'packages', 'services', 'infra', 'docs'];
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
for (const dir of roots) if (existsSync(dir)) walk(dir);
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      console.error(`Potential secret pattern in ${file}: ${pattern}`);
      process.exit(1);
    }
  }
}
const migration = readFileSync('database/typescript-migrations/0002_phase3_production.sql', 'utf8');
for (const marker of [
  'enable row level security',
  'outbox_events',
  'participant_access_tokens',
  'cims_block_mutation'
])
  if (!migration.includes(marker)) {
    console.error(`Migration marker missing: ${marker}`);
    process.exit(1);
  }
console.log(
  `PASS production baseline check: ${required.length} required files and ${files.length} scanned files`
);
