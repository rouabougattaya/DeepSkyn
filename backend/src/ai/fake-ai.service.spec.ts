import { Test, TestingModule } from '@nestjs/testing';
import { FakeAiService } from './fake-ai.service';

describe('FakeAiService', () => {
  let service: FakeAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FakeAiService],
    }).compile();

    service = module.get<FakeAiService>(FakeAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate random detections (coverage for crypto)', () => {
    const detections = service.generateRandomDetections();
    expect(detections.length).toBeGreaterThanOrEqual(5);
    expect(detections[0]).toHaveProperty('class');
    expect(detections[0]).toHaveProperty('confidence');
  });

  it('should generate random detections with seed', () => {
    const detections1 = service.generateRandomDetections(123);
    const detections2 = service.generateRandomDetections(123);
    expect(detections1).toEqual(detections2);
  });
});
