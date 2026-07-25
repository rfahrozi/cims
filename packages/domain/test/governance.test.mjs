import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accessReviewStatus,
  assertAccessReviewDecisionAllowed,
  assertLegalHoldReleaseAllowed,
  productionGateDecision,
  retentionEligibility,
} from '../dist/index.js';

test('production gate is NO_GO when a blocking check fails', () => {
  assert.equal(productionGateDecision([
    { code: 'DB', status: 'PASS', blocking: true, message: 'ok' },
    { code: 'OIDC', status: 'FAIL', blocking: true, message: 'missing' },
  ]), 'NO_GO');
});

test('production gate is conditional when only warnings remain', () => {
  assert.equal(productionGateDecision([
    { code: 'DB', status: 'PASS', blocking: true, message: 'ok' },
    { code: 'PEN_TEST', status: 'WARNING', blocking: false, message: 'pending' },
  ]), 'CONDITIONAL_GO');
});

test('retention remains blocked by an active legal hold', () => {
  const result = retentionEligibility({
    closedAt: '2020-01-01T00:00:00.000Z',
    retentionDays: 365,
    activeLegalHoldCount: 1,
    now: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(result.status, 'ON_HOLD');
  assert.equal(result.eligibleForReview, false);
});

test('retention is due only after the configured period', () => {
  const result = retentionEligibility({
    closedAt: '2025-01-01T00:00:00.000Z',
    retentionDays: 365,
    activeLegalHoldCount: 0,
    now: '2026-01-02T00:00:00.000Z',
  });
  assert.equal(result.status, 'DUE_FOR_REVIEW');
  assert.equal(result.eligibleForReview, true);
});

test('legal hold release enforces maker checker', () => {
  assert.throws(() => assertLegalHoldReleaseAllowed('user-1', 'user-1', true), /cannot release/i);
  assert.doesNotThrow(() => assertLegalHoldReleaseAllowed('user-1', 'user-2', true));
});

test('access review cannot approve own access', () => {
  assert.equal(accessReviewStatus('REVOKE'), 'REVOKED');
  assert.throws(() => assertAccessReviewDecisionAllowed('user-1', 'user-1'), /own access/i);
});
