import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { toValidationException } from './common/errors/validation-errors.js';
import helmet from 'helmet';
import { isSwaggerEnabled } from './common/utils/swagger-enabled.util.js';
import { parseCorsOrigins } from './common/utils/cors-origins.util.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const trustProxyHops = Number(configService.get<string>('TRUST_PROXY_HOPS', '0'));
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  app.set('trust proxy', trustProxyHops);
  app.disable('x-powered-by');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: toValidationException,
    }),
  );

  const corsOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS'),
    configService.get<string>('NODE_ENV') === 'production',
  );
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Table-Token', 'X-Order-Token'],
    exposedHeaders: ['Retry-After'],
    credentials: false,
    maxAge: 600,
  });

  const swaggerEnabled = isSwaggerEnabled(configService);
  app.use(helmet(swaggerEnabled ? { contentSecurityPolicy: false } : {}));

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Restaurant QR Ordering API')
      .setDescription('QR ordering + KDS backend API docs')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    new Logger('Bootstrap').log('Swagger UI enabled at /api');
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
