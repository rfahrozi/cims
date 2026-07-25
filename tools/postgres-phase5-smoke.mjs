if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pg = await import('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: 'cims-phase5-smoke' });
await client.connect();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const courtId = `phase5-court-${suffix}`;
const prosecutionId = `phase5-prosecution-${suffix}`;
const caseId = `phase5-case-${suffix}`;
const hearingId = `phase5-hearing-${suffix}`;
const userId = `phase5-user-${suffix}`;
try {
  const requiredTables = ['court_cases','hearings','hearing_user_assignments','hearing_intake_parties','hearing_data_revisions','hearing_import_sources','hearing_import_jobs','hearing_import_staging'];
  const found = await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name=any($1::text[])`, [requiredTables]);
  if (found.rowCount !== requiredTables.length) throw new Error('Missing Phase 5 tables.');

  await client.query('begin');
  await client.query(`insert into organizations(id,organization_code,name,organization_type) values($1,$2,'Phase 5 Court','COURT'),($3,$4,'Phase 5 Prosecution','PROSECUTION')`, [courtId, `C-${suffix}`, prosecutionId, `P-${suffix}`]);
  await client.query(`insert into court_cases(id,case_number,normalized_case_number,case_classification,case_type_code,case_title,court_organization_id,prosecution_organization_id,data_source,created_by,updated_by) values($1,$2,$3,'SPECIAL_CRIMINAL','PID.SUS','Phase 5 smoke case',$4,$5,'MANUAL',$6,$6)`, [caseId, `101/Pid.Sus/${suffix}`, `101/PID.SUS/${suffix}`.toUpperCase(), courtId, prosecutionId, userId]);
  await client.query(`insert into hearings(id,case_id,case_number,hearing_type,state,hearing_sequence,intake_status,data_source,court_organization_id,prosecution_organization_id,defendant_custody_status,created_by,updated_by) values($1,$2,$3,'PEMERIKSAAN_SAKSI','DRAFT',1,'DRAFT','MANUAL',$4,$5,'NOT_DETAINED',$6,$6)`, [hearingId, caseId, `101/Pid.Sus/${suffix}`, courtId, prosecutionId, userId]);
  await client.query(`insert into hearing_assignments(hearing_id,organization_id) values($1,$2),($1,$3)`, [hearingId, courtId, prosecutionId]);
  await client.query(`insert into hearing_user_assignments(hearing_id,user_id,assignment_role) values($1,$2,'CREATOR')`, [hearingId, userId]);
  await client.query(`insert into hearing_intake_parties(hearing_id,party_type,display_name_encrypted,display_name_search_hash,protected_identity,custody_status,created_by) values($1,'DEFENDANT',decode('00','hex'),'hash',false,'NOT_DETAINED',$2)`, [hearingId, userId]);
  const revision = await client.query(`insert into hearing_data_revisions(hearing_id,revision_number,action,snapshot,actor_user_id) values($1,1,'CREATED','{}',$2) returning id`, [hearingId, userId]);

  let duplicateBlocked = false;
  await client.query('savepoint duplicate_intake');
  try {
    await client.query(`insert into hearings(id,case_id,case_number,hearing_type,state,hearing_sequence,intake_status,data_source,court_organization_id,prosecution_organization_id,defendant_custody_status,created_by,updated_by) values($1,$2,$3,'TUNTUTAN','DRAFT',1,'DRAFT','MANUAL',$4,$5,'NOT_DETAINED',$6,$6)`, [`dup-${hearingId}`, caseId, `101/Pid.Sus/${suffix}`, courtId, prosecutionId, userId]);
  } catch (error) {
    duplicateBlocked = error?.code === '23505';
    await client.query('rollback to savepoint duplicate_intake');
  }
  await client.query('release savepoint duplicate_intake');
  if (!duplicateBlocked) throw new Error('Duplicate case and hearing sequence was not blocked.');

  let revisionImmutable = false;
  await client.query('savepoint revision_immutable');
  try { await client.query(`update hearing_data_revisions set action='UPDATED' where id=$1`, [revision.rows[0].id]); }
  catch { revisionImmutable = true; await client.query('rollback to savepoint revision_immutable'); }
  await client.query('release savepoint revision_immutable');
  if (!revisionImmutable) throw new Error('Hearing revision immutability was not enforced.');
  await client.query('rollback');

  const source = await client.query(`select enabled,configuration_status from hearing_import_sources where source_code='OFFICIAL_CASE_DB'`);
  if (!source.rowCount || source.rows[0].enabled || source.rows[0].configuration_status !== 'DISABLED') throw new Error('Future import source must be disabled by default.');

  console.log(JSON.stringify({ status:'PASS', required_tables:requiredTables.length, duplicate_case_sequence:'PASS', revision_immutability:'PASS', future_import_default:'DISABLED' }, null, 2));
} finally {
  await client.query('rollback').catch(() => undefined);
  await client.end();
}
