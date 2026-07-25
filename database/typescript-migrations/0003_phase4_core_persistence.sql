-- CIMS v0.17.0 core workflow persistence and operational outbox
-- This migration completes PostgreSQL persistence for the workflow modules that remained in memory in v0.16.0.
create extension if not exists pgcrypto;


-- Legacy Phase 2 tables used UUID identifiers without database defaults.
-- Repositories now rely on database-generated identifiers in PostgreSQL mode.
alter table if exists official_notices alter column id set default gen_random_uuid();
alter table if exists notice_recipients alter column id set default gen_random_uuid();
alter table if exists notice_delivery_attempts alter column id set default gen_random_uuid();
alter table if exists notice_acknowledgments alter column id set default gen_random_uuid();
alter table if exists identity_verifications alter column id set default gen_random_uuid();
alter table if exists room_inspections alter column id set default gen_random_uuid();
alter table if exists readiness_submissions alter column id set default gen_random_uuid();
alter table if exists readiness_items alter column id set default gen_random_uuid();
alter table if exists technical_tests alter column id set default gen_random_uuid();
alter table if exists virtual_sessions alter column id set default gen_random_uuid();
alter table if exists virtual_rooms alter column id set default gen_random_uuid();
alter table if exists hearing_runtime alter column id set default gen_random_uuid();
alter table if exists hearing_control_events alter column id set default gen_random_uuid();

create table if not exists schema_migrations (
  version text primary key,
  checksum_sha256 text not null,
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);

-- Normalize cross-module identifiers as text. Production values should still be UUID-formatted.
alter table if exists official_notices alter column hearing_id type text using hearing_id::text;
alter table if exists official_notices alter column schedule_id type text using schedule_id::text;
alter table if exists official_notices alter column sender_organization_id type text using sender_organization_id::text;
alter table if exists official_notices alter column created_by type text using created_by::text;
alter table if exists notice_recipients alter column recipient_user_id type text using recipient_user_id::text;
alter table if exists notice_recipients alter column recipient_organization_id type text using recipient_organization_id::text;
alter table if exists notice_acknowledgments alter column acknowledged_by type text using acknowledged_by::text;
alter table if exists identity_verifications alter column hearing_id type text using hearing_id::text;
alter table if exists identity_verifications alter column organization_id type text using organization_id::text;
alter table if exists identity_verifications alter column verified_by type text using verified_by::text;
alter table if exists room_inspections alter column hearing_id type text using hearing_id::text;
alter table if exists room_inspections alter column organization_id type text using organization_id::text;
alter table if exists room_inspections alter column inspected_by type text using inspected_by::text;
alter table if exists readiness_submissions alter column hearing_id type text using hearing_id::text;
alter table if exists readiness_submissions alter column organization_id type text using organization_id::text;
alter table if exists readiness_submissions alter column submitted_by type text using submitted_by::text;
alter table if exists virtual_sessions alter column hearing_id type text using hearing_id::text;
alter table if exists virtual_sessions alter column schedule_id type text using schedule_id::text;
alter table if exists virtual_sessions alter column created_by type text using created_by::text;
alter table if exists hearing_runtime alter column hearing_id type text using hearing_id::text;
alter table if exists hearing_runtime alter column started_by type text using started_by::text;
alter table if exists hearing_runtime alter column suspended_by type text using suspended_by::text;
alter table if exists hearing_runtime alter column ended_by type text using ended_by::text;
alter table if exists hearing_control_events alter column hearing_id type text using hearing_id::text;
alter table if exists hearing_control_events alter column actor_user_id type text using actor_user_id::text;

create table if not exists organizations (
  id text primary key default gen_random_uuid()::text,
  organization_code text not null unique,
  name text not null,
  organization_type text not null check (organization_type in ('COURT','PROSECUTION','CORRECTIONS')),
  active boolean not null default true,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hearings (
  id text primary key default gen_random_uuid()::text,
  case_number text not null unique,
  hearing_type text not null,
  state text not null default 'DRAFT',
  official_case_reference text,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hearing_assignments (
  hearing_id text not null references hearings(id),
  organization_id text not null references organizations(id),
  assignment_type text not null default 'PARTICIPATING',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (hearing_id, organization_id)
);
create index if not exists idx_hearing_assignments_org on hearing_assignments(organization_id, hearing_id) where active;

create table if not exists electronic_hearing_requests (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id),
  requested_mode text not null check (requested_mode in ('ELECTRONIC','HYBRID')),
  reason text not null,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','REVIEWED','CANCELLED')),
  created_by text not null,
  row_version bigint not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_electronic_request_hearing on electronic_hearing_requests(hearing_id, created_at desc);

create table if not exists judicial_determinations (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id),
  version integer not null,
  decision text not null check (decision in ('APPROVED','REJECTED')),
  official_reference text not null,
  reason text not null,
  is_current boolean not null default true,
  created_by text not null,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  unique (hearing_id, version)
);
create unique index if not exists uq_current_determination_per_hearing on judicial_determinations(hearing_id) where is_current;

create table if not exists schedule_proposals (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  display_timezone text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','CHECKED','APPROVED','REJECTED','CANCELLED')),
  created_by text not null,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists idx_schedule_proposal_hearing on schedule_proposals(hearing_id, created_at desc);

create table if not exists schedule_proposal_resources (
  id text primary key default gen_random_uuid()::text,
  proposal_id text not null references schedule_proposals(id) on delete cascade,
  resource_type text not null check (resource_type in ('JUDGE','ROOM','PROSECUTOR','CORRECTIONS')),
  resource_id text not null,
  requirement text not null check (requirement in ('REQUIRED','PREFERRED')),
  unique (proposal_id, resource_type, resource_id)
);

create table if not exists schedule_conflicts (
  id text primary key default gen_random_uuid()::text,
  proposal_id text not null references schedule_proposals(id) on delete cascade,
  conflict_code text not null,
  severity text not null check (severity in ('REQUIRED','WARNING')),
  message text not null,
  resource_type text,
  resource_id text,
  detected_at timestamptz not null default now()
);
create index if not exists idx_schedule_conflict_proposal on schedule_conflicts(proposal_id, severity);

create table if not exists hearing_schedules (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id),
  version integer not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  display_timezone text not null,
  status text not null check (status in ('ACTIVE','SUPERSEDED','CANCELLED')),
  approval_reason text not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  row_version bigint not null default 1,
  unique (hearing_id, version),
  check (end_at > start_at)
);
create unique index if not exists uq_active_schedule_per_hearing on hearing_schedules(hearing_id) where status='ACTIVE';
create index if not exists idx_active_schedule_window on hearing_schedules(start_at, end_at) where status='ACTIVE';

create table if not exists hearing_schedule_resources (
  id text primary key default gen_random_uuid()::text,
  schedule_id text not null references hearing_schedules(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  requirement text not null,
  unique (schedule_id, resource_type, resource_id)
);
create index if not exists idx_schedule_resource_overlap on hearing_schedule_resources(resource_type, resource_id, schedule_id);

alter table if exists official_notices
  add column if not exists row_version bigint not null default 1;
alter table if exists notice_recipients
  add column if not exists row_version bigint not null default 1;
alter table if exists readiness_submissions
  add column if not exists row_version bigint not null default 1;
alter table if exists virtual_sessions
  add column if not exists row_version bigint not null default 1;
alter table if exists hearing_runtime
  add column if not exists row_version bigint not null default 1;

create table if not exists audit_events (
  id text primary key default gen_random_uuid()::text,
  object_type text not null,
  object_id text not null,
  sequence bigint not null,
  event_type text not null,
  actor_user_id text,
  actor_organization_id text,
  correlation_id text,
  payload jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  occurred_at timestamptz not null default now(),
  unique (object_type, object_id, sequence)
);
create index if not exists idx_audit_object_timeline on audit_events(object_type, object_id, sequence);
create index if not exists idx_audit_correlation on audit_events(correlation_id) where correlation_id is not null;

create table if not exists video_provider_operations (
  idempotency_key text primary key,
  provider_code text not null,
  operation_type text not null,
  request_hash text not null,
  status text not null check (status in ('PROCESSING','SUCCEEDED','FAILED')),
  provider_reference text,
  response_payload jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_video_provider_operation_status on video_provider_operations(status, updated_at);

create table if not exists provider_webhook_events (
  id text primary key,
  provider_code text not null,
  event_type text not null,
  provider_session_reference text,
  signature_valid boolean not null,
  payload_hash text not null,
  payload jsonb not null,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'RECEIVED' check (processing_status in ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  last_error text
);
create index if not exists idx_provider_webhook_processing on provider_webhook_events(processing_status, received_at);

create table if not exists reconciliation_runs (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id),
  source_system text not null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','PROCESSING','COMPLETED','FAILED')),
  requested_by text not null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  matched_count integer not null default 0,
  mismatch_count integer not null default 0,
  missing_count integer not null default 0,
  last_error text
);
create index if not exists idx_reconciliation_hearing on reconciliation_runs(hearing_id, requested_at desc);

create table if not exists reconciliation_items (
  id text primary key default gen_random_uuid()::text,
  run_id text not null references reconciliation_runs(id) on delete cascade,
  field_path text not null,
  cims_value jsonb,
  source_value jsonb,
  result text not null check (result in ('MATCHED','MISMATCH','MISSING_IN_CIMS','MISSING_IN_SOURCE')),
  created_at timestamptz not null default now()
);
create index if not exists idx_reconciliation_item_result on reconciliation_items(run_id, result);

alter table if exists outbox_events
  add column if not exists correlation_id text,
  add column if not exists traceparent text,
  add column if not exists dead_lettered_at timestamptz;
alter table if exists outbox_events drop constraint if exists outbox_events_status_check;
alter table if exists outbox_events add constraint outbox_events_status_check check (status in ('PENDING','PROCESSING','PUBLISHED','FAILED','DEAD_LETTER'));

-- RLS is enforced with transaction-local settings set by PgPoolService.transactionAs().
alter table hearings enable row level security;
alter table electronic_hearing_requests enable row level security;
alter table judicial_determinations enable row level security;
alter table schedule_proposals enable row level security;
alter table hearing_schedules enable row level security;
alter table official_notices enable row level security;
alter table readiness_submissions enable row level security;
alter table virtual_sessions enable row level security;
alter table hearing_runtime enable row level security;
alter table audit_events enable row level security;
alter table reconciliation_runs enable row level security;

create or replace function cims_hearing_allowed(target_hearing_id text) returns boolean
language sql stable as $$
  select current_setting('cims.is_system_admin', true) = 'true'
    or target_hearing_id = any(string_to_array(coalesce(current_setting('cims.hearing_assignments', true), ''), ','));
$$;

drop policy if exists hearing_scope on hearings;
create policy hearing_scope on hearings using (cims_hearing_allowed(id)) with check (cims_hearing_allowed(id));

do $$
declare table_name text;
begin
  foreach table_name in array array['electronic_hearing_requests','judicial_determinations','schedule_proposals','hearing_schedules','official_notices','readiness_submissions','virtual_sessions','hearing_runtime','reconciliation_runs']
  loop
    execute format('drop policy if exists hearing_scope on %I', table_name);
    execute format('create policy hearing_scope on %I using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id))', table_name);
  end loop;
end $$;

drop policy if exists audit_scope on audit_events;
create policy audit_scope on audit_events
using (current_setting('cims.is_system_admin', true) = 'true' or object_type <> 'HEARING' or cims_hearing_allowed(object_id))
with check (current_setting('cims.is_system_admin', true) = 'true' or object_type <> 'HEARING' or cims_hearing_allowed(object_id));

-- Extend RLS to Phase 2 and Phase 3 child tables.
alter table notice_recipients enable row level security;
alter table notice_delivery_attempts enable row level security;
alter table notice_acknowledgments enable row level security;
alter table identity_verifications enable row level security;
alter table room_inspections enable row level security;
alter table readiness_items enable row level security;
alter table technical_tests enable row level security;
alter table virtual_rooms enable row level security;
alter table hearing_control_events enable row level security;
alter table participant_access_tokens enable row level security;
alter table participant_sessions enable row level security;
alter table attendance_events enable row level security;
alter table consultation_sessions enable row level security;
alter table incident_actions enable row level security;

-- Child-table policies resolve hearing scope through their parent.
drop policy if exists notice_recipient_scope on notice_recipients;
create policy notice_recipient_scope on notice_recipients using (exists(select 1 from official_notices n where n.id=notice_id and cims_hearing_allowed(n.hearing_id))) with check (exists(select 1 from official_notices n where n.id=notice_id and cims_hearing_allowed(n.hearing_id)));
drop policy if exists delivery_attempt_scope on notice_delivery_attempts;
create policy delivery_attempt_scope on notice_delivery_attempts using (exists(select 1 from notice_recipients r join official_notices n on n.id=r.notice_id where r.id=recipient_id and cims_hearing_allowed(n.hearing_id))) with check (exists(select 1 from notice_recipients r join official_notices n on n.id=r.notice_id where r.id=recipient_id and cims_hearing_allowed(n.hearing_id)));
drop policy if exists acknowledgment_scope on notice_acknowledgments;
create policy acknowledgment_scope on notice_acknowledgments using (exists(select 1 from notice_recipients r join official_notices n on n.id=r.notice_id where r.id=recipient_id and cims_hearing_allowed(n.hearing_id))) with check (exists(select 1 from notice_recipients r join official_notices n on n.id=r.notice_id where r.id=recipient_id and cims_hearing_allowed(n.hearing_id)));
drop policy if exists identity_scope on identity_verifications;
create policy identity_scope on identity_verifications using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
drop policy if exists room_inspection_scope on room_inspections;
create policy room_inspection_scope on room_inspections using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
drop policy if exists readiness_item_scope on readiness_items;
create policy readiness_item_scope on readiness_items using (exists(select 1 from readiness_submissions s where s.id=submission_id and cims_hearing_allowed(s.hearing_id))) with check (exists(select 1 from readiness_submissions s where s.id=submission_id and cims_hearing_allowed(s.hearing_id)));
drop policy if exists technical_test_scope on technical_tests;
create policy technical_test_scope on technical_tests using (exists(select 1 from readiness_submissions s where s.id=submission_id and cims_hearing_allowed(s.hearing_id))) with check (exists(select 1 from readiness_submissions s where s.id=submission_id and cims_hearing_allowed(s.hearing_id)));
drop policy if exists virtual_room_scope on virtual_rooms;
create policy virtual_room_scope on virtual_rooms using (exists(select 1 from virtual_sessions s where s.id=virtual_session_id and cims_hearing_allowed(s.hearing_id))) with check (exists(select 1 from virtual_sessions s where s.id=virtual_session_id and cims_hearing_allowed(s.hearing_id)));
drop policy if exists hearing_control_scope on hearing_control_events;
create policy hearing_control_scope on hearing_control_events using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));

-- Participant and incident child-table policies.
drop policy if exists participant_token_scope on participant_access_tokens;
create policy participant_token_scope on participant_access_tokens
using (current_setting('cims.token_exchange', true) = 'true' or cims_hearing_allowed(hearing_id))
with check (current_setting('cims.token_exchange', true) = 'true' or cims_hearing_allowed(hearing_id));
drop policy if exists participant_session_scope on participant_sessions;
create policy participant_session_scope on participant_sessions using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
drop policy if exists attendance_scope on attendance_events;
create policy attendance_scope on attendance_events using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
drop policy if exists consultation_scope on consultation_sessions;
create policy consultation_scope on consultation_sessions using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
drop policy if exists incident_action_scope on incident_actions;
create policy incident_action_scope on incident_actions
using (exists(select 1 from incidents i where i.id=incident_id and cims_hearing_allowed(i.hearing_id)))
with check (exists(select 1 from incidents i where i.id=incident_id and cims_hearing_allowed(i.hearing_id)));

-- Append-only protections.
drop trigger if exists trg_audit_events_immutable on audit_events;
create trigger trg_audit_events_immutable before update or delete on audit_events for each row execute function cims_block_mutation();
drop trigger if exists trg_hearing_control_events_immutable on hearing_control_events;
create trigger trg_hearing_control_events_immutable before update or delete on hearing_control_events for each row execute function cims_block_mutation();
drop trigger if exists trg_delivery_attempts_immutable on notice_delivery_attempts;
create trigger trg_delivery_attempts_immutable before update or delete on notice_delivery_attempts for each row execute function cims_block_mutation();
drop trigger if exists trg_acknowledgments_immutable on notice_acknowledgments;
create trigger trg_acknowledgments_immutable before update or delete on notice_acknowledgments for each row execute function cims_block_mutation();
