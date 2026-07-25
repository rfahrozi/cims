begin;
create table if not exists official_notices (
 id uuid primary key, hearing_id uuid not null references hearings(id), schedule_id uuid not null references hearing_schedules(id),
 notice_type varchar(80) not null, subject text not null, message text not null, official_reference varchar(160) not null,
 sender_organization_id uuid not null references organizations(id), created_by uuid not null references users(id),
 status varchar(24) not null check(status in ('DRAFT','SENT','PARTIAL','ACKNOWLEDGED','FAILED','CANCELLED')),
 created_at timestamptz not null, sent_at timestamptz, unique(official_reference, hearing_id));
create table if not exists notice_recipients (
 id uuid primary key, notice_id uuid not null references official_notices(id) on delete cascade, recipient_user_id uuid references users(id),
 recipient_organization_id uuid references organizations(id), recipient_name text not null, destination text not null,
 preferred_channel varchar(20) not null, required_ack boolean not null default true, ack_deadline timestamptz,
 status varchar(24) not null, unique(notice_id,destination));
create table if not exists notice_delivery_attempts (
 id uuid primary key, recipient_id uuid not null references notice_recipients(id) on delete cascade, attempt_number int not null,
 channel varchar(20) not null, status varchar(20) not null, provider_reference text, evidence_json jsonb not null default '{}'::jsonb,
 error_code text, attempted_at timestamptz not null, unique(recipient_id,attempt_number));
create table if not exists notice_acknowledgments (
 id uuid primary key, recipient_id uuid not null unique references notice_recipients(id), acknowledged_by uuid not null references users(id),
 acknowledgment_method varchar(40) not null, receipt_reference text not null, acknowledged_at timestamptz not null);
create table if not exists identity_verifications (
 id uuid primary key, hearing_id uuid not null references hearings(id), organization_id uuid not null references organizations(id),
 participant_reference text not null, method text not null, result varchar(10) not null, notes text, verified_by uuid not null references users(id), verified_at timestamptz not null);
create table if not exists room_inspections (
 id uuid primary key, hearing_id uuid not null references hearings(id), organization_id uuid not null references organizations(id), location_code text not null,
 camera_full_view boolean not null, unauthorized_person_absent boolean not null, confidentiality_ready boolean not null,
 result varchar(10) not null, notes text, inspected_by uuid not null references users(id), inspected_at timestamptz not null);
create table if not exists readiness_submissions (
 id uuid primary key, hearing_id uuid not null references hearings(id), organization_id uuid not null references organizations(id), version int not null,
 location_code text not null, status varchar(16) not null, submitted_by uuid not null references users(id), submitted_at timestamptz not null,
 unique(hearing_id,organization_id,version));
create table if not exists readiness_items (
 id uuid primary key, submission_id uuid not null references readiness_submissions(id) on delete cascade, item_code varchar(80) not null,
 required boolean not null, result varchar(10) not null, notes text, unique(submission_id,item_code));
create table if not exists technical_tests (
 id uuid primary key, submission_id uuid not null unique references readiness_submissions(id) on delete cascade,
 camera varchar(10) not null, microphone varchar(10) not null, audio varchar(10) not null, primary_network varchar(10) not null,
 backup_network varchar(10) not null, provider_access varchar(10) not null, tested_at timestamptz not null);
create table if not exists virtual_sessions (
 id uuid primary key, hearing_id uuid not null references hearings(id), schedule_id uuid not null references hearing_schedules(id),
 provider_code varchar(80) not null, provider_session_reference text, state varchar(20) not null,
 recording_policy varchar(30) not null, failure_code text, created_by uuid not null references users(id), created_at timestamptz not null, updated_at timestamptz not null);
create unique index if not exists uq_active_virtual_session on virtual_sessions(hearing_id) where state in ('REQUESTED','READY');
create table if not exists virtual_rooms (
 id uuid primary key, virtual_session_id uuid not null references virtual_sessions(id) on delete cascade, room_code varchar(80) not null,
 room_type varchar(30) not null, provider_room_reference text not null, recording_allowed boolean not null, unique(virtual_session_id,room_code));
create table if not exists provider_webhook_events (
 event_id uuid primary key, provider_code varchar(80) not null, event_type varchar(100) not null, provider_session_reference text,
 payload_json jsonb not null, occurred_at timestamptz not null, received_at timestamptz not null);
commit;
