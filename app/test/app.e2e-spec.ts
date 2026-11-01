import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.config';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /items then GET /items', async () => {
    await request(app.getHttpServer())
      .post('/items')
      .send({ name: 'widget' })
      .expect(201)
      .expect({ id: 1, name: 'widget' });

    return request(app.getHttpServer())
      .get('/items')
      .expect(200)
      .expect([{ id: 1, name: 'widget' }]);
  });

  it('POST /items rejects an empty name', () => {
    return request(app.getHttpServer())
      .post('/items')
      .send({ name: '' })
      .expect(400);
  });
});
