import { Test, TestingModule } from '@nestjs/testing';
import { ImageValidationService } from './image-validation.service';

// Mock du module @xenova/transformers
jest.mock('@xenova/transformers', () => {
  return {
    pipeline: jest.fn(),
    env: { allowLocalModels: true },
    RawImage: {
      fromBlob: jest.fn(),
    },
  };
});

describe('ImageValidationService', () => {
  let service: ImageValidationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageValidationService],
    }).compile();

    service = module.get<ImageValidationService>(ImageValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateImageBeforeAnalysis', () => {
    it('should return valid if no image is provided', async () => {
      const result = await service.validateImageBeforeAnalysis('');
      expect(result).toEqual({ isValid: true, message: 'Aucune image fournie.' });
    });

    it('should return valid due to local validation being disabled (current implementation)', async () => {
      const result = await service.validateImageBeforeAnalysis('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD');
      expect(result).toEqual({ isValid: true, message: 'Local validation disabled' });
    });
  });
});
