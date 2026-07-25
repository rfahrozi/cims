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
  occurred_at text not null
);

create trigger if not exists audit_events_no_update before update on audit_events
begin select raise(abort, 'audit_events are append-only'); end;
create trigger if not exists audit_events_no_delete before delete on audit_events
begin select raise(abort, 'audit_events are append-only'); end;
