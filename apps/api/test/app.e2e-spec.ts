import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SupabaseService } from './../src/database/supabase.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({ client: {} })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: 'Hello World!',
    });

    expect(typeof response.body.requestId).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: { ok: true },
    });
  });

  it('/examples (GET) pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/examples')
      .query({ page: 1, pageSize: 10 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items).toHaveLength(10);
    expect(response.body.meta.pagination).toMatchObject({
      page: 1,
      pageSize: 10,
      totalItems: 128,
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
