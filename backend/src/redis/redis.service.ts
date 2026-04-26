import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  onModuleInit() {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.set(key, value, 'EX', ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redisClient.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.redisClient.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redisClient.hgetall(key);
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redisClient.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number, order: 'ASC' | 'REV' = 'ASC'): Promise<string[]> {
    if (order === 'REV') {
      return this.redisClient.zrange(key, start, stop, 'REV');
    }
    return this.redisClient.zrange(key, start, stop);
  }

  async zrem(key: string, member: string): Promise<void> {
    await this.redisClient.zrem(key, member);
  }
}
