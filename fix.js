const fs = require('fs');
const content = fs.readFileSync(
  'apps/api/src/infrastructure/persistence/repositories/core-workflow.repository.ts',
  'utf8'
);

// Do a simpler regex replace
const updated = content
  .replace(
    /const client = await this\.pg\.connect\(\);/g,
    `const client = await this.pg.pool.connect();`
  )
  .replace(/return result\.rows\.map\(\(row\) => \(\{/g, `return result.rows.map((row: any) => ({`);

fs.writeFileSync(
  'apps/api/src/infrastructure/persistence/repositories/core-workflow.repository.ts',
  updated
);
console.log('Updated');
