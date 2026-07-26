import { DomainError } from './errors.js';
import type {
  ActiveSchedule,
  Determination,
  HearingAction,
  HearingRuntimeState,
  NoticeGateInput,
  NoticeGateResult,
  ReadinessGateInput,
  ReadinessGateResult
} from './types.js';

export function assertActiveSchedule(
  hearingId: string,
  schedules: readonly ActiveSchedule[]
): ActiveSchedule {
  const schedule = [...schedules]
    .filter((item) => item.hearingId === hearingId && item.status === 'ACTIVE')
    .sort((a, b) => b.version - a.version)[0];
  if (!schedule) {
    throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.');
  }
  return schedule;
}

export function evaluateNoticeGate(input: NoticeGateInput): NoticeGateResult {
  const activeNoticeIds = new Set(
    input.notices.filter((item) => item.status !== 'CANCELLED').map((item) => item.id)
  );
  const required = input.recipients.filter(
    (item) => activeNoticeIds.has(item.noticeId) && item.requiredAck
  );
  const acknowledged = required.filter((item) => item.status === 'ACKNOWLEDGED');
  return {
    noticeCount: activeNoticeIds.size,
    requiredAcknowledgmentCount: required.length,
    acknowledgedCount: acknowledged.length,
    ready:
      activeNoticeIds.size > 0 && required.length > 0 && acknowledged.length === required.length
  };
}

export function evaluateReadinessGate(input: ReadinessGateInput): ReadinessGateResult {
  const latestByType = new Map<
    string,
    {
      organizationType: ReadinessGateInput['submissions'][number]['organizationType'];
      version: number;
      status: ReadinessGateInput['submissions'][number]['status'];
    }
  >();
  for (const submission of input.submissions) {
    const current = latestByType.get(submission.organizationType);
    if (!current || submission.version > current.version)
      latestByType.set(submission.organizationType, submission);
  }
  const organizations = input.requiredOrganizationTypes.map((organizationType) => {
    const submission = latestByType.get(organizationType);
    return submission
      ? { organizationType, status: submission.status, version: submission.version }
      : { organizationType, status: 'MISSING' as const };
  });
  return {
    requiredOrganizationTypes: input.requiredOrganizationTypes,
    organizations,
    ready:
      organizations.length === input.requiredOrganizationTypes.length &&
      organizations.every((item) => item.status === 'READY')
  };
}

export function assertVirtualProvisionAllowed(input: {
  hearingId: string;
  determinations: readonly Determination[];
  schedules: readonly ActiveSchedule[];
  noticeGate: NoticeGateResult;
  readinessGate: ReadinessGateResult;
}): void {
  const validDetermination = input.determinations.some(
    (item) => item.hearingId === input.hearingId && item.decision === 'APPROVED'
  );
  if (!validDetermination)
    throw new DomainError('DETERMINATION_REQUIRED', 'A valid judicial determination is required.');
  assertActiveSchedule(input.hearingId, input.schedules);
  if (!input.noticeGate.ready) {
    throw new DomainError(
      'NOTICE_ACK_REQUIRED',
      'Required official notices must be acknowledged.',
      409,
      input.noticeGate
    );
  }
  if (!input.readinessGate.ready) {
    throw new DomainError(
      'READINESS_REQUIRED',
      'All required organizations must be READY.',
      409,
      input.readinessGate
    );
  }
}

export function transitionHearing(
  current: HearingRuntimeState,
  action: HearingAction
): HearingRuntimeState {
  const transitions: Record<
    HearingRuntimeState,
    Partial<Record<HearingAction, HearingRuntimeState>>
  > = {
    NOT_READY: {},
    READY: { START: 'STARTED', POSTPONE: 'POSTPONED' },
    STARTED: { SUSPEND: 'SUSPENDED', END: 'ENDED', POSTPONE: 'POSTPONED' },
    SUSPENDED: { RESUME: 'STARTED', END: 'ENDED', POSTPONE: 'POSTPONED' },
    ENDED: { FLAG_DOCUMENTATION: 'DOCUMENTATION_PENDING' },
    POSTPONED: {},
    // Dari DOCUMENTATION_PENDING: bisa diselesaikan (kembali ke ENDED/final)
    // atau di-flag ulang jika ada kelengkapan tambahan
    DOCUMENTATION_PENDING: { COMPLETE_DOCUMENTATION: 'ENDED' }
  };
  const next = transitions[current]?.[action];
  if (!next) {
    throw new DomainError(
      'INVALID_HEARING_TRANSITION',
      `Hearing cannot perform ${action} from ${current}.`,
      409,
      { current, action }
    );
  }
  return next;
}
