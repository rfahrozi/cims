import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';

const idem=(p)=>`${p}-${randomUUID()}`;

test('audit chain verifies and reconciliation records matched, mismatched and missing data',async()=>{
  const app=await startTestApp();
  try{
    const admin=await login(app.baseUrl,'admin@cims.local','Admin123!');
    let response=await fetch(`${app.baseUrl}/api/v1/audit-events/verify-chain`,{headers:authHeaders(admin)});let body=await response.json();assert.equal(response.status,200);assert.equal(body.valid,true);assert.ok(body.event_count>=2);
    response=await fetch(`${app.baseUrl}/api/v1/reconciliation-runs`,{method:'POST',headers:authHeaders(admin,idem('reconcile')),body:JSON.stringify({source_system_code:'SIP-DEMO',records:[
      {external_case_id:'EXT-CASE-001',case_number:'123/Pid.Sus/2026/PN Demo',case_type:'PIDANA_KHUSUS'},
      {external_case_id:'EXT-CASE-002',case_number:'WRONG-NUMBER',case_type:'PIDANA_KHUSUS'},
      {external_case_id:'EXT-CASE-999',case_number:'999/Pid/2026/PN Demo',case_type:'PIDANA'},
    ]})});body=await response.json();assert.equal(response.status,201);assert.equal(body.matched_records,1);assert.equal(body.mismatch_records,1);assert.equal(body.missing_records,1);
    response=await fetch(`${app.baseUrl}/api/v1/compliance-dashboard`,{headers:authHeaders(admin)});body=await response.json();assert.equal(response.status,200);assert.equal(body.reconciliation.id,body.id??body.reconciliation.id);assert.ok(body.audit_head.event_hash);
    response=await fetch(`${app.baseUrl}/api/v1/audit-events/verify-chain`,{headers:authHeaders(admin)});body=await response.json();assert.equal(body.valid,true);
  }finally{await app.stop();}
});
