import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerService } from './integration/circuit-breaker.service.js';
import { EvidenceStorageGateway } from './integration/evidence-storage.gateway.js';
import { NotificationGateway } from './integration/notification.gateway.js';
import { OfficialSystemGateway } from './integration/official-system.gateway.js';
import { VideoProviderGateway } from './integration/video-provider.gateway.js';

const providers = [
  CircuitBreakerService,
  EvidenceStorageGateway,
  NotificationGateway,
  OfficialSystemGateway,
  VideoProviderGateway
];

@Global()
@Module({
  imports: [ConfigModule],
  providers,
  exports: [
    EvidenceStorageGateway,
    NotificationGateway,
    OfficialSystemGateway,
    VideoProviderGateway,
    CircuitBreakerService
  ]
})
export class IntegrationModule {}
