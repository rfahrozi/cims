import { requirePermission } from '../iam/authorization.mjs';
export class WorkflowGateService {
  constructor(db,determination,notice,readiness,virtual){this.db=db;this.determination=determination;this.notice=notice;this.readiness=readiness;this.virtual=virtual;}
  status(context,hearingId){
    requirePermission(context,'hearing.read',hearingId);
    const determination=this.determination.latest(hearingId);
    const determinationValid=Boolean(determination&&determination.decision==='APPROVED'&&['ELECTRONIC','HYBRID'].includes(determination.mode)&&Date.parse(determination.effective_at)<=Date.now());
    const schedule=this.db.get("select * from hearing_schedules where hearing_id=? and status='ACTIVE' order by version desc limit 1",hearingId);
    const notice=this.notice.gate(hearingId),readiness=this.readiness.gate(hearingId),virtual=this.virtual.gate(hearingId);
    const runtime=this.db.get('select * from hearing_runtime where hearing_id=?',hearingId);
    const participantCounts=this.db.get(`select count(*) as registered,
      sum(case when ps.state='WAITING' then 1 else 0 end) as waiting,
      sum(case when ps.state in ('ADMITTED','CONSULTATION') then 1 else 0 end) as admitted
      from hearing_participants p left join participant_sessions ps on ps.participant_id=p.id where p.hearing_id=? and p.status='REGISTERED'`,hearingId);
    const incidentCounts=this.db.get(`select count(*) as open_count,sum(case when severity in ('HIGH','CRITICAL') then 1 else 0 end) as blocking_count from incidents where hearing_id=? and status in ('OPEN','MITIGATING')`,hearingId);
    let next='JUDICIAL_DETERMINATION';
    if(determinationValid)next='SCHEDULING';
    if(determinationValid&&schedule)next='OFFICIAL_NOTICE';
    if(schedule&&notice.ready)next='READINESS';
    if(notice.ready&&readiness.ready)next='VIRTUAL_SESSION';
    if(virtual.ready)next='HEARING_CONTROL';
    if(runtime?.state==='STARTED')next='ACTIVE_HEARING';
    if(runtime?.state==='SUSPENDED')next='INCIDENT_OR_RESUME';
    if(runtime?.state==='ENDED')next='AUDIT_AND_CLOSURE';
    return {hearing_id:hearingId,determination_valid:determinationValid,determination:determination??null,schedule_active:Boolean(schedule),active_schedule:schedule??null,notice,readiness,virtual,runtime:runtime??{state:virtual.ready?'READY':'NOT_READY'},participants:{registered:Number(participantCounts.registered??0),waiting:Number(participantCounts.waiting??0),admitted:Number(participantCounts.admitted??0)},incidents:{open:Number(incidentCounts.open_count??0),blocking:Number(incidentCounts.blocking_count??0)},next_gate:next};
  }
}
