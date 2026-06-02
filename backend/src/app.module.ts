// =================================================================================
// APP MODULE (The Root Orchestrator)
// =================================================================================
// This is the primary module of the NestJS application.
// It integrates all domain-specific modules and establishes the
// global security context via the JWT Auth Guard.
// =================================================================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { CreateUsersTable1748000000000 } from './database/migrations/1748000000000-CreateUsersTable';
import { AddEmailToUsers1780411963887 } from './database/migrations/1780411963887-AddEmailToUsers';
import { MailModule } from './mail/mail.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { MetricsService } from './common/metrics/metrics.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  // [NESTJS] Aggregation of core infrastructure and business features
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 1. [SECURITY] Rate Limiting Configuration
    // Why: Protects the API from denial-of-service and brute-force attacks.
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window (1 minute)
        limit: 60, // Max requests per window
      },
    ]),
    // 2. [PERFORMANCE] Multi-layer Caching (L1: In-memory)
    // Why: Reduces latency for hot metadata by serving it from memory before hitting Redis.
    CacheModule.register({
      ttl: 10000, // 10s default TTL
      max: 100, // Max items in memory
      isGlobal: true,
    }),
    // 3. [DB] Postgres connection for relational data (users today, more later)
    //
    // synchronize is OFF — the schema is owned by migrations under
    // src/database/migrations. migrationsRun: true applies any pending
    // migrations at boot, so a freshly-started container always lands on
    // the latest schema before the app accepts traffic.
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'vsp',
      password: process.env.POSTGRES_PASSWORD || 'vsp_pg_change_in_prod_2024',
      database: process.env.POSTGRES_DB || 'vsp',
      entities: [User],
      migrations: [CreateUsersTable1748000000000, AddEmailToUsers1780411963887],
      synchronize: false,
      migrationsRun: true,
      logging: process.env.TYPEORM_LOGGING === 'true',
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    VideosModule,
    UploadModule,
    MailModule,
  ],
  // [NESTJS] System-level health and root endpoints
  controllers: [AppController],
  providers: [
    AppService,
    MetricsService,
    // 2. [SECURITY] Register global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 3. [SECURITY] Register global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  // [OBSERVABILITY] Global Middleware Registry
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*'); // Apply correlation IDs to every single endpoint
  }
}
