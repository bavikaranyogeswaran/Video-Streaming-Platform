import { Test, TestingModule } from '@nestjs/testing';
import { LockService } from './lock.service';
import { RedisService } from './redis.service';
import Redlock from 'redlock';

jest.mock('redlock');
jest.mock('ioredis');

describe('LockService', () => {
  let service: LockService;

  const mockLockInstance = {
    release: jest.fn().mockResolvedValue(true),
  };

  const mockRedlock = {
    acquire: jest.fn().mockResolvedValue(mockLockInstance),
    on: jest.fn(),
  };

  beforeEach(async () => {
    (Redlock as unknown as jest.Mock).mockImplementation(() => mockRedlock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({ on: jest.fn() }),
          },
        },
      ],
    }).compile();

    service = module.get<LockService>(LockService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acquire', () => {
    it('should successfully acquire a lock', async () => {
      const lock = await service.acquire('test-resource', 5000);
      
      expect(mockRedlock.acquire).toHaveBeenCalledWith(['test-resource'], 5000);
      expect(lock).toBeDefined();
    });

    it('should throw an error if lock acquisition fails', async () => {
      mockRedlock.acquire.mockRejectedValue(new Error('Lock busy'));

      await expect(service.acquire('test-resource', 5000))
        .rejects.toThrow('Could not acquire lock for test-resource: Lock busy');
    });
  });

  describe('Lock wrapper', () => {
    it('should correctly wrap redlock release', async () => {
      mockRedlock.acquire.mockResolvedValue(mockLockInstance);
      const lock = await service.acquire('test-resource', 5000);
      await lock.release();

      expect(mockLockInstance.release).toHaveBeenCalled();
    });
  });
});
