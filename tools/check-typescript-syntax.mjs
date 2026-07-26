import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const roots = [
  'apps/api/src',
  'apps/web/src',
  'packages/domain/src',
  'packages/contracts/src',
  'services/zoom-provider/src'
];
const files = [];
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
}
for (const root of roots) walk(root);
try {
  execFileSync(
    'tsc',
    [
      '--pretty',
      'false',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--experimentalDecorators',
      '--emitDecoratorMetadata',
      '--jsx',
      'react-jsx',
      '--noResolve',
      ...files
    ],
    { stdio: 'pipe', maxBuffer: 20 * 1024 * 1024 }
  );
} catch (error) {
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  const syntaxLines = output
    .split('\n')
    .filter((line) => /error TS1\d{3}|error TS10\d{2}|error TS11\d{2}/.test(line));
  if (syntaxLines.length) {
    console.error(`Syntax errors:\n${syntaxLines.join('\n')}`);
    process.exit(1);
  }
}
console.log(`PASS TypeScript syntax check: ${files.length} TS/TSX files parsed`);
