-- CIMS v0.18.0 manual hearing intake and future database-import foundation
create extension if not exists pgcrypto;

-- Safe placeholders allow pre-v0.18 hearings to be normalized without inventing operational ownership.
insert into organizations(id,organization_code,name,organization_type,active)
values
  ('system-unassigned-court','SYSTEM_UNASSIGNED_COURT','Belum Dipetakan - Pengadilan','COURT',false),
  ('system-unassigned-prosecution','SYSTEM_UNASSIGNED_PROSECUTION','Belum Dipetakan - Kejaksaan','PROSECUTION',false)
on conflict(id) do nothing;

create table if not exists court_cases (
  id text primary key default gen_random_uuid()::text,
  case_number text not null,
  normalized_case_number text not null,
  official_case_reference text,
  case_classification text not null check (case_classification in ('GENERAL_CRIMINAL','SPECIAL_CRIMINAL')),
  case_type_code text not null,
  case_title text not null,
  court_organization_id text not null references organizations(id),
  prosecution_organization_id text not null references organizations(id),
  data_source text not null check (data_source in ('MANUAL','EXTERNAL_DATABASE')),
  source_system text,
  source_record_id text,
  source_snapshot_hash text,
  created_by text not null,
  updated_by text not null,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(court_organization_id, normalized_case_number)
);
create index if not exists idx_court_cases_reference on court_cases(official_case_reference) where official_case_reference is not null;
create index if not exists idx_court_cases_source on court_cases(source_system,source_record_id) where source_record_id is not null;
create unique index if not exists uq_court_cases_source_record on court_cases(source_system,source_record_id) where source_system is not null and source_record_id is not null;

alter table hearings drop constraint if exists hearings_case_number_key;
alter table hearings
  add column if not exists case_id text references court_cases(id),
  add column if not exists hearing_sequence integer,
  add column if not exists intake_status text,
  add column if not exists data_source text,
  add column if not exists court_organization_id text references organizations(id),
  add column if not exists prosecution_organization_id text references organizations(id),
  add column if not exists corrections_organization_id text references organizations(id),
  add column if not exists defendant_custody_status text,
  add column if not exists notes text,
  add column if not exists created_by text,
  add column if not exists updated_by text,
  add column if not exists submitted_by text,
  add column if not exists submitted_at timestamptz,
  add column if not exists activated_by text,
  add column if not exists activated_at timestamptz,
  add column if not exists return_reason text;

with legacy as (
  select h.id,h.case_number,
         coalesce((select a.organization_id from hearing_assignments a join organizations o on o.id=a.organization_id where a.hearing_id=h.id and a.active and o.organization_type='COURT' order by a.created_at limit 1),'system-unassigned-court') court_id,
         coalesce((select a.organization_id from hearing_assignments a join organizations o on o.id=a.organization_id where a.hearing_id=h.id and a.active and o.organization_type='PROSECUTION' order by a.created_at limit 1),'system-unassigned-prosecution') prosecution_id,
         (select a.organization_id from hearing_assignments a join organizations o on o.id=a.organization_id where a.hearing_id=h.id and a.active and o.organization_type='CORRECTIONS' order by a.created_at limit 1) corrections_id
    from hearings h where h.case_id is null
), inserted as (
  insert into court_cases(case_number,normalized_case_number,official_case_reference,case_classification,case_type_code,case_title,court_organization_id,prosecution_organization_id,data_source,created_by,updated_by)
  select distinct on (court_id,upper(regexp_replace(trim(case_number),'\s+',' ','g')))
         case_number,upper(regexp_replace(trim(case_number),'\s+',' ','g')),null,'SPECIAL_CRIMINAL','LEGACY','Migrasi data persidangan',court_id,prosecution_id,'MANUAL','migration-v0.18','migration-v0.18'
    from legacy
  on conflict(court_organization_id,normalized_case_number) do nothing
  returning id
)
update hearings h
   set case_id=c.id,
       hearing_sequence=coalesce(h.hearing_sequence,1),
       intake_status=coalesce(h.intake_status,'ACTIVE'),
       data_source=coalesce(h.data_source,'MANUAL'),
       court_organization_id=coalesce(h.court_organization_id,l.court_id),
       prosecution_organization_id=coalesce(h.prosecution_organization_id,l.prosecution_id),
       corrections_organization_id=coalesce(h.corrections_organization_id,l.corrections_id),
       defendant_custody_status=coalesce(h.defendant_custody_status,case when l.corrections_id is null then 'UNKNOWN' else 'DETAINED' end),
       created_by=coalesce(h.created_by,'migration-v0.18'),
       updated_by=coalesce(h.updated_by,'migration-v0.18')
  from legacy l
  join court_cases c on c.court_organization_id=l.court_id and c.normalized_case_number=upper(regexp_replace(trim(l.case_number),'\s+',' ','g'))
 where h.id=l.id;

alter table hearings
  alter column hearing_sequence set default 1,
  alter column intake_status set default 'DRAFT',
  alter column data_source set default 'MANUAL',
  alter column defendant_custody_status set default 'UNKNOWN',
  alter column case_id set not null,
  alter column hearing_sequence set not null,
  alter column intake_status set not null,
  alter column data_source set not null,
  alter column court_organization_id set not null,
  alter column prosecution_organization_id set not null,
  alter column defendant_custody_status set not null,
  alter column created_by set not null,
  alter column updated_by set not null;

do $$ begin
  alter table hearings add constraint hearings_sequence_check check (hearing_sequence between 1 and 999);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table hearings add constraint hearings_intake_status_check check (intake_status in ('DRAFT','SUBMITTED','ACTIVE','RETURNED','ARCHIVED'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table hearings add constraint hearings_data_source_check check (data_source in ('MANUAL','EXTERNAL_DATABASE'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table hearings add constraint hearings_custody_status_check check (defendant_custody_status in ('DETAINED','NOT_DETAINED','MIXED','UNKNOWN'));
exception when duplicate_object then null; end $$;

create unique index if not exists uq_hearing_case_sequence_active on hearings(case_id,hearing_sequence) where intake_status<>'ARCHIVED';
create index if not exists idx_hearings_intake_status on hearings(court_organization_id,intake_status,created_at desc);

create table if not exists hearing_user_assignments (
  hearing_id text not null references hearings(id) on delete cascade,
  user_id text not null,
  assignment_role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(hearing_id,user_id)
);
create index if not exists idx_hearing_user_assignments_user on hearing_user_assignments(user_id,hearing_id) where active;

create table if not exists hearing_intake_parties (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id) on delete cascade,
  party_type text not null check (party_type in ('DEFENDANT')),
  display_name_encrypted bytea not null,
  display_name_search_hash text not null,
  alias text,
  protected_identity boolean not null default false,
  custody_status text not null check (custody_status in ('DETAINED','NOT_DETAINED','UNKNOWN')),
  detention_organization_id text references organizations(id),
  created_by text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_hearing_intake_parties_hearing on hearing_intake_parties(hearing_id,created_at) where deleted_at is null;
create index if not exists idx_hearing_intake_party_search on hearing_intake_parties(display_name_search_hash) where deleted_at is null;

create table if not exists hearing_data_revisions (
  id text primary key default gen_random_uuid()::text,
  hearing_id text not null references hearings(id) on delete cascade,
  revision_number integer not null,
  action text not null check (action in ('CREATED','UPDATED','SUBMIT','ACTIVATE','RETURN','REOPEN','ARCHIVE','IMPORTED','MERGED')),
  snapshot jsonb not null,
  reason text,
  actor_user_id text not null,
  created_at timestamptz not null default now(),
  unique(hearing_id,revision_number)
);
create index if not exists idx_hearing_revisions_timeline on hearing_data_revisions(hearing_id,revision_number);

create table if not exists hearing_import_sources (
  id text primary key default gen_random_uuid()::text,
  source_code text not null unique,
  name text not null,
  source_type text not null check(source_type in ('DATABASE')),
  enabled boolean not null default false,
  configuration_status text not null default 'DISABLED' check(configuration_status in ('DISABLED','NOT_CONFIGURED','READY','DEGRADED')),
  connection_secret_reference text,
  last_health_check_at timestamptz,
  last_health_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into hearing_import_sources(source_code,name,source_type,enabled,configuration_status)
values('OFFICIAL_CASE_DB','Database Perkara Resmi','DATABASE',false,'DISABLED')
on conflict(source_code) do nothing;

create table if not exists hearing_import_jobs (
  id text primary key default gen_random_uuid()::text,
  source_id text not null references hearing_import_sources(id),
  status text not null default 'REQUESTED' check(status in ('REQUESTED','FETCHING','PREVIEW_READY','APPROVED','IMPORTING','COMPLETED','FAILED','CANCELLED')),
  source_query jsonb not null,
  requested_by text not null,
  requested_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  preview_count integer not null default 0,
  imported_count integer not null default 0,
  rejected_count integer not null default 0,
  last_error text,
  completed_at timestamptz
);
create index if not exists idx_hearing_import_jobs_status on hearing_import_jobs(status,requested_at);

create table if not exists hearing_import_staging (
  id text primary key default gen_random_uuid()::text,
  job_id text not null references hearing_import_jobs(id) on delete cascade,
  source_record_id text not null,
  source_updated_at timestamptz,
  source_payload jsonb not null,
  source_payload_hash text not null,
  mapping_status text not null default 'PENDING' check(mapping_status in ('PENDING','VALID','INVALID','DUPLICATE','APPROVED','REJECTED','IMPORTED')),
  validation_errors jsonb,
  target_hearing_id text references hearings(id),
  created_at timestamptz not null default now(),
  unique(job_id,source_record_id)
);
create index if not exists idx_hearing_import_staging_status on hearing_import_staging(job_id,mapping_status);

-- RLS uses both explicit user assignment and organization participation. This supports newly created hearings without waiting for an OIDC token refresh.
create or replace function cims_hearing_allowed(target_hearing_id text) returns boolean
language sql stable security definer set search_path=public as $$
  select current_setting('cims.is_system_admin',true)='true'
    or target_hearing_id = any(string_to_array(coalesce(current_setting('cims.hearing_assignments',true),''),','))
    or exists(select 1 from hearing_user_assignments u where u.hearing_id=target_hearing_id and u.user_id=current_setting('cims.user_id',true) and u.active)
    or exists(select 1 from hearing_assignments a where a.hearing_id=target_hearing_id and a.active and a.organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),',')));
$$;

alter table court_cases enable row level security;
alter table hearing_user_assignments enable row level security;
alter table hearing_intake_parties enable row level security;
alter table hearing_data_revisions enable row level security;
alter table hearing_import_jobs enable row level security;
alter table hearing_import_staging enable row level security;

drop policy if exists court_case_scope on court_cases;
create policy court_case_scope on court_cases
using (current_setting('cims.is_system_admin',true)='true' or court_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),',')))
with check (current_setting('cims.is_system_admin',true)='true' or court_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),',')));

drop policy if exists hearing_user_scope on hearing_user_assignments;
create policy hearing_user_scope on hearing_user_assignments using(cims_hearing_allowed(hearing_id)) with check(cims_hearing_allowed(hearing_id));
drop policy if exists intake_party_scope on hearing_intake_parties;
create policy intake_party_scope on hearing_intake_parties using(cims_hearing_allowed(hearing_id)) with check(cims_hearing_allowed(hearing_id));
drop policy if exists hearing_revision_scope on hearing_data_revisions;
create policy hearing_revision_scope on hearing_data_revisions using(cims_hearing_allowed(hearing_id)) with check(cims_hearing_allowed(hearing_id));
drop policy if exists import_job_scope on hearing_import_jobs;
create policy import_job_scope on hearing_import_jobs using(current_setting('cims.is_system_admin',true)='true' or requested_by=current_setting('cims.user_id',true)) with check(current_setting('cims.is_system_admin',true)='true' or requested_by=current_setting('cims.user_id',true));
drop policy if exists import_staging_scope on hearing_import_staging;
create policy import_staging_scope on hearing_import_staging using(exists(select 1 from hearing_import_jobs j where j.id=job_id and (current_setting('cims.is_system_admin',true)='true' or j.requested_by=current_setting('cims.user_id',true)))) with check(exists(select 1 from hearing_import_jobs j where j.id=job_id and (current_setting('cims.is_system_admin',true)='true' or j.requested_by=current_setting('cims.user_id',true))));

-- Revisions are immutable evidence of manual entry, correction, and activation.
drop trigger if exists trg_hearing_data_revisions_immutable on hearing_data_revisions;
create trigger trg_hearing_data_revisions_immutable before update or delete on hearing_data_revisions for each row execute function cims_block_mutation();

-- Bootstrap policy for a new manual hearing. The creator must be the authenticated user and the court must be in the authenticated organization scope. After assignment rows are created, normal cims_hearing_allowed rules apply.
drop policy if exists hearing_scope on hearings;
create policy hearing_scope on hearings
using (cims_hearing_allowed(id))
with check (
  cims_hearing_allowed(id)
  or (
    data_source='MANUAL'
    and intake_status='DRAFT'
    and created_by=current_setting('cims.user_id',true)
    and court_organization_id=any(string_to_array(coalesce(current_setting('cims.organization_ids',true),''),','))
  )
);
