-- CIMS v0.19.0 database role and grant template
-- Run as the database owner after schema migration. Passwords and login bindings are managed outside this file.
-- Adapt role names only through a reviewed environment-specific copy.

revoke create on schema public from public;
revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke all on all functions in schema public from public;

do $$
begin
  if not exists(select 1 from pg_roles where rolname='cims_api') then create role cims_api nologin; end if;
  if not exists(select 1 from pg_roles where rolname='cims_worker') then create role cims_worker nologin; end if;
  if not exists(select 1 from pg_roles where rolname='cims_zoom_provider') then create role cims_zoom_provider nologin; end if;
  if not exists(select 1 from pg_roles where rolname='cims_auditor') then create role cims_auditor nologin; end if;
end $$;

grant usage on schema public to cims_api,cims_worker,cims_zoom_provider,cims_auditor;
grant execute on function cims_hearing_allowed(text) to cims_api,cims_worker,cims_auditor;

-- API role. RLS policies restrict hearing-scoped rows when this non-owner role is used.
grant select,insert,update on
  organizations,court_cases,hearings,hearing_assignments,hearing_user_assignments,hearing_intake_parties,hearing_data_revisions,hearing_import_sources,hearing_import_jobs,hearing_import_staging,electronic_hearing_requests,judicial_determinations,
  schedule_proposals,schedule_proposal_resources,schedule_conflicts,hearing_schedules,hearing_schedule_resources,
  official_notices,notice_recipients,notice_delivery_attempts,notice_acknowledgments,
  identity_verifications,room_inspections,readiness_submissions,readiness_items,technical_tests,
  virtual_sessions,virtual_rooms,hearing_runtime,hearing_control_events,
  hearing_participants,participant_access_tokens,participant_sessions,attendance_events,consultation_sessions,
  incidents,incident_actions,security_events,audit_events,reconciliation_runs,reconciliation_items,
  provider_webhook_events,api_idempotency_keys,outbox_events,
  legal_holds,retention_policies,retention_previews,evidence_exports,evidence_export_items,
  access_review_campaigns,access_review_items,production_readiness_snapshots
  to cims_api;

-- Delete is intentionally omitted for append-only and operational evidence tables.
grant delete on
  schedule_proposal_resources,schedule_conflicts,reconciliation_items,api_idempotency_keys
  to cims_api;

-- Integration worker role.
grant select,insert,update on
  outbox_events,hearing_import_sources,hearing_import_jobs,hearing_import_staging,official_notices,notice_recipients,notice_delivery_attempts,notice_acknowledgments,
  virtual_sessions,virtual_rooms,hearing_schedules,reconciliation_runs,reconciliation_items,
  hearings,hearing_assignments,hearing_data_revisions,judicial_determinations,audit_events,
  court_cases,legal_holds,evidence_exports,evidence_export_items
  to cims_worker;
grant delete on reconciliation_items to cims_worker;

-- Zoom adapter only needs the durable provider operation ledger.
grant select,insert,update on video_provider_operations to cims_zoom_provider;

-- Read-only auditor. RLS context must still be set by an approved access service.
grant select on
  court_cases,hearings,hearing_assignments,hearing_user_assignments,hearing_intake_parties,hearing_data_revisions,hearing_import_sources,hearing_import_jobs,judicial_determinations,hearing_schedules,official_notices,
  notice_recipients,notice_delivery_attempts,notice_acknowledgments,readiness_submissions,
  virtual_sessions,hearing_runtime,hearing_control_events,hearing_participants,attendance_events,
  incidents,incident_actions,audit_events,reconciliation_runs,reconciliation_items,security_events,
  legal_holds,retention_policies,retention_previews,evidence_exports,evidence_export_items,
  access_review_campaigns,access_review_items,production_readiness_snapshots
  to cims_auditor;

grant usage,select on all sequences in schema public to cims_api,cims_worker,cims_zoom_provider;

alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public revoke all on sequences from public;
alter default privileges in schema public revoke all on functions from public;
