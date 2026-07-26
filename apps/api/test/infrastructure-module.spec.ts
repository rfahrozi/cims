import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { InfrastructureModule } from '../src/infrastructure/infrastructure.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('InfrastructureModule', () => {
  it('should compile after module split', async () => {
    // Process env is empty by default in vitest, mock values to avoid "cannot read 'get'" when
    // injectables are initialized outside of an http request scope during compilation
    process.env.PERSISTENCE_MODE = 'MEMORY';

    const testingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        InfrastructureModule
      ]
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'PERSISTENCE_MODE') return 'MEMORY';
          if (key === 'CIRCUIT_BREAKER_FAILURE_THRESHOLD') return '5';
          if (key === 'CIRCUIT_BREAKER_RESET_MS') return '30000';
          if (key === 'DB_POOL_MAX') return '20';
          if (key === 'DB_POOL_MIN') return '0';
          if (key === 'DB_IDLE_TIMEOUT_MS') return '30000';
          if (key === 'DB_CONNECTION_TIMEOUT_MS') return '5000';
          if (key === 'DB_STATEMENT_TIMEOUT_MS') return '15000';
          if (key === 'DB_QUERY_TIMEOUT_MS') return '20000';
          if (key === 'DB_APPLICATION_NAME') return 'cims-api';
          if (key === 'DB_SSL') return 'false';
          if (key === 'LEGAL_HOLD_MAKER_CHECKER') return 'false';
          if (key === 'DATABASE_URL') return 'postgres://postgres:postgres@localhost:5432/cims_dev';
          if (key === 'VIDEO_PROVIDER_TIMEOUT_MS') return '15000';
          if (key === 'VIDEO_PROVIDER_MODE') return 'MOCK';
          if (key === 'VIDEO_PROVIDER_URL') return 'http://localhost:3010';
          return undefined;
        }
      })
      .compile();

    expect(testingModule).toBeDefined();
  });
});