import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkinAnalysis } from '../src/skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../src/skinMetric/skin-metric.entity';

describe('AnalysisController (e2e)', () => {
  let app: INestApplication;
  let skinAnalysisRepo: any;
  let skinMetricRepo: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(SkinAnalysis))
      .useValue({
        findOne: jest.fn().mockResolvedValue({ id: '1', skinScore: null }),
        save: jest.fn().mockImplementation(a => a),
      })
      .overrideProvider(getRepositoryToken(SkinMetric))
      .useValue({
        find: jest.fn().mockResolvedValue([
          { metricType: 'hydration', score: 80 },
          { metricType: 'oil', score: 60 },
          { metricType: 'acne', score: 20 },
          { metricType: 'wrinkles', score: 40 },
        ]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    skinAnalysisRepo = moduleFixture.get(getRepositoryToken(SkinAnalysis));
    skinMetricRepo = moduleFixture.get(getRepositoryToken(SkinMetric));
  });

  it('/analysis/recalculate/:id (POST)', async () => {
    const weights = { hydration: 1, oil: 1, acne: 1, wrinkles: 1 };
    const res = await request(app.getHttpServer())
      .post('/analysis/recalculate/1')
      .send({ weights });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('skinScore');
    expect(typeof res.body.skinScore).toBe('number');
  });
});
