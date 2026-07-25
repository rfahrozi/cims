
import { Injectable, LoggerService } from '@nestjs/common';
const sensitiveKeys = /authorization|token|secret|password|start_url|join_url|passcode/i;
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sensitiveKeys.test(key) ? '[REDACTED]' : redact(item)]));
  return value;
}
@Injectable()
export class StructuredLogger implements LoggerService {
  private emit(level: string, message: unknown, optional: unknown[]): void { process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level, message: redact(message), context: redact(optional) })}\n`); }
  log(message: unknown, ...optional: unknown[]): void { this.emit('info', message, optional); }
  error(message: unknown, ...optional: unknown[]): void { this.emit('error', message, optional); }
  warn(message: unknown, ...optional: unknown[]): void { this.emit('warn', message, optional); }
  debug(message: unknown, ...optional: unknown[]): void { this.emit('debug', message, optional); }
  verbose(message: unknown, ...optional: unknown[]): void { this.emit('trace', message, optional); }
}
