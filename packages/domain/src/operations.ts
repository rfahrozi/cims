import { DomainError } from './errors.js';

export type ReconciliationResult = 'MATCHED' | 'MISMATCH' | 'MISSING_IN_CIMS' | 'MISSING_IN_SOURCE';

export interface ReconciliationItem {
  fieldPath: string;
  cimsValue: unknown;
  sourceValue: unknown;
  result: ReconciliationResult;
}

export function computeOutboxBackoffSeconds(attemptCount: number): number {
  const normalized = Math.max(1, Math.floor(attemptCount));
  return Math.min(3600, Math.max(5, 2 ** Math.min(normalized, 10)));
}

export function compareFlatSnapshots(
  cims: Readonly<Record<string, unknown>>,
  source: Readonly<Record<string, unknown>>,
): ReconciliationItem[] {
  const paths = new Set([...Object.keys(cims), ...Object.keys(source)]);
  return [...paths].sort().map((fieldPath) => {
    const cimsHas = Object.prototype.hasOwnProperty.call(cims, fieldPath);
    const sourceHas = Object.prototype.hasOwnProperty.call(source, fieldPath);
    const cimsValue = cims[fieldPath];
    const sourceValue = source[fieldPath];
    let result: ReconciliationResult;
    if (!cimsHas) result = 'MISSING_IN_CIMS';
    else if (!sourceHas) result = 'MISSING_IN_SOURCE';
    else result = canonicalJson(cimsValue) === canonicalJson(sourceValue) ? 'MATCHED' : 'MISMATCH';
    return { fieldPath, cimsValue, sourceValue, result };
  });
}

export function assertExpectedRowVersion(actual: number, expected?: number): void {
  if (expected !== undefined && actual !== expected) {
    throw new DomainError(
      'OPTIMISTIC_CONCURRENCY_CONFLICT',
      'The record was changed by another transaction.',
      409,
      { actual, expected },
    );
  }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}
