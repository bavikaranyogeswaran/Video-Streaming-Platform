// =================================================================================
// REDIS MODULE (The Shared State)
// =================================================================================
// This global module provides the shared Redis infrastructure.
// It enables atomic state management and cross-service indexing
// across the entire distributed system.
// =================================================================================

import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { LockService } from './lock.service';

@Global() // Makes RedisService available across all modules without re-importing
@Module({
  // [NESTJS] Providers for shared state and synchronization logic
  providers: [RedisService, LockService],
  // [NESTJS] Exports for dependency injection in other domains
  exports: [RedisService, LockService],
})
export class RedisModule {}
