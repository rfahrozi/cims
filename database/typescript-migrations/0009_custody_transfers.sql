-- CIMS v0.20.0 — Mutasi/Perpindahan Tahanan
-- SOP/CIMS/PPE/001/2026 Bagian 10.14
-- Matriks MVP Bagian 9: custody_transfers

-- =============================================================================
-- Tabel custody_transfers — rekam mutasi tahanan antar Rutan/Lapas
-- =============================================================================
-- SOP 10.14 mewajibkan:
-- 1. Instansi asal mencatat mutasi dan lokasi baru
-- 2. Pejabat penghubung notifikasi ke Pengadilan, Kejaksaan, Pemasyarakatan tujuan
-- 3. Akses CIMS dialihkan (least privilege)
-- 4. Checklist kesiapan, verifikasi identitas, uji teknis diulang di lokasi baru
-- 5. Riwayat lokasi dan pengalihan tanggung jawab di audit trail

create table if not exists custody_transfers (
  id                        text primary key default gen_random_uuid()::text,
  hearing_id                text not null references hearings(id) on delete restrict,

  -- Identitas terdakwa (reference saja, bukan duplikasi data identitas)
  defendant_reference       text not null,   -- participant_id atau nama referensi
  defendant_name            text not null,

  -- Lokasi asal (Rutan/Lapas yang melepas)
  from_organization_id      text not null references organizations(id),
  from_organization_name    text not null,
  from_location_code        text,            -- kode ruang/blok jika ada

  -- Lokasi tujuan (Rutan/Lapas yang menerima)
  to_organization_id        text not null references organizations(id),
  to_organization_name      text not null,
  to_location_code          text,

  -- Detail mutasi
  transfer_reason           text not null check (transfer_reason in (
    'SIDANG',               -- Dipindah untuk keperluan sidang
    'ADMINISTRATIF',        -- Perpindahan administratif biasa
    'KEAMANAN',             -- Alasan keamanan
    'KESEHATAN',            -- Alasan kesehatan / medis
    'KAHAR',                -- Keadaan kahar
    'LAINNYA'
  )),
  transfer_reason_detail    text,
  official_reference        text not null,   -- nomor surat mutasi resmi
  transferred_at            timestamptz not null,

  -- Status alur SOP 10.14
  status                    text not null default 'RECORDED'
                              check (status in (
                                'RECORDED',         -- Dicatat di sistem
                                'NOTIFIED',         -- Pengadilan, Kejaksaan, Pemasyarakatan tujuan sudah dinotifikasi
                                'ACCESS_TRANSFERRED', -- Akses CIMS sudah dialihkan
                                'CHECKLIST_PENDING', -- Menunggu re-checklist di lokasi baru
                                'COMPLETED'          -- Semua langkah SOP 10.14 selesai
                              )),

  -- Apakah akses CIMS sudah dialihkan ke org baru
  access_transferred        boolean not null default false,
  access_transferred_at     timestamptz,
  access_transferred_by     text,

  -- Re-checklist dan re-verifikasi wajib di lokasi baru (referensi ke checklist baru)
  new_checklist_required    boolean not null default true,
  new_checklist_submitted   boolean not null default false,
  new_identity_verified     boolean not null default false,

  -- Catatan
  notes                     text,

  -- Audit
  recorded_by               text not null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  row_version               bigint not null default 1
);

create index if not exists idx_custody_transfers_hearing
  on custody_transfers(hearing_id, transferred_at desc);

create index if not exists idx_custody_transfers_defendant
  on custody_transfers(defendant_reference, transferred_at desc);

create index if not exists idx_custody_transfers_status
  on custody_transfers(status, created_at desc);

comment on table custody_transfers
  is 'Mutasi/perpindahan tahanan antar Rutan/Lapas per SOP 10.14. Setiap perpindahan memerlukan notifikasi, pengalihan akses, dan re-checklist.';

-- =============================================================================
-- Tabel custody_transfer_notifications — notifikasi ke pihak terkait
-- =============================================================================
create table if not exists custody_transfer_notifications (
  id                text primary key default gen_random_uuid()::text,
  transfer_id       text not null references custody_transfers(id) on delete cascade,
  notified_party    text not null check (notified_party in (
    'COURT',           -- Pengadilan
    'PROSECUTION',     -- Kejaksaan
    'CORRECTIONS_DEST' -- Pemasyarakatan tujuan
  )),
  notified_org_id   text references organizations(id),
  notified_org_name text not null,
  channel           text not null check (channel in ('EMAIL','WHATSAPP','SMS','IN_APP','OFFICIAL')),
  official_reference text not null,
  status            text not null default 'PENDING'
                      check (status in ('PENDING','SENT','ACKNOWLEDGED','FAILED')),
  sent_at           timestamptz,
  acknowledged_at   timestamptz,
  acknowledged_by   text,
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_custody_notif_transfer
  on custody_transfer_notifications(transfer_id, notified_party);
