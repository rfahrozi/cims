import { DomainError } from './errors.js';

export type ProductionGateDecision = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
export type ReadinessCheckStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface ReadinessCheck {
  code: string;
  status: ReadinessCheckStatus;
  blocking: boolean;
  message: string;
}

export interface RetentionEligibilityInput {
  closedAt?: string;
  retentionDays?: number;
  activeLegalHoldCount: number;
  now?: string;
}

export interface RetentionEligibilityResult {
  status: 'NOT_CLOSED' | 'POLICY_NOT_CONFIGURED' | 'ON_HOLD' | 'NOT_DUE' | 'DUE_FOR_REVIEW';
  eligibleForReview: boolean;
  dueAt?: string;
  activeLegalHoldCount: number;
}

export type AccessReviewDecision = 'KEEP' | 'REVOKE';
export type AccessReviewItemStatus = 'PENDING' | 'KEPT' | 'REVOKED';

export function productionGateDecision(checks: readonly ReadinessCheck[]): ProductionGateDecision {
  if (checks.some((check) => check.blocking && check.status === 'FAIL')) return 'NO_GO';
  if (checks.some((check) => check.status !== 'PASS')) return 'CONDITIONAL_GO';
  return 'GO';
}

export function retentionEligibility(input: RetentionEligibilityInput): RetentionEligibilityResult {
  if (!input.closedAt) {
    return { status: 'NOT_CLOSED', eligibleForReview: false, activeLegalHoldCount: input.activeLegalHoldCount };
  }
  if (!Number.isInteger(input.retentionDays) || Number(input.retentionDays) <= 0) {
    return { status: 'POLICY_NOT_CONFIGURED', eligibleForReview: false, activeLegalHoldCount: input.activeLegalHoldCount };
  }
  const closedAt = new Date(input.closedAt);
  if (Number.isNaN(closedAt.getTime())) throw new DomainError('INVALID_CLOSED_AT', 'The closure timestamp is invalid.', 400);
  const due = new Date(closedAt.getTime() + Number(input.retentionDays) * 86_400_000);
  const dueAt = due.toISOString();
  if (input.activeLegalHoldCount > 0) {
    return { status: 'ON_HOLD', eligibleForReview: false, dueAt, activeLegalHoldCount: input.activeLegalHoldCount };
  }
  const now = new Date(input.now ?? new Date().toISOString());
  if (Number.isNaN(now.getTime())) throw new DomainError('INVALID_NOW', 'The evaluation timestamp is invalid.', 400);
  if (now.getTime() < due.getTime()) {
    return { status: 'NOT_DUE', eligibleForReview: false, dueAt, activeLegalHoldCount: 0 };
  }
  return { status: 'DUE_FOR_REVIEW', eligibleForReview: true, dueAt, activeLegalHoldCount: 0 };
}

export function assertLegalHoldReleaseAllowed(createdBy: string, actorUserId: string, makerChecker = true): void {
  if (makerChecker && createdBy === actorUserId) {
    throw new DomainError('LEGAL_HOLD_MAKER_CHECKER_REQUIRED', 'The user who created a legal hold cannot release the same hold.', 409);
  }
}

export function accessReviewStatus(decision: AccessReviewDecision): AccessReviewItemStatus {
  if (decision === 'KEEP') return 'KEPT';
  if (decision === 'REVOKE') return 'REVOKED';
  throw new DomainError('INVALID_ACCESS_REVIEW_DECISION', 'Unsupported access review decision.', 400, { decision });
}

export function assertAccessReviewDecisionAllowed(subjectUserId: string, reviewerUserId: string): void {
  if (subjectUserId === reviewerUserId) {
    throw new DomainError('ACCESS_REVIEW_SELF_APPROVAL_FORBIDDEN', 'A user cannot approve or revoke their own access.', 409);
  }
}
