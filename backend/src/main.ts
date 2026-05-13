// =================================================================================
// MAIN BOOTSTRAP (The System Entry)
// =================================================================================
// This is the entry point for the NestJS environment.
// It initializes global pipes, CORS settings, Swagger documentation,
// and binds the application to the network port.
// =================================================================================

import './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. [SIDE EFFECT] Create the core application instance with Structured Winston Logger
  // Why: Enables machine-readable logs (JSON) for centralized monitoring (ELK/Grafana)
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      // ... (transports configuration remains same)
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.json(), 
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/backend-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    }),
  });

  // 1.1 [SECURITY] Helmet Hardening
  // Why: Automatically sets secure HTTP headers (XSS, Clickjacking, CSP, etc.)
  app.use(helmet());

  const logger = new Logger('Bootstrap');

  // 2. [SIDE EFFECT] Set global API routing prefix
  app.setGlobalPrefix('api');

  // 3. [SECURITY] Configure Cross-Origin Resource Sharing
  // ⚠️ NOTE: Restrict origin '*' to specific domains in production
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // 4. [VALIDATION] Setup global input sanitization and enforcement
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Automatically strip non-decorated properties from payloads
      forbidNonWhitelisted: true, // Reject requests containing unknown fields
      transform: true,            // Hydrate plain objects into DTO class instances
    }),
  );

  // 5. [SIDE EFFECT] Initialize Swagger OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Video Streaming Platform API')
    .setDescription('Distributed video streaming system — NestJS + TypeScript')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 6. [SIDE EFFECT] Bind to network port and start listening
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Backend running on http://localhost:${port}/api`);
  logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
