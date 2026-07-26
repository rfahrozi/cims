import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { BrevoNotificationModule } from './brevo-notification.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    BrevoNotificationModule,
    new FastifyAdapter({ logger: true, trustProxy: process.env.TRUST_PROXY === 'true' })
  );
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3020);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
