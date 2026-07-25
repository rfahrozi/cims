-- CIMS Sprint 10-12 PostgreSQL migration baseline.
-- Apply only after backup and migration rehearsal.

alter table audit_events add column if not exists previous_hash text;
alter table audit_events add column if not exists event_hash text;
create unique index if not exists uq_audit_event_hash on audit_events(event_hash) where event_hash is not null;

create table if not exists auth_security_state (
  user_id uuid primary key references users(id) on delete cascade,
  failed_password_attempts integer not null default 0,
  failed_otp_attempts integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists appeal_decision_readings (
  id uuid primary key,
  case_reference_id uuid not null references case_references(id),
  version integer not null,
  scheduled_at timestamptz not null,
  display_timezone text not null,
  delivery_mode text not null check(delivery_mode in ('DIRECT','ELECTRONIC','HYBRID')),
  determination_reference text not null,
  virtual_session_reference text,
  status text not null check(status in ('SCHEDULED','SUPERSEDED','READ','POSTPONED','CANCELLED')),
  reschedule_reason text,
  read_at timestamptz,
  open_to_public boolean,
  cassation_deadline_at timestamptz,
  deadline_policy_code text,
  created_by uuid not null references users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique(case_reference_id, version)
);
create unique index if not exists uq_active_appeal_reading on appeal_decision_readings(case_reference_id) where status='SCHEDULED';

create table if not exists appeal_notice_steps (
  sequence bigserial primary key,
  id uuid not null unique,
  reading_id uuid not null references appeal_decision_readings(id) on delete cascade,
  step_code text not null,
  sender_organization_id uuid not null references organizations(id),
  recipient_reference text not null,
  channel text not null,
  official_reference text not null,
  status text not null,
  sent_at timestamptz not null,
  acknowledged_at timestamptz,
  receipt_reference text,
  actor_user_id uuid not null references users(id),
  correlation_id text not null,
  unique(reading_id, step_code, recipient_reference)
);

create table if not exists appeal_presence_records (
  id uuid primary key,
  reading_id uuid not null references appeal_decision_readings(id) on delete cascade,
  party_role text not null,
  party_reference text not null,
  attendance_status text not null,
  attendance_mode text not null,
  verified_by uuid not null references users(id),
  verified_at timestamptz not null,
  unique(reading_id, party_role, party_reference)
);

create table if not exists appeal_publications (
  id uuid primary key,
  reading_id uuid not null unique references appeal_decision_readings(id) on delete cascade,
  excerpt_reference text not null,
  source_system_code text not null,
  published_at timestamptz not null,
  published_by uuid not null references users(id),
  same_day_compliant boolean not null,
  document_hash text
);

create table if not exists appeal_transmissions (
  id uuid primary key,
  reading_id uuid not null unique references appeal_decision_readings(id) on delete cascade,
  destination_court_reference text not null,
  transmission_reference text not null,
  transmitted_at timestamptz not null,
  transmitted_by uuid not null references users(id),
  seven_day_compliant boolean not null,
  document_hash text
);

create table if not exists reconciliation_runs (
  id uuid primary key,
  source_system_code text not null,
  status text not null,
  total_records integer not null default 0,
  matched_records integer not null default 0,
  mismatch_records integer not null default 0,
  missing_records integer not null default 0,
  started_by uuid not null references users(id),
  started_at timestamptz not null,
  completed_at timestamptz,
  correlation_id text not null
);

create table if not exists reconciliation_items (
  id uuid primary key,
  run_id uuid not null references reconciliation_runs(id) on delete cascade,
  external_case_id text not null,
  local_case_reference_id uuid references case_references(id),
  result text not null,
  differences_json jsonb not null default '{}'::jsonb,
  source_hash text,
  local_hash text,
  checked_at timestamptz not null
);
create index if not exists idx_reconciliation_items_run on reconciliation_items(run_id, result);
