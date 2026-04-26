import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── Global API prefix ──────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── CORS ───────────────────────────────────────────────────────
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // ── Global Validation Pipe ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strip unknown properties
      forbidNonWhitelisted: true, // throw on unknown properties
      transform: true,            // auto-transform payloads to DTO types
    }),
  );

  // ── Swagger API Docs ───────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Video Streaming Platform API')
    .setDescription('Distributed video streaming system — NestJS + TypeScript')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Backend running on http://localhost:${port}/api`);
  logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
