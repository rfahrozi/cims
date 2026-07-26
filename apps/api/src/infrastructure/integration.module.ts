import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { EvidenceStorageGateway } from './evidence-storage.gateway.js';
import { NotificationGateway } from './notification.gateway.js';
import { OfficialSystemGateway } from './official-system.gateway.js';
import { VideoProviderGateway } from './video-provider.gateway.js';

const providers = [
  CircuitBreakerService,
  EvidenceStorageGateway,
  NotificationGateway,
  OfficialSystemGateway,
  VideoProviderGateway
];

@Module({
  imports: [ConfigModule],
  providers,
  exports: providers
})
export class IntegrationModule {}