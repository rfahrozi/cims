import { Module } from '@nestjs/common';
import { HearingsModule } from '../hearings/hearings.module.js';
import { HearingControlController } from './hearing-control.controller.js';
import { HearingControlService } from './hearing-control.service.js';

@Module({ imports: [HearingsModule], controllers: [HearingControlController], providers: [HearingControlService] })
export class HearingControlModule {}
