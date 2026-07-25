if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pg = await import('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: 'cims-phase6-smoke' });
await client.connect();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const courtId=`phase6-court-${suffix}`, prosecutionId=`phase6-prosecution-${suffix}`, caseId=`phase6-case-${suffix}`, hearingId=`phase6-hearing-${suffix}`;
try {
  const requiredTables=['legal_holds','retention_policies','retention_previews','evidence_exports','evidence_export_items','access_review_campaigns','access_review_items','production_readiness_snapshots'];
  const found=await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name=any($1::text[])`,[requiredTables]);
  if(found.rowCount!==requiredTables.length) throw new Error('Missing Phase 6 tables.');
  await client.query('begin');
  await client.query(`insert into organizations(id,organization_code,name,organization_type) values($1,$2,'Phase 6 Court','COURT'),($3,$4,'Phase 6 Prosecution','PROSECUTION')`,[courtId,`C6-${suffix}`,prosecutionId,`P6-${suffix}`]);
  await client.query(`insert into court_cases(id,case_number,normalized_case_number,case_classification,case_type_code,case_title,court_organization_id,prosecution_organization_id,data_source,created_by,updated_by) values($1,$2,$3,'SPECIAL_CRIMINAL','PID.SUS','Phase 6 smoke',$4,$5,'MANUAL','phase6','phase6')`,[caseId,`601/Pid.Sus/${suffix}`,`601/PID.SUS/${suffix}`.toUpperCase(),courtId,prosecutionId]);
  await client.query(`insert into hearings(id,case_id,case_number,hearing_type,state,hearing_sequence,intake_status,data_source,court_organization_id,prosecution_organization_id,defendant_custody_status,created_by,updated_by) values($1,$2,$3,'PEMERIKSAAN_SAKSI','DRAFT',1,'ACTIVE','MANUAL',$4,$5,'NOT_DETAINED','phase6','phase6')`,[hearingId,caseId,`601/Pid.Sus/${suffix}`,courtId,prosecutionId]);
  await client.query(`insert into hearing_assignments(hearing_id,organization_id) values($1,$2),($1,$3)`,[hearingId,courtId,prosecutionId]);
  const hold=await client.query(`insert into legal_holds(hearing_id,hold_type,reason,official_reference,created_by) values($1,'AUDIT','Phase 6 audit hold',$2,'reviewer-a') returning id`,[hearingId,`REF-${suffix}`]);
  let duplicateBlocked=false; await client.query('savepoint duplicate_hold');
  try{await client.query(`insert into legal_holds(hearing_id,hold_type,reason,official_reference,created_by) values($1,'AUDIT','Duplicate',$2,'reviewer-b')`,[hearingId,`REF-${suffix}`]);}
  catch(error){duplicateBlocked=error?.code==='23505';await client.query('rollback to savepoint duplicate_hold');}
  await client.query('release savepoint duplicate_hold'); if(!duplicateBlocked) throw new Error('Duplicate active legal hold was not blocked.');
  let releaseGuard=false; await client.query('savepoint hold_release_guard');
  try{await client.query(`update legal_holds set reason='tamper' where id=$1`,[hold.rows[0].id]);}
  catch{releaseGuard=true;await client.query('rollback to savepoint hold_release_guard');}
  await client.query('release savepoint hold_release_guard'); if(!releaseGuard) throw new Error('Legal hold lifecycle guard was not enforced.');
  const preview=await client.query(`insert into retention_previews(hearing_id,eligibility_status,active_legal_hold_count,eligible_for_review,requested_by,snapshot) values($1,'ON_HOLD',1,false,'auditor','{}') returning id`,[hearingId]);
  let previewImmutable=false; await client.query('savepoint preview_immutable');
  try{await client.query(`update retention_previews set eligibility_status='NOT_DUE' where id=$1`,[preview.rows[0].id]);}
  catch{previewImmutable=true;await client.query('rollback to savepoint preview_immutable');}
  await client.query('release savepoint preview_immutable'); if(!previewImmutable) throw new Error('Retention preview immutability was not enforced.');
  const exp=await client.query(`insert into evidence_exports(hearing_id,export_format,status,requested_by) values($1,'JSON','PROCESSING','auditor') returning id`,[hearingId]);
  const item=await client.query(`insert into evidence_export_items(export_id,sequence,category,record_count,content_hash) values($1,1,'HEARING',1,repeat('a',64)) returning id`,[exp.rows[0].id]);
  let itemImmutable=false; await client.query('savepoint item_immutable');
  try{await client.query(`delete from evidence_export_items where id=$1`,[item.rows[0].id]);}
  catch{itemImmutable=true;await client.query('rollback to savepoint item_immutable');}
  await client.query('release savepoint item_immutable'); if(!itemImmutable) throw new Error('Evidence item immutability was not enforced.');
  const campaign=await client.query(`insert into access_review_campaigns(campaign_name,hearing_id,created_by,due_at) values('Phase 6',$1,'reviewer-a',now()+interval '1 day') returning id`,[hearingId]);
  const reviewItem=await client.query(`insert into access_review_items(campaign_id,hearing_id,subject_user_id,assignment_role) values($1,$2,'subject-a','COURT_CLERK') returning id`,[campaign.rows[0].id,hearingId]);
  await client.query(`update access_review_items set status='KEPT',decision_reason='still required',reviewed_by='reviewer-b',reviewed_at=now() where id=$1`,[reviewItem.rows[0].id]);
  let secondDecisionBlocked=false; await client.query('savepoint second_decision');
  try{await client.query(`update access_review_items set status='REVOKED',decision_reason='changed',reviewed_by='reviewer-c',reviewed_at=now() where id=$1`,[reviewItem.rows[0].id]);}
  catch{secondDecisionBlocked=true;await client.query('rollback to savepoint second_decision');}
  await client.query('release savepoint second_decision'); if(!secondDecisionBlocked) throw new Error('Second access-review decision was not blocked.');
  await client.query('rollback');
  const policy=await client.query(`select enabled,retention_days,disposition_action from retention_policies where policy_code='CIMS_HEARING_REVIEW_ONLY'`);
  if(!policy.rowCount || policy.rows[0].enabled || policy.rows[0].retention_days!==null || policy.rows[0].disposition_action!=='REVIEW_ONLY') throw new Error('Default retention policy is unsafe.');
  console.log(JSON.stringify({status:'PASS',required_tables:requiredTables.length,duplicate_hold:'PASS',retention_preview_immutable:'PASS',evidence_item_immutable:'PASS',legal_hold_transition_guard:'PASS',access_review_single_decision:'PASS',retention_execution:'DISABLED'},null,2));
} finally { await client.query('rollback').catch(()=>undefined); await client.end(); }
