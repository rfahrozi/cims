if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
let pg;
try {
  pg = await import('pg');
} catch {
  throw new Error('The pg dependency is not installed. Run npm install first.');
}
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  application_name: 'cims-migration-status'
});
await client.connect();
try {
  const result = await client.query(
    `select version,checksum_sha256,applied_at,applied_by from schema_migrations order by version`
  );
  console.table(result.rows);
} finally {
  await client.end();
}
