import { Injectable, OnModuleInit } from '@nestjs/common';
import Redlock from 'redlock';
import { RedisService } from './redis.service';

@Injectable()
export class LockService implements OnModuleInit {
  private redlock: Redlock;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    // 1. [RESILIENCE] Initialize Redlock with the existing Redis connection
    // Why: Ensures distributed locking consistency across multiple backend replicas
    this.redlock = new Redlock(
      [this.redisService.getClient()],
      {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200,
        retryJitter: 200,
        automaticExtensionThreshold: 500,
      }
    );

    this.redlock.on('error', (error) => {
      console.error('❌ Redlock Error:', error);
    });
  }

  // ACQUIRE: Attempts to lock a resource for a specific duration
  async acquire(resource: string, ttl: number) {
    try {
      return await this.redlock.acquire([resource], ttl);
    } catch (err) {
      throw new Error(`Could not acquire lock for ${resource}: ${err.message}`);
    }
  }
}
