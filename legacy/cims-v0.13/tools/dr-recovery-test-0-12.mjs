import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createCimsApplication } from '../apps/api/src/app.mjs';
import { loadConfig } from '../apps/api/src/config.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cims-dr-'));
const primary = path.join(dir, 'primary.sqlite');
const backup = path.join(dir, 'backup.sqlite');
const restored = path.join(dir, 'restored.sqlite');
const config = loadConfig({
  dbPath: primary,
  tokenSecret: 'dr-test-secret-at-least-thirty-two-characters',
  fixedOtp: '123456',
  exposeDevelopmentOtp: false,
  allowedOrigins: []
});
let app = createCimsApplication(config);
let before;
try {
  app.audit.append({
    eventType: 'DR_TEST_MARKER',
    objectType: 'SYSTEM',
    objectId: 'DR-TEST',
    correlationId: randomUUID(),
    payload: { purpose: 'backup-restore validation' }
  });
  before = {
    organizations: Number(app.db.get('select count(*) as c from organizations').c),
    users: Number(app.db.get('select count(*) as c from users').c),
    cases: Number(app.db.get('select count(*) as c from case_references').c),
    audit_events: Number(app.db.get('select count(*) as c from audit_events').c),
    audit_chain: app.audit.verifyChain()
  };
  app.db.exec('PRAGMA wal_checkpoint(FULL);');
} finally {
  app.close();
}
fs.copyFileSync(primary, backup);
const backupHash = createHash('sha256').update(fs.readFileSync(backup)).digest('hex');
fs.copyFileSync(backup, restored);
app = createCimsApplication({ ...config, dbPath: restored });
let after;
try {
  after = {
    organizations: Number(app.db.get('select count(*) as c from organizations').c),
    users: Number(app.db.get('select count(*) as c from users').c),
    cases: Number(app.db.get('select count(*) as c from case_references').c),
    audit_events: Number(app.db.get('select count(*) as c from audit_events').c),
    audit_chain: app.audit.verifyChain()
  };
} finally {
  app.close();
}
const passed =
  JSON.stringify({
    organizations: before.organizations,
    users: before.users,
    cases: before.cases,
    audit_events: before.audit_events
  }) ===
    JSON.stringify({
      organizations: after.organizations,
      users: after.users,
      cases: after.cases,
      audit_events: after.audit_events
    }) &&
  before.audit_chain.valid &&
  after.audit_chain.valid;
console.log(
  JSON.stringify(
    {
      version: '0.12.0',
      backup_sha256: backupHash,
      backup_size_bytes: fs.statSync(backup).size,
      before,
      after,
      rpo_test: 'zero committed transactions lost after checkpoint',
      rto_seconds: Number(process.uptime().toFixed(3)),
      passed,
      executed_at: new Date().toISOString()
    },
    null,
    2
  )
);
fs.rmSync(dir, { recursive: true, force: true });
if (!passed) process.exitCode = 1;
