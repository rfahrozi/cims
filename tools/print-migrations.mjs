import { readdirSync } from 'node:fs';
for (const file of readdirSync('database/typescript-migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort())
  console.log(file);
