import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module.js';
import { DevIdentityInterceptor } from './common/dev-identity.interceptor.js';
import { DomainExceptionFilter } from './common/domain-exception.filter.js';
import { CorrelationInterceptor } from './common/correlation.interceptor.js';
import { StructuredLogger } from './infrastructure/structured-logger.service.js';
import { secretValue } from './infrastructure/config/secret-value.js';

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: Number(process.env.REQUEST_BODY_LIMIT_BYTES ?? 1_048_576),
    trustProxy: process.env.TRUST_PROXY === 'true'
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    rawBody: true
  });
  const configService = app.get(ConfigService);
  app.useLogger(app.get(StructuredLogger));
  const authMode = (configService.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase();
  if (
    (configService.get<string>('NODE_ENV') ?? 'development') === 'production' &&
    authMode === 'DEV'
  )
    throw new Error('AUTH_MODE=DEV is forbidden in production.');
  if (
    (configService.get<string>('NODE_ENV') ?? 'development') === 'production' &&
    !secretValue(configService, 'DATABASE_URL')
  )
    throw new Error('DATABASE_URL or DATABASE_URL_FILE is required in production.');
  if (authMode === 'DEV') app.useGlobalInterceptors(new DevIdentityInterceptor());
  app.useGlobalInterceptors(new CorrelationInterceptor());
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live', 'health/ready', 'metrics'] });
  const origins = (configService.get<string>('WEB_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'authorization',
      'content-type',
      'idempotency-key',
      'x-correlation-id',
      'x-cims-dev-persona',
      'traceparent',
      'x-cims-signature',
      'x-cims-timestamp'
    ]
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, {
    max: Number(configService.get<string>('RATE_LIMIT_MAX') ?? 300),
    timeWindow: Number(configService.get<string>('RATE_LIMIT_WINDOW_MS') ?? 60_000)
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false
    })
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  if (configService.get<string>('SWAGGER_ENABLED') !== 'false') {
    const swagger = new DocumentBuilder()
      .setTitle('CIMS API')
      .setDescription('Compliance-first electronic criminal hearing orchestration API')
      .setVersion('0.19.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-cims-dev-persona' }, 'devPersona')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger), {
      jsonDocumentUrl: 'docs/openapi.json'
    });
  }
  app.enableShutdownHooks();
  await app.listen(Number(configService.get<string>('API_PORT') ?? 3000), '0.0.0.0');
}
void bootstrap();
