import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrevoNotificationController } from './brevo-notification.controller.js';
import { BrevoNotificationService } from './brevo-notification.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [BrevoNotificationController],
  providers: [BrevoNotificationService]
})
export class BrevoNotificationModule {}
