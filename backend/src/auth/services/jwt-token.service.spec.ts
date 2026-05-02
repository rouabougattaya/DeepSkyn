import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenService } from './jwt-token.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../user/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt');

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              if (key === 'JWT_ACCESS_TTL') return 900;
              if (key === 'JWT_REFRESH_TTL') return 604800;
              if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return correct TTLs', () => {
      expect(service.getAccessTokenTtl()).toBe(900);
      expect(service.getRefreshTokenTtl()).toBe(604800);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with correct payload', () => {
      (jwtService.sign as jest.Mock).mockReturnValue('mock-access-token');

      const token = service.generateAccessToken(mockUser, 2);

      expect(token).toBe('mock-access-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          tokenType: 'access',
          version: 2,
          jti: expect.any(String),
        }),
        { secret: 'access-secret', expiresIn: '900s' },
      );
    });

    it('should use default token version 1 if not provided', () => {
      (jwtService.sign as jest.Mock).mockReturnValue('mock-access-token');

      service.generateAccessToken(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
        }),
        expect.any(Object),
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with correct payload', () => {
      (jwtService.sign as jest.Mock).mockReturnValue('mock-refresh-token');

      const token = service.generateRefreshToken(mockUser, 3);

      expect(token).toBe('mock-refresh-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          tokenType: 'refresh',
          version: 3,
          jti: expect.any(String),
        }),
        { secret: 'refresh-secret', expiresIn: '604800s' },
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should successfully verify a valid access token', () => {
      const mockPayload = { sub: 'user-123' };
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = service.verifyAccessToken('valid-token');

      expect(result).toBe(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'access-secret',
      });
    });

    it('should return null if verification fails', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.verifyAccessToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should successfully verify a valid refresh token', () => {
      const mockPayload = { sub: 'user-123' };
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = service.verifyRefreshToken('valid-token');

      expect(result).toBe(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'refresh-secret',
      });
    });

    it('should return null if verification fails', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.verifyRefreshToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('hashToken and verifyHashedToken', () => {
    it('should hash a token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      const result = await service.hashToken('plain-token');

      expect(result).toBe('hashed-token');
      expect(bcrypt.hash).toHaveBeenCalledWith('plain-token', 10);
    });

    it('should verify a hashed token', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyHashedToken('plain-token', 'hashed-token');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('plain-token', 'hashed-token');
    });

    it('should return false if hash verification fails', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyHashedToken('wrong-token', 'hashed-token');

      expect(result).toBe(false);
    });
  });

  describe('calculateExpirationDate', () => {
    it('should calculate expiration date correctly', () => {
      const now = new Date('2026-05-02T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const ttlSeconds = 3600; // 1 hour
      const result = service.calculateExpirationDate(ttlSeconds);

      const expectedDate = new Date('2026-05-02T11:00:00Z');
      expect(result).toEqual(expectedDate);

      jest.useRealTimers();
    });
  });
});
