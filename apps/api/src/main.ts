import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module.js';
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
      'traceparent',
      'x-cims-signature',
      'x-cims-timestamp'
    ]
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline untuk Swagger UI
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"], // Mencegah clickjacking
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false // Perlu false agar Swagger UI berfungsi normal
  });
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
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger), {
      jsonDocumentUrl: 'docs/openapi.json'
    });
  }

  app.enableShutdownHooks();

  // M-10 DLP: Peringatkan jika METRICS_BEARER_TOKEN tidak dikonfigurasi
  if (!process.env['METRICS_BEARER_TOKEN']?.trim()) {
    const logger = app.get(StructuredLogger);
    if (env.NODE_ENV === 'production') {
      logger.error(
        'METRICS_BEARER_TOKEN is not set — /metrics endpoint is BLOCKED in production.',
        '',
        'Bootstrap'
      );
    } else {
      logger.warn(
        'METRICS_BEARER_TOKEN not set — /metrics is open (dev only). Set token for staging/prod.',
        'Bootstrap'
      );
    }
  }

  await app.listen(env.API_PORT, '0.0.0.0');
}
void bootstrap();
