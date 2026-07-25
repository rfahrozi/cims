-- CIMS Compliance MVP baseline schema
-- PostgreSQL 15+
-- This script is a design baseline and must be reviewed by DBA and security before execution.

create extension if not exists pgcrypto;

create type determination_decision as enum ('APPROVED','REJECTED');
create type hearing_mode as enum ('IN_PERSON','ELECTRONIC','HYBRID');
create type schedule_status as enum ('ACTIVE','SUPERSEDED','CANCELLED');
create type proposal_status as enum ('DRAFT','CHECKED','APPROVED','REJECTED','EXPIRED');
create type notice_status as enum ('DRAFT','SENT','PARTIALLY_ACKNOWLEDGED','ACKNOWLEDGED','FAILED','ESCALATED');
create type readiness_status as enum ('INCOMPLETE','FAILED','PASSED');
create type virtual_session_state as enum ('PROVISIONING','READY','STARTED','SUSPENDED','ENDED','FAILED','CANCELLED');
create type incident_type as enum ('TECHNICAL','CYBER','FORCE_MAJEURE');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  code varchar(64) not null unique,
  name varchar(255) not null,
  organization_type varchar(64) not null,
  timezone varchar(64) not null default 'Asia/Jakarta',
  status varchar(32) not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  identity_subject varchar(255) not null unique,
  organization_id uuid not null references organizations(id),
  display_name varchar(255) not null,
  email_reference varchar(255),
  status varchar(32) not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  code varchar(64) not null unique,
  name varchar(128) not null
);

create table user_roles (
  user_id uuid not null references users(id),
  role_id uuid not null references roles(id),
  organization_id uuid not null references organizations(id),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  primary key (user_id, role_id, organization_id, valid_from)
);

create table case_references (
  id uuid primary key default gen_random_uuid(),
  source_system_code varchar(64) not null,
  external_case_id varchar(255) not null,
  case_number varchar(255) not null,
  case_type varchar(128),
  owning_organization_id uuid not null references organizations(id),
  reconciliation_status varchar(32) not null default 'PENDING',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_system_code, external_case_id)
);

create table hearings (
  id uuid primary key default gen_random_uuid(),
  case_reference_id uuid not null references case_references(id),
  hearing_type varchar(128) not null,
  state varchar(64) not null default 'DRAFT',
  owning_organization_id uuid not null references organizations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hearing_assignments (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  user_id uuid references users(id),
  organization_id uuid not null references organizations(id),
  assignment_role varchar(64) not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  unique (hearing_id, organization_id, assignment_role, user_id, valid_from)
);

create table electronic_hearing_requests (
  id uuid primary key default gen_random_uuid(),
  case_reference_id uuid not null references case_references(id),
  requested_mode hearing_mode not null,
  reason text not null,
  status varchar(32) not null default 'SUBMITTED',
  requested_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table judicial_determinations (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  version integer not null,
  decision determination_decision not null,
  mode hearing_mode not null,
  reason text,
  effective_at timestamptz not null,
  official_reference varchar(255) not null,
  document_hash char(64) not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (hearing_id, version)
);

create index idx_determination_hearing_effective on judicial_determinations(hearing_id, effective_at desc);

create table schedule_proposals (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  version integer not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  display_timezone varchar(64) not null,
  status proposal_status not null default 'DRAFT',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  unique (hearing_id, version)
);

create table schedule_constraints (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references schedule_proposals(id) on delete cascade,
  resource_type varchar(64) not null,
  resource_reference varchar(255) not null,
  requirement varchar(16) not null check (requirement in ('REQUIRED','PREFERRED')),
  constraint_payload jsonb not null default '{}'::jsonb
);

create table schedule_conflicts (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references schedule_proposals(id) on delete cascade,
  rule_code varchar(128) not null,
  severity varchar(16) not null check (severity in ('INFO','WARNING','REQUIRED')),
  resource_type varchar(64),
  resource_reference varchar(255),
  message text not null,
  resolution_options jsonb not null default '[]'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references users(id),
  resolution_note text
);

create table hearing_schedules (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  proposal_id uuid references schedule_proposals(id),
  version integer not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  display_timezone varchar(64) not null,
  status schedule_status not null,
  approved_by uuid not null references users(id),
  approval_reason text not null,
  basis_reference varchar(255),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  unique (hearing_id, version)
);

create unique index uq_one_active_schedule_per_hearing
  on hearing_schedules(hearing_id)
  where status = 'ACTIVE';

create table official_notices (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  schedule_id uuid references hearing_schedules(id),
  notice_type varchar(64) not null,
  sender_organization_id uuid not null references organizations(id),
  document_reference varchar(255) not null,
  status notice_status not null default 'DRAFT',
  message text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table notice_recipients (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references official_notices(id) on delete cascade,
  sequence_no integer not null,
  recipient_type varchar(32) not null,
  recipient_reference varchar(255) not null,
  organization_id uuid references organizations(id),
  official_channel varchar(64),
  unique (notice_id, sequence_no)
);

create table notice_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notice_recipient_id uuid not null references notice_recipients(id) on delete cascade,
  provider_code varchar(64) not null,
  attempt_no integer not null,
  sent_at timestamptz,
  delivery_status varchar(32) not null,
  provider_message_reference varchar(255),
  proof_reference varchar(255),
  error_code varchar(128),
  error_message text,
  created_at timestamptz not null default now(),
  unique (notice_recipient_id, attempt_no)
);

create table notice_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  notice_recipient_id uuid not null references notice_recipients(id),
  acknowledged_by uuid not null references users(id),
  method varchar(64) not null,
  proof_reference varchar(255),
  acknowledged_at timestamptz not null default now(),
  unique (notice_recipient_id)
);

create table readiness_submissions (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  organization_id uuid not null references organizations(id),
  location_reference varchar(255) not null,
  status readiness_status not null default 'INCOMPLETE',
  submitted_by uuid not null references users(id),
  submitted_at timestamptz not null default now(),
  unique (hearing_id, organization_id, location_reference)
);

create table readiness_items (
  id uuid primary key default gen_random_uuid(),
  readiness_submission_id uuid not null references readiness_submissions(id) on delete cascade,
  item_code varchar(128) not null,
  mandatory boolean not null,
  result varchar(24) not null check (result in ('PASS','FAIL','NOT_APPLICABLE')),
  evidence_reference varchar(255),
  note text,
  unique (readiness_submission_id, item_code)
);

create table technical_tests (
  id uuid primary key default gen_random_uuid(),
  readiness_submission_id uuid not null references readiness_submissions(id) on delete cascade,
  latency_ms numeric(10,2),
  jitter_ms numeric(10,2),
  packet_loss_percent numeric(5,2),
  download_mbps numeric(10,2),
  upload_mbps numeric(10,2),
  audio_result varchar(16),
  video_result varchar(16),
  provider_access_result varchar(16),
  tested_at timestamptz not null default now(),
  tested_by uuid not null references users(id)
);

create table identity_verifications (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  participant_reference varchar(255) not null,
  verification_method varchar(64) not null,
  result varchar(16) not null,
  location_reference varchar(255),
  verified_by uuid not null references users(id),
  verified_at timestamptz not null default now()
);

create table room_inspections (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  location_reference varchar(255) not null,
  sterile boolean not null,
  camera_view_pass boolean not null,
  persons_present jsonb not null default '[]'::jsonb,
  irregularities text,
  inspected_by uuid not null references users(id),
  inspected_at timestamptz not null default now()
);

create table virtual_sessions (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references hearings(id),
  schedule_id uuid not null references hearing_schedules(id),
  provider_code varchar(64) not null,
  provider_session_reference varchar(255),
  room_template_code varchar(64) not null,
  recording_policy varchar(64) not null,
  state virtual_session_state not null default 'PROVISIONING',
  health_status varchar(32) not null default 'UNKNOWN',
  provisioned_at timestamptz,
  created_at timestamptz not null default now()
);

create table virtual_rooms (
  id uuid primary key default gen_random_uuid(),
  virtual_session_id uuid not null references virtual_sessions(id) on delete cascade,
  room_code varchar(64) not null,
  room_type varchar(32) not null,
  provider_room_reference varchar(255),
  recording_allowed boolean not null default false,
  unique (virtual_session_id, room_code)
);

create table participant_join_tokens (
  id uuid primary key default gen_random_uuid(),
  virtual_session_id uuid not null references virtual_sessions(id) on delete cascade,
  virtual_room_id uuid not null references virtual_rooms(id),
  participant_reference varchar(255) not null,
  participant_role varchar(64) not null,
  token_hash char(64) not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoke_reason text,
  issued_at timestamptz not null default now()
);

create index idx_join_token_session_participant on participant_join_tokens(virtual_session_id, participant_reference);

create table hearing_events (
  id bigserial primary key,
  hearing_id uuid not null references hearings(id),
  virtual_session_id uuid references virtual_sessions(id),
  event_type varchar(64) not null,
  actor_user_id uuid references users(id),
  reason text,
  payload jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  occurred_at timestamptz not null default now()
);

create table attendance_events (
  id bigserial primary key,
  hearing_id uuid not null references hearings(id),
  participant_reference varchar(255) not null,
  event_type varchar(32) not null check (event_type in ('JOINED','LEFT','ADMITTED','MOVED','REMOVED')),
  room_code varchar(64),
  provider_event_reference varchar(255),
  occurred_at timestamptz not null,
  unique (provider_event_reference)
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid references hearings(id),
  incident_type incident_type not null,
  severity varchar(16) not null,
  status varchar(32) not null default 'OPEN',
  title varchar(255) not null,
  description text not null,
  detected_at timestamptz not null,
  notification_due_at timestamptz,
  evidence_manifest jsonb not null default '[]'::jsonb,
  owner_organization_id uuid references organizations(id),
  closed_at timestamptz
);

create table official_record_references (
  id uuid primary key default gen_random_uuid(),
  case_reference_id uuid not null references case_references(id),
  hearing_id uuid references hearings(id),
  record_type varchar(64) not null,
  source_system_code varchar(64) not null,
  external_record_id varchar(255) not null,
  official_reference varchar(255) not null,
  document_hash char(64),
  classification varchar(64),
  retention_code varchar(64),
  created_at timestamptz not null default now(),
  unique (source_system_code, external_record_id)
);

create table audit_events (
  id bigserial primary key,
  actor_user_id uuid references users(id),
  actor_role varchar(64),
  actor_organization_id uuid references organizations(id),
  action varchar(128) not null,
  object_type varchar(128) not null,
  object_id varchar(255) not null,
  reason text,
  before_value jsonb,
  after_value jsonb,
  correlation_id uuid not null,
  source_ip inet,
  user_agent_hash char(64),
  occurred_at timestamptz not null default now()
);

create index idx_audit_object on audit_events(object_type, object_id, occurred_at desc);
create index idx_audit_correlation on audit_events(correlation_id);

-- Gate view. Service layer must also enforce authorization and state rules.
create view hearing_gate_status as
select
  h.id as hearing_id,
  exists (
    select 1 from judicial_determinations jd
    where jd.hearing_id = h.id
      and jd.decision = 'APPROVED'
      and jd.mode in ('ELECTRONIC','HYBRID')
      and jd.effective_at <= now()
  ) as has_valid_determination,
  exists (
    select 1 from hearing_schedules hs
    where hs.hearing_id = h.id and hs.status = 'ACTIVE'
  ) as has_active_schedule
from hearings h;

-- Recommended production controls not fully represented in DDL:
-- row-level security, partitioning of audit and event tables, retention jobs,
-- trusted timestamp, key management, immutable audit storage, and legal hold.
