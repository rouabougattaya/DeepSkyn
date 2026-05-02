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

  it('should generate severe test case', () => {
    const detections = service.generateTestCase('severe');
    expect(detections.some(d => d.class === 'Acne')).toBe(true);
    expect(detections.length).toBeGreaterThan(5);
  });

  it('should generate mild test case', () => {
    const detections = service.generateTestCase('mild');
    expect(detections.length).toBeLessThan(10);
  });

  it('should generate mixed test case (default)', () => {
    const detections = service.generateTestCase('mixed');
    expect(detections.length).toBeGreaterThan(0);
  });

  it('should handle analyzeImage call', async () => {
    const detections = await service.analyzeImage('some-id');
    expect(detections.length).toBeGreaterThan(0);
  });
});
