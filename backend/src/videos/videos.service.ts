// =================================================================================
// VIDEOS SERVICE (The Metadata Manager)
// =================================================================================
// This service acts as the primary data access layer for video records.
// It manages metadata persistence in Redis using high-performance
// Hash maps and Sorted Set indexes for feed generation.
// =================================================================================

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../redis/redis.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoResponseDto } from './dto/video-response.dto';

@Injectable()
export class VideosService {
  // [NESTJS] Shared Redis and Local Cache for multi-layer data strategy
  constructor(
    private readonly redisService: RedisService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // CREATE VIDEO: Registers a new video record in the system
  async create(createVideoDto: CreateVideoDto, username: string): Promise<VideoResponseDto> {
    // 1. [VALIDATION] Generate unique identifier and prepare payload
    const id = uuidv4();
    const videoKey = `video:${id}`;
    const createdAt = new Date().toISOString();
    const timestamp = Date.now();

    const videoData: any = {
      id,
      title: createVideoDto.title,
      description: createVideoDto.description || '',
      uploadedBy: username,
      createdAt,
      status: 'processing',
      storageNodes: JSON.stringify([]),
    };

    // 2. [DB] Persist detailed metadata in a Redis Hash
    // [DB] HSET video:{id} -> field/value mapping
    // Why: Provides fast, atomic access to individual video attributes
    for (const [field, value] of Object.entries(videoData)) {
      await this.redisService.hset(videoKey, field, value as string);
    }

    // 3. [DB] Update global video index
    // [DB] ZADD videos:index {timestamp} {id}
    // Why: Allows efficient chronological sorting and pagination of the feed
    await this.redisService.zadd('videos:index', timestamp, id);

    // 4. [PERFORMANCE] Invalidate feed cache to reflect the new upload
    await this.cacheManager.del('videos:all');

    return {
      ...videoData,
      storageNodes: [],
    };
  }

  // FIND ALL: Retrieves all indexed videos ordered by upload date
  async findAll(): Promise<VideoResponseDto[]> {
    // 1. [PERFORMANCE] Attempt to serve from L1 Cache (Memory)
    const cached = await this.cacheManager.get<VideoResponseDto[]>('videos:all');
    if (cached) return cached;

    // 2. [DB] Fetch IDs from the sorted index in reverse order (newest first)
    // [DB] ZRANGE videos:index 0 -1 REV
    const ids = await this.redisService.zrange('videos:index', 0, -1, 'REV');
    
    // 3. [DB] Hydrate metadata for each video record
    const videos = await Promise.all(ids.map(id => this.findOne(id)));

    // 4. [PERFORMANCE] Populate L1 Cache for subsequent requests
    await this.cacheManager.set('videos:all', videos);

    return videos;
  }

  // FIND ONE: Retrieves metadata for a specific video ID
  async findOne(id: string): Promise<VideoResponseDto> {
    // 1. [PERFORMANCE] Attempt to serve from L1 Cache (Memory)
    const cacheKey = `video:${id}`;
    const cached = await this.cacheManager.get<VideoResponseDto>(cacheKey);
    if (cached) return cached;

    // 2. [DB] Fetch all fields for the given video key
    // [DB] HGETALL video:{id}
    const videoKey = `video:${id}`;
    const data = await this.redisService.hgetall(videoKey);

    // 3. [VALIDATION] Ensure the record exists and is valid
    if (!data || !data.id) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    const video = {
      ...data,
      storageNodes: JSON.parse(data.storageNodes || '[]'),
    } as any;

    // 4. [PERFORMANCE] Populate L1 Cache
    await this.cacheManager.set(cacheKey, video);

    return video;
  }

  // DELETE: Safely removes video metadata and index entry
  async delete(id: string): Promise<void> {
    const videoKey = `video:${id}`;
    
    // 1. [DB] Verify existence before attempting deletion
    const data = await this.redisService.hgetall(videoKey);
    
    if (data && data.id) {
       // 2. [TRANSACTIONAL] Remove hash and index member
       // ⚠️ NOTE: Cleanup of actual video chunks on storage nodes should happen via side effect
       await this.redisService.del(videoKey);
       await this.redisService.zrem('videos:index', id);

       // 3. [PERFORMANCE] Invalidate L1 Cache
       await this.cacheManager.del('videos:all');
       await this.cacheManager.del(`video:${id}`);
    }
  }

  // UPDATE STATUS: Modifies the processing state of a video
  async updateStatus(id: string, status: 'processing' | 'ready' | 'error', hlsPath?: string): Promise<void> {
    // 1. [DB] Update status field in the video hash
    const videoKey = `video:${id}`;
    await this.redisService.hset(videoKey, 'status', status);
    
    // 2. [DB] If ready, attach the public streaming path
    if (hlsPath) {
      await this.redisService.hset(videoKey, 'hlsPath', hlsPath);
    }

    // 3. [PERFORMANCE] Invalidate L1 Cache to reflect status update
    await this.cacheManager.del('videos:all');
    await this.cacheManager.del(`video:${id}`);
  }

  // SET STORAGE NODES: Records the physical location of video replicas
  async setStorageNodes(id: string, nodes: string[]): Promise<void> {
    // 1. [DB] Persist node labels (e.g. ['A', 'B']) for failover selection
    const videoKey = `video:${id}`;
    await this.redisService.hset(videoKey, 'storageNodes', JSON.stringify(nodes));

    // 2. [PERFORMANCE] Invalidate L1 Cache
    await this.cacheManager.del('videos:all');
    await this.cacheManager.del(`video:${id}`);
  }
}
