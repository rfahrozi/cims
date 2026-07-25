import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import { createFakeZoomApi } from '../../services/fake-zoom-api/src/app.mjs';
import { createZoomAdapter } from '../../services/zoom-video-provider/src/app.mjs';

const request=async(base,pathName,{method='GET',body,headers={}}={})=>{
  const raw=body===undefined?undefined:JSON.stringify(body);
  const response=await fetch(base+pathName,{method,headers:{...(raw?{'content-type':'application/json'}:{}),...headers},body:raw});
  const data=await response.json().catch(()=>null);
  return {status:response.status,data,headers:response.headers};
};

const listen=(server)=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address())));
const close=(server)=>new Promise(resolve=>server.close(resolve));

test('Zoom adapter implements real REST/OAuth mapping and explicit capability gaps',async()=>{
  const fake=createFakeZoomApi();
  const fakeAddr=await fake.listen();
  const received=[];
  const receiver=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;received.push({headers:req.headers,body:JSON.parse(raw)});res.writeHead(202,{'content-type':'application/json'});res.end(JSON.stringify({accepted:true}));});
  const receiverAddr=await listen(receiver);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cims-zoom-adapter-'));
  const adapter=createZoomAdapter({
    port:0,dbPath:path.join(tmp,'adapter.sqlite'),environment:'test',
    accountId:fake.config.accountId,clientId:fake.config.clientId,clientSecret:fake.config.clientSecret,hostUserId:fake.config.hostUserId,
    oauthUrl:`http://127.0.0.1:${fakeAddr.port}/oauth/token`,apiBaseUrl:`http://127.0.0.1:${fakeAddr.port}/v2`,
    webhookSecretToken:'zoom-webhook-secret',cimsWebhookUrl:`http://127.0.0.1:${receiverAddr.port}/provider`,cimsProviderWebhookSecret:'cims-provider-secret',
    dataKey:Buffer.alloc(32,7).toString('base64'),requestTimeoutMs:3000,
  });
  const adapterAddr=await adapter.listen();
  const base=`http://127.0.0.1:${adapterAddr.port}`;
  try{
    let r=await request(base,'/health');
    assert.equal(r.status,200);assert.equal(r.data.status,'HEALTHY');assert.equal(r.data.details.capabilities.live_breakout_room_move,false);

    const sessionPayload={hearing_reference:'hearing-zoom-001',start_at:'2026-08-20T02:00:00.000Z',end_at:'2026-08-20T04:00:00.000Z',recording_policy:'COURT_CONTROLLED'};
    r=await request(base,'/sessions',{method:'POST',body:sessionPayload,headers:{'idempotency-key':'zoom-session-001'}});
    assert.equal(r.status,201);const sessionRef=r.data.provider_session_reference;assert.ok(sessionRef);
    const repeated=await request(base,'/sessions',{method:'POST',body:sessionPayload,headers:{'idempotency-key':'zoom-session-001'}});
    assert.equal(repeated.status,200);assert.equal(repeated.data.provider_session_reference,sessionRef);

    const roomRefs={};
    for(const type of ['MAIN','WAITING','DEFENDANT','WITNESS','CONSULTATION']){
      const room=await request(base,`/sessions/${sessionRef}/rooms`,{method:'POST',body:{room_code:type,room_type:type,recording_allowed:type==='MAIN'}});
      assert.ok([200,201].includes(room.status));roomRefs[type]=room.data.provider_room_reference;
    }

    r=await request(base,`/sessions/${sessionRef}/access`,{method:'POST',body:{participant_reference:'participant-001',participant_email:'participant@example.test',participant_name:'Peserta Uji',role:'DEFENDANT',room_reference:roomRefs.WAITING,expires_at:'2026-08-20T04:00:00.000Z',permissions:['AUDIO','VIDEO']}});
    assert.equal(r.status,201);const accessRef=r.data.participant_access_reference;assert.match(r.data.participant_join_url,/tk=/);
    const access=await request(base,`/access/${accessRef}`);assert.equal(access.status,200);assert.equal(access.data.revoked,false);

    const preassign=await request(base,`/access/${accessRef}/move`,{method:'POST',body:{room_reference:roomRefs.DEFENDANT}});
    assert.equal(preassign.status,200);assert.equal(preassign.data.state,'PREASSIGNED');
    const fakeMeeting=fake.meetings.get(sessionRef);assert.deepEqual(fakeMeeting.settings.breakout_room.rooms,[{name:'DEFENDANT',participants:['participant@example.test']}]);

    const mainMove=await request(base,`/access/${accessRef}/move`,{method:'POST',body:{room_reference:roomRefs.MAIN}});
    assert.equal(mainMove.status,409);assert.equal(mainMove.data.code,'CAPABILITY_NOT_SUPPORTED');assert.equal(mainMove.data.details.manual_action_required,true);

    const recording=await request(base,`/sessions/${sessionRef}/recording`,{method:'POST',body:{action:'START'}});
    assert.equal(recording.status,200);assert.equal(recording.data.state,'STARTED');

    const validation=await request(base,'/webhooks/zoom',{method:'POST',body:{event:'endpoint.url_validation',payload:{plainToken:'plain-token'}}});
    assert.equal(validation.status,200);assert.equal(validation.data.plainToken,'plain-token');
    assert.equal(validation.data.encryptedToken,createHmac('sha256','zoom-webhook-secret').update('plain-token').digest('hex'));

    const event={event:'meeting.started',event_ts:Date.now(),payload:{account_id:'fake',object:{id:Number(sessionRef),uuid:'uuid',host_id:'host',topic:'CIMS'}}};
    const eventRaw=JSON.stringify(event);const ts=String(Math.floor(Date.now()/1000));const sig='v0='+createHmac('sha256','zoom-webhook-secret').update(`v0:${ts}:${eventRaw}`).digest('hex');
    const webhookResponse=await fetch(base+'/webhooks/zoom',{method:'POST',headers:{'content-type':'application/json','x-zm-request-timestamp':ts,'x-zm-signature':sig,'x-zm-trackingid':'tracking-001'},body:eventRaw});
    assert.equal(webhookResponse.status,200);assert.equal(received.at(-1).body.event_type,'session.started');assert.equal(received.at(-1).body.provider_session_reference,sessionRef);

    const liveMove=await request(base,`/access/${accessRef}/move`,{method:'POST',body:{room_reference:roomRefs.WITNESS}});
    assert.equal(liveMove.status,409);assert.equal(liveMove.data.code,'CAPABILITY_NOT_SUPPORTED');

    const revoke=await request(base,`/access/${accessRef}/revoke`,{method:'POST',body:{reason:'test'}});
    assert.equal(revoke.status,200);assert.equal(revoke.data.revoked,true);
    const revoked=await request(base,`/access/${accessRef}`);assert.equal(revoked.data.revoked,true);

    const badWebhook=await fetch(base+'/webhooks/zoom',{method:'POST',headers:{'content-type':'application/json','x-zm-request-timestamp':ts,'x-zm-signature':'v0=bad'},body:eventRaw});
    assert.equal(badWebhook.status,401);
  }finally{
    await adapter.close();await fake.close();await close(receiver);fs.rmSync(tmp,{recursive:true,force:true});
  }
});
