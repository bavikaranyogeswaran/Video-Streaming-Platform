import { Test, TestingModule } from '@nestjs/testing';
import { ReplicationService } from './replication.service';
import { LockService } from '../redis/lock.service';
import axios from 'axios';
import * as fs from 'fs';

jest.mock('axios');
jest.mock('fs');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ReplicationService', () => {
  let service: ReplicationService;
  let lockService: LockService;

  const mockLock = {
    release: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplicationService,
        {
          provide: LockService,
          useValue: {
            acquire: jest.fn().mockResolvedValue(mockLock),
          },
        },
      ],
    }).compile();

    service = module.get<ReplicationService>(ReplicationService);
    lockService = module.get<LockService>(LockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('replicate', () => {
    it('should successfully replicate to primary nodes', async () => {
      mockedFs.readdirSync.mockReturnValue(['init.mp4', '0.m4s'] as any);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const result = await service.replicate('video-123', '/tmp/hls');

      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(lockService.acquire).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should handle partial failures during replication', async () => {
      mockedFs.readdirSync.mockReturnValue(['init.mp4'] as any);
      
      // Node A fails, Node B succeeds
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network Error')) // Node A
        .mockResolvedValueOnce({ status: 200 });           // Node B

      const result = await service.replicate('video-123', '/tmp/hls');

      expect(result).not.toContain('A');
      expect(result).toContain('B');
    });
  });

  describe('repair', () => {
    it('should successfully trigger repair on a specific node', async () => {
      mockedFs.readdirSync.mockReturnValue(['test.ts'] as any);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const result = await service.repair('video-123', '/tmp/hls', 'http://node-a:4001');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should return false if repair fails', async () => {
      mockedFs.readdirSync.mockReturnValue(['test.ts'] as any);
      mockedAxios.post.mockRejectedValue(new Error('Storage node offline'));

      const result = await service.repair('video-123', '/tmp/hls', 'http://node-a:4001');

      expect(result).toBe(false);
    });
  });
});
