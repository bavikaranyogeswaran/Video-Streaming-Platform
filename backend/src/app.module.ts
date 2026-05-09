// =================================================================================
// APP MODULE (The Root Orchestrator)
// =================================================================================
// This is the primary module of the NestJS application.
// It integrates all domain-specific modules and establishes the
// global security context via the JWT Auth Guard.
// =================================================================================

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';
import { UploadModule } from './upload/upload.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  // [NESTJS] Aggregation of core infrastructure and business features
  imports: [RedisModule, AuthModule, VideosModule, UploadModule],
  // [NESTJS] System-level health and root endpoints
  controllers: [AppController],
  providers: [
    AppService,
    // 1. [SECURITY] Register global JWT guard
    // Why: Enforces "Secure by Default" — all routes require auth unless marked @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
