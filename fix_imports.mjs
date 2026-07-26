import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const basePath = path.resolve('apps/api/src/infrastructure');

// Map of old relative path from infrastructure -> new relative path
const moves = [
  { from: 'audit.service', to: 'observability/audit.service' },
  { from: 'metrics.service', to: 'observability/metrics.service' },
  { from: 'structured-logger.service', to: 'observability/structured-logger.service' },
  
  { from: 'field-crypto.service', to: 'security/field-crypto.service' },
  { from: 'hearing-access.service', to: 'security/hearing-access.service' },
  { from: 'production-readiness.service', to: 'security/production-readiness.service' },
  
  { from: 'circuit-breaker.service', to: 'integration/circuit-breaker.service' },
  { from: 'evidence-storage.gateway', to: 'integration/evidence-storage.gateway' },
  { from: 'notification.gateway', to: 'integration/notification.gateway' },
  { from: 'official-system.gateway', to: 'integration/official-system.gateway' },
  { from: 'video-provider.gateway', to: 'integration/video-provider.gateway' },
  
  { from: 'in-memory.store', to: 'workflow-support/in-memory.store' },
  { from: 'outbox-worker.service', to: 'workflow-support/outbox-worker.service' },

  { from: 'database/database-health.service', to: 'persistence/database/database-health.service' },
  { from: 'database/idempotency.service', to: 'persistence/database/idempotency.service' },
  { from: 'database/outbox.service', to: 'persistence/database/outbox.service' },
  { from: 'database/persistence-mode.service', to: 'persistence/database/persistence-mode.service' },
  { from: 'database/pg-pool.service', to: 'persistence/database/pg-pool.service' },

  { from: 'repositories/core-workflow.repository', to: 'persistence/repositories/core-workflow.repository' },
  { from: 'repositories/governance.repository', to: 'persistence/repositories/governance.repository' },
  { from: 'repositories/hearing-control.repository', to: 'persistence/repositories/hearing-control.repository' },
  { from: 'repositories/hearing-intake.repository', to: 'persistence/repositories/hearing-intake.repository' },
  { from: 'repositories/incidents.repository', to: 'persistence/repositories/incidents.repository' },
  { from: 'repositories/notices.repository', to: 'persistence/repositories/notices.repository' },
  { from: 'repositories/participants.repository', to: 'persistence/repositories/participants.repository' },
  { from: 'repositories/readiness.repository', to: 'persistence/repositories/readiness.repository' },
  { from: 'repositories/reconciliation.repository', to: 'persistence/repositories/reconciliation.repository' },
  { from: 'repositories/virtual-sessions.repository', to: 'persistence/repositories/virtual-sessions.repository' },
];

const moveMap = new Map();

const shimPaths = new Set();

for (const m of moves) {
  const oldPath = path.join(basePath, m.from).split(path.sep).join('/');
  const newPath = path.join(basePath, m.to).split(path.sep).join('/');
  moveMap.set(oldPath, newPath);
  shimPaths.add(path.normalize(path.join(basePath, m.from + '.ts')));
}

const files = globSync('apps/api/{src,test}/**/*.ts', { absolute: true });

let updatedFilesCount = 0;

for (const file of files) {
  if (shimPaths.has(path.normalize(file))) continue;

  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  newContent = newContent.replace(/(from\s+['"])([^'"]+)(['"])/g, (match, prefix, importPath, suffix) => {
    if (!importPath.startsWith('.')) return match;
    
    const fileDir = path.dirname(file).split(path.sep).join('/');
    let resolvedPath = path.resolve(fileDir, importPath).split(path.sep).join('/').replace(/\.js$/, '');
    
    for (const [oldP, newP] of moveMap.entries()) {
      if (resolvedPath.endsWith(oldP.substring(oldP.indexOf('apps/api/src/infrastructure')))) {
        let newRelativePath = path.relative(fileDir, newP).split(path.sep).join('/');
        if (!newRelativePath.startsWith('.')) {
          newRelativePath = './' + newRelativePath;
        }
        newRelativePath += '.js';
        return `${prefix}${newRelativePath}${suffix}`;
      }
    }
    
    return match;
  });

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    updatedFilesCount++;
  }
}

console.log(`Updated ${updatedFilesCount} files`);
