import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const required = [
  'database/typescript-migrations/0003_phase4_core_persistence.sql',
  'database/seeds/0001_demo_nonproduction.sql',
  'apps/api/src/infrastructure/repositories/core-workflow.repository.ts',
  'apps/api/src/infrastructure/repositories/notices.repository.ts',
  'apps/api/src/infrastructure/repositories/readiness.repository.ts',
  'apps/api/src/infrastructure/repositories/virtual-sessions.repository.ts',
  'apps/api/src/infrastructure/repositories/hearing-control.repository.ts',
  'apps/api/src/infrastructure/repositories/reconciliation.repository.ts',
  'apps/api/src/infrastructure/database/outbox.service.ts',
  'apps/api/src/infrastructure/outbox-worker.service.ts',
  'apps/api/src/infrastructure/config/production-config-validator.service.ts',
  'apps/api/src/worker.ts',
  'apps/api/src/modules/provider-webhooks/provider-webhook.service.ts',
  'apps/api/src/modules/reconciliation/reconciliation.module.ts',
  'services/zoom-provider/src/zoom-provider.service.ts',
  'tools/migrate-postgres.mjs',
  'tools/postgres-phase4-smoke.mjs',
  'packages/contracts/openapi-cims-production-v0.17.yaml',
  'packages/contracts/openapi-video-provider-v0.17.yaml',
  'apps/worker.Dockerfile',
  'tools/Dockerfile.migrations',
  'infra/k8s/base/migration-job.yaml',
  'infra/k8s/base/worker-deployment.yaml',
  'infra/k8s/base/zoom-provider-deployment.yaml',
  'infra/k8s/base/web-deployment.yaml',
  'infra/k8s/base/monitoring.example.yaml',
  'database/admin/roles-and-grants.template.sql',
  'docs/PRODUCTION_PERSISTENCE_0.17.md',
  'docs/DEPLOYMENT_RUNBOOK_0.17.md',
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('Missing Phase 4 files:', missing);
  process.exit(1);
}

const migration = readFileSync('database/typescript-migrations/0003_phase4_core_persistence.sql', 'utf8').toLowerCase();
for (const marker of [
  'schema_migrations',
  'hearing_schedules',
  'row_version',
  'enable row level security',
  'audit_events',
  'provider_webhook_events',
  'video_provider_operations',
  'reconciliation_runs',
  'cims_hearing_allowed',
  'alter table if exists official_notices alter column id set default gen_random_uuid()',
]) {
  if (!migration.includes(marker)) throw new Error(`Migration marker missing: ${marker}`);
}

const outbox = readFileSync('apps/api/src/infrastructure/database/outbox.service.ts', 'utf8').toLowerCase();
for (const marker of ['for update skip locked', 'dead_letter', 'correlation_id', 'traceparent']) {
  if (!outbox.includes(marker)) throw new Error(`Outbox marker missing: ${marker}`);
}

const main = readFileSync('apps/api/src/main.ts', 'utf8');
for (const marker of ['rawBody: true', "'traceparent'", "'x-cims-signature'", "'x-cims-timestamp'"]) {
  if (!main.includes(marker)) throw new Error(`HTTP bootstrap marker missing: ${marker}`);
}

const zoom = readFileSync('services/zoom-provider/src/zoom-provider.service.ts', 'utf8');
for (const marker of ['video_provider_operations', 'Idempotency key', "auto_recording: 'none'", 'ZOOM_HOST_USER_ID']) {
  if (!zoom.includes(marker)) throw new Error(`Zoom adapter marker missing: ${marker}`);
}

const migratedServices = [
  'apps/api/src/modules/hearings/hearings.service.ts',
  'apps/api/src/modules/determinations/determinations.service.ts',
  'apps/api/src/modules/scheduling/scheduling.service.ts',
  'apps/api/src/modules/notices/notices.service.ts',
  'apps/api/src/modules/readiness/readiness.service.ts',
  'apps/api/src/modules/virtual-sessions/virtual-sessions.service.ts',
  'apps/api/src/modules/hearing-control/hearing-control.service.ts',
  'apps/api/src/modules/participants/participants.service.ts',
  'apps/api/src/modules/incidents/incidents.service.ts',
];
for (const file of migratedServices) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('InMemoryStore')) throw new Error(`Direct InMemoryStore dependency remains in ${file}`);
}

const version = readFileSync('VERSION', 'utf8').trim();
if (version !== '0.17.0') throw new Error(`Unexpected VERSION: ${version}`);
for (const packageFile of ['package.json','apps/api/package.json','apps/web/package.json','services/zoom-provider/package.json','packages/domain/package.json','packages/contracts/package.json']) {
  const packageVersion = JSON.parse(readFileSync(packageFile, 'utf8')).version;
  if (packageVersion !== version) throw new Error(`Package version mismatch in ${packageFile}: ${packageVersion}`);
}

for (const dockerfile of ['apps/api/Dockerfile','apps/worker.Dockerfile','apps/web/Dockerfile','services/zoom-provider/Dockerfile']) {
  const text = readFileSync(dockerfile, 'utf8');
  for (const manifest of ['apps/api/package.json','apps/web/package.json','services/zoom-provider/package.json','packages/domain/package.json','packages/contracts/package.json']) {
    if (!text.includes(manifest)) throw new Error(`${dockerfile} does not copy workspace manifest ${manifest}`);
  }
}

const forbidden = [
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
  /ZOOM_CLIENT_SECRET\s*=\s*[^\s]+/i,
  /NOTIFICATION_GATEWAY_API_KEY\s*=\s*[^\s]+/i,
  /OFFICIAL_SYSTEM_GATEWAY_API_KEY\s*=\s*[^\s]+/i,
];
const roots = ['apps', 'packages', 'services', 'infra', 'docs', 'tools'];
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const candidate = path.join(dir, name);
    if (statSync(candidate).isDirectory()) walk(candidate);
    else files.push(candidate);
  }
}
for (const root of roots) if (existsSync(root)) walk(root);
for (const file of files) {
  if (file.includes('tools/check-')) continue;
  const text = readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text) && !file.endsWith('.env.example')) throw new Error(`Potential secret in ${file}`);
  }
}

console.log(`PASS Phase 4 baseline: ${required.length} required files, ${migratedServices.length} migrated services, ${files.length} files scanned`);
