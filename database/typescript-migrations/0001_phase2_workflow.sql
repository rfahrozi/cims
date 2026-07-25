-- CIMS TypeScript migration target baseline 0.15.0
-- Development source currently uses InMemoryStore. This PostgreSQL DDL is the repository target.
create table if not exists official_notices (
  id uuid primary key,
  hearing_id uuid not null,
  schedule_id uuid not null,
  notice_type text not null,
  subject text not null,
  message text not null,
  official_reference text not null,
  sender_organization_id uuid not null,
  created_by uuid not null,
  status text not null check (status in ('DRAFT','SENT','PARTIAL','FAILED','ACKNOWLEDGED','CANCELLED')),
  created_at timestamptz not null,
  sent_at timestamptz
);
create table if not exists notice_recipients (
  id uuid primary key,
  notice_id uuid not null references official_notices(id),
  recipient_user_id uuid,
  recipient_organization_id uuid,
  recipient_name text not null,
  destination text not null,
  preferred_channel text not null check (preferred_channel in ('EMAIL','WHATSAPP','SMS','IN_APP')),
  required_ack boolean not null default true,
  ack_deadline timestamptz,
  status text not null check (status in ('PENDING','DELIVERED','FAILED','ACKNOWLEDGED'))
);
create table if not exists notice_delivery_attempts (
  id uuid primary key,
  recipient_id uuid not null references notice_recipients(id),
  attempt_number integer not null,
  channel text not null,
  status text not null,
  provider_reference text,
  evidence_json jsonb not null,
  error_code text,
  attempted_at timestamptz not null,
  unique(recipient_id, attempt_number)
);
create table if not exists notice_acknowledgments (
  id uuid primary key,
  recipient_id uuid not null unique references notice_recipients(id),
  acknowledged_by uuid not null,
  acknowledgment_method text not null,
  receipt_reference text not null,
  acknowledged_at timestamptz not null
);
create table if not exists identity_verifications (
  id uuid primary key, hearing_id uuid not null, organization_id uuid not null,
  participant_reference text not null, method text not null, result text not null check(result in ('PASS','FAIL')),
  notes text, verified_by uuid not null, verified_at timestamptz not null
);
create table if not exists room_inspections (
  id uuid primary key, hearing_id uuid not null, organization_id uuid not null, location_code text not null,
  camera_full_view boolean not null, unauthorized_person_absent boolean not null, confidentiality_ready boolean not null,
  result text not null check(result in ('PASS','FAIL')), notes text, inspected_by uuid not null, inspected_at timestamptz not null
);
create table if not exists readiness_submissions (
  id uuid primary key, hearing_id uuid not null, organization_id uuid not null, organization_type text not null,
  version integer not null, location_code text not null, status text not null check(status in ('READY','NOT_READY')),
  submitted_by uuid not null, submitted_at timestamptz not null,
  unique(hearing_id, organization_id, version)
);
create table if not exists readiness_items (
  id uuid primary key, submission_id uuid not null references readiness_submissions(id), item_code text not null,
  required boolean not null, result text not null check(result in ('PASS','FAIL','NA')), notes text
);
create table if not exists technical_tests (
  id uuid primary key, submission_id uuid not null unique references readiness_submissions(id),
  camera text not null, microphone text not null, audio text not null, primary_network text not null,
  backup_network text not null, provider_access text not null, tested_at timestamptz not null
);
create table if not exists virtual_sessions (
  id uuid primary key, hearing_id uuid not null, schedule_id uuid not null, provider_code text not null,
  provider_session_reference text, state text not null check(state in ('REQUESTED','READY','FAILED','CANCELLED')),
  recording_policy text not null, failure_code text, created_by uuid not null, created_at timestamptz not null, updated_at timestamptz not null
);
create unique index if not exists uq_virtual_ready_per_hearing on virtual_sessions(hearing_id) where state in ('REQUESTED','READY');
create table if not exists virtual_rooms (
  id uuid primary key, virtual_session_id uuid not null references virtual_sessions(id), room_code text not null,
  room_type text not null, provider_room_reference text not null, recording_allowed boolean not null,
  unique(virtual_session_id, room_code)
);
create table if not exists hearing_runtime (
  id uuid primary key, hearing_id uuid not null unique, virtual_session_id uuid not null references virtual_sessions(id),
  state text not null check(state in ('READY','STARTED','SUSPENDED','ENDED','POSTPONED')),
  started_by uuid, started_at timestamptz, suspended_by uuid, suspended_at timestamptz, suspension_reason text,
  ended_by uuid, ended_at timestamptz, updated_at timestamptz not null
);
create table if not exists hearing_control_events (
  id uuid primary key, hearing_id uuid not null, sequence integer not null, event_type text not null,
  reason text, actor_user_id uuid not null, occurred_at timestamptz not null,
  unique(hearing_id, sequence)
);
