import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
@Module({ imports: [HearingsModule, PersistenceModule], controllers: [ComplianceController] })
export class ComplianceModule {}
