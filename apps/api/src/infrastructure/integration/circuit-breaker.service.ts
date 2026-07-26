import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';

interface CircuitState {
  failures: number;
  openedAt?: number;
  lastFailure?: string;
}

@Injectable()
export class CircuitBreakerService {
  private readonly states = new Map<string, CircuitState>();
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(config: ConfigService) {
    this.threshold = Number(
      (config && config.get
        ? config.get<string>('CIRCUIT_BREAKER_FAILURE_THRESHOLD')
        : undefined) ?? 5
    );
    this.resetMs = Number(
      (config && config.get ? config.get<string>('CIRCUIT_BREAKER_RESET_MS') : undefined) ?? 30_000
    );
  }

  async execute<T>(dependency: string, operation: () => Promise<T>): Promise<T> {
    const state = this.states.get(dependency) ?? { failures: 0 };
    if (state.openedAt && Date.now() - state.openedAt < this.resetMs) {
      throw new DomainError(
        'DEPENDENCY_CIRCUIT_OPEN',
        `Dependency circuit is open for ${dependency}.`,
        503,
        {
          dependency,
          retry_after_ms: this.resetMs - (Date.now() - state.openedAt)
        }
      );
    }
    if (state.openedAt) {
      state.openedAt = undefined;
      state.failures = Math.max(0, this.threshold - 1);
    }
    try {
      const result = await operation();
      this.states.set(dependency, { failures: 0 });
      return result;
    } catch (error) {
      state.failures += 1;
      state.lastFailure = error instanceof Error ? error.message : String(error);
      if (state.failures >= this.threshold) state.openedAt = Date.now();
      this.states.set(dependency, state);
      throw error;
    }
  }

  snapshot(): Record<
    string,
    { state: 'CLOSED' | 'OPEN'; failures: number; last_failure?: string; retry_after_ms?: number }
  > {
    return Object.fromEntries(
      [...this.states.entries()].map(([dependency, state]) => {
        const open = Boolean(state.openedAt && Date.now() - state.openedAt < this.resetMs);
        return [
          dependency,
          {
            state: open ? 'OPEN' : 'CLOSED',
            failures: state.failures,
            last_failure: state.lastFailure,
            retry_after_ms:
              open && state.openedAt
                ? Math.max(0, this.resetMs - (Date.now() - state.openedAt))
                : undefined
          }
        ];
      })
    );
  }
}
