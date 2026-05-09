// =================================================================================
// REDIS MODULE (The Shared State)
// =================================================================================
// This global module provides the shared Redis infrastructure.
// It enables atomic state management and cross-service indexing
// across the entire distributed system.
// =================================================================================

import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Makes RedisService available across all modules without re-importing
@Module({
  // [NESTJS] Provider for the Redis abstraction layer
  providers: [RedisService],
  // [NESTJS] Export for dependency injection in other domains
  exports: [RedisService],
})
export class RedisModule {}
