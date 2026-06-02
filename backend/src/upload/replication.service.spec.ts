import { Test, TestingModule } from '@nestjs/testing';
import {
  ReplicationService,
  QuorumNotMetError,
} from './replication.service';
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
    jest.clearAllMocks();
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
    it('returns all three labels when every node accepts every segment', async () => {
      mockedFs.readdirSync.mockReturnValue(['init.mp4', '0.m4s'] as any);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const result = await service.replicate('video-123', '/tmp/hls');

      expect(result).toEqual(['A', 'B', 'C']);
      expect(lockService.acquire).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('meets quorum (2 of 3) when one node fails — C surfaces in the result list', async () => {
      mockedFs.readdirSync.mockReturnValue(['init.mp4'] as any);

      // Node A fails, B and C succeed
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network Error')) // A
        .mockResolvedValueOnce({ status: 200 }) // B
        .mockResolvedValueOnce({ status: 200 }); // C

      const result = await service.replicate('video-123', '/tmp/hls');

      expect(result).not.toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('throws QuorumNotMetError when only one node succeeds', async () => {
      mockedFs.readdirSync.mockReturnValue(['init.mp4'] as any);

      // Only B succeeds
      mockedAxios.post
        .mockRejectedValueOnce(new Error('A offline')) // A
        .mockResolvedValueOnce({ status: 200 }) // B
        .mockRejectedValueOnce(new Error('C offline')); // C

      await expect(service.replicate('video-123', '/tmp/hls')).rejects.toThrow(
        QuorumNotMetError,
      );
      // Lock must still be released
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('throws when staging dir is empty', async () => {
      mockedFs.readdirSync.mockReturnValue([] as any);

      await expect(service.replicate('video-123', '/tmp/hls')).rejects.toThrow(
        /No HLS segments/,
      );
      expect(mockLock.release).toHaveBeenCalled();
    });
  });

  describe('repair', () => {
    it('returns true when repair succeeds', async () => {
      mockedFs.readdirSync.mockReturnValue(['test.ts'] as any);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const result = await service.repair(
        'video-123',
        '/tmp/hls',
        'http://node-a:4001',
      );

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('returns false when repair fails', async () => {
      mockedFs.readdirSync.mockReturnValue(['test.ts'] as any);
      mockedAxios.post.mockRejectedValue(new Error('Storage node offline'));

      const result = await service.repair(
        'video-123',
        '/tmp/hls',
        'http://node-a:4001',
      );

      expect(result).toBe(false);
    });
  });
});
