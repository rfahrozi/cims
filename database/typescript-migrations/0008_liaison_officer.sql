-- CIMS v0.20.0 — Pejabat Penghubung (Liaison Officer) & Organization Units
-- SOP/CIMS/PPE/001/2026 Bagian 7 & 8 — M-01 MUST HAVE
-- Matriks MVP Bagian 9: liaison_officers, organization_units, delegations

-- =============================================================================
-- 1. Organization units — satuan kerja dan wilayah hukum per instansi
-- =============================================================================
create table if not exists organization_units (
  id                text primary key default gen_random_uuid()::text,
  organization_id   text not null references organizations(id) on delete restrict,
  unit_code         text not null,
  unit_name         text not null,
  unit_type         text not null check (unit_type in (
    'COURT_DIVISION',       -- Majelis / Kepaniteraan
    'PROSECUTION_SECTION',  -- Seksi Tuntutan / Pidana Umum / Pidana Khusus
    'CORRECTIONS_FACILITY', -- Lapas / Rutan / LPKA / LPAS
    'OTHER'
  )),
  jurisdiction_area text,   -- Wilayah hukum (mis: "DKI Jakarta", "Jawa Barat")
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, unit_code)
);

create index if not exists idx_org_units_org
  on organization_units(organization_id, active);

comment on table organization_units
  is 'Unit kerja dan wilayah hukum per instansi. Digunakan untuk memetakan pejabat penghubung.';

-- =============================================================================
-- 2. Liaison officers — pejabat penghubung yang ditunjuk per organisasi/unit
-- =============================================================================
-- Pejabat penghubung tidak memiliki kewenangan substantif (tidak bisa ubah isi
-- perkara), hanya koordinasi, acknowledgment, dan eskalasi antarinstansi.
create table if not exists liaison_officers (
  id                  text primary key default gen_random_uuid()::text,
  user_id             text not null,               -- referensi ke akun CIMS
  user_name           text not null,               -- nama untuk ditampilkan
  organization_id     text not null references organizations(id) on delete restrict,
  organization_unit_id text references organization_units(id) on delete set null,

  -- Periode penunjukan resmi
  appointed_from      timestamptz not null default now(),
  appointed_until     timestamptz,                 -- null = tidak ada batas waktu

  -- Surat keputusan / dasar penunjukan
  appointment_reference text not null,

  -- Status
  active              boolean not null default true,

  -- Kontak untuk koordinasi
  contact_email       text,
  contact_phone       text,

  -- Audit
  appointed_by        text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  row_version         bigint not null default 1,

  -- Satu user aktif per organisasi pada satu waktu
  constraint uq_active_liaison_per_org
    unique (organization_id, user_id, active)
);

create index if not exists idx_liaison_officers_org_active
  on liaison_officers(organization_id, active, appointed_from desc);

create index if not exists idx_liaison_officers_user
  on liaison_officers(user_id, active);

comment on table liaison_officers
  is 'Pejabat penghubung antarinstansi per SOP Bagian 7 & 8. Hanya koordinasi dan eskalasi, tanpa kewenangan substantif.';

-- =============================================================================
-- 3. Delegations — pelimpahan kewenangan sementara
-- =============================================================================
-- Digunakan saat pejabat penghubung berhalangan dan perlu delegasi sementara.
create table if not exists delegations (
  id                  text primary key default gen_random_uuid()::text,
  delegator_user_id   text not null,
  delegator_name      text not null,
  delegate_user_id    text not null,
  delegate_name       text not null,
  organization_id     text not null references organizations(id) on delete restrict,

  -- Scope pelimpahan
  scope               text not null check (scope in (
    'LIAISON_COORDINATION',  -- Koordinasi dan acknowledgment
    'NOTICE_FORWARDING',     -- Teruskan pemberitahuan
    'ESCALATION_ONLY'        -- Eskalasi saja, tidak termasuk acknowledgment
  )),

  -- Periode
  valid_from          timestamptz not null default now(),
  valid_until         timestamptz not null,
  delegation_reason   text not null,
  official_reference  text not null,

  -- Status
  status              text not null default 'ACTIVE'
                        check (status in ('ACTIVE','EXPIRED','REVOKED')),

  -- Audit
  created_by          text not null,
  created_at          timestamptz not null default now(),
  revoked_by          text,
  revoked_at          timestamptz,

  -- Tidak boleh mendelegasikan ke diri sendiri
  constraint chk_delegation_no_self
    check (delegator_user_id <> delegate_user_id)
);

create index if not exists idx_delegations_delegate_active
  on delegations(delegate_user_id, status, valid_until);

create index if not exists idx_delegations_org_active
  on delegations(organization_id, status, valid_from desc);

comment on table delegations
  is 'Pelimpahan kewenangan sementara dari pejabat penghubung. Matriks MVP Bagian 9.';

-- =============================================================================
-- 4. Liaison escalations — log eskalasi yang dilakukan pejabat penghubung
-- =============================================================================
create table if not exists liaison_escalations (
  id                  text primary key default gen_random_uuid()::text,
  hearing_id          text references hearings(id) on delete restrict,
  liaison_officer_id  text not null references liaison_officers(id) on delete restrict,
  escalation_type     text not null check (escalation_type in (
    'NOTICE_NO_ACK',       -- Pemberitahuan tidak di-acknowledge dalam SLA
    'READINESS_DELAYED',   -- Kesiapan belum disubmit mendekati waktu sidang
    'INCIDENT_UNRESOLVED', -- Insiden tidak terselesaikan
    'SCHEDULE_CONFLICT',   -- Konflik jadwal antar instansi
    'DEFENDANT_TRANSFER',  -- Mutasi tahanan belum dikonfirmasi
    'OTHER'
  )),
  description         text not null,
  escalated_to        text not null,  -- user_id pejabat yang menerima eskalasi
  escalated_to_name   text not null,
  status              text not null default 'OPEN'
                        check (status in ('OPEN','ACKNOWLEDGED','RESOLVED','CLOSED')),
  resolution_notes    text,
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_liaison_escalations_hearing
  on liaison_escalations(hearing_id, status, created_at desc);

create index if not exists idx_liaison_escalations_officer
  on liaison_escalations(liaison_officer_id, status);
