-- PostgreSQL migration for Sprint 8-9.
create table if not exists hearing_participants (
  id uuid primary key,
  hearing_id uuid not null references hearings(id),
  participant_reference varchar(160) not null,
  display_name varchar(240) not null,
  participant_role varchar(40) not null,
  user_id uuid references users(id),
  organization_id uuid references organizations(id),
  protected_identity boolean not null default false,
  public_alias varchar(240),
  default_room_code varchar(80) not null,
  status varchar(20) not null default 'REGISTERED',
  created_by uuid not null references users(id),
  created_at timestamptz not null,
  unique(hearing_id, participant_reference)
);
create index if not exists idx_participants_hearing on hearing_participants(hearing_id, status);

create table if not exists participant_access_tokens (
  id uuid primary key,
  participant_id uuid not null references hearing_participants(id),
  virtual_session_id uuid not null references virtual_sessions(id),
  room_id uuid not null references virtual_rooms(id),
  provider_access_reference varchar(240) not null,
  token_hash char(64) not null unique,
  token_fingerprint varchar(24) not null,
  state varchar(20) not null,
  expires_at timestamptz not null,
  issued_by uuid not null references users(id),
  issued_at timestamptz not null,
  exchanged_at timestamptz,
  revoked_at timestamptz
);
create index if not exists idx_access_participant_state on participant_access_tokens(participant_id, state, expires_at);

create table if not exists participant_sessions (
  id uuid primary key,
  participant_id uuid not null references hearing_participants(id),
  virtual_session_id uuid not null references virtual_sessions(id),
  provider_access_reference varchar(240) not null,
  current_room_id uuid not null references virtual_rooms(id),
  previous_room_id uuid references virtual_rooms(id),
  state varchar(24) not null,
  joined_at timestamptz,
  admitted_at timestamptz,
  left_at timestamptz,
  updated_at timestamptz not null,
  unique(participant_id, virtual_session_id)
);

create table if not exists attendance_events (
  sequence bigserial primary key,
  id uuid not null unique,
  hearing_id uuid not null references hearings(id),
  participant_id uuid not null references hearing_participants(id),
  event_type varchar(40) not null,
  room_id uuid references virtual_rooms(id),
  actor_user_id uuid references users(id),
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);
create index if not exists idx_attendance_hearing on attendance_events(hearing_id, sequence);

create table if not exists hearing_runtime (
  id uuid primary key,
  hearing_id uuid not null unique references hearings(id),
  virtual_session_id uuid not null references virtual_sessions(id),
  state varchar(24) not null,
  started_by uuid references users(id),
  started_at timestamptz,
  suspended_by uuid references users(id),
  suspended_at timestamptz,
  suspension_reason text,
  ended_by uuid references users(id),
  ended_at timestamptz,
  updated_at timestamptz not null
);

create table if not exists hearing_control_events (
  sequence bigserial primary key,
  id uuid not null unique,
  hearing_id uuid not null references hearings(id),
  event_type varchar(24) not null,
  reason text,
  actor_user_id uuid not null references users(id),
  occurred_at timestamptz not null
);

create table if not exists consultation_sessions (
  id uuid primary key,
  hearing_id uuid not null references hearings(id),
  virtual_session_id uuid not null references virtual_sessions(id),
  consultation_room_id uuid not null references virtual_rooms(id),
  state varchar(20) not null,
  reason text not null,
  authorized_by uuid not null references users(id),
  started_at timestamptz not null,
  ended_by uuid references users(id),
  ended_at timestamptz
);
create unique index if not exists uq_active_consultation on consultation_sessions(hearing_id) where state='ACTIVE';

create table if not exists consultation_participants (
  consultation_id uuid not null references consultation_sessions(id) on delete cascade,
  participant_id uuid not null references hearing_participants(id),
  previous_room_id uuid not null references virtual_rooms(id),
  primary key(consultation_id, participant_id)
);

create table if not exists incidents (
  id uuid primary key,
  hearing_id uuid references hearings(id),
  incident_type varchar(24) not null,
  severity varchar(16) not null,
  status varchar(20) not null,
  summary text not null,
  details text,
  reported_by uuid not null references users(id),
  reported_at timestamptz not null,
  notification_due_at timestamptz,
  notified_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  auto_suspended boolean not null default false,
  correlation_id varchar(160) not null
);
create index if not exists idx_incidents_hearing_status on incidents(hearing_id, status, incident_type);

create table if not exists incident_actions (
  sequence bigserial primary key,
  id uuid not null unique,
  incident_id uuid not null references incidents(id) on delete cascade,
  action_type varchar(24) not null,
  notes text,
  actor_user_id uuid not null references users(id),
  occurred_at timestamptz not null
);
