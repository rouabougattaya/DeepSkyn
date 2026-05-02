import { Test, TestingModule } from '@nestjs/testing';
import { DigitalTwinController } from './digital-twin.controller';
import { DigitalTwinService } from './digital-twin.service';
import { CreateDigitalTwinDto } from './digital-twin.dto';
import { BadRequestException } from '@nestjs/common';

describe('DigitalTwinController', () => {
  let controller: DigitalTwinController;

  const mockService = {
    createDigitalTwin: jest.fn(),
    getLatestDigitalTwin: jest.fn(),
    getDigitalTwinTimeline: jest.fn(),
    getDigitalTwin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DigitalTwinController],
      providers: [
        {
          provide: DigitalTwinService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DigitalTwinController>(DigitalTwinController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDigitalTwin', () => {
    it('should create digital twin', async () => {
      const dto: CreateDigitalTwinDto = { baseAnalysisId: '1' };
      mockService.createDigitalTwin.mockResolvedValueOnce({ id: 'tw1' });

      const req = { user: { id: 'u1' } };
      const res = await controller.createDigitalTwin(req, dto);
      expect(res).toBeDefined();
      expect(res.id).toBe('tw1');
    });

    it('should throw if no user id', async () => {
      const dto: CreateDigitalTwinDto = { baseAnalysisId: '1' };
      const req = { user: {} };
      await expect(controller.createDigitalTwin(req, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLatestDigitalTwin', () => {
    it('should get latest digital twin', async () => {
      mockService.getLatestDigitalTwin.mockResolvedValueOnce({ id: 'tw1' });
      const req = { user: { id: 'u1' } };
      const res = await controller.getLatestDigitalTwin(req);
      expect(res).toBeDefined();
    });

    it('should return message if no twin', async () => {
      mockService.getLatestDigitalTwin.mockResolvedValueOnce(null);
      const req = { user: { id: 'u1' } };
      const res = await controller.getLatestDigitalTwin(req);
      expect((res as any).message).toBeDefined();
    });
  });

  describe('getTimeline', () => {
    it('should get timeline', async () => {
      mockService.getDigitalTwinTimeline.mockResolvedValueOnce({ currentState: {} });
      const req = { user: { id: 'u1' } };
      const res = await controller.getTimeline(req, 'tw1');
      expect(res).toBeDefined();
    });
  });

  describe('getDigitalTwin', () => {
    it('should get specific twin', async () => {
      mockService.getDigitalTwin.mockResolvedValueOnce({ id: 'tw1' });
      const req = { user: { id: 'u1' } };
      const res = await controller.getDigitalTwin(req, 'tw1');
      expect(res).toBeDefined();
    });
  });
});
