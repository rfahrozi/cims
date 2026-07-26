import fs from 'fs';
import path from 'path';

const moves = [
  // Observability
  { from: 'audit.service.ts', to: 'observability/audit.service.ts' },
  { from: 'metrics.service.ts', to: 'observability/metrics.service.ts' },
  { from: 'structured-logger.service.ts', to: 'observability/structured-logger.service.ts' },
  
  // Security
  { from: 'field-crypto.service.ts', to: 'security/field-crypto.service.ts' },
  { from: 'hearing-access.service.ts', to: 'security/hearing-access.service.ts' },
  { from: 'production-readiness.service.ts', to: 'security/production-readiness.service.ts' },
  
  // Integration
  { from: 'circuit-breaker.service.ts', to: 'integration/circuit-breaker.service.ts' },
  { from: 'evidence-storage.gateway.ts', to: 'integration/evidence-storage.gateway.ts' },
  { from: 'notification.gateway.ts', to: 'integration/notification.gateway.ts' },
  { from: 'official-system.gateway.ts', to: 'integration/official-system.gateway.ts' },
  { from: 'video-provider.gateway.ts', to: 'integration/video-provider.gateway.ts' },
  
  // Workflow Support
  { from: 'in-memory.store.ts', to: 'workflow-support/in-memory.store.ts' },
  { from: 'outbox-worker.service.ts', to: 'workflow-support/outbox-worker.service.ts' },

  // Persistence Database
  { from: 'database/database-health.service.ts', to: 'persistence/database/database-health.service.ts' },
  { from: 'database/idempotency.service.ts', to: 'persistence/database/idempotency.service.ts' },
  { from: 'database/outbox.service.ts', to: 'persistence/database/outbox.service.ts' },
  { from: 'database/persistence-mode.service.ts', to: 'persistence/database/persistence-mode.service.ts' },
  { from: 'database/pg-pool.service.ts', to: 'persistence/database/pg-pool.service.ts' },

  // Persistence Repositories
  { from: 'repositories/core-workflow.repository.ts', to: 'persistence/repositories/core-workflow.repository.ts' },
  { from: 'repositories/governance.repository.ts', to: 'persistence/repositories/governance.repository.ts' },
  { from: 'repositories/hearing-control.repository.ts', to: 'persistence/repositories/hearing-control.repository.ts' },
  { from: 'repositories/hearing-intake.repository.ts', to: 'persistence/repositories/hearing-intake.repository.ts' },
  { from: 'repositories/incidents.repository.ts', to: 'persistence/repositories/incidents.repository.ts' },
  { from: 'repositories/notices.repository.ts', to: 'persistence/repositories/notices.repository.ts' },
  { from: 'repositories/participants.repository.ts', to: 'persistence/repositories/participants.repository.ts' },
  { from: 'repositories/readiness.repository.ts', to: 'persistence/repositories/readiness.repository.ts' },
  { from: 'repositories/reconciliation.repository.ts', to: 'persistence/repositories/reconciliation.repository.ts' },
  { from: 'repositories/virtual-sessions.repository.ts', to: 'persistence/repositories/virtual-sessions.repository.ts' },
];

const basePath = 'apps/api/src/infrastructure';

for (const move of moves) {
  const fromPath = path.join(basePath, move.from);
  const toPath = path.join(basePath, move.to);
  
  if (!fs.existsSync(fromPath)) {
    console.log(`Skipping ${fromPath} as it doesn't exist`);
    continue;
  }
  
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  
  let content = fs.readFileSync(fromPath, 'utf8');
  content = content.replace(/from '(\.\.?\/[^']+)'/g, (match, p1) => {
    if (p1.startsWith('../')) {
      return `from '../${p1}'`;
    } else if (p1.startsWith('./')) {
      return `from '../${p1.substring(2)}'`;
    }
    return match;
  });
  
  fs.writeFileSync(toPath, content);
  
  const fromDir = path.dirname(fromPath);
  let relPath = path.relative(fromDir, toPath).split(path.sep).join('/').replace(/\.ts$/, '.js');
  const exportPath = relPath.startsWith('.') ? relPath : `./${relPath}`;
  
  fs.writeFileSync(fromPath, `export * from '${exportPath}';\n`);
  console.log(`Moved ${move.from} to ${move.to} and created shim`);
}
