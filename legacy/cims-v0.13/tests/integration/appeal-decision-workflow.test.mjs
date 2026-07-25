import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';
import { DEMO } from '../helpers/workflow.mjs';

const idem=(p)=>`${p}-${randomUUID()}`;
async function post(base,path,token,body){const response=await fetch(base+path,{method:'POST',headers:authHeaders(token,idem(path.replace(/\W/g,''))),body:JSON.stringify(body??{})});const json=await response.json();return{response,json};}

test('appeal decision reading enforces notice, presence, same-day publication and seven-day transmission evidence',async()=>{
  const app=await startTestApp();
  try{
    const judge=await login(app.baseUrl,'judge@cims.local','Judge123!');
    const clerk=await login(app.baseUrl,'clerk@cims.local','Clerk123!');
    const prosecutor=await login(app.baseUrl,'prosecutor@cims.local','Prosecutor123!');
    const corrections=await login(app.baseUrl,'corrections@cims.local','Corrections123!');
    let out=await post(app.baseUrl,'/api/v1/appeal-decision-readings',clerk,{case_reference_id:DEMO.caseId,scheduled_at:'2026-08-20T02:00:00.000Z',display_timezone:'Asia/Jakarta',delivery_mode:'ELECTRONIC',determination_reference:'PT-DEMO/PEN/001/2026'});
    assert.equal(out.response.status,201);const readingId=out.json.id;
    for(const step of [
      [clerk,'COURT_TO_PROSECUTION','PROSECUTOR-DEMO','PT-NOTICE-001'],
      [prosecutor,'PROSECUTION_TO_DEFENDANT','DEFENDANT-DEMO','KEJARI-NOTICE-001'],
      [corrections,'CORRECTIONS_TO_DEFENDANT','DEFENDANT-DEMO','RUTAN-RECEIPT-001'],
    ]){
      out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${readingId}/notices`,step[0],{step_code:step[1],recipient_reference:step[2],channel:'IN_APP',official_reference:step[3],status:'ACKNOWLEDGED',receipt_reference:`ACK-${step[3]}`,sent_at:'2026-08-18T02:00:00.000Z',acknowledged_at:'2026-08-18T03:00:00.000Z'});
      assert.equal(out.response.status,201);
    }
    out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${readingId}/presence`,clerk,{party_role:'DEFENDANT',party_reference:'DEFENDANT-DEMO',attendance_status:'PRESENT',attendance_mode:'ELECTRONIC'});assert.equal(out.response.status,201);
    out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${readingId}/presence`,clerk,{party_role:'PROSECUTOR',party_reference:'PROSECUTOR-DEMO',attendance_status:'PRESENT',attendance_mode:'ELECTRONIC'});assert.equal(out.response.status,201);
    out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${readingId}:complete`,judge,{read_at:'2026-08-20T02:15:00.000Z',open_to_public:true});
    assert.equal(out.response.status,200);assert.equal(out.json.status,'READ');assert.equal(out.json.cassation_deadline_at,'2026-09-03T02:15:00.000Z');
    out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${readingId}/excerpt`,clerk,{excerpt_reference:'SIP-EXCERPT-001',source_system_code:'SIP-DEMO',published_at:'2026-08-20T10:00:00.000Z'});
    assert.equal(out.response.status,201);assert.equal(out.json.publication.same_day_compliant,true);
    out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${readingId}/transmission`,clerk,{destination_court_reference:'PN-DEMO',transmission_reference:'PT-SEND-001',transmitted_at:'2026-08-25T02:00:00.000Z'});
    assert.equal(out.response.status,201);assert.equal(out.json.transmission.seven_day_compliant,true);assert.equal(out.json.compliance.notice_chain_complete,true);assert.equal(out.json.compliance.presence_record_complete,true);
  }finally{await app.stop();}
});

test('appeal decision cannot be completed without presence records',async()=>{
  const app=await startTestApp();
  try{
    const judge=await login(app.baseUrl,'judge@cims.local','Judge123!');const clerk=await login(app.baseUrl,'clerk@cims.local','Clerk123!');
    let out=await post(app.baseUrl,'/api/v1/appeal-decision-readings',clerk,{case_reference_id:DEMO.caseId,scheduled_at:'2026-08-21T02:00:00.000Z',delivery_mode:'DIRECT',determination_reference:'PT-DEMO/PEN/002/2026'});const id=out.json.id;
    out=await post(app.baseUrl,`/api/v1/appeal-decision-readings/${id}:complete`,judge,{read_at:'2026-08-21T02:10:00.000Z',open_to_public:true});
    assert.equal(out.response.status,409);assert.equal(out.json.error.code,'PRESENCE_RECORD_REQUIRED');
  }finally{await app.stop();}
});
