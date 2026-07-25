import { readFileSync } from 'node:fs';
import type { ConfigService } from '@nestjs/config';

export function secretValue(config: ConfigService, name: string): string | undefined {
  const direct = config.get<string>(name)?.trim();
  if (direct) return direct;
  const file = config.get<string>(`${name}_FILE`)?.trim();
  if (!file) return undefined;
  return readFileSync(file, 'utf8').trim();
}

export function requiredSecret(config: ConfigService, name: string, minimumLength = 16): string {
  const value = secretValue(config, name);
  if (!value || value.length < minimumLength) throw new Error(`${name} is not configured or is too short.`);
  return value;
}
