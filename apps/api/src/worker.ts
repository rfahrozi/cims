import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';
import { StructuredLogger } from './infrastructure/observability/structured-logger.service.js';
import { KmsSecretService } from './infrastructure/config/kms-secret.service.js';
import { validateEnvOrThrow } from './infrastructure/config/env.schema.js';
import { enforceRuntimeSecurityPolicyAsync } from './infrastructure/security/runtime-security.policy.js';

async function bootstrap(): Promise<void> {
  const env = validateEnvOrThrow(process.env);

  if (env.PERSISTENCE_MODE !== 'POSTGRES') {
    throw new Error('The CIMS worker requires PERSISTENCE_MODE=POSTGRES.');
  }
  if (process.env.OUTBOX_WORKER_ENABLED === 'false') {
    throw new Error('OUTBOX_WORKER_ENABLED must not be false for the worker process.');
  }

  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(StructuredLogger));

  const kmsSecret = app.get(KmsSecretService);
  await enforceRuntimeSecurityPolicyAsync(env, (key) => kmsSecret.getSecret(key));

  app.enableShutdownHooks();
}

void bootstrap();
