import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const required = [
  'apps/api/src/server.mjs',
  'apps/api/src/app.mjs',
  'apps/api/src/modules/participant/service.mjs',
  'apps/api/src/modules/hearing-control/service.mjs',
  'apps/api/src/modules/incident/service.mjs',
  'apps/api/src/modules/appeal/service.mjs',
  'apps/api/src/modules/compliance/service.mjs',
  'apps/api/src/common/rate-limiter.mjs',
  'apps/web/app/index.html',
  'database/sqlite/0001_sprint_0_12.sql',
  'database/migrations/0005_sprint_10_12_appeal_audit_reconciliation.sql',
  'packages/contracts/openapi-cims-sprint-0-12.yaml',
  'packages/contracts/video-provider-adapter-contract.yaml',
  'services/mock-video-provider/src/server.mjs',
  'services/zoom-video-provider/src/server.mjs',
  'services/zoom-video-provider/src/app.mjs',
  'services/fake-zoom-api/src/server.mjs',
  'tests/contract/zoom-adapter-smoke.mjs',
  'database/migrations/0006_zoom_provider_integration.sql',
  'docs/ZOOM_INTEGRATION_GUIDE.md',
  'tests/integration/appeal-decision-workflow.test.mjs',
  'tests/integration/audit-reconciliation.test.mjs',
  'tests/integration/security-hardening.test.mjs',
  'tools/performance-smoke-0-12.mjs',
  'tools/dr-recovery-test-0-12.mjs',
  'tools/pilot-uat-0-12.mjs'
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error('Missing required files:', missing);
  process.exit(1);
}
const files = [];
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory() && !['node_modules', '.git', 'var'].includes(item.name)) walk(full);
    else if (item.isFile() && full.endsWith('.mjs')) files.push(full);
  }
}
for (const directory of ['apps', 'services', 'tests', 'tools'])
  if (fs.existsSync(directory)) walk(directory);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
const prohibited = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (/console\.log\([^\n]*(join_token|participant_join_url|host_secret)/i.test(text))
    prohibited.push(file);
}
if (prohibited.length) {
  console.error('Potential secret logging found:', prohibited);
  process.exit(1);
}
console.log(
  `PASS repository check: ${required.length} required files, ${files.length} JavaScript modules, and no obvious secret logging.`
);
