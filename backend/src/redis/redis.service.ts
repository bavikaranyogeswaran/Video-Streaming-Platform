// =================================================================================
// REDIS SERVICE (The Infrastructure Core)
// =================================================================================
// This service provides the core persistence abstraction for the cluster.
// It wraps ioredis commands with typed interfaces for reliable
// distributed state and index management.
// =================================================================================

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  // ON MODULE INIT: Establish connection to the Redis cluster
  onModuleInit() {
    // 1. [DB] Initialize ioredis instance with environment configuration
    this.redisClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );
  }

  // ON MODULE DESTROY: Graceful shutdown of the client connection
  onModuleDestroy() {
    // 1. [SIDE EFFECT] Close Redis connection to prevent memory leaks
    this.redisClient.quit();
  }

  // GET CLIENT: Exposes the raw ioredis instance
  getClient(): Redis {
    // Why: Needed for third-party libraries (like Redlock) that require direct access
    return this.redisClient;
  }

  // GET: Retrieves a simple string value by key
  async get(key: string): Promise<string | null> {
    // [DB] GET {key}
    return this.redisClient.get(key);
  }

  // SET: Persists a string value with optional expiration
  async set(key: string, value: string, ttl?: number): Promise<void> {
    // 1. [DB] SET {key} {value} [EX {ttl}]
    if (ttl) {
      await this.redisClient.set(key, value, 'EX', ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  // HSET: Updates a field within a Redis Hash
  async hset(key: string, field: string, value: string): Promise<void> {
    // [DB] HSET {key} {field} {value}
    // Why: Atomic update of specific object attributes (e.g. video status)
    await this.redisClient.hset(key, field, value);
  }

  // HGET: Retrieves a specific field from a Redis Hash
  async hget(key: string, field: string): Promise<string | null> {
    // [DB] HGET {key} {field}
    return this.redisClient.hget(key, field);
  }

  // HGETALL: Hydrates a full object from a Redis Hash
  async hgetall(key: string): Promise<Record<string, string>> {
    // [DB] HGETALL {key}
    return this.redisClient.hgetall(key);
  }

  // DEL: Removes one or more keys from the database
  async del(key: string): Promise<void> {
    // [DB] DEL {key}
    await this.redisClient.del(key);
  }

  // EXISTS: Checks for the presence of a key
  async exists(key: string): Promise<boolean> {
    // [DB] EXISTS {key}
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  // ZADD: Adds a member to a Sorted Set with a specific score
  async zadd(key: string, score: number, member: string): Promise<void> {
    // [DB] ZADD {key} {score} {member}
    // Why: Used for indexing videos chronologically by timestamp
    await this.redisClient.zadd(key, score, member);
  }

  // ZRANGE: Retrieves a range of members from a Sorted Set
  async zrange(
    key: string,
    start: number,
    stop: number,
    order: 'ASC' | 'REV' = 'ASC',
  ): Promise<string[]> {
    // 1. [DB] ZRANGE {key} {start} {stop} [REV]
    // Why: Facilitates feed generation and pagination
    if (order === 'REV') {
      return this.redisClient.zrange(key, start, stop, 'REV');
    }
    return this.redisClient.zrange(key, start, stop);
  }

  // ZREM: Removes a member from a Sorted Set
  async zrem(key: string, member: string): Promise<void> {
    // [DB] ZREM {key} {member}
    await this.redisClient.zrem(key, member);
  }
}
