import { createServer } from 'node:http';
import { Router } from './common/router.mjs';
import { DomainError } from './common/domain-error.mjs';
import { applyCors, applySecurityHeaders, correlationId, readJson, sendError, sendJson } from './common/http.mjs';
import { bearerToken, verifyAccessToken } from './common/security.mjs';
import { createDatabase } from './infrastructure/bootstrap.mjs';
import { AuditService } from './common/audit-service.mjs';
import { IdempotencyService } from './common/idempotency.mjs';
import { IamService } from './modules/iam/service.mjs';
import { CaseService } from './modules/case/service.mjs';
import { DeterminationService } from './modules/determination/service.mjs';
import { SchedulingService } from './modules/scheduling/service.mjs';
import { NoticeService } from './modules/notice/service.mjs';
import { ReadinessService } from './modules/readiness/service.mjs';
import { VirtualService } from './modules/virtual/service.mjs';
import { ParticipantService } from './modules/participant/service.mjs';
import { HearingControlService } from './modules/hearing-control/service.mjs';
import { IncidentService } from './modules/incident/service.mjs';
import { WorkflowGateService } from './modules/workflow/gate-service.mjs';
import { requirePermission } from './modules/iam/authorization.mjs';
import { FixedWindowRateLimiter } from './common/rate-limiter.mjs';
import { AppealDecisionService } from './modules/appeal/service.mjs';
import { ComplianceService } from './modules/compliance/service.mjs';

function result(status, body, headers={}) { return {status,body,headers}; }

export function createCimsApplication(config) {
  const db=createDatabase(config);
  const audit=new AuditService(db);
  const idempotency=new IdempotencyService(db);
  const iam=new IamService(db,config,audit);
  const cases=new CaseService(db);
  const determinations=new DeterminationService(db,audit,cases);
  const scheduling=new SchedulingService(db,audit,determinations,cases);
  const notices=new NoticeService(db,audit,cases);
  const readiness=new ReadinessService(db,audit,cases,notices);
  const virtual=new VirtualService(db,audit,config,determinations,notices,readiness);
  const participants=new ParticipantService(db,audit,config);
  const hearingControl=new HearingControlService(db,audit);
  const incidents=new IncidentService(db,audit,hearingControl);
  const gate=new WorkflowGateService(db,determinations,notices,readiness,virtual);
  const appeal=new AppealDecisionService(db,audit);
  const compliance=new ComplianceService(db,audit);
  const loginLimiter=new FixedWindowRateLimiter({windowMs:60_000,max:config.loginRateLimitPerMinute});
  const publicLimiter=new FixedWindowRateLimiter({windowMs:60_000,max:config.publicRateLimitPerMinute});
  const router=new Router();

  router.add('GET','/health',async()=>result(200,{status:'HEALTHY',service:'cims-api',version:'0.12.0',database:'sqlite-development-adapter',provider:config.providerCode}),{auth:false});
  router.add('POST','/api/v1/auth/login',async({request,body,correlationId})=>result(200,iam.login(body,correlationId,{ip:request.socket.remoteAddress,route:request.url,userAgent:request.headers['user-agent']})),{auth:false});
  router.add('POST','/api/v1/auth/verify-otp',async({request,body,correlationId})=>result(200,iam.verifyChallenge(body,correlationId,{ip:request.socket.remoteAddress,route:request.url,userAgent:request.headers['user-agent']})),{auth:false});
  router.add('POST','/api/v1/public/join-tokens:exchange',async({body,correlationId})=>result(200,await participants.exchangeJoinToken(body,correlationId)),{auth:false});
  router.add('GET','/api/v1/me',async({context})=>result(200,iam.publicContext(context)));

  router.add('GET','/api/v1/admin/users',async({context})=>result(200,{items:iam.listUsers(context)}));
  router.add('POST','/api/v1/admin/users',async({context,body,correlationId})=>result(201,iam.createUser(context,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/admin/hearings/:hearingId/assignments',async({context,params,body,correlationId})=>result(201,iam.assignHearing(context,params.hearingId,body,correlationId)),{idempotent:true});

  router.add('GET','/api/v1/cases',async({context})=>result(200,{items:cases.listCases(context)}));
  router.add('GET','/api/v1/hearings',async({context})=>result(200,{items:cases.listHearings(context)}));
  router.add('GET','/api/v1/hearings/:hearingId/gate-status',async({context,params})=>result(200,gate.status(context,params.hearingId)));

  router.add('POST','/api/v1/electronic-hearing-requests',async({context,body,correlationId})=>result(201,determinations.createRequest(context,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/judicial-determinations',async({context,body,correlationId})=>result(201,determinations.createDetermination(context,body,correlationId)),{idempotent:true});

  router.add('GET','/api/v1/hearings/:hearingId/availability',async({context,params,url})=>result(200,scheduling.availability(context,params.hearingId,url.searchParams.get('from'),url.searchParams.get('to'))));
  router.add('POST','/api/v1/hearings/:hearingId/schedule-proposals',async({context,params,body,correlationId})=>result(201,scheduling.createProposal(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/schedule-proposals/:proposalId/conflicts:check',async({context,params,correlationId})=>result(200,scheduling.checkConflicts(context,params.proposalId,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/schedule-proposals/:proposalId/conflicts/:conflictId:resolve',async({context,params,body,correlationId})=>result(200,scheduling.resolveConflict(context,params.proposalId,params.conflictId,body.note,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/schedule-proposals/:proposalId:approve',async({context,params,body,correlationId})=>result(200,scheduling.approve(context,params.proposalId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId/reschedules',async({context,params,body,correlationId})=>result(201,scheduling.reschedule(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/schedules',async({context,params})=>result(200,{items:scheduling.listSchedules(context,params.hearingId)}));

  router.add('POST','/api/v1/hearings/:hearingId/notices',async({context,params,body,correlationId})=>result(201,notices.create(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/notices/:noticeId:send',async({context,params,correlationId})=>result(200,notices.send(context,params.noticeId,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/notices/:noticeId:acknowledge',async({context,params,body,correlationId})=>result(200,notices.acknowledge(context,params.noticeId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/notices',async({context,params})=>result(200,{items:notices.list(context,params.hearingId)}));

  router.add('POST','/api/v1/hearings/:hearingId/identity-verifications',async({context,params,body,correlationId})=>result(201,readiness.verifyIdentity(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId/room-inspections',async({context,params,body,correlationId})=>result(201,readiness.inspectRoom(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId/readiness-submissions',async({context,params,body,correlationId})=>result(201,readiness.submit(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/readiness',async({context,params})=>result(200,{gate:readiness.gate(params.hearingId),items:readiness.list(context,params.hearingId)}));

  router.add('POST','/api/v1/hearings/:hearingId/virtual-session:provision',async({context,params,body,correlationId})=>result(201,await virtual.provision(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/virtual-session',async({context,params})=>result(200,virtual.get(context,params.hearingId)));
  router.add('POST','/api/v1/provider-webhooks/video',async({request,body,correlationId})=>result(202,virtual.webhook(request.headers,body,correlationId)),{auth:false});

  router.add('POST','/api/v1/hearings/:hearingId/participants',async({context,params,body,correlationId})=>result(201,participants.register(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/participants',async({context,params})=>result(200,{items:participants.list(context,params.hearingId)}));
  router.add('GET','/api/v1/hearings/:hearingId/participants/:participantId',async({context,params})=>result(200,participants.status(context,params.hearingId,params.participantId)));
  router.add('POST','/api/v1/hearings/:hearingId/participants/:participantId/join-token',async({context,params,body,correlationId})=>result(201,await participants.issueJoinToken(context,params.hearingId,params.participantId,body,correlationId)));
  router.add('POST','/api/v1/hearings/:hearingId/participants/:participantId:admit',async({context,params,body,correlationId})=>result(200,await participants.admit(context,params.hearingId,params.participantId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId/participants/:participantId:leave',async({context,params,body,correlationId})=>result(200,await participants.leave(context,params.hearingId,params.participantId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/attendance',async({context,params})=>result(200,participants.attendance(context,params.hearingId)));
  router.add('POST','/api/v1/hearings/:hearingId/consultations',async({context,params,body,correlationId})=>result(201,await participants.startConsultation(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId/consultations/current:end',async({context,params,body,correlationId})=>result(200,await participants.endConsultation(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/consultations/current',async({context,params})=>result(200,participants.consultation(context,params.hearingId)));

  router.add('GET','/api/v1/hearings/:hearingId/runtime',async({context,params})=>result(200,hearingControl.status(context,params.hearingId)));
  router.add('POST','/api/v1/hearings/:hearingId:start',async({context,params,body,correlationId})=>result(200,hearingControl.start(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId:suspend',async({context,params,body,correlationId})=>result(200,hearingControl.suspend(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId:resume',async({context,params,body,correlationId})=>result(200,hearingControl.resume(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/hearings/:hearingId:end',async({context,params,body,correlationId})=>result(200,hearingControl.end(context,params.hearingId,body,correlationId)),{idempotent:true});

  router.add('POST','/api/v1/hearings/:hearingId/incidents',async({context,params,body,correlationId})=>result(201,incidents.create(context,params.hearingId,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/hearings/:hearingId/incidents',async({context,params})=>result(200,{items:incidents.list(context,params.hearingId)}));
  router.add('POST','/api/v1/incidents/:incidentId/actions',async({context,params,body,correlationId})=>result(200,incidents.addAction(context,params.incidentId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/incidents/:incidentId:notify',async({context,params,body,correlationId})=>result(200,incidents.notify(context,params.incidentId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/incidents/:incidentId:resolve',async({context,params,body,correlationId})=>result(200,incidents.resolve(context,params.incidentId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/incidents/:incidentId:close',async({context,params,body,correlationId})=>result(200,incidents.close(context,params.incidentId,body,correlationId)),{idempotent:true});

  router.add('GET','/api/v1/audit-events',async({context,url})=>{requirePermission(context,'audit.read');return result(200,{items:audit.list({hearingId:url.searchParams.get('hearing_id')??undefined,limit:url.searchParams.get('limit')??100})});});

  router.add('POST','/api/v1/appeal-decision-readings',async({context,body,correlationId})=>result(201,appeal.schedule(context,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/appeal-decision-readings/:readingId',async({context,params})=>result(200,appeal.get(context,params.readingId)));
  router.add('GET','/api/v1/cases/:caseReferenceId/appeal-decision-readings',async({context,params})=>result(200,{items:appeal.list(context,params.caseReferenceId)}));
  router.add('POST','/api/v1/appeal-decision-readings/:readingId:reschedule',async({context,params,body,correlationId})=>result(201,appeal.reschedule(context,params.readingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/appeal-decision-readings/:readingId/notices',async({context,params,body,correlationId})=>result(201,appeal.recordNotice(context,params.readingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/appeal-decision-readings/:readingId/presence',async({context,params,body,correlationId})=>result(201,appeal.recordPresence(context,params.readingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/appeal-decision-readings/:readingId:complete',async({context,params,body,correlationId})=>result(200,appeal.completeReading(context,params.readingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/appeal-decision-readings/:readingId/excerpt',async({context,params,body,correlationId})=>result(201,appeal.publishExcerpt(context,params.readingId,body,correlationId)),{idempotent:true});
  router.add('POST','/api/v1/appeal-decision-readings/:readingId/transmission',async({context,params,body,correlationId})=>result(201,appeal.recordTransmission(context,params.readingId,body,correlationId)),{idempotent:true});

  router.add('GET','/api/v1/compliance-dashboard',async({context})=>result(200,compliance.dashboard(context)));
  router.add('POST','/api/v1/reconciliation-runs',async({context,body,correlationId})=>result(201,compliance.runReconciliation(context,body,correlationId)),{idempotent:true});
  router.add('GET','/api/v1/reconciliation-runs',async({context,url})=>result(200,{items:compliance.listReconciliations(context,url.searchParams.get('limit')??20)}));
  router.add('GET','/api/v1/reconciliation-runs/:runId',async({context,params})=>result(200,compliance.getReconciliation(context,params.runId)));
  router.add('GET','/api/v1/audit-events/verify-chain',async({context})=>{requirePermission(context,'audit.read');return result(200,audit.verifyChain());});
  router.add('GET','/api/v1/security-events',async({context,url})=>{requirePermission(context,'security.read');const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||100,1),500);return result(200,{items:db.all('select * from security_events order by sequence desc limit ?',limit).map(x=>({...x,details:JSON.parse(x.details_json),details_json:undefined}))});});


  const handler=async(request,response)=>{
    const corrId=correlationId(request);
    applyCors(request,response,config.allowedOrigins);
    applySecurityHeaders(response);
    if(request.method==='OPTIONS'){response.writeHead(204);response.end();return;}
    try{
      const url=new URL(request.url,'http://localhost');
      const route=router.match(request.method,url.pathname);
      if(!route)throw new DomainError('NOT_FOUND','Endpoint was not found.',404);
      const clientKey=`${request.socket.remoteAddress??'unknown'}:${url.pathname}`;
      if(['/api/v1/auth/login','/api/v1/auth/verify-otp'].includes(url.pathname))loginLimiter.consume(clientKey);
      if(url.pathname==='/api/v1/public/join-tokens:exchange')publicLimiter.consume(clientKey);
      const body=['POST','PUT','PATCH'].includes(request.method)?await readJson(request):{};
      let context;
      if(route.options.auth!==false){const tokenPayload=verifyAccessToken(bearerToken(request),config.tokenSecret);context=iam.context(tokenPayload.sub);}
      let replay,idemKey,requestHash;
      if(route.options.idempotent){
        idemKey=request.headers['idempotency-key'];
        if(typeof idemKey!=='string'||idemKey.length<16||idemKey.length>128)throw new DomainError('IDEMPOTENCY_KEY_REQUIRED','Idempotency-Key must contain 16-128 characters.',400);
        requestHash=idempotency.requestHash({method:request.method,pathname:url.pathname,body});
        replay=idempotency.replay(context.id,idemKey,requestHash);
      }
      if(replay){sendJson(response,replay.status,replay.body,corrId,{'x-idempotent-replay':'true'});return;}
      const output=await route.handler({request,response,url,params:route.params,body,context,correlationId:corrId});
      const normalized=output??result(204,null);
      if(route.options.idempotent)idempotency.store(context.id,idemKey,requestHash,normalized.status,normalized.body);
      sendJson(response,normalized.status,normalized.body,corrId,normalized.headers);
    }catch(error){sendError(response,error,corrId);}
  };

  return {config,db,audit,iam,cases,determinations,scheduling,notices,readiness,virtual,participants,hearingControl,incidents,gate,appeal,compliance,createServer:()=>createServer(handler),close:()=>db.close()};
}
