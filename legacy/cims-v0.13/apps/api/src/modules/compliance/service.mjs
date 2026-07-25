import { createHash, randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';

const now=()=>new Date().toISOString();
const hash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class ComplianceService {
  constructor(db,audit){this.db=db;this.audit=audit;}

  dashboard(context){
    requirePermission(context,'monitoring.read');
    const hearingStates=this.db.all('select state,count(*) as count from hearings group by state');
    const notice=this.db.get(`select count(*) as total,
      sum(case when status='ACKNOWLEDGED' then 1 else 0 end) as acknowledged,
      sum(case when status='FAILED' then 1 else 0 end) as failed from official_notices`);
    const readiness=this.db.get(`select count(*) as total,
      sum(case when status='READY' then 1 else 0 end) as ready,
      sum(case when status='NOT_READY' then 1 else 0 end) as not_ready from readiness_submissions`);
    const incidents=this.db.get(`select count(*) as total,
      sum(case when status in ('OPEN','MITIGATING') then 1 else 0 end) as open,
      sum(case when incident_type='CYBER' and notification_due_at is not null and notified_at is null and notification_due_at < ? then 1 else 0 end) as overdue_cyber from incidents`,now());
    const appeal=this.db.get(`select count(*) as total,
      sum(case when status='READ' then 1 else 0 end) as read_count from appeal_decision_readings`);
    const appealPublication=this.db.get(`select count(*) as total,
      sum(case when same_day_compliant=1 then 1 else 0 end) as compliant from appeal_publications`);
    const appealTransmission=this.db.get(`select count(*) as total,
      sum(case when seven_day_compliant=1 then 1 else 0 end) as compliant from appeal_transmissions`);
    const reconciliation=this.db.get(`select id,status,total_records,matched_records,mismatch_records,missing_records,completed_at from reconciliation_runs order by started_at desc limit 1`);
    const auditHead=this.db.get('select sequence,event_hash,occurred_at from audit_events order by sequence desc limit 1');
    const readingDeadlines=this.db.all(`select id,case_reference_id,cassation_deadline_at from appeal_decision_readings where status='READ' and cassation_deadline_at is not null order by cassation_deadline_at limit 20`);
    return{
      generated_at:now(),
      hearings:Object.fromEntries(hearingStates.map(x=>[x.state,Number(x.count)])),
      notices:{total:Number(notice?.total??0),acknowledged:Number(notice?.acknowledged??0),failed:Number(notice?.failed??0)},
      readiness:{total:Number(readiness?.total??0),ready:Number(readiness?.ready??0),not_ready:Number(readiness?.not_ready??0)},
      incidents:{total:Number(incidents?.total??0),open:Number(incidents?.open??0),overdue_cyber:Number(incidents?.overdue_cyber??0)},
      appeal:{total:Number(appeal?.total??0),read:Number(appeal?.read_count??0),same_day_publication:{total:Number(appealPublication?.total??0),compliant:Number(appealPublication?.compliant??0)},seven_day_transmission:{total:Number(appealTransmission?.total??0),compliant:Number(appealTransmission?.compliant??0)},cassation_deadlines:readingDeadlines},
      reconciliation:reconciliation??null,
      audit_head:auditHead??null,
    };
  }

  runReconciliation(context,payload,correlationId){
    requirePermission(context,'reconciliation.run');
    assert(typeof payload.source_system_code==='string'&&payload.source_system_code.trim(),'VALIDATION_ERROR','source_system_code is required.',400);
    assert(Array.isArray(payload.records)&&payload.records.length>0,'VALIDATION_ERROR','records must contain at least one source record.',400);
    const id=randomUUID();const startedAt=now();
    this.db.run(`insert into reconciliation_runs(id,source_system_code,status,total_records,started_by,started_at,correlation_id) values(?,?,?,?,?,?,?)`,id,payload.source_system_code.trim(), 'RUNNING',payload.records.length,context.id,startedAt,correlationId);
    let matched=0,mismatch=0,missing=0;
    for(const record of payload.records){
      assert(record.external_case_id,'VALIDATION_ERROR','external_case_id is required for every record.',400);
      const local=this.db.get('select * from case_references where source_system_code=? and external_case_id=?',payload.source_system_code.trim(),record.external_case_id);
      let result,differences={};
      if(!local){result='MISSING_LOCAL';missing+=1;}
      else{
        for(const field of ['case_number','case_type'])if(record[field]!==undefined&&String(record[field]??'')!==String(local[field]??''))differences[field]={source:record[field]??null,local:local[field]??null};
        result=Object.keys(differences).length?'MISMATCH':'MATCHED';if(result==='MATCHED')matched+=1;else mismatch+=1;
      }
      const sourceHash=record.source_hash??hash(record);const localHash=local?hash({external_case_id:local.external_case_id,case_number:local.case_number,case_type:local.case_type}):null;
      this.db.run('insert into reconciliation_items(id,run_id,external_case_id,local_case_reference_id,result,differences_json,source_hash,local_hash,checked_at) values(?,?,?,?,?,?,?,?,?)',randomUUID(),id,record.external_case_id,local?.id??null,result,JSON.stringify(differences),sourceHash,localHash,now());
      if(local)this.db.run('update case_references set reconciliation_status=?,last_synced_at=? where id=?',result==='MATCHED'?'SYNCHRONIZED':'MISMATCH',now(),local.id);
    }
    const completedAt=now();this.db.run("update reconciliation_runs set status='COMPLETED',matched_records=?,mismatch_records=?,missing_records=?,completed_at=? where id=?",matched,mismatch,missing,completedAt,id);
    this.audit.append({eventType:'RECONCILIATION_COMPLETED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'RECONCILIATION_RUN',objectId:id,correlationId,payload:{source_system_code:payload.source_system_code,total_records:payload.records.length,matched_records:matched,mismatch_records:mismatch,missing_records:missing}});
    return this.getReconciliation(context,id);
  }

  getReconciliation(context,id){
    requirePermission(context,'reconciliation.read');
    const run=this.db.get('select * from reconciliation_runs where id=?',id);if(!run)throw new DomainError('RECONCILIATION_NOT_FOUND','Reconciliation run was not found.',404);
    return{...run,items:this.db.all('select * from reconciliation_items where run_id=? order by checked_at',id).map(x=>({...x,differences:JSON.parse(x.differences_json),differences_json:undefined}))};
  }

  listReconciliations(context,limit=20){requirePermission(context,'reconciliation.read');const safe=Math.min(Math.max(Number(limit)||20,1),100);return this.db.all('select * from reconciliation_runs order by started_at desc limit ?',safe);}
}
