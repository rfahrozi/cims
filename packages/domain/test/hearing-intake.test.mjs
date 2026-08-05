import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertManualIntakeEditable,
  normalizeCaseNumber,
  normalizedDuplicateKey,
  transitionHearingIntake,
  validateManualHearingIntake
} from '../dist/index.js';

const valid = {
  caseNumber: '123 / Pid.Sus / 2026 / PN Demo',
  officialCaseReference: 'SIPP-123',
  caseClassification: 'SPECIAL_CRIMINAL',
  caseTypeCode: 'PID.SUS',
  caseTitle: 'Penuntut Umum melawan Terdakwa A',
  hearingType: 'PEMERIKSAAN_SAKSI',
  hearingSequence: 1,
  courtOrganizationId: 'court-demo',
  prosecutionOrganizationId: 'prosecution-demo',
  correctionsOrganizationId: 'corrections-demo',
  defendantCustodyStatus: 'DETAINED',
  defendants: [
    {
      displayName: 'Terdakwa A',
      protectedIdentity: false,
      custodyStatus: 'DETAINED',
      detentionOrganizationId: 'corrections-demo'
    }
  ]
};

test('manual hearing intake accepts complete substitute-clerk input', () => {
  assert.doesNotThrow(() => validateManualHearingIntake(valid));
});

test('detained defendant requires detention organization', () => {
  assert.throws(
    () => validateManualHearingIntake({ ...valid, correctionsOrganizationId: undefined }),
    /belum lengkap/i
  );
});

test('case number normalization produces stable duplicate key', () => {
  assert.equal(normalizeCaseNumber(' 123/pid.sus/2026/pn demo '), '123/PID.SUS/2026/PN DEMO');
  assert.equal(
    normalizedDuplicateKey({
      courtOrganizationId: 'court-demo',
      caseNumber: '123/pid.sus/2026/pn demo',
      hearingSequence: 2
    }),
    normalizedDuplicateKey({
      courtOrganizationId: 'court-demo',
      caseNumber: ' 123/PID.SUS/2026/PN DEMO ',
      hearingSequence: 2
    })
  );
});

test('manual intake uses maker checker lifecycle', () => {
  assert.equal(transitionHearingIntake('DRAFT', 'SUBMIT'), 'SUBMITTED');
  assert.equal(transitionHearingIntake('SUBMITTED', 'ADMIN_VERIFY'), 'ADMIN_VERIFIED');
  assert.equal(transitionHearingIntake('ADMIN_VERIFIED', 'JUDGE_VERIFY'), 'JUDGE_VALIDATION');
  assert.equal(transitionHearingIntake('JUDGE_VALIDATION', 'APPROVE_DATA'), 'DATA_APPROVED');
  assert.equal(transitionHearingIntake('DATA_APPROVED', 'ACTIVATE'), 'ACTIVE');
  assert.throws(() => transitionHearingIntake('DRAFT', 'ACTIVATE'), /tidak dapat/i);
  assert.doesNotThrow(() => assertManualIntakeEditable('RETURNED'));
  assert.throws(() => assertManualIntakeEditable('ACTIVE'), /hanya dapat diubah/i);
});
