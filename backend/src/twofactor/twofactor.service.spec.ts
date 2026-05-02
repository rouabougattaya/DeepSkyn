import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from './twofactor.service';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

// Mock dependecies
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwoFactorService],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSecret', () => {
    it('should generate a secret and a qr code', async () => {
      const email = 'test@example.com';
      const mockSecret = 'mock-secret';
      const mockUri = 'otpauth://totp/DeepSkyn:test@example.com?secret=mock-secret&issuer=DeepSkyn';
      const mockQrCode = 'data:image/png;base64,mocked-qr-code';

      (generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (generateURI as jest.Mock).mockReturnValue(mockUri);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);

      const result = await service.generateSecret(email);

      expect(result).toEqual({ secret: mockSecret, qrCode: mockQrCode });
      expect(generateSecret).toHaveBeenCalled();
      expect(generateURI).toHaveBeenCalledWith({
        issuer: 'DeepSkyn',
        label: email,
        secret: mockSecret,
      });
      expect(QRCode.toDataURL).toHaveBeenCalledWith(mockUri);
    });

    it('should allow custom app name', async () => {
      const email = 'test@example.com';
      const customAppname = 'CustomApp';
      (generateSecret as jest.Mock).mockReturnValue('s');
      (generateURI as jest.Mock).mockReturnValue('u');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('q');

      await service.generateSecret(email, customAppname);

      expect(generateURI).toHaveBeenCalledWith(expect.objectContaining({
        issuer: customAppname,
      }));
    });
  });

  describe('verifyToken', () => {
    it('should return true when token is valid', () => {
      (verifySync as jest.Mock).mockReturnValue({ valid: true });

      const result = service.verifyToken('valid-secret', '123456');

      expect(result).toBe(true);
      expect(verifySync).toHaveBeenCalledWith({
        token: '123456',
        secret: 'valid-secret',
      });
    });

    it('should return false when token is invalid', () => {
      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      const result = service.verifyToken('valid-secret', '654321');

      expect(result).toBe(false);
    });

    it('should trim empty spaces from token', () => {
      (verifySync as jest.Mock).mockReturnValue({ valid: true });

      service.verifyToken('secret', '  123456   ');

      expect(verifySync).toHaveBeenCalledWith({
        token: '123456',
        secret: 'secret',
      });
    });

    it('should return false if secret or token is missing', () => {
      expect(service.verifyToken('', '123456')).toBe(false);
      expect(service.verifyToken('secret', '')).toBe(false);
      expect(service.verifyToken(null as any, null as any)).toBe(false);
    });

    it('should catch error and return false if verification throws', () => {
      (verifySync as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = service.verifyToken('secret', '123456');

      expect(result).toBe(false);
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
