import { randomUUID } from 'node:crypto';
import { hashPassword } from '../common/security.mjs';
import { computeAuditHash } from '../common/audit-service.mjs';
import { DEMO } from './demo-fixtures.mjs';

const now = () => new Date().toISOString();

export function seedDevelopmentData(db, config) {
  const existing = db.get('select count(*) as count from organizations');
  if (Number(existing.count) > 0) return;

  const createdAt = now();
  const organizations = [
    [DEMO.organizations.court, 'PN-DEMO', 'Pengadilan Negeri Demo', 'COURT'],
    [DEMO.organizations.prosecution, 'KEJARI-DEMO', 'Kejaksaan Negeri Demo', 'PROSECUTION'],
    [DEMO.organizations.corrections, 'RUTAN-DEMO', 'Rumah Tahanan Negara Demo', 'CORRECTIONS']
  ];
  for (const row of organizations)
    db.run(
      'insert into organizations(id, code, name, type, created_at) values(?,?,?,?,?)',
      ...row,
      createdAt
    );

  const permissions = [
    'iam.user.manage',
    'iam.role.manage',
    'assignment.manage',
    'case.read',
    'hearing.read',
    'determination.request',
    'determination.write',
    'schedule.read',
    'schedule.write',
    'schedule.approve',
    'audit.read',
    'notice.read',
    'notice.write',
    'notice.ack',
    'readiness.read',
    'readiness.write',
    'readiness.verify',
    'virtual.read',
    'virtual.provision',
    'participant.read',
    'participant.manage',
    'virtual.token.issue',
    'waiting.admit',
    'attendance.read',
    'hearing.control',
    'consultation.control',
    'incident.read',
    'incident.technical.write',
    'incident.cyber.write',
    'incident.force.write',
    'appeal.read',
    'appeal.write',
    'appeal.notice',
    'appeal.presence',
    'appeal.publication',
    'appeal.transmission',
    'monitoring.read',
    'reconciliation.read',
    'reconciliation.run',
    'security.read'
  ];
  for (const code of permissions)
    db.run('insert into permissions(code, description) values(?,?)', code, code);

  const roles = [
    ['SYSTEM_ADMIN', 'System Administrator'],
    ['JUDGE', 'Judge'],
    ['COURT_CLERK', 'Court Clerk'],
    ['PROSECUTOR', 'Public Prosecutor'],
    ['CORRECTIONS', 'Corrections Officer']
  ];
  for (const [code, name] of roles) db.run('insert into roles(code, name) values(?,?)', code, name);

  const rolePermissions = {
    SYSTEM_ADMIN: permissions,
    JUDGE: [
      'case.read',
      'hearing.read',
      'determination.write',
      'schedule.read',
      'schedule.approve',
      'notice.read',
      'readiness.read',
      'virtual.read',
      'audit.read',
      'participant.read',
      'waiting.admit',
      'attendance.read',
      'hearing.control',
      'consultation.control',
      'incident.read',
      'incident.technical.write',
      'appeal.read',
      'appeal.write',
      'appeal.presence',
      'monitoring.read',
      'reconciliation.read'
    ],
    COURT_CLERK: [
      'case.read',
      'hearing.read',
      'determination.request',
      'schedule.read',
      'schedule.write',
      'schedule.approve',
      'assignment.manage',
      'notice.read',
      'notice.write',
      'notice.ack',
      'readiness.read',
      'readiness.write',
      'readiness.verify',
      'virtual.read',
      'virtual.provision',
      'audit.read',
      'participant.read',
      'participant.manage',
      'virtual.token.issue',
      'waiting.admit',
      'attendance.read',
      'incident.read',
      'incident.technical.write',
      'appeal.read',
      'appeal.write',
      'appeal.notice',
      'appeal.presence',
      'appeal.publication',
      'appeal.transmission',
      'monitoring.read',
      'reconciliation.read',
      'reconciliation.run'
    ],
    PROSECUTOR: [
      'case.read',
      'hearing.read',
      'determination.request',
      'schedule.read',
      'schedule.write',
      'notice.read',
      'notice.write',
      'notice.ack',
      'readiness.read',
      'readiness.write',
      'virtual.read',
      'participant.read',
      'participant.manage',
      'attendance.read',
      'incident.read',
      'incident.technical.write',
      'appeal.read',
      'appeal.notice',
      'appeal.presence',
      'monitoring.read'
    ],
    CORRECTIONS: [
      'case.read',
      'hearing.read',
      'schedule.read',
      'notice.read',
      'notice.ack',
      'readiness.read',
      'readiness.write',
      'readiness.verify',
      'virtual.read',
      'participant.read',
      'participant.manage',
      'attendance.read',
      'incident.read',
      'incident.technical.write',
      'incident.force.write',
      'appeal.read',
      'appeal.notice',
      'appeal.presence',
      'monitoring.read'
    ]
  };
  for (const [role, values] of Object.entries(rolePermissions)) {
    for (const permission of values)
      db.run(
        'insert into role_permissions(role_code, permission_code) values(?,?)',
        role,
        permission
      );
  }

  const fixedSecret = 'JBSWY3DPEHPK3PXP';
  const users = [
    [
      DEMO.users.admin,
      DEMO.organizations.court,
      'admin@cims.local',
      'Administrator CIMS',
      'Admin123!',
      'SYSTEM_ADMIN'
    ],
    [
      DEMO.users.judge,
      DEMO.organizations.court,
      'judge@cims.local',
      'Hakim Demo',
      'Judge123!',
      'JUDGE'
    ],
    [
      DEMO.users.clerk,
      DEMO.organizations.court,
      'clerk@cims.local',
      'Panitera Demo',
      'Clerk123!',
      'COURT_CLERK'
    ],
    [
      DEMO.users.prosecutor,
      DEMO.organizations.prosecution,
      'prosecutor@cims.local',
      'Penuntut Umum Demo',
      'Prosecutor123!',
      'PROSECUTOR'
    ],
    [
      DEMO.users.corrections,
      DEMO.organizations.corrections,
      'corrections@cims.local',
      'Petugas Rutan Demo',
      'Corrections123!',
      'CORRECTIONS'
    ]
  ];
  for (const [id, orgId, email, name, password, role] of users) {
    db.run(
      'insert into users(id, organization_id, email, name, password_hash, otp_secret, status, created_at) values(?,?,?,?,?,?,?,?)',
      id,
      orgId,
      email,
      name,
      hashPassword(password),
      fixedSecret,
      'ACTIVE',
      createdAt
    );
    db.run(
      'insert into user_roles(user_id, role_code, organization_id, valid_from) values(?,?,?,?)',
      id,
      role,
      orgId,
      createdAt
    );
  }

  db.run(
    'insert into case_references(id, source_system_code, external_case_id, case_number, case_type, owning_organization_id, reconciliation_status, created_at) values(?,?,?,?,?,?,?,?)',
    DEMO.cases.primary,
    'SIP-DEMO',
    'EXT-CASE-001',
    '123/Pid.Sus/2026/PN Demo',
    'PIDANA_KHUSUS',
    DEMO.organizations.court,
    'SYNCHRONIZED',
    createdAt
  );
  db.run(
    'insert into case_references(id, source_system_code, external_case_id, case_number, case_type, owning_organization_id, reconciliation_status, created_at) values(?,?,?,?,?,?,?,?)',
    DEMO.cases.conflict,
    'SIP-DEMO',
    'EXT-CASE-002',
    '124/Pid.Sus/2026/PN Demo',
    'PIDANA_KHUSUS',
    DEMO.organizations.court,
    'SYNCHRONIZED',
    createdAt
  );

  db.run(
    'insert into hearings(id, case_reference_id, hearing_type, state, owning_organization_id, created_at, updated_at) values(?,?,?,?,?,?,?)',
    DEMO.hearings.primary,
    DEMO.cases.primary,
    'PEMERIKSAAN_SAKSI',
    'DRAFT',
    DEMO.organizations.court,
    createdAt,
    createdAt
  );
  db.run(
    'insert into hearings(id, case_reference_id, hearing_type, state, owning_organization_id, created_at, updated_at) values(?,?,?,?,?,?,?)',
    DEMO.hearings.conflict,
    DEMO.cases.conflict,
    'PEMERIKSAAN_SAKSI',
    'SCHEDULED',
    DEMO.organizations.court,
    createdAt,
    createdAt
  );

  const assignments = [
    [DEMO.hearings.primary, DEMO.users.judge, DEMO.organizations.court, 'JUDGE'],
    [DEMO.hearings.primary, DEMO.users.clerk, DEMO.organizations.court, 'COURT_CLERK'],
    [DEMO.hearings.primary, DEMO.users.prosecutor, DEMO.organizations.prosecution, 'PROSECUTOR'],
    [DEMO.hearings.primary, DEMO.users.corrections, DEMO.organizations.corrections, 'CORRECTIONS'],
    [DEMO.hearings.conflict, DEMO.users.judge, DEMO.organizations.court, 'JUDGE'],
    [DEMO.hearings.conflict, DEMO.users.clerk, DEMO.organizations.court, 'COURT_CLERK']
  ];
  for (const [hearingId, userId, orgId, role] of assignments) {
    db.run(
      'insert into hearing_assignments(id, hearing_id, user_id, organization_id, assignment_role, valid_from) values(?,?,?,?,?,?)',
      randomUUID(),
      hearingId,
      userId,
      orgId,
      role,
      createdAt
    );
  }

  // Synthetic active schedule used by conflict tests: 12 Aug 2026, 09:00-10:00 WIB.
  db.run(
    'insert into hearing_schedules(id, hearing_id, version, start_at, end_at, display_timezone, status, approved_by, approval_reason, basis_reference, created_at) values(?,?,?,?,?,?,?,?,?,?,?)',
    DEMO.schedules.conflict,
    DEMO.hearings.conflict,
    1,
    '2026-08-12T02:00:00.000Z',
    '2026-08-12T03:00:00.000Z',
    'Asia/Jakarta',
    'ACTIVE',
    DEMO.users.judge,
    'Synthetic conflict fixture',
    'FIXTURE-001',
    createdAt
  );
  for (const resource of [
    ['ROOM', 'ROOM-A'],
    ['JUDGE', DEMO.users.judge]
  ]) {
    db.run(
      'insert into hearing_schedule_resources(id, schedule_id, resource_type, resource_reference, requirement) values(?,?,?,?,?)',
      randomUUID(),
      DEMO.schedules.conflict,
      resource[0],
      resource[1],
      'REQUIRED'
    );
  }

  db.run(
    'insert into resource_catalog(id, resource_type, organization_id, code, name, status) values(?,?,?,?,?,?)',
    randomUUID(),
    'ROOM',
    DEMO.organizations.court,
    'ROOM-A',
    'Ruang Sidang A',
    'ACTIVE'
  );
  db.run(
    'insert into resource_catalog(id, resource_type, organization_id, code, name, status) values(?,?,?,?,?,?)',
    randomUUID(),
    'ROOM',
    DEMO.organizations.court,
    'ROOM-B',
    'Ruang Sidang B',
    'ACTIVE'
  );

  const seedAudit = {
    id: randomUUID(),
    event_type: 'DEVELOPMENT_DATA_SEEDED',
    actor_user_id: DEMO.users.admin,
    actor_organization_id: DEMO.organizations.court,
    object_type: 'SYSTEM',
    object_id: 'SEED',
    correlation_id: randomUUID(),
    payload: { otp_mode: config.otpMode },
    previous_hash: '0'.repeat(64),
    occurred_at: createdAt
  };
  seedAudit.event_hash = computeAuditHash(seedAudit);
  db.run(
    'insert into audit_events(id, event_type, actor_user_id, actor_organization_id, object_type, object_id, correlation_id, payload_json, previous_hash, event_hash, occurred_at) values(?,?,?,?,?,?,?,?,?,?,?)',
    seedAudit.id,
    seedAudit.event_type,
    seedAudit.actor_user_id,
    seedAudit.actor_organization_id,
    seedAudit.object_type,
    seedAudit.object_id,
    seedAudit.correlation_id,
    JSON.stringify(seedAudit.payload),
    seedAudit.previous_hash,
    seedAudit.event_hash,
    seedAudit.occurred_at
  );
}
