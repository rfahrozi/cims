import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller.js';
import { HearingsModule } from '../hearings/hearings.module.js';
@Module({ imports: [HearingsModule], controllers: [ComplianceController] })
export class ComplianceModule {}
