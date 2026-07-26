import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidDetermination, detectConflicts, nextGate } from '../dist/index.js';

test('determination hard gate rejects missing approval', () => {
  assert.throws(() => assertValidDetermination('h-1', []), /valid judicial determination/i);
});

test('next gate follows compliance order', () => {
  assert.equal(
    nextGate({
      hearingData: true,
      determination: true,
      schedule: true,
      notice: false,
      readiness: false,
      virtualSession: false,
      hearingEnded: false
    }),
    'OFFICIAL_NOTICE'
  );
});

test('conflict engine detects overlapping required room', () => {
  const conflicts = detectConflicts(
    {
      id: 'p-1',
      hearingId: 'h-1',
      startAt: '2026-08-12T02:00:00.000Z',
      endAt: '2026-08-12T03:00:00.000Z',
      displayTimezone: 'Asia/Jakarta',
      status: 'DRAFT',
      resources: [{ resourceType: 'ROOM', resourceId: 'ROOM-A', requirement: 'REQUIRED' }]
    },
    [
      {
        id: 's-2',
        hearingId: 'h-2',
        startAt: '2026-08-12T02:30:00.000Z',
        endAt: '2026-08-12T03:30:00.000Z',
        version: 1,
        status: 'ACTIVE',
        resources: [{ resourceType: 'ROOM', resourceId: 'ROOM-A', requirement: 'REQUIRED' }]
      }
    ]
  );
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].severity, 'REQUIRED');
});
