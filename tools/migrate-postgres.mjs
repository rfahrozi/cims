import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const migrationsDir = path.resolve('database/typescript-migrations');
const files = readdirSync(migrationsDir).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
if (files.length === 0) throw new Error('No migrations found.');

const migrations = files.map((file) => {
  const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
  return {
    version: file.replace(/\.sql$/, ''),
    file,
    sql,
    checksum: createHash('sha256').update(sql).digest('hex'),
  };
});

if (dryRun) {
  for (const migration of migrations) console.log(`${migration.version}  ${migration.checksum}`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
let pg;
try {
  pg = await import('pg');
} catch {
  throw new Error('The pg dependency is not installed. Run npm install before db:migrate.');
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
  application_name: 'cims-migration-runner',
  statement_timeout: Number(process.env.DB_MIGRATION_STATEMENT_TIMEOUT_MS ?? 120000),
});

await client.connect();
try {
  await client.query(`select pg_advisory_lock(hashtextextended('cims-schema-migrations',0))`);
  await client.query(`
    create table if not exists schema_migrations (
      version text primary key,
      checksum_sha256 text not null,
      applied_at timestamptz not null default now(),
      applied_by text not null default current_user
    )
  `);

  for (const migration of migrations) {
    const existing = await client.query(
      'select checksum_sha256 from schema_migrations where version=$1',
      [migration.version],
    );
    if (existing.rowCount) {
      const recorded = String(existing.rows[0].checksum_sha256);
      if (recorded !== migration.checksum) {
        throw new Error(`Checksum mismatch for applied migration ${migration.version}.`);
      }
      console.log(`SKIP ${migration.version}`);
      continue;
    }

    console.log(`APPLY ${migration.version}`);
    await client.query('begin');
    try {
      await client.query(migration.sql);
      await client.query(
        'insert into schema_migrations(version,checksum_sha256) values($1,$2)',
        [migration.version, migration.checksum],
      );
      await client.query('commit');
      console.log(`DONE ${migration.version}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.query(`select pg_advisory_unlock(hashtextextended('cims-schema-migrations',0))`).catch(() => undefined);
  await client.end();
}
