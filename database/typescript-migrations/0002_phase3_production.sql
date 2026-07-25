
-- CIMS v0.16.0 production-hardening migration
create extension if not exists pgcrypto;

create table if not exists api_idempotency_keys (
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (scope, idempotency_key)
);
create index if not exists idx_idempotency_expiry on api_idempotency_keys(expires_at);

create table if not exists outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','PUBLISHED','FAILED')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_outbox_dispatch on outbox_events(status,next_attempt_at,created_at);

create table if not exists hearing_participants (
  id uuid primary key default gen_random_uuid(),
  hearing_id text not null,
  organization_id text,
  role text not null check (role in ('JUDGE','COURT_CLERK','PROSECUTOR','DEFENDANT','ADVOCATE','WITNESS','EXPERT','INTERPRETER','CORRECTIONS_OFFICER','IT_OPERATOR')),
  display_name_encrypted bytea not null,
  display_name_search_hash text,
  alias text,
  protected_identity boolean not null default false,
  contact_email_encrypted bytea,
  state text not null default 'REGISTERED' check (state in ('REGISTERED','TOKEN_ISSUED','WAITING','ADMITTED','LEFT','REMOVED','REVOKED')),
  row_version bigint not null default 1,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_participant_hearing_state on hearing_participants(hearing_id,state) where deleted_at is null;
create index if not exists idx_participant_org on hearing_participants(organization_id) where deleted_at is null;

create table if not exists participant_access_tokens (
  id uuid primary key default gen_random_uuid(),
  hearing_id text not null,
  participant_id uuid not null references hearing_participants(id),
  token_hash text not null unique,
  fingerprint text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  check (consumed_at is null or revoked_at is null)
);
create index if not exists idx_access_token_active on participant_access_tokens(participant_id,expires_at) where consumed_at is null and revoked_at is null;

create table if not exists participant_sessions (
  id uuid primary key default gen_random_uuid(),
  hearing_id text not null,
  participant_id uuid not null references hearing_participants(id),
  provider_participant_ref text,
  virtual_room_code text not null check (virtual_room_code in ('WAITING','MAIN','DEFENDANT','WITNESS','CONSULTATION')),
  state text not null check (state in ('WAITING','ADMITTED','LEFT','REMOVED')),
  joined_waiting_at timestamptz,
  admitted_at timestamptz,
  admitted_by text,
  left_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_participant_session_active on participant_sessions(hearing_id,state,created_at desc);

create table if not exists attendance_events (
  id uuid primary key default gen_random_uuid(),
  hearing_id text not null,
  participant_id uuid not null references hearing_participants(id),
  event_type text not null,
  room_code text,
  source text not null,
  provider_event_id text,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload_hash text,
  unique(provider_event_id)
);
create index if not exists idx_attendance_timeline on attendance_events(hearing_id,occurred_at,id);

create table if not exists consultation_sessions (
  id uuid primary key default gen_random_uuid(),
  hearing_id text not null,
  defendant_participant_id uuid not null references hearing_participants(id),
  advocate_participant_id uuid not null references hearing_participants(id),
  state text not null check (state in ('ACTIVE','ENDED')),
  recording_allowed boolean not null default false check (recording_allowed = false),
  started_by text not null,
  started_at timestamptz not null default now(),
  ended_by text,
  ended_at timestamptz
);
create unique index if not exists uq_active_consultation_per_hearing on consultation_sessions(hearing_id) where state='ACTIVE';

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  hearing_id text not null,
  incident_type text not null check (incident_type in ('TECHNICAL','CYBER','FORCE_MAJEURE')),
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','MITIGATING','RESOLVED','CLOSED')),
  title text not null,
  description_encrypted bytea not null,
  occurred_at timestamptz not null,
  notification_deadline timestamptz,
  notified_at timestamptz,
  notification_reference text,
  resolution_encrypted bytea,
  reported_by text not null,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_incident_open on incidents(hearing_id,status,severity,occurred_at desc);
create index if not exists idx_incident_notification_deadline on incidents(notification_deadline) where notified_at is null and status in ('OPEN','MITIGATING');

create table if not exists incident_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id),
  action_type text not null,
  notes_encrypted bytea,
  actor_user_id text not null,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_incident_action_timeline on incident_actions(incident_id,occurred_at,id);

create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null,
  actor_user_id text,
  source_ip inet,
  correlation_id text,
  object_type text,
  object_id text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_security_event_time on security_events(occurred_at desc);
create index if not exists idx_security_event_actor on security_events(actor_user_id,occurred_at desc);

-- Row level security context is set per transaction by the API.
alter table hearing_participants enable row level security;
alter table incidents enable row level security;

drop policy if exists participant_org_scope on hearing_participants;
create policy participant_org_scope on hearing_participants
using (
  current_setting('cims.is_system_admin', true) = 'true'
  or organization_id = any(string_to_array(current_setting('cims.organization_ids', true), ','))
  or hearing_id = any(string_to_array(current_setting('cims.hearing_assignments', true), ','))
);

drop policy if exists incident_hearing_scope on incidents;
create policy incident_hearing_scope on incidents
using (
  current_setting('cims.is_system_admin', true) = 'true'
  or hearing_id = any(string_to_array(current_setting('cims.hearing_assignments', true), ','))
);

-- Immutability protections.
create or replace function cims_block_mutation() returns trigger language plpgsql as $$ begin raise exception 'CIMS append-only table cannot be updated or deleted'; end $$;
drop trigger if exists trg_attendance_immutable on attendance_events;
create trigger trg_attendance_immutable before update or delete on attendance_events for each row execute function cims_block_mutation();
drop trigger if exists trg_incident_actions_immutable on incident_actions;
create trigger trg_incident_actions_immutable before update or delete on incident_actions for each row execute function cims_block_mutation();
drop trigger if exists trg_security_events_immutable on security_events;
create trigger trg_security_events_immutable before update or delete on security_events for each row execute function cims_block_mutation();
