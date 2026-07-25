-- Sprint 0-3 PostgreSQL additions. Apply after 0001_cims_baseline.sql.
create table if not exists schedule_proposal_resources (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references schedule_proposals(id) on delete cascade,
  resource_type varchar(64) not null,
  resource_reference varchar(255) not null,
  requirement varchar(16) not null check(requirement in ('REQUIRED','PREFERRED')),
  unique(proposal_id, resource_type, resource_reference)
);
create table if not exists hearing_schedule_resources (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references hearing_schedules(id) on delete cascade,
  resource_type varchar(64) not null,
  resource_reference varchar(255) not null,
  requirement varchar(16) not null check(requirement in ('REQUIRED','PREFERRED')),
  unique(schedule_id, resource_type, resource_reference)
);
create index if not exists idx_hearing_schedule_resource on hearing_schedule_resources(resource_type, resource_reference);
create table if not exists idempotency_records (
  actor_user_id uuid not null references users(id),
  idempotency_key varchar(128) not null,
  request_hash char(64) not null,
  status_code integer not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor_user_id, idempotency_key)
);
