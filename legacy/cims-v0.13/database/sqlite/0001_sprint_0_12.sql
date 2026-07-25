PRAGMA foreign_keys = ON;

create table if not exists organizations (
  id text primary key,
  code text not null unique,
  name text not null,
  type text not null,
  created_at text not null
);

create table if not exists users (
  id text primary key,
  organization_id text not null references organizations(id),
  email text not null unique,
  name text not null,
  password_hash text not null,
  otp_secret text not null,
  status text not null check(status in ('ACTIVE','DISABLED','LOCKED')),
  created_at text not null
);

create table if not exists roles (
  code text primary key,
  name text not null
);

create table if not exists permissions (
  code text primary key,
  description text
);

create table if not exists role_permissions (
  role_code text not null references roles(code),
  permission_code text not null references permissions(code),
  primary key(role_code, permission_code)
);

create table if not exists user_roles (
  user_id text not null references users(id),
  role_code text not null references roles(code),
  organization_id text not null references organizations(id),
  valid_from text not null,
  valid_until text,
  primary key(user_id, role_code, organization_id, valid_from)
);

create table if not exists auth_challenges (
  id text primary key,
  user_id text not null references users(id),
  expires_at text not null,
  used_at text,
  created_at text not null
);

create table if not exists delegations (
  id text primary key,
  user_id text not null references users(id),
  hearing_id text not null,
  permission_code text not null,
  valid_from text not null,
  valid_until text not null,
  granted_by text not null references users(id),
  created_at text not null
);

create table if not exists case_references (
  id text primary key,
  source_system_code text not null,
  external_case_id text not null,
  case_number text not null,
  case_type text,
  owning_organization_id text not null references organizations(id),
  reconciliation_status text not null,
  last_synced_at text,
  created_at text not null,
  unique(source_system_code, external_case_id)
);

create table if not exists hearings (
  id text primary key,
  case_reference_id text not null references case_references(id),
  hearing_type text not null,
  state text not null,
  owning_organization_id text not null references organizations(id),
  created_at text not null,
  updated_at text not null
);

create table if not exists hearing_assignments (
  id text primary key,
  hearing_id text not null references hearings(id),
  user_id text references users(id),
  organization_id text not null references organizations(id),
  assignment_role text not null,
  valid_from text not null,
  valid_until text
);

create index if not exists idx_hearing_assignments_user on hearing_assignments(user_id, hearing_id);

create table if not exists electronic_hearing_requests (
  id text primary key,
  case_reference_id text not null references case_references(id),
  requested_mode text not null check(requested_mode in ('ELECTRONIC','HYBRID')),
  reason text not null,
  evidence_references_json text not null default '[]',
  status text not null check(status in ('SUBMITTED','UNDER_REVIEW','DECIDED','WITHDRAWN')),
  requested_by text not null references users(id),
  created_at text not null
);

create table if not exists judicial_determinations (
  id text primary key,
  hearing_id text not null references hearings(id),
  version integer not null,
  decision text not null check(decision in ('APPROVED','REJECTED')),
  mode text not null check(mode in ('IN_PERSON','ELECTRONIC','HYBRID')),
  reason text,
  effective_at text not null,
  official_reference text not null,
  document_hash text not null check(length(document_hash)=64),
  created_by text not null references users(id),
  created_at text not null,
  unique(hearing_id, version),
  unique(official_reference, document_hash)
);

create index if not exists idx_determination_hearing on judicial_determinations(hearing_id, version desc);

create table if not exists resource_catalog (
  id text primary key,
  resource_type text not null,
  organization_id text references organizations(id),
  code text not null,
  name text not null,
  status text not null,
  unique(resource_type, code)
);

create table if not exists schedule_proposals (
  id text primary key,
  hearing_id text not null references hearings(id),
  version integer not null,
  start_at text not null,
  end_at text not null,
  display_timezone text not null,
  notes text,
  status text not null check(status in ('DRAFT','CHECKED','APPROVED','REJECTED','EXPIRED')),
  created_by text not null references users(id),
  created_at text not null,
  unique(hearing_id, version)
);

create table if not exists schedule_proposal_resources (
  id text primary key,
  proposal_id text not null references schedule_proposals(id) on delete cascade,
  resource_type text not null,
  resource_reference text not null,
  requirement text not null check(requirement in ('REQUIRED','PREFERRED')),
  unique(proposal_id, resource_type, resource_reference)
);

create table if not exists schedule_constraints (
  id text primary key,
  resource_type text not null,
  resource_reference text not null,
  blocked_from text not null,
  blocked_until text not null,
  severity text not null check(severity in ('WARNING','REQUIRED')),
  reason text not null,
  created_at text not null
);

create table if not exists schedule_conflicts (
  id text primary key,
  proposal_id text not null references schedule_proposals(id) on delete cascade,
  rule_code text not null,
  severity text not null check(severity in ('INFO','WARNING','REQUIRED')),
  resource_type text,
  resource_reference text,
  message text not null,
  resolution_options_json text not null default '[]',
  resolved_at text,
  resolved_by text references users(id),
  resolution_note text
);

create table if not exists hearing_schedules (
  id text primary key,
  hearing_id text not null references hearings(id),
  proposal_id text references schedule_proposals(id),
  version integer not null,
  start_at text not null,
  end_at text not null,
  display_timezone text not null,
  status text not null check(status in ('ACTIVE','SUPERSEDED','CANCELLED')),
  approved_by text not null references users(id),
  approval_reason text not null,
  basis_reference text,
  created_at text not null,
  unique(hearing_id, version)
);

create unique index if not exists uq_one_active_schedule_per_hearing on hearing_schedules(hearing_id) where status='ACTIVE';

create table if not exists hearing_schedule_resources (
  id text primary key,
  schedule_id text not null references hearing_schedules(id) on delete cascade,
  resource_type text not null,
  resource_reference text not null,
  requirement text not null check(requirement in ('REQUIRED','PREFERRED')),
  unique(schedule_id, resource_type, resource_reference)
);

create index if not exists idx_schedule_resource on hearing_schedule_resources(resource_type, resource_reference);
create index if not exists idx_active_schedule_window on hearing_schedules(status, start_at, end_at);

create table if not exists idempotency_records (
  actor_user_id text not null,
  idempotency_key text not null,
  request_hash text not null,
  status_code integer not null,
  response_json text not null,
  created_at text not null,
  primary key(actor_user_id, idempotency_key)
);

create table if not exists audit_events (
  sequence integer primary key autoincrement,
  id text not null unique,
  event_type text not null,
  actor_user_id text,
  actor_organization_id text,
  object_type text not null,
  object_id text not null,
  correlation_id text not null,
  payload_json text not null,
  previous_hash text not null,
  event_hash text not null unique,
  occurred_at text not null
);

create trigger if not exists audit_events_no_update before update on audit_events
begin select raise(abort, 'audit_events are append-only'); end;
create trigger if not exists audit_events_no_delete before delete on audit_events
begin select raise(abort, 'audit_events are append-only'); end;


create table if not exists official_notices (
  id text primary key,
  hearing_id text not null references hearings(id),
  schedule_id text not null references hearing_schedules(id),
  notice_type text not null,
  subject text not null,
  message text not null,
  official_reference text not null,
  sender_organization_id text not null references organizations(id),
  created_by text not null references users(id),
  status text not null check(status in ('DRAFT','SENT','PARTIAL','ACKNOWLEDGED','FAILED','CANCELLED')),
  created_at text not null,
  sent_at text,
  unique(official_reference, hearing_id)
);
create table if not exists notice_recipients (
  id text primary key,
  notice_id text not null references official_notices(id) on delete cascade,
  recipient_user_id text references users(id),
  recipient_organization_id text references organizations(id),
  recipient_name text not null,
  destination text not null,
  preferred_channel text not null check(preferred_channel in ('EMAIL','WHATSAPP','SMS','IN_APP')),
  required_ack integer not null default 1 check(required_ack in (0,1)),
  ack_deadline text,
  status text not null check(status in ('PENDING','SENT','DELIVERED','ACKNOWLEDGED','FAILED')),
  unique(notice_id, destination)
);
create table if not exists notice_delivery_attempts (
  id text primary key,
  recipient_id text not null references notice_recipients(id) on delete cascade,
  attempt_number integer not null,
  channel text not null,
  status text not null check(status in ('SENT','DELIVERED','FAILED')),
  provider_reference text,
  evidence_json text not null default '{}',
  error_code text,
  attempted_at text not null,
  unique(recipient_id, attempt_number)
);
create table if not exists notice_acknowledgments (
  id text primary key,
  recipient_id text not null unique references notice_recipients(id),
  acknowledged_by text not null references users(id),
  acknowledgment_method text not null,
  receipt_reference text not null,
  acknowledged_at text not null
);
create index if not exists idx_notice_hearing on official_notices(hearing_id, status);

create table if not exists identity_verifications (
  id text primary key,
  hearing_id text not null references hearings(id),
  organization_id text not null references organizations(id),
  participant_reference text not null,
  method text not null,
  result text not null check(result in ('PASS','FAIL')),
  notes text,
  verified_by text not null references users(id),
  verified_at text not null
);
create table if not exists room_inspections (
  id text primary key,
  hearing_id text not null references hearings(id),
  organization_id text not null references organizations(id),
  location_code text not null,
  camera_full_view integer not null check(camera_full_view in (0,1)),
  unauthorized_person_absent integer not null check(unauthorized_person_absent in (0,1)),
  confidentiality_ready integer not null check(confidentiality_ready in (0,1)),
  result text not null check(result in ('PASS','FAIL')),
  notes text,
  inspected_by text not null references users(id),
  inspected_at text not null
);
create table if not exists readiness_submissions (
  id text primary key,
  hearing_id text not null references hearings(id),
  organization_id text not null references organizations(id),
  version integer not null,
  location_code text not null,
  status text not null check(status in ('READY','NOT_READY')),
  submitted_by text not null references users(id),
  submitted_at text not null,
  unique(hearing_id, organization_id, version)
);
create table if not exists readiness_items (
  id text primary key,
  submission_id text not null references readiness_submissions(id) on delete cascade,
  item_code text not null,
  required integer not null check(required in (0,1)),
  result text not null check(result in ('PASS','FAIL','NA')),
  notes text,
  unique(submission_id, item_code)
);
create table if not exists technical_tests (
  id text primary key,
  submission_id text not null unique references readiness_submissions(id) on delete cascade,
  camera text not null check(camera in ('PASS','FAIL')),
  microphone text not null check(microphone in ('PASS','FAIL')),
  audio text not null check(audio in ('PASS','FAIL')),
  primary_network text not null check(primary_network in ('PASS','FAIL')),
  backup_network text not null check(backup_network in ('PASS','FAIL','NA')),
  provider_access text not null check(provider_access in ('PASS','FAIL')),
  tested_at text not null
);
create index if not exists idx_readiness_hearing_org on readiness_submissions(hearing_id, organization_id, version desc);

create table if not exists virtual_sessions (
  id text primary key,
  hearing_id text not null references hearings(id),
  schedule_id text not null references hearing_schedules(id),
  provider_code text not null,
  provider_session_reference text,
  state text not null check(state in ('REQUESTED','READY','FAILED','CANCELLED')),
  recording_policy text not null check(recording_policy in ('DISABLED','COURT_CONTROLLED')),
  failure_code text,
  created_by text not null references users(id),
  created_at text not null,
  updated_at text not null
);
create unique index if not exists uq_active_virtual_session on virtual_sessions(hearing_id) where state in ('REQUESTED','READY');
create table if not exists virtual_rooms (
  id text primary key,
  virtual_session_id text not null references virtual_sessions(id) on delete cascade,
  room_code text not null,
  room_type text not null check(room_type in ('MAIN','WAITING','DEFENDANT','WITNESS','CONSULTATION')),
  provider_room_reference text not null,
  recording_allowed integer not null check(recording_allowed in (0,1)),
  unique(virtual_session_id, room_code)
);
create table if not exists provider_webhook_events (
  event_id text primary key,
  provider_code text not null,
  event_type text not null,
  provider_session_reference text,
  payload_json text not null,
  occurred_at text not null,
  received_at text not null
);

-- Sprint 8-9: participant access, hearing control, attendance, consultation and incidents.
create table if not exists hearing_participants (
  id text primary key,
  hearing_id text not null references hearings(id),
  participant_reference text not null,
  display_name text not null,
  contact_email text,
  participant_role text not null check(participant_role in ('JUDGE','COURT_CLERK','PROSECUTOR','CORRECTIONS','DEFENDANT','ADVOCATE','WITNESS','EXPERT','INTERPRETER','OTHER')),
  user_id text references users(id),
  organization_id text references organizations(id),
  protected_identity integer not null default 0 check(protected_identity in (0,1)),
  public_alias text,
  default_room_code text not null,
  status text not null check(status in ('REGISTERED','INACTIVE')),
  created_by text not null references users(id),
  created_at text not null,
  unique(hearing_id, participant_reference)
);
create index if not exists idx_participants_hearing on hearing_participants(hearing_id, status);

create table if not exists participant_access_tokens (
  id text primary key,
  participant_id text not null references hearing_participants(id),
  virtual_session_id text not null references virtual_sessions(id),
  room_id text not null references virtual_rooms(id),
  provider_access_reference text not null,
  token_hash text not null unique,
  token_fingerprint text not null,
  state text not null check(state in ('ISSUED','EXCHANGED','REVOKED','EXPIRED')),
  expires_at text not null,
  issued_by text not null references users(id),
  issued_at text not null,
  exchanged_at text,
  revoked_at text
);
create index if not exists idx_access_participant_state on participant_access_tokens(participant_id, state, expires_at);

create table if not exists participant_sessions (
  id text primary key,
  participant_id text not null references hearing_participants(id),
  virtual_session_id text not null references virtual_sessions(id),
  provider_access_reference text not null,
  current_room_id text not null references virtual_rooms(id),
  previous_room_id text references virtual_rooms(id),
  state text not null check(state in ('INVITED','WAITING','ADMITTED','CONSULTATION','LEFT','REMOVED')),
  joined_at text,
  admitted_at text,
  left_at text,
  updated_at text not null,
  unique(participant_id, virtual_session_id)
);

create table if not exists attendance_events (
  sequence integer primary key autoincrement,
  id text not null unique,
  hearing_id text not null references hearings(id),
  participant_id text not null references hearing_participants(id),
  event_type text not null check(event_type in ('TOKEN_ISSUED','JOINED_WAITING','ADMITTED','MOVED','LEFT','REMOVED','CONSULTATION_STARTED','CONSULTATION_ENDED')),
  room_id text references virtual_rooms(id),
  actor_user_id text references users(id),
  metadata_json text not null default '{}',
  occurred_at text not null
);
create index if not exists idx_attendance_hearing on attendance_events(hearing_id, sequence);
create trigger if not exists attendance_events_no_update before update on attendance_events
begin select raise(abort, 'attendance_events are append-only'); end;
create trigger if not exists attendance_events_no_delete before delete on attendance_events
begin select raise(abort, 'attendance_events are append-only'); end;

create table if not exists hearing_runtime (
  id text primary key,
  hearing_id text not null unique references hearings(id),
  virtual_session_id text not null references virtual_sessions(id),
  state text not null check(state in ('READY','STARTED','SUSPENDED','ENDED','POSTPONED')),
  started_by text references users(id),
  started_at text,
  suspended_by text references users(id),
  suspended_at text,
  suspension_reason text,
  ended_by text references users(id),
  ended_at text,
  updated_at text not null
);

create table if not exists hearing_control_events (
  sequence integer primary key autoincrement,
  id text not null unique,
  hearing_id text not null references hearings(id),
  event_type text not null check(event_type in ('READY','STARTED','SUSPENDED','RESUMED','ENDED','POSTPONED')),
  reason text,
  actor_user_id text not null references users(id),
  occurred_at text not null
);
create trigger if not exists hearing_control_events_no_update before update on hearing_control_events
begin select raise(abort, 'hearing_control_events are append-only'); end;
create trigger if not exists hearing_control_events_no_delete before delete on hearing_control_events
begin select raise(abort, 'hearing_control_events are append-only'); end;

create table if not exists consultation_sessions (
  id text primary key,
  hearing_id text not null references hearings(id),
  virtual_session_id text not null references virtual_sessions(id),
  consultation_room_id text not null references virtual_rooms(id),
  state text not null check(state in ('ACTIVE','ENDED','CANCELLED')),
  reason text not null,
  authorized_by text not null references users(id),
  started_at text not null,
  ended_by text references users(id),
  ended_at text
);
create unique index if not exists uq_active_consultation on consultation_sessions(hearing_id) where state='ACTIVE';

create table if not exists consultation_participants (
  consultation_id text not null references consultation_sessions(id) on delete cascade,
  participant_id text not null references hearing_participants(id),
  previous_room_id text not null references virtual_rooms(id),
  primary key(consultation_id, participant_id)
);

create table if not exists incidents (
  id text primary key,
  hearing_id text references hearings(id),
  incident_type text not null check(incident_type in ('TECHNICAL','CYBER','FORCE_MAJEURE')),
  severity text not null check(severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null check(status in ('OPEN','MITIGATING','RESOLVED','CLOSED')),
  summary text not null,
  details text,
  reported_by text not null references users(id),
  reported_at text not null,
  notification_due_at text,
  notified_at text,
  resolved_at text,
  resolution text,
  auto_suspended integer not null default 0 check(auto_suspended in (0,1)),
  correlation_id text not null
);
create index if not exists idx_incidents_hearing_status on incidents(hearing_id, status, incident_type);

create table if not exists incident_actions (
  sequence integer primary key autoincrement,
  id text not null unique,
  incident_id text not null references incidents(id) on delete cascade,
  action_type text not null check(action_type in ('CREATED','MITIGATION','NOTIFIED','ESCALATED','RESOLVED','CLOSED')),
  notes text,
  actor_user_id text not null references users(id),
  occurred_at text not null
);
create trigger if not exists incident_actions_no_update before update on incident_actions
begin select raise(abort, 'incident_actions are append-only'); end;
create trigger if not exists incident_actions_no_delete before delete on incident_actions
begin select raise(abort, 'incident_actions are append-only'); end;


-- Sprint 10-12: appeal decision reading, reconciliation and security hardening.
create table if not exists auth_security_state (
  user_id text primary key references users(id) on delete cascade,
  failed_password_attempts integer not null default 0,
  failed_otp_attempts integer not null default 0,
  locked_until text,
  last_failed_at text,
  updated_at text not null
);

create table if not exists official_record_references (
  id text primary key,
  case_reference_id text not null references case_references(id),
  record_type text not null,
  source_system_code text not null,
  external_record_id text not null,
  official_reference text not null,
  document_hash text,
  recorded_at text not null,
  unique(source_system_code, external_record_id)
);
create index if not exists idx_official_record_case on official_record_references(case_reference_id, record_type);

create table if not exists appeal_decision_readings (
  id text primary key,
  case_reference_id text not null references case_references(id),
  version integer not null,
  scheduled_at text not null,
  display_timezone text not null,
  delivery_mode text not null check(delivery_mode in ('DIRECT','ELECTRONIC','HYBRID')),
  determination_reference text not null,
  virtual_session_reference text,
  status text not null check(status in ('SCHEDULED','SUPERSEDED','READ','POSTPONED','CANCELLED')),
  reschedule_reason text,
  read_at text,
  open_to_public integer check(open_to_public in (0,1)),
  cassation_deadline_at text,
  deadline_policy_code text,
  created_by text not null references users(id),
  created_at text not null,
  updated_at text not null,
  unique(case_reference_id, version)
);
create unique index if not exists uq_active_appeal_reading on appeal_decision_readings(case_reference_id) where status='SCHEDULED';

create table if not exists appeal_notice_steps (
  sequence integer primary key autoincrement,
  id text not null unique,
  reading_id text not null references appeal_decision_readings(id) on delete cascade,
  step_code text not null check(step_code in ('COURT_TO_PROSECUTION','PROSECUTION_TO_DEFENDANT','PROSECUTION_TO_ADVOCATE','CORRECTIONS_TO_DEFENDANT')),
  sender_organization_id text not null references organizations(id),
  recipient_reference text not null,
  channel text not null,
  official_reference text not null,
  status text not null check(status in ('SENT','DELIVERED','ACKNOWLEDGED','FAILED')),
  sent_at text not null,
  acknowledged_at text,
  receipt_reference text,
  actor_user_id text not null references users(id),
  correlation_id text not null,
  unique(reading_id, step_code, recipient_reference)
);

create table if not exists appeal_presence_records (
  id text primary key,
  reading_id text not null references appeal_decision_readings(id) on delete cascade,
  party_role text not null check(party_role in ('DEFENDANT','PROSECUTOR','ADVOCATE')),
  party_reference text not null,
  attendance_status text not null check(attendance_status in ('PRESENT','ABSENT')),
  attendance_mode text not null check(attendance_mode in ('DIRECT','ELECTRONIC','NOT_APPLICABLE')),
  verified_by text not null references users(id),
  verified_at text not null,
  unique(reading_id, party_role, party_reference)
);

create table if not exists appeal_publications (
  id text primary key,
  reading_id text not null unique references appeal_decision_readings(id) on delete cascade,
  excerpt_reference text not null,
  source_system_code text not null,
  published_at text not null,
  published_by text not null references users(id),
  same_day_compliant integer not null check(same_day_compliant in (0,1)),
  document_hash text
);

create table if not exists appeal_transmissions (
  id text primary key,
  reading_id text not null unique references appeal_decision_readings(id) on delete cascade,
  destination_court_reference text not null,
  transmission_reference text not null,
  transmitted_at text not null,
  transmitted_by text not null references users(id),
  seven_day_compliant integer not null check(seven_day_compliant in (0,1)),
  document_hash text
);

create table if not exists reconciliation_runs (
  id text primary key,
  source_system_code text not null,
  status text not null check(status in ('RUNNING','COMPLETED','FAILED')),
  total_records integer not null default 0,
  matched_records integer not null default 0,
  mismatch_records integer not null default 0,
  missing_records integer not null default 0,
  started_by text not null references users(id),
  started_at text not null,
  completed_at text,
  correlation_id text not null
);

create table if not exists reconciliation_items (
  id text primary key,
  run_id text not null references reconciliation_runs(id) on delete cascade,
  external_case_id text not null,
  local_case_reference_id text references case_references(id),
  result text not null check(result in ('MATCHED','MISMATCH','MISSING_LOCAL')),
  differences_json text not null default '{}',
  source_hash text,
  local_hash text,
  checked_at text not null
);
create index if not exists idx_reconciliation_items_run on reconciliation_items(run_id, result);

create table if not exists security_events (
  sequence integer primary key autoincrement,
  id text not null unique,
  event_type text not null,
  principal_reference text,
  ip_address text,
  route text,
  details_json text not null default '{}',
  occurred_at text not null
);
create trigger if not exists security_events_no_update before update on security_events
begin select raise(abort, 'security_events are append-only'); end;
create trigger if not exists security_events_no_delete before delete on security_events
begin select raise(abort, 'security_events are append-only'); end;
