import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InMemoryStore } from './in-memory.store.js';
import { OutboxWorkerService } from './outbox-worker.service.js';

const providers = [InMemoryStore, OutboxWorkerService];

@Module({
  imports: [ConfigModule],
  providers,
  exports: providers
})
export class WorkflowSupportModule {}