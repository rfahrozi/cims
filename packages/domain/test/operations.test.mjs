import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertExpectedRowVersion,
  canonicalJson,
  compareFlatSnapshots,
  computeOutboxBackoffSeconds
} from '../dist/index.js';

test('outbox backoff is bounded and increases', () => {
  assert.equal(computeOutboxBackoffSeconds(1), 5);
  assert.equal(computeOutboxBackoffSeconds(4), 16);
  assert.equal(computeOutboxBackoffSeconds(50), 1024);
});

test('snapshot comparison detects matches, mismatches, and missing values', () => {
  const items = compareFlatSnapshots(
    { case_number: '12/Pid/2026', state: 'ACTIVE', court: 'PN A' },
    { case_number: '12/Pid/2026', state: 'ENDED', prosecutor: 'Kejari A' }
  );
  assert.equal(items.find((item) => item.fieldPath === 'case_number')?.result, 'MATCHED');
  assert.equal(items.find((item) => item.fieldPath === 'state')?.result, 'MISMATCH');
  assert.equal(items.find((item) => item.fieldPath === 'court')?.result, 'MISSING_IN_SOURCE');
  assert.equal(items.find((item) => item.fieldPath === 'prosecutor')?.result, 'MISSING_IN_CIMS');
});

test('canonical JSON is stable across object key order', () => {
  assert.equal(
    canonicalJson({ b: 2, a: { d: 4, c: 3 } }),
    canonicalJson({ a: { c: 3, d: 4 }, b: 2 })
  );
});

test('optimistic concurrency rejects a stale version', () => {
  assert.doesNotThrow(() => assertExpectedRowVersion(3, 3));
  assert.throws(() => assertExpectedRowVersion(4, 3), /changed by another transaction/i);
});
