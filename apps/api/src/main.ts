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
import { StructuredLogger } from './infrastructure/observability/structured-logger.service.js';
import { secretValue } from './infrastructure/config/secret-value.js';
import { validateEnvOrThrow } from './infrastructure/config/env.schema.js';
import { enforceRuntimeSecurityPolicy } from './infrastructure/security/runtime-security.policy.js';

async function bootstrap(): Promise<void> {
  const env = validateEnvOrThrow(process.env);
  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: env.REQUEST_BODY_LIMIT_BYTES,
    trustProxy: env.TRUST_PROXY
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    rawBody: true
  });
  const configService = app.get(ConfigService);
  app.useLogger(app.get(StructuredLogger));

  enforceRuntimeSecurityPolicy(env, (key) => secretValue(configService, key));

  if (env.AUTH_MODE === 'DEV') {
    app.useGlobalInterceptors(new DevIdentityInterceptor());
  }

  app.useGlobalInterceptors(new CorrelationInterceptor());
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live', 'health/ready', 'metrics'] });

  app.enableCors({
    origin: env.WEB_ORIGINS,
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
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
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

  if (env.SWAGGER_ENABLED) {
    const swagger = new DocumentBuilder()
      .setTitle('CIMS API')
      .setDescription('Compliance-first electronic criminal hearing orchestration API')
      .setVersion('0.20.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-cims-dev-persona' }, 'devPersona')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger), {
      jsonDocumentUrl: 'docs/openapi.json'
    });
  }

  app.enableShutdownHooks();
  await app.listen(env.API_PORT, '0.0.0.0');
}
void bootstrap();
