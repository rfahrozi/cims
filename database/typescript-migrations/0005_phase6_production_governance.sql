-- CIMS v0.19.0 production governance, evidence, retention, and access review
create extension if not exists pgcrypto;

create table if not exists legal_holds (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id) on delete restrict,
  hold_type text not null check (hold_type in ('LITIGATION','INVESTIGATION','AUDIT','COURT_ORDER','OTHER')),
  reason text not null,
  official_reference text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','RELEASED')),
  created_by text not null,
  created_at timestamptz not null default now(),
  released_by text,
  released_at timestamptz,
  release_reason text,
  constraint legal_hold_release_consistency check (
    (status='ACTIVE' and released_by is null and released_at is null)
    or (status='RELEASED' and released_by is not null and released_at is not null and release_reason is not null)
  )
);
create index if not exists idx_legal_holds_hearing_status on legal_holds(hearing_id,status,created_at desc);
create unique index if not exists uq_legal_hold_active_reference on legal_holds(hearing_id,official_reference) where status='ACTIVE';

create table if not exists retention_policies (
  id text primary key default gen_random_uuid()::text,
  policy_code text not null unique,
  object_type text not null check (object_type in ('HEARING','AUDIT_EVENT','EVIDENCE_EXPORT','SECURITY_EVENT')),
  retention_days integer check (retention_days is null or retention_days > 0),
  disposition_action text not null default 'REVIEW_ONLY' check (disposition_action in ('REVIEW_ONLY','ARCHIVE','DELETE')),
  enabled boolean not null default false,
  requires_approval boolean not null default true,
  legal_basis_reference text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retention_policy_approval_check check (
    not enabled or (legal_basis_reference is not null and approved_by is not null and approved_at is not null)
  )
);
insert into retention_policies(policy_code,object_type,retention_days,disposition_action,enabled,requires_approval)
values('CIMS_HEARING_REVIEW_ONLY','HEARING',null,'REVIEW_ONLY',false,true)
on conflict(policy_code) do nothing;

create table if not exists retention_previews (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id) on delete restrict,
  policy_id text references retention_policies(id),
  closure_at timestamptz,
  due_at timestamptz,
  eligibility_status text not null check (eligibility_status in ('NOT_CLOSED','POLICY_NOT_CONFIGURED','ON_HOLD','NOT_DUE','DUE_FOR_REVIEW')),
  active_legal_hold_count integer not null default 0,
  eligible_for_review boolean not null default false,
  requested_by text not null,
  requested_at timestamptz not null default now(),
  snapshot jsonb not null default '{}'::jsonb
);
create index if not exists idx_retention_previews_hearing on retention_previews(hearing_id,requested_at desc);

create table if not exists evidence_exports (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id) on delete restrict,
  export_format text not null default 'JSON' check (export_format in ('JSON','ZIP_MANIFEST')),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','PROCESSING','COMPLETED','FAILED','EXPIRED')),
  requested_by text not null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  storage_uri text,
  object_hash text,
  manifest_hash text,
  item_count integer not null default 0,
  expires_at timestamptz,
  last_error text,
  correlation_id text
);
create index if not exists idx_evidence_exports_hearing on evidence_exports(hearing_id,requested_at desc);
create index if not exists idx_evidence_exports_status on evidence_exports(status,requested_at);

create table if not exists evidence_export_items (
  id text primary key default gen_random_uuid()::text,
  export_id text not null references evidence_exports(id) on delete restrict,
  sequence integer not null,
  category text not null,
  record_count integer not null default 0,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(export_id,sequence),
  unique(export_id,category)
);
create index if not exists idx_evidence_export_items_export on evidence_export_items(export_id,sequence);

create table if not exists access_review_campaigns (
  id text primary key default gen_random_uuid()::text,
  campaign_name text not null,
  scope_organization_id text references organizations(id),
  hearing_id text references hearings(id) on delete restrict,
  status text not null default 'OPEN' check (status in ('OPEN','COMPLETED','CANCELLED')),
  created_by text not null,
  created_at timestamptz not null default now(),
  due_at timestamptz not null,
  completed_by text,
  completed_at timestamptz,
  constraint access_review_scope_check check (scope_organization_id is not null or hearing_id is not null)
);
create index if not exists idx_access_review_campaigns_status on access_review_campaigns(status,due_at);

create table if not exists access_review_items (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references access_review_campaigns(id) on delete cascade,
  hearing_id text not null references hearings(id) on delete restrict,
  subject_user_id text not null,
  assignment_role text not null,
  status text not null default 'PENDING' check (status in ('PENDING','KEPT','REVOKED')),
  decision_reason text,
  reviewed_by text,
  reviewed_at timestamptz,
  snapshot jsonb not null default '{}'::jsonb,
  unique(campaign_id,hearing_id,subject_user_id)
);
create index if not exists idx_access_review_items_campaign on access_review_items(campaign_id,status);

create table if not exists production_readiness_snapshots (
  id text primary key default gen_random_uuid()::text,
  release_version text not null,
  decision text not null check (decision in ('GO','CONDITIONAL_GO','NO_GO')),
  checks jsonb not null,
  generated_by text not null,
  generated_at timestamptz not null default now(),
  correlation_id text
);
create index if not exists idx_readiness_snapshots_generated on production_readiness_snapshots(generated_at desc);

alter table legal_holds enable row level security;
alter table retention_previews enable row level security;
alter table evidence_exports enable row level security;
alter table evidence_export_items enable row level security;
alter table access_review_campaigns enable row level security;
alter table access_review_items enable row level security;
alter table production_readiness_snapshots enable row level security;

create policy legal_hold_scope on legal_holds
using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
create policy retention_preview_scope on retention_previews
using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
create policy evidence_export_scope on evidence_exports
using (cims_hearing_allowed(hearing_id)) with check (cims_hearing_allowed(hearing_id));
create policy evidence_export_item_scope on evidence_export_items
using (exists(select 1 from evidence_exports e where e.id=export_id and cims_hearing_allowed(e.hearing_id)))
with check (exists(select 1 from evidence_exports e where e.id=export_id and cims_hearing_allowed(e.hearing_id)));
create policy access_review_campaign_scope on access_review_campaigns
using (
  current_setting('cims.is_system_admin',true)='true'
  or (hearing_id is not null and cims_hearing_allowed(hearing_id))
  or scope_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),','))
)
with check (
  current_setting('cims.is_system_admin',true)='true'
  or (hearing_id is not null and cims_hearing_allowed(hearing_id))
  or scope_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),','))
);
create policy access_review_item_scope on access_review_items
using (exists(select 1 from access_review_campaigns c where c.id=campaign_id and (
  current_setting('cims.is_system_admin',true)='true'
  or cims_hearing_allowed(access_review_items.hearing_id)
  or c.scope_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),','))
)))
with check (exists(select 1 from access_review_campaigns c where c.id=campaign_id and (
  current_setting('cims.is_system_admin',true)='true'
  or cims_hearing_allowed(access_review_items.hearing_id)
  or c.scope_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),','))
)));
create policy production_readiness_scope on production_readiness_snapshots
using (current_setting('cims.is_system_admin',true)='true')
with check (current_setting('cims.is_system_admin',true)='true');

-- Evidence, retention previews, and access decisions are immutable records.
drop trigger if exists trg_retention_previews_immutable on retention_previews;
create trigger trg_retention_previews_immutable before update or delete on retention_previews for each row execute function cims_block_mutation();
drop trigger if exists trg_evidence_export_items_immutable on evidence_export_items;
create trigger trg_evidence_export_items_immutable before update or delete on evidence_export_items for each row execute function cims_block_mutation();
drop trigger if exists trg_production_readiness_snapshots_immutable on production_readiness_snapshots;
create trigger trg_production_readiness_snapshots_immutable before update or delete on production_readiness_snapshots for each row execute function cims_block_mutation();

-- Retention execution is intentionally absent. The application only creates review previews until a legally approved disposition process is implemented.

-- One-way lifecycle guards preserve the evidentiary history while allowing approved business transitions.
create or replace function cims_guard_legal_hold_transition() returns trigger language plpgsql as $$
begin
  if old.status='ACTIVE' and new.status='RELEASED'
     and new.hearing_id=old.hearing_id
     and new.hold_type=old.hold_type
     and new.reason=old.reason
     and new.official_reference=old.official_reference
     and new.created_by=old.created_by
     and new.created_at=old.created_at
     and new.released_by is not null
     and new.released_at is not null
     and new.release_reason is not null then
    return new;
  end if;
  raise exception 'legal hold permits only the ACTIVE to RELEASED transition';
end $$;
drop trigger if exists trg_legal_hold_transition on legal_holds;
create trigger trg_legal_hold_transition before update or delete on legal_holds
for each row execute function cims_guard_legal_hold_transition();

create or replace function cims_guard_access_review_item_transition() returns trigger language plpgsql as $$
begin
  if old.status='PENDING' and new.status in ('KEPT','REVOKED')
     and new.campaign_id=old.campaign_id
     and new.hearing_id=old.hearing_id
     and new.subject_user_id=old.subject_user_id
     and new.assignment_role=old.assignment_role
     and new.snapshot=old.snapshot
     and new.reviewed_by is not null
     and new.reviewed_at is not null
     and new.decision_reason is not null then
    return new;
  end if;
  raise exception 'access review item permits one final decision only';
end $$;
drop trigger if exists trg_access_review_item_transition on access_review_items;
create trigger trg_access_review_item_transition before update or delete on access_review_items
for each row execute function cims_guard_access_review_item_transition();

create or replace function cims_guard_evidence_export_transition() returns trigger language plpgsql as $$
declare
  valid_transition boolean;
begin
  if tg_op='DELETE' then
    raise exception 'evidence exports cannot be deleted';
  end if;
  if new.hearing_id<>old.hearing_id
     or new.export_format<>old.export_format
     or new.requested_by<>old.requested_by
     or new.requested_at<>old.requested_at then
    raise exception 'evidence export identity fields are immutable';
  end if;
  valid_transition :=
    new.status=old.status
    or (old.status='REQUESTED' and new.status in ('PROCESSING','FAILED','EXPIRED'))
    or (old.status='FAILED' and new.status in ('PROCESSING','EXPIRED'))
    or (old.status='PROCESSING' and new.status in ('COMPLETED','FAILED'))
    or (old.status='COMPLETED' and new.status='EXPIRED');
  if not valid_transition then
    raise exception 'invalid evidence export status transition from % to %',old.status,new.status;
  end if;
  if new.status='COMPLETED' and (new.completed_at is null or new.storage_uri is null or new.object_hash is null or new.manifest_hash is null) then
    raise exception 'completed evidence export requires storage and hash evidence';
  end if;
  return new;
end $$;
drop trigger if exists trg_evidence_export_transition on evidence_exports;
create trigger trg_evidence_export_transition before update or delete on evidence_exports
for each row execute function cims_guard_evidence_export_transition();
