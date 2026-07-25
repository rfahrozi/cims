
import { existsSync } from 'node:fs';
const required = [
  'apps/api/src/main.ts','apps/api/src/app.module.ts','apps/api/src/common/auth.guard.ts','apps/api/src/common/policy.guard.ts',
  'apps/api/src/modules/notices/notices.module.ts','apps/api/src/modules/readiness/readiness.module.ts','apps/api/src/modules/virtual-sessions/virtual-sessions.module.ts','apps/api/src/modules/hearing-control/hearing-control.module.ts',
  'apps/api/src/modules/participants/participants.module.ts','apps/api/src/modules/incidents/incidents.module.ts',
  'apps/web/src/pages/notices.tsx','apps/web/src/pages/readiness.tsx','apps/web/src/pages/virtual-session.tsx','apps/web/src/pages/hearing-control.tsx','apps/web/src/pages/participants.tsx','apps/web/src/pages/incidents.tsx',
  'packages/domain/src/workflow.ts','packages/domain/src/participants.ts','packages/domain/src/incidents.ts','packages/domain/src/authorization.ts',
  'packages/contracts/openapi-cims-workflow-v0.15.yaml','packages/contracts/openapi-cims-production-v0.16.yaml',
  'database/typescript-migrations/0001_phase2_workflow.sql','database/typescript-migrations/0002_phase3_production.sql','services/zoom-provider/src/main.ts'
];
const missing=required.filter((file)=>!existsSync(file));if(missing.length){console.error('Missing files:',missing);process.exit(1)}console.log(`PASS structure check: ${required.length} required files present`);
