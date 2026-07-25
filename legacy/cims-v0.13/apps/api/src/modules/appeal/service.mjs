import { createHash, randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';

const now = () => new Date().toISOString();
const validIso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const addDays = (iso, days) => new Date(Date.parse(iso) + days * 86_400_000).toISOString();
const jakartaDate = (iso) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(iso));
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

export class AppealDecisionService {
  constructor(db, audit) { this.db=db; this.audit=audit; }

  schedule(context, payload, correlationId) {
    requirePermission(context, 'appeal.write');
    for (const field of ['case_reference_id','scheduled_at','delivery_mode','determination_reference']) assert(payload[field], 'VALIDATION_ERROR', `${field} is required.`, 400);
    assert(validIso(payload.scheduled_at), 'VALIDATION_ERROR', 'scheduled_at must be ISO-8601.', 400);
    assert(['DIRECT','ELECTRONIC','HYBRID'].includes(payload.delivery_mode), 'VALIDATION_ERROR', 'delivery_mode is invalid.', 400);
    const caseRef = this.db.get('select * from case_references where id=?', payload.case_reference_id);
    if (!caseRef) throw new DomainError('CASE_NOT_FOUND', 'Case reference was not found.', 404);
    const existing = this.db.get("select * from appeal_decision_readings where case_reference_id=? and status='SCHEDULED'", payload.case_reference_id);
    if (existing) throw new DomainError('APPEAL_READING_ALREADY_SCHEDULED', 'An active decision reading already exists for this case.', 409, {reading_id:existing.id});
    const versionRow = this.db.get('select coalesce(max(version),0)+1 as version from appeal_decision_readings where case_reference_id=?', payload.case_reference_id);
    const id = randomUUID(); const at=now();
    this.db.run(`insert into appeal_decision_readings(id,case_reference_id,version,scheduled_at,display_timezone,delivery_mode,determination_reference,virtual_session_reference,status,created_by,created_at,updated_at)
      values(?,?,?,?,?,?,?,?,?,?,?,?)`, id, payload.case_reference_id, Number(versionRow.version), payload.scheduled_at, payload.display_timezone ?? 'Asia/Jakarta', payload.delivery_mode, payload.determination_reference.trim(), payload.virtual_session_reference ?? null, 'SCHEDULED', context.id, at, at);
    this.audit.append({eventType:'APPEAL_READING_SCHEDULED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_DECISION_READING',objectId:id,correlationId,payload:{case_reference_id:payload.case_reference_id,scheduled_at:payload.scheduled_at,delivery_mode:payload.delivery_mode,version:Number(versionRow.version)}});
    return this.get(context,id);
  }

  reschedule(context, readingId, payload, correlationId) {
    requirePermission(context, 'appeal.write');
    const current=this.#reading(readingId);
    if(current.status!=='SCHEDULED')throw new DomainError('INVALID_APPEAL_TRANSITION','Only a SCHEDULED reading may be rescheduled.',409,{status:current.status});
    assert(validIso(payload.scheduled_at), 'VALIDATION_ERROR', 'scheduled_at must be ISO-8601.', 400);
    assert(typeof payload.reason==='string'&&payload.reason.trim().length>=5,'VALIDATION_ERROR','reason is required.',400);
    const at=now();
    this.db.run("update appeal_decision_readings set status='SUPERSEDED',reschedule_reason=?,updated_at=? where id=?",payload.reason.trim(),at,readingId);
    const id=randomUUID(); const version=Number(current.version)+1;
    this.db.run(`insert into appeal_decision_readings(id,case_reference_id,version,scheduled_at,display_timezone,delivery_mode,determination_reference,virtual_session_reference,status,reschedule_reason,created_by,created_at,updated_at)
      values(?,?,?,?,?,?,?,?,?,?,?,?,?)`,id,current.case_reference_id,version,payload.scheduled_at,current.display_timezone,payload.delivery_mode??current.delivery_mode,payload.determination_reference??current.determination_reference,payload.virtual_session_reference??current.virtual_session_reference,'SCHEDULED',payload.reason.trim(),context.id,at,at);
    this.audit.append({eventType:'APPEAL_READING_RESCHEDULED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_DECISION_READING',objectId:id,correlationId,payload:{superseded_reading_id:readingId,scheduled_at:payload.scheduled_at,version,reason:payload.reason.trim()}});
    return this.get(context,id);
  }

  recordNotice(context, readingId, payload, correlationId) {
    requirePermission(context,'appeal.notice');
    const reading=this.#reading(readingId); if(reading.status!=='SCHEDULED')throw new DomainError('APPEAL_READING_NOT_ACTIVE','Notice may only be recorded for a SCHEDULED reading.',409);
    for(const field of ['step_code','recipient_reference','channel','official_reference','status'])assert(payload[field],'VALIDATION_ERROR',`${field} is required.`,400);
    assert(['COURT_TO_PROSECUTION','PROSECUTION_TO_DEFENDANT','PROSECUTION_TO_ADVOCATE','CORRECTIONS_TO_DEFENDANT'].includes(payload.step_code),'VALIDATION_ERROR','step_code is invalid.',400);
    assert(['SENT','DELIVERED','ACKNOWLEDGED','FAILED'].includes(payload.status),'VALIDATION_ERROR','status is invalid.',400);
    const id=randomUUID();const sentAt=payload.sent_at??now();const ack=payload.status==='ACKNOWLEDGED'?(payload.acknowledged_at??now()):null;
    try{this.db.run(`insert into appeal_notice_steps(id,reading_id,step_code,sender_organization_id,recipient_reference,channel,official_reference,status,sent_at,acknowledged_at,receipt_reference,actor_user_id,correlation_id)
      values(?,?,?,?,?,?,?,?,?,?,?,?,?)`,id,readingId,payload.step_code,context.organization_id,payload.recipient_reference,payload.channel,payload.official_reference,payload.status,sentAt,ack,payload.receipt_reference??null,context.id,correlationId);}catch(error){if(String(error.message).includes('UNIQUE'))throw new DomainError('APPEAL_NOTICE_DUPLICATE','The same notice step and recipient already exists.',409);throw error;}
    this.audit.append({eventType:'APPEAL_NOTICE_RECORDED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_NOTICE_STEP',objectId:id,correlationId,payload:{reading_id:readingId,step_code:payload.step_code,status:payload.status,official_reference:payload.official_reference}});
    return this.get(context,readingId);
  }

  recordPresence(context, readingId, payload, correlationId) {
    requirePermission(context,'appeal.presence');this.#reading(readingId);
    for(const field of ['party_role','party_reference','attendance_status','attendance_mode'])assert(payload[field],'VALIDATION_ERROR',`${field} is required.`,400);
    assert(['DEFENDANT','PROSECUTOR','ADVOCATE'].includes(payload.party_role),'VALIDATION_ERROR','party_role is invalid.',400);
    assert(['PRESENT','ABSENT'].includes(payload.attendance_status),'VALIDATION_ERROR','attendance_status is invalid.',400);
    assert(['DIRECT','ELECTRONIC','NOT_APPLICABLE'].includes(payload.attendance_mode),'VALIDATION_ERROR','attendance_mode is invalid.',400);
    const id=randomUUID();const at=now();
    this.db.run(`insert into appeal_presence_records(id,reading_id,party_role,party_reference,attendance_status,attendance_mode,verified_by,verified_at) values(?,?,?,?,?,?,?,?)
      on conflict(reading_id,party_role,party_reference) do update set attendance_status=excluded.attendance_status,attendance_mode=excluded.attendance_mode,verified_by=excluded.verified_by,verified_at=excluded.verified_at`,id,readingId,payload.party_role,payload.party_reference,payload.attendance_status,payload.attendance_mode,context.id,at);
    this.audit.append({eventType:'APPEAL_PRESENCE_RECORDED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_DECISION_READING',objectId:readingId,correlationId,payload:{party_role:payload.party_role,party_reference:payload.party_reference,attendance_status:payload.attendance_status,attendance_mode:payload.attendance_mode}});
    return this.get(context,readingId);
  }

  completeReading(context, readingId, payload, correlationId) {
    requirePermission(context,'appeal.write');const reading=this.#reading(readingId);
    if(reading.status!=='SCHEDULED')throw new DomainError('INVALID_APPEAL_TRANSITION','Reading must be SCHEDULED before completion.',409,{status:reading.status});
    const readAt=payload.read_at??now();assert(validIso(readAt),'VALIDATION_ERROR','read_at must be ISO-8601.',400);assert(payload.open_to_public===true,'PUBLIC_HEARING_REQUIRED','Decision must be read in a hearing open to the public.',409);
    const presence=this.db.all('select * from appeal_presence_records where reading_id=?',readingId);
    if(!presence.some(x=>x.party_role==='DEFENDANT')||!presence.some(x=>x.party_role==='PROSECUTOR'))throw new DomainError('PRESENCE_RECORD_REQUIRED','Presence or absence of the defendant and prosecutor must be recorded.',409);
    const deadline=addDays(readAt,14);const at=now();
    this.db.run("update appeal_decision_readings set status='READ',read_at=?,open_to_public=1,cassation_deadline_at=?,deadline_policy_code='KUHAP_2025_SEMA_2_2026_14_CALENDAR_DAYS',updated_at=? where id=?",readAt,deadline,at,readingId);
    this.audit.append({eventType:'APPEAL_DECISION_READ',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_DECISION_READING',objectId:readingId,correlationId,payload:{read_at:readAt,open_to_public:true,cassation_deadline_at:deadline}});
    return this.get(context,readingId);
  }

  publishExcerpt(context, readingId, payload, correlationId) {
    requirePermission(context,'appeal.publication');const reading=this.#reading(readingId);
    if(reading.status!=='READ')throw new DomainError('APPEAL_DECISION_NOT_READ','Excerpt may only be published after the decision is read.',409);
    for(const field of ['excerpt_reference','source_system_code'])assert(payload[field],'VALIDATION_ERROR',`${field} is required.`,400);
    const publishedAt=payload.published_at??now();assert(validIso(publishedAt),'VALIDATION_ERROR','published_at must be ISO-8601.',400);
    const compliant=jakartaDate(publishedAt)===jakartaDate(reading.read_at);const id=randomUUID();
    this.db.run(`insert into appeal_publications(id,reading_id,excerpt_reference,source_system_code,published_at,published_by,same_day_compliant,document_hash) values(?,?,?,?,?,?,?,?)
      on conflict(reading_id) do update set excerpt_reference=excluded.excerpt_reference,source_system_code=excluded.source_system_code,published_at=excluded.published_at,published_by=excluded.published_by,same_day_compliant=excluded.same_day_compliant,document_hash=excluded.document_hash`,id,readingId,payload.excerpt_reference,payload.source_system_code,publishedAt,context.id,compliant?1:0,payload.document_hash??sha256(payload.excerpt_reference));
    this.audit.append({eventType:'APPEAL_EXCERPT_PUBLISHED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_DECISION_READING',objectId:readingId,correlationId,payload:{published_at:publishedAt,same_day_compliant:compliant,excerpt_reference:payload.excerpt_reference}});
    return this.get(context,readingId);
  }

  recordTransmission(context, readingId, payload, correlationId) {
    requirePermission(context,'appeal.transmission');const reading=this.#reading(readingId);
    if(reading.status!=='READ')throw new DomainError('APPEAL_DECISION_NOT_READ','Transmission may only be recorded after the decision is read.',409);
    for(const field of ['destination_court_reference','transmission_reference'])assert(payload[field],'VALIDATION_ERROR',`${field} is required.`,400);
    const transmittedAt=payload.transmitted_at??now();assert(validIso(transmittedAt),'VALIDATION_ERROR','transmitted_at must be ISO-8601.',400);
    const compliant=Date.parse(transmittedAt)<=Date.parse(addDays(reading.read_at,7));const id=randomUUID();
    this.db.run(`insert into appeal_transmissions(id,reading_id,destination_court_reference,transmission_reference,transmitted_at,transmitted_by,seven_day_compliant,document_hash) values(?,?,?,?,?,?,?,?)
      on conflict(reading_id) do update set destination_court_reference=excluded.destination_court_reference,transmission_reference=excluded.transmission_reference,transmitted_at=excluded.transmitted_at,transmitted_by=excluded.transmitted_by,seven_day_compliant=excluded.seven_day_compliant,document_hash=excluded.document_hash`,id,readingId,payload.destination_court_reference,payload.transmission_reference,transmittedAt,context.id,compliant?1:0,payload.document_hash??sha256(payload.transmission_reference));
    this.audit.append({eventType:'APPEAL_RECORD_TRANSMITTED',actorUserId:context.id,actorOrganizationId:context.organization_id,objectType:'APPEAL_DECISION_READING',objectId:readingId,correlationId,payload:{transmitted_at:transmittedAt,seven_day_compliant:compliant,transmission_reference:payload.transmission_reference}});
    return this.get(context,readingId);
  }

  list(context, caseReferenceId) { requirePermission(context,'appeal.read'); return this.db.all('select * from appeal_decision_readings where case_reference_id=? order by version desc',caseReferenceId).map(x=>this.#decorate(x)); }
  get(context, readingId) { requirePermission(context,'appeal.read'); return this.#decorate(this.#reading(readingId)); }

  #reading(id){const row=this.db.get('select * from appeal_decision_readings where id=?',id);if(!row)throw new DomainError('APPEAL_READING_NOT_FOUND','Appeal decision reading was not found.',404);return row;}
  #decorate(reading){const notices=this.db.all('select * from appeal_notice_steps where reading_id=? order by sequence',reading.id);const presence=this.db.all('select * from appeal_presence_records where reading_id=? order by party_role',reading.id);const publication=this.db.get('select * from appeal_publications where reading_id=?',reading.id)??null;const transmission=this.db.get('select * from appeal_transmissions where reading_id=?',reading.id)??null;const requiredNoticeCodes=['COURT_TO_PROSECUTION','PROSECUTION_TO_DEFENDANT','CORRECTIONS_TO_DEFENDANT'];const acked=new Set(notices.filter(x=>x.status==='ACKNOWLEDGED').map(x=>x.step_code));return{...reading,open_to_public:reading.open_to_public===null?null:Boolean(reading.open_to_public),notices,presence,publication:publication?{...publication,same_day_compliant:Boolean(publication.same_day_compliant)}:null,transmission:transmission?{...transmission,seven_day_compliant:Boolean(transmission.seven_day_compliant)}:null,compliance:{notice_chain_complete:requiredNoticeCodes.every(code=>acked.has(code)),presence_record_complete:presence.some(x=>x.party_role==='DEFENDANT')&&presence.some(x=>x.party_role==='PROSECUTOR'),excerpt_same_day:publication?Boolean(publication.same_day_compliant):false,records_within_seven_days:transmission?Boolean(transmission.seven_day_compliant):false,cassation_deadline_at:reading.cassation_deadline_at??null}};}
}
