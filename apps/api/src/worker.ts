import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';
import { StructuredLogger } from './infrastructure/structured-logger.service.js';

async function bootstrap(): Promise<void> {
  if ((process.env.PERSISTENCE_MODE ?? '').toUpperCase() !== 'POSTGRES') {
    throw new Error('The CIMS worker requires PERSISTENCE_MODE=POSTGRES.');
  }
  if (process.env.OUTBOX_WORKER_ENABLED === 'false') {
    throw new Error('OUTBOX_WORKER_ENABLED must not be false for the worker process.');
  }
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(StructuredLogger));
  app.enableShutdownHooks();
}

void bootstrap();
