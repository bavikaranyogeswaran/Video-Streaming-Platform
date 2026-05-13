import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ReplicationService } from './../src/upload/replication.service';

describe('Integration Tests (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'Password123!',
  };

  const mockReplicationService = {
    replicate: jest.fn().mockResolvedValue(['A', 'B']),
    repair: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ReplicationService)
      .useValue(mockReplicationService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Auth Flow', () => {
    it('/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res: request.Response) => {
          expect((res.body as { message: string }).message).toEqual(
            'User registered successfully',
          );
        });
    });

    it('/auth/login (POST) - should login and return JWT', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as { access_token: string };
          expect(body.access_token).toBeDefined();
          authToken = body.access_token;
        });
    });
  });

  describe('Videos Flow', () => {
    let createdVideoId: string;

    it('/videos (POST) - should create video metadata (Authenticated)', () => {
      return request(app.getHttpServer())
        .post('/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Integration Video',
          description: 'Testing the full metadata flow',
        })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as { id: string; title: string };
          expect(body.id).toBeDefined();
          expect(body.title).toEqual('Test Integration Video');
          createdVideoId = body.id;
        });
    });

    it('/videos (GET) - should list all videos (Public)', () => {
      return request(app.getHttpServer())
        .get('/videos')
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as Array<{ id: string }>;
          expect(Array.isArray(body)).toBe(true);
          expect(body.some((v) => v.id === createdVideoId)).toBe(true);
        });
    });

    it('/videos/:id (GET) - should get specific video details (Public)', () => {
      return request(app.getHttpServer())
        .get(`/videos/${createdVideoId}`)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as { id: string; title: string };
          expect(body.id).toEqual(createdVideoId);
          expect(body.title).toEqual('Test Integration Video');
        });
    });

    it('/videos/:id (DELETE) - should delete video (Authenticated)', () => {
      return request(app.getHttpServer())
        .delete(`/videos/${createdVideoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('/videos/:id (GET) - should return 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/videos/${createdVideoId}`)
        .expect(404);
    });
  });
});
