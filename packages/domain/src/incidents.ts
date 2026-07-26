import { DomainError } from './errors.js';

export type IncidentType = 'TECHNICAL' | 'CYBER' | 'FORCE_MAJEURE';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'MITIGATING' | 'RESOLVED' | 'CLOSED';
export type IncidentAction = 'START_MITIGATION' | 'RESOLVE' | 'CLOSE' | 'REOPEN';

export function incidentNotificationDeadline(
  type: IncidentType,
  occurredAt: string
): string | undefined {
  const base = Date.parse(occurredAt);
  if (!Number.isFinite(base))
    throw new DomainError('INVALID_INCIDENT_TIME', 'Incident time is invalid.', 422);
  if (type === 'CYBER') return new Date(base + 24 * 60 * 60 * 1000).toISOString();
  if (type === 'FORCE_MAJEURE') return new Date(base + 72 * 60 * 60 * 1000).toISOString();
  return undefined;
}

export function incidentBlocksHearing(type: IncidentType, severity: IncidentSeverity): boolean {
  if (severity === 'CRITICAL') return true;
  if (severity === 'HIGH')
    return type === 'TECHNICAL' || type === 'CYBER' || type === 'FORCE_MAJEURE';
  return false;
}

export function transitionIncident(
  current: IncidentStatus,
  action: IncidentAction
): IncidentStatus {
  const transitions: Record<IncidentStatus, Partial<Record<IncidentAction, IncidentStatus>>> = {
    OPEN: { START_MITIGATION: 'MITIGATING', RESOLVE: 'RESOLVED' },
    MITIGATING: { RESOLVE: 'RESOLVED' },
    RESOLVED: { CLOSE: 'CLOSED', REOPEN: 'OPEN' },
    CLOSED: { REOPEN: 'OPEN' }
  };
  const next = transitions[current][action];
  if (!next)
    throw new DomainError(
      'INVALID_INCIDENT_TRANSITION',
      `Incident cannot perform ${action} from ${current}.`,
      409,
      { current, action }
    );
  return next;
}
