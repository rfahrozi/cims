import { randomUUID } from 'node:crypto';

function localHour(iso, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(iso));
  return Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
}

export class ConflictEngine {
  constructor(db) {
    this.db = db;
  }

  evaluate(proposal, resources, { excludeHearingId } = {}) {
    const conflicts = [];
    const startMs = Date.parse(proposal.start_at);
    const endMs = Date.parse(proposal.end_at);
    const durationMinutes = (endMs - startMs) / 60_000;

    const startHour = localHour(proposal.start_at, proposal.display_timezone);
    const endHour = localHour(proposal.end_at, proposal.display_timezone);
    if (
      startHour < 8 ||
      endHour > 18 ||
      (endHour === 18 && new Date(proposal.end_at).getMinutes() > 0)
    ) {
      conflicts.push({
        rule_code: 'OUTSIDE_OPERATIONAL_HOURS',
        severity: 'REQUIRED',
        message: 'Schedule is outside 08:00-18:00 in the selected timezone.',
        resolution_options: ['Choose a time within operational hours.']
      });
    }
    if (durationMinutes > 240) {
      conflicts.push({
        rule_code: 'LONG_DURATION',
        severity: 'WARNING',
        message: 'Schedule duration exceeds four hours.',
        resolution_options: ['Confirm duration or split the hearing.']
      });
    }

    for (const resource of resources) {
      const overlap = this.db.get(
        `select hs.id as schedule_id, hs.hearing_id, hs.start_at, hs.end_at
        from hearing_schedules hs join hearing_schedule_resources hsr on hsr.schedule_id=hs.id
        where hs.status='ACTIVE' and hsr.resource_type=? and hsr.resource_reference=?
          and hs.start_at < ? and hs.end_at > ?
          and (? is null or hs.hearing_id<>?) limit 1`,
        resource.resource_type,
        resource.resource_id,
        proposal.end_at,
        proposal.start_at,
        excludeHearingId ?? null,
        excludeHearingId ?? null
      );
      if (overlap) {
        conflicts.push({
          rule_code: 'RESOURCE_OVERLAP',
          severity: resource.requirement === 'REQUIRED' ? 'REQUIRED' : 'WARNING',
          resource_type: resource.resource_type,
          resource_id: resource.resource_id,
          message: `Resource is already assigned to schedule ${overlap.schedule_id}.`,
          resolution_options: ['Choose another resource.', 'Choose another time.']
        });
      }
      const block = this.db.get(
        `select * from schedule_constraints where resource_type=? and resource_reference=?
        and blocked_from < ? and blocked_until > ? order by blocked_from limit 1`,
        resource.resource_type,
        resource.resource_id,
        proposal.end_at,
        proposal.start_at
      );
      if (block) {
        conflicts.push({
          rule_code: 'RESOURCE_BLOCKED',
          severity: block.severity,
          resource_type: resource.resource_type,
          resource_id: resource.resource_id,
          message: block.reason,
          resolution_options: ['Choose another resource.', 'Choose another time.']
        });
      }
    }
    return conflicts.map((item) => ({ id: randomUUID(), ...item }));
  }
}
