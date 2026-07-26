if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pg = await import('pg');
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  application_name: 'cims-phase4-smoke'
});
await client.connect();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const hearingId = `smoke-hearing-${suffix}`;
const courtId = `smoke-court-${suffix}`;
const otherId = `smoke-other-${suffix}`;
try {
  const requiredTables = [
    'hearings',
    'judicial_determinations',
    'schedule_proposals',
    'hearing_schedules',
    'official_notices',
    'readiness_submissions',
    'virtual_sessions',
    'hearing_runtime',
    'audit_events',
    'outbox_events',
    'provider_webhook_events',
    'video_provider_operations',
    'reconciliation_runs'
  ];
  const tableRows = await client.query(
    `select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[])`,
    [requiredTables]
  );
  if (tableRows.rowCount !== requiredTables.length) {
    const found = new Set(tableRows.rows.map((row) => row.table_name));
    throw new Error(
      `Missing tables: ${requiredTables.filter((name) => !found.has(name)).join(', ')}`
    );
  }

  const ledger = await client.query('select count(*)::int as count from schema_migrations');
  if (Number(ledger.rows[0].count) < 3)
    throw new Error('Migration ledger does not contain all baseline migrations.');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('begin');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query(
    `insert into organizations(id,organization_code,name,organization_type) values($1,$2,$3,'COURT'),($4,$5,$6,'COURT')`,
    [courtId, `COURT-${suffix}`, 'Smoke Court', otherId, `OTHER-${suffix}`, 'Other Court']
  );

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query(
    `insert into hearings(id,case_number,hearing_type,state,case_id,court_organization_id,prosecution_organization_id,created_by,updated_by) values($1,$2,'FIRST_INSTANCE','SCHEDULING',$1,$5,$5,'test','test'),($3,$4,'FIRST_INSTANCE','DRAFT',$3,$6,$6,'test','test')`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('insert into hearing_assignments(hearing_id,organization_id) values($1,$2)', [
    hearingId,
    courtId
  ]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query(
    `insert into judicial_determinations(hearing_id,version,decision,official_reference,reason,is_current,created_by)
     values($1,1,'APPROVED',$2,'Smoke approval',true,'smoke-user')`,
    [hearingId, `DET-${suffix}`]
  );
  const proposal = await client.query(
    `insert into schedule_proposals(hearing_id,start_at,end_at,display_timezone,status,created_by)
     values($1,now()+interval '1 day',now()+interval '1 day 1 hour','Asia/Jakarta','CHECKED','smoke-user') returning id`,
    [hearingId]
  );

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query(
    `insert into hearing_schedules(hearing_id,version,start_at,end_at,display_timezone,status,approval_reason,approved_by)
     select hearing_id,1,start_at,end_at,display_timezone,'ACTIVE','Smoke approval','smoke-user' from schedule_proposals where id=$1`,
    [proposal.rows[0].id]
  );
  let uniqueBlocked = false;

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('savepoint duplicate_schedule_test');
  try {
    await client.query(
      `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
      [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
    );
    await client.query(
      `insert into hearing_schedules(hearing_id,version,start_at,end_at,display_timezone,status,approval_reason,approved_by)
       select hearing_id,2,start_at,end_at,display_timezone,'ACTIVE','Second active','smoke-user' from schedule_proposals where id=$1`,
      [proposal.rows[0].id]
    );
  } catch (error) {
    uniqueBlocked = error?.code === '23505';

    await client.query(
      `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
      [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
    );
    await client.query('rollback to savepoint duplicate_schedule_test');
  }

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('release savepoint duplicate_schedule_test');
  if (!uniqueBlocked)
    throw new Error('Single active schedule constraint did not block a duplicate.');

  const audit = await client.query(
    `insert into audit_events(object_type,object_id,sequence,event_type,payload,event_hash)
     values('HEARING',$1,1,'SMOKE_EVENT','{}','smoke-hash') returning id`,
    [hearingId]
  );
  let immutable = false;

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('savepoint audit_immutable_test');
  try {
    await client.query("update audit_events set event_type='MUTATED' where id=$1", [
      audit.rows[0].id
    ]);
  } catch {
    immutable = true;
    await client.query('rollback to savepoint audit_immutable_test');
  }

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('release savepoint audit_immutable_test');
  if (!immutable) throw new Error('Audit immutability trigger did not block update.');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('commit');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query(
    `do $$ begin if not exists(select 1 from pg_roles where rolname='cims_smoke_app') then create role cims_smoke_app nologin; end if; end $$`
  );

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('grant usage on schema public to cims_smoke_app');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('grant select on hearings to cims_smoke_app');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('begin');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('set local role cims_smoke_app');

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query(
    `select set_config('cims.is_system_admin','false',true), set_config('cims.hearing_assignments',$1,true), set_config('cims.organization_ids',$2,true)`,
    [hearingId, courtId]
  );
  const visible = await client.query('select id from hearings where id in ($1,$2)', [
    hearingId,
    `other-hearing-${suffix}`
  ]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('rollback');
  if (visible.rowCount !== 1 || visible.rows[0].id !== hearingId)
    throw new Error('RLS hearing scope failed.');

  const policies = await client.query(
    `select count(*)::int as count from pg_policies where schemaname='public'`
  );
  if (Number(policies.rows[0].count) < 15)
    throw new Error('Expected RLS policies were not installed.');

  const rlsTables = [
    'hearings',
    'official_notices',
    'participant_access_tokens',
    'participant_sessions',
    'attendance_events',
    'consultation_sessions',
    'incidents',
    'incident_actions'
  ];
  const rls = await client.query(
    `select relname,relrowsecurity from pg_class where relname=any($1::text[])`,
    [rlsTables]
  );
  if (rls.rowCount !== rlsTables.length || rls.rows.some((row) => !row.relrowsecurity)) {
    throw new Error('Expected row-level security was not enabled on all critical workflow tables.');
  }

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from audit_events where object_id=$1').catch(() => undefined);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from hearing_schedules where hearing_id=$1', [hearingId]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from schedule_proposals where hearing_id=$1', [hearingId]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from judicial_determinations where hearing_id=$1', [hearingId]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from hearing_assignments where hearing_id=$1', [hearingId]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from hearings where id=any($1::text[])', [
    [hearingId, `other-hearing-${suffix}`]
  ]);

  await client.query(
    `insert into court_cases(id,case_number,normalized_case_number,court_organization_id,prosecution_organization_id,created_by,updated_by,case_classification,case_type_code,case_title,data_source) values($1,$2,$2,$5,$5,'test','test','GENERAL_CRIMINAL','test','test','MANUAL'),($3,$4,$4,$6,$6,'test','test','GENERAL_CRIMINAL','test','test','MANUAL') on conflict do nothing`,
    [hearingId, `SMOKE/${suffix}`, `other-hearing-${suffix}`, `OTHER/${suffix}`, courtId, otherId]
  );
  await client.query('delete from organizations where id=any($1::text[])', [[courtId, otherId]]);

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        required_tables: requiredTables.length,
        migration_count: Number(ledger.rows[0].count),
        rls_policy_count: Number(policies.rows[0].count),
        unique_active_schedule: 'PASS',
        audit_immutability: 'PASS',
        rls_scope: 'PASS',
        rls_critical_tables: 'PASS'
      },
      null,
      2
    )
  );
} finally {
  await client.end();
}
