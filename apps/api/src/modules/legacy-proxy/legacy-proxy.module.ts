import { Module } from '@nestjs/common';
import { LegacyProxyService } from './legacy-proxy.service.js';
@Module({ providers: [LegacyProxyService], exports: [LegacyProxyService] })
export class LegacyProxyModule {}
