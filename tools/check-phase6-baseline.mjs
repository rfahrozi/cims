import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const required = [
  'database/typescript-migrations/0005_phase6_production_governance.sql',
  'apps/api/src/modules/governance/governance.module.ts',
  'apps/api/src/modules/governance/governance.controller.ts',
  'apps/api/src/modules/governance/governance.service.ts',
  'apps/api/src/infrastructure/repositories/governance.repository.ts',
  'apps/api/src/infrastructure/production-readiness.service.ts',
  'apps/api/src/infrastructure/evidence-storage.gateway.ts',
  'apps/api/src/infrastructure/circuit-breaker.service.ts',
  'apps/web/src/pages/governance.tsx',
  'packages/domain/src/governance.ts',
  'packages/domain/test/governance.test.mjs',
  'packages/contracts/openapi-cims-production-v0.19.yaml',
  'docs/PRODUCTION_GOVERNANCE_0.19.md',
  'docs/EVIDENCE_EXPORT_0.19.md',
  'docs/RETENTION_AND_LEGAL_HOLD_0.19.md',
  'docs/ACCESS_REVIEW_0.19.md',
  'docs/PRODUCTION_RUNBOOK_0.19.md',
  'docs/PHASE_NEXT_0.19.md',
  'infra/k8s/base/resource-governance.yaml',
  'infra/k8s/base/namespace-security.example.yaml',
  'infra/k8s/base/governance-secrets.example.yaml',
  'PRODUCTION_PHASE6_TEST_RESULTS.txt',
  'PHASE6_VALIDATION_SUMMARY.json',
  'PRODUCTION_STATUS.json',
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) { console.error('Missing Phase 6 files:', missing); process.exit(1); }

const migration = readFileSync('database/typescript-migrations/0005_phase6_production_governance.sql', 'utf8').toLowerCase();
for (const marker of ['legal_holds','retention_policies','retention_previews','evidence_exports','evidence_export_items','access_review_campaigns','access_review_items','production_readiness_snapshots','enable row level security','cims_block_mutation','cims_guard_legal_hold_transition','cims_guard_access_review_item_transition','cims_guard_evidence_export_transition']) {
  if (!migration.includes(marker)) throw new Error(`Phase 6 migration marker missing: ${marker}`);
}


const grants = readFileSync('database/admin/roles-and-grants.template.sql','utf8');
for (const marker of ['legal_holds','evidence_exports','access_review_campaigns','production_readiness_snapshots']) {
  if (!grants.includes(marker)) throw new Error(`Database grant marker missing: ${marker}`);
}
const openapi = readFileSync('packages/contracts/openapi-cims-production-v0.19.yaml','utf8');
for (const marker of ['/production-readiness','/legal-holds','/retention-preview','/evidence-exports','/access-reviews']) {
  if (!openapi.includes(marker)) throw new Error(`OpenAPI governance marker missing: ${marker}`);
}
const repository = readFileSync('apps/api/src/infrastructure/repositories/governance.repository.ts','utf8');
for (const marker of ['EVIDENCE_EXPORT_REQUESTED','processEvidenceExport','assertLegalHoldReleaseAllowed','assertAccessReviewDecisionAllowed','retentionEligibility']) {
  if (!repository.includes(marker)) throw new Error(`Governance repository marker missing: ${marker}`);
}
const readiness = readFileSync('apps/api/src/infrastructure/production-readiness.service.ts','utf8');
for (const marker of ['productionGateDecision','PACKAGE_LOCK','EVIDENCE_STORAGE','RETENTION_EXECUTION']) {
  if (!readiness.includes(marker)) throw new Error(`Readiness marker missing: ${marker}`);
}
const env = readFileSync('.env.example','utf8');
for (const marker of ['HEARING_IMPORT_ENABLED=false','RETENTION_EXECUTION_ENABLED=false','LEGAL_HOLD_MAKER_CHECKER=true','EVIDENCE_STORAGE_MODE=LOCAL']) {
  if (!env.includes(marker)) throw new Error(`Environment safety marker missing: ${marker}`);
}
const version = readFileSync('VERSION','utf8').trim();
if (version !== '0.19.0') throw new Error(`Unexpected VERSION: ${version}`);
for (const packageFile of ['package.json','apps/api/package.json','apps/web/package.json','services/zoom-provider/package.json','packages/domain/package.json','packages/contracts/package.json']) {
  const packageVersion = JSON.parse(readFileSync(packageFile,'utf8')).version;
  if (packageVersion !== version) throw new Error(`Package version mismatch in ${packageFile}: ${packageVersion}`);
}
const files=[];
function walk(dir){for(const name of readdirSync(dir)){const candidate=path.join(dir,name);if(statSync(candidate).isDirectory())walk(candidate);else files.push(candidate)}}
for(const root of ['apps','packages','services','database','docs','tools','infra']) if(existsSync(root)) walk(root);
const forbidden=[/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,/EVIDENCE_STORAGE_API_KEY\s*=\s*[^\s#]+/i];
for(const file of files){if(file.endsWith('.env.example') || file.includes('check-')) continue; const text=readFileSync(file,'utf8'); for(const pattern of forbidden) if(pattern.test(text)) throw new Error(`Forbidden production pattern in ${file}: ${pattern}`);}
for (const configFile of ['.env.example','infra/docker-compose.production-like.yml','infra/k8s/base/configmap.example.yaml']) {
  const text=readFileSync(configFile,'utf8');
  if (/RETENTION_EXECUTION_ENABLED:\s*['\"]?true/i.test(text) || /RETENTION_EXECUTION_ENABLED=true/i.test(text)) throw new Error(`Retention execution must remain disabled in ${configFile}`);
}
if (!existsSync('package-lock.json')) console.warn('WARN package-lock.json is absent. Production readiness remains NO_GO until the official CI generates and reviews it.');
console.log(`PASS Phase 6 baseline: ${required.length} required files and ${files.length} files scanned`);
