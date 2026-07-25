import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startTestApp, login, authHeaders } from '../tests/helpers/test-app.mjs';
import { DEMO, prepareActiveSchedule, prepareNotices, prepareReadiness, prepareVirtual } from '../tests/helpers/workflow.mjs';

const port=43209;
const provider=spawn(process.execPath,['services/mock-video-provider/src/server.mjs'],{cwd:process.cwd(),env:{...process.env,MOCK_PROVIDER_PORT:String(port),MOCK_PROVIDER_WEBHOOK_SECRET:'demo-provider-secret'},stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('provider start timeout')),3000);provider.stdout.on('data',d=>{if(String(d).includes('listening')){clearTimeout(timer);resolve();}});});
const app=await startTestApp({providerBaseUrl:`http://127.0.0.1:${port}`,providerWebhookSecret:'demo-provider-secret'});
const idem=(prefix)=>`${prefix}-${crypto.randomUUID()}`;
async function post(path,token,body={},idempotent=true){const response=await fetch(app.baseUrl+path,{method:'POST',headers:token?authHeaders(token,idempotent?idem('demo'):undefined):{'content-type':'application/json'},body:JSON.stringify(body)});const json=await response.json();if(!response.ok)throw new Error(`${path}: ${JSON.stringify(json)}`);return json;}
try{
  const tokens={admin:await login(app.baseUrl,'admin@cims.local','Admin123!'),judge:await login(app.baseUrl,'judge@cims.local','Judge123!'),clerk:await login(app.baseUrl,'clerk@cims.local','Clerk123!'),prosecutor:await login(app.baseUrl,'prosecutor@cims.local','Prosecutor123!'),corrections:await login(app.baseUrl,'corrections@cims.local','Corrections123!')};
  const schedule=await prepareActiveSchedule(app.baseUrl,tokens);const notices=await prepareNotices(app.baseUrl,tokens);await prepareReadiness(app.baseUrl,tokens);const virtual=await prepareVirtual(app.baseUrl,tokens);
  const defendant=await post(`/api/v1/hearings/${DEMO.hearingId}/participants`,tokens.corrections,{participant_reference:'DEMO-DEFENDANT',display_name:'Terdakwa Demo',participant_role:'DEFENDANT',protected_identity:true,public_alias:'Terdakwa A',default_room_code:'DEFENDANT'});
  const advocate=await post(`/api/v1/hearings/${DEMO.hearingId}/participants`,tokens.clerk,{participant_reference:'DEMO-ADVOCATE',display_name:'Advokat Demo',participant_role:'ADVOCATE',default_room_code:'DEFENDANT'});
  async function joinAndAdmit(participant){const issued=await post(`/api/v1/hearings/${DEMO.hearingId}/participants/${participant.id}/join-token`,tokens.clerk,{room_code:'WAITING',ttl_minutes:30},false);const exchanged=await post('/api/v1/public/join-tokens:exchange',null,{join_token:issued.join_token},false);const admitted=await post(`/api/v1/hearings/${DEMO.hearingId}/participants/${participant.id}:admit`,tokens.judge,{target_room_code:'DEFENDANT'});return{issued:{token_id:issued.token_id,expires_at:issued.expires_at},exchanged:{participant_session_id:exchanged.participant_session_id,state:exchanged.state,room_code:exchanged.room_code,expires_at:exchanged.expires_at},admitted};}
  const defendantAccess=await joinAndAdmit(defendant);const advocateAccess=await joinAndAdmit(advocate);
  const started=await post(`/api/v1/hearings/${DEMO.hearingId}:start`,tokens.judge,{reason:'Demo hearing started'});
  const consultation=await post(`/api/v1/hearings/${DEMO.hearingId}/consultations`,tokens.judge,{participant_ids:[defendant.id,advocate.id],reason:'Konsultasi privat demo'});
  const consultationEnded=await post(`/api/v1/hearings/${DEMO.hearingId}/consultations/current:end`,tokens.judge,{reason:'Konsultasi demo selesai'});
  const technical=await post(`/api/v1/hearings/${DEMO.hearingId}/incidents`,tokens.clerk,{incident_type:'TECHNICAL',severity:'HIGH',summary:'Gangguan audio demo',details:'Simulasi untuk continuity test.'});
  const resolved=await post(`/api/v1/incidents/${technical.id}:resolve`,tokens.clerk,{resolution:'Audio dipulihkan melalui koneksi cadangan.'});
  const resumed=await post(`/api/v1/hearings/${DEMO.hearingId}:resume`,tokens.judge,{reason:'Gangguan demo telah dipulihkan'});
  const ended=await post(`/api/v1/hearings/${DEMO.hearingId}:end`,tokens.judge,{reason:'Agenda demo selesai'});
  const gate=await fetch(`${app.baseUrl}/api/v1/hearings/${DEMO.hearingId}/gate-status`,{headers:authHeaders(tokens.clerk)}).then(r=>r.json());
  const attendance=await fetch(`${app.baseUrl}/api/v1/hearings/${DEMO.hearingId}/attendance`,{headers:authHeaders(tokens.clerk)}).then(r=>r.json());
  console.log(JSON.stringify({version:'0.9.0',schedule,notice_ids:notices.map(n=>n.id),virtual_session_id:virtual.id,participants:[defendant,advocate],access:{defendant:defendantAccess,advocate:advocateAccess},hearing_states:{started:started.state,after_incident:'SUSPENDED',resumed:resumed.state,ended:ended.state},consultation:{started:consultation.state,ended:consultationEnded.state},incident:{created:technical,resolved},attendance_event_count:attendance.events.length,gate},null,2));
}finally{await app.stop();provider.kill('SIGTERM');await once(provider,'exit').catch(()=>{});}
