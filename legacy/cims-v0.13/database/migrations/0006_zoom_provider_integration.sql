-- Sprint 13: Zoom provider integration
-- Contact email is needed only for provider-specific unique registrant links.
alter table hearing_participants add column if not exists contact_email varchar(320);
create index if not exists idx_hearing_participants_contact_email on hearing_participants(contact_email) where contact_email is not null;

comment on column hearing_participants.contact_email is
  'Restricted provider contact identifier. Do not expose in ordinary participant list or audit payloads.';
