import fs from 'fs';

let content = fs.readFileSync('packages/domain/src/gates.ts', 'utf8');

const nextGateOld = `
export function nextGate(input: {
  hearingData: boolean;
  determination: boolean;
  schedule: boolean;
  notice: boolean;
  readiness: boolean;
  virtualSession: boolean;
  hearingEnded: boolean;
}): GateCode {
  if (!input.hearingData) return 'HEARING_DATA';
  if (!input.determination) return 'JUDICIAL_DETERMINATION';
  if (!input.schedule) return 'SCHEDULING';
`;

const nextGateNew = `
export function nextGate(input: {
  hearingData: boolean;
  determination: boolean;
  schedule: boolean;
  notice: boolean;
  readiness: boolean;
  virtualSession: boolean;
  hearingEnded: boolean;
}): GateCode {
  if (!input.hearingData) return 'HEARING_DATA';
  if (!input.schedule) return 'SCHEDULING';
  if (!input.determination) return 'JUDICIAL_DETERMINATION';
`;

content = content.replace(nextGateOld, nextGateNew);

fs.writeFileSync('packages/domain/src/gates.ts', content);
