import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ZoomProviderModule } from './zoom-provider.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ZoomProviderModule,
    new FastifyAdapter({ logger: true, trustProxy: process.env.TRUST_PROXY === 'true' })
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env.ZOOM_PROVIDER_PORT ?? 3010), '0.0.0.0');
}
void bootstrap();
