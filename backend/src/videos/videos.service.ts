import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../redis/redis.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoResponseDto } from './dto/video-response.dto';

@Injectable()
export class VideosService {
  constructor(private readonly redisService: RedisService) {}

  async create(createVideoDto: CreateVideoDto, username: string): Promise<VideoResponseDto> {
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

    // Store in hash
    for (const [field, value] of Object.entries(videoData)) {
      await this.redisService.hset(videoKey, field, value as string);
    }

    // Add to global index (sorted set by timestamp)
    await this.redisService.zadd('videos:index', timestamp, id);

    return {
      ...videoData,
      storageNodes: [],
    };
  }

  async findAll(): Promise<VideoResponseDto[]> {
    const ids = await this.redisService.zrange('videos:index', 0, -1, 'REV');
    const videos = await Promise.all(ids.map(id => this.findOne(id)));
    return videos;
  }

  async findOne(id: string): Promise<VideoResponseDto> {
    const videoKey = `video:${id}`;
    const data = await this.redisService.hgetall(videoKey);

    if (!data || !data.id) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    return {
      ...data,
      storageNodes: JSON.parse(data.storageNodes || '[]'),
    } as any;
  }

  async delete(id: string): Promise<void> {
    const videoKey = `video:${id}`;
    const data = await this.redisService.hgetall(videoKey);
    
    if (data && data.id) {
       await this.redisService.del(videoKey);
       await this.redisService.zrem('videos:index', id);
    }
  }

  async updateStatus(id: string, status: 'processing' | 'ready' | 'error', hlsPath?: string): Promise<void> {
    const videoKey = `video:${id}`;
    await this.redisService.hset(videoKey, 'status', status);
    if (hlsPath) {
      await this.redisService.hset(videoKey, 'hlsPath', hlsPath);
    }
  }

  async setStorageNodes(id: string, nodes: string[]): Promise<void> {
    const videoKey = `video:${id}`;
    await this.redisService.hset(videoKey, 'storageNodes', JSON.stringify(nodes));
  }
}
