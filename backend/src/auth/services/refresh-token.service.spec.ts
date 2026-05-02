import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenService } from './refresh-token.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtTokenService } from './jwt-token.service';
import { User } from '../../user/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: any;
  let jwtTokenService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@test.com',
  } as User;

  const mockRefreshToken = {
    id: 'token-123',
    userId: 'user-123',
    hashedToken: 'hashed-rt',
    version: 1,
    revoked: false,
    expiresAt: new Date(Date.now() + 100000),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  };

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtTokenService = {
    generateRefreshToken: jest.fn(),
    hashToken: jest.fn(),
    verifyHashedToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    calculateExpirationDate: jest.fn(),
    getRefreshTokenTtl: jest.fn().mockReturnValue(604800),
  };

  beforeEach(async () => {
    mockRefreshToken.revoked = false;
    mockRefreshToken.expiresAt = new Date(Date.now() + 100000);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRepo,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
    jwtTokenService = module.get(JwtTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefreshToken', () => {
    it('should create and store a new refresh token', async () => {
      const expirationDate = new Date();
      mockJwtTokenService.generateRefreshToken.mockReturnValue('plain-rt');
      mockJwtTokenService.hashToken.mockResolvedValue('hashed-rt');
      mockJwtTokenService.calculateExpirationDate.mockReturnValue(expirationDate);
      mockRepo.create.mockReturnValue(mockRefreshToken);
      mockRepo.save.mockResolvedValue(mockRefreshToken);

      const result = await service.createRefreshToken(mockUser, '127.0.0.1', 'test-agent');

      expect(result).toEqual({ ...mockRefreshToken, refreshToken: 'plain-rt' });
      expect(mockJwtTokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser, 1);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          hashedToken: 'hashed-rt',
          version: 1,
          revoked: false,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalledWith(mockRefreshToken);
    });
  });

  describe('rotateRefreshToken', () => {
    it('should throw UnauthorizedException if old token fails verification', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue(null);

      await expect(
        service.rotateRefreshToken(mockUser, 'invalid-old-rt', 2, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if old token not found in DB', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ version: 1 });
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rotateRefreshToken(mockUser, 'old-rt', 2, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if hash does not match', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ version: 1 });
      mockRepo.findOne.mockResolvedValue(mockRefreshToken);
      mockJwtTokenService.verifyHashedToken.mockResolvedValue(false);

      await expect(
        service.rotateRefreshToken(mockUser, 'wrong-hash-rt', 2, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully rotate refresh token', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ version: 1 });
      mockRepo.findOne.mockResolvedValue(mockRefreshToken);
      mockJwtTokenService.verifyHashedToken.mockResolvedValue(true);

      mockJwtTokenService.generateRefreshToken.mockReturnValue('new-plain-rt');
      mockJwtTokenService.hashToken.mockResolvedValue('new-hashed-rt');
      mockJwtTokenService.calculateExpirationDate.mockReturnValue(new Date());

      const mockNewRecord = { ...mockRefreshToken, id: 'token-124', hashedToken: 'new-hashed-rt', version: 2 };
      mockRepo.create.mockReturnValue(mockNewRecord);

      const result = await service.rotateRefreshToken(mockUser, 'old-rt', 2, '192.168.1.1', 'mobile-agent');

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ ...mockRefreshToken, revoked: true }));
      expect(mockJwtTokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser, 2);
      expect(mockRepo.save).toHaveBeenCalledWith(mockNewRecord);
      expect(result.refreshToken).toBe('new-plain-rt');
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate correctly and return record', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ sub: mockUser.id, version: 1 });
      mockRepo.findOne.mockResolvedValue(mockRefreshToken);
      mockJwtTokenService.verifyHashedToken.mockResolvedValue(true);

      const result = await service.validateRefreshToken(mockUser.id, 'plain-rt');

      expect(result).toEqual(mockRefreshToken);
    });

    it('should throw if payload sub does not match userId', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ sub: 'other-user', version: 1 });

      await expect(service.validateRefreshToken(mockUser.id, 'plain-rt')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token revoked', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ sub: mockUser.id, version: 1 });
      mockRepo.findOne.mockResolvedValue({ ...mockRefreshToken, revoked: true });

      await expect(service.validateRefreshToken(mockUser.id, 'plain-rt')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token expired', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ sub: mockUser.id, version: 1 });
      mockRepo.findOne.mockResolvedValue({ ...mockRefreshToken, expiresAt: new Date(Date.now() - 1000) });

      await expect(service.validateRefreshToken(mockUser.id, 'plain-rt')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if signatures do not match', async () => {
      mockJwtTokenService.verifyRefreshToken.mockReturnValue({ sub: mockUser.id, version: 1 });
      mockRepo.findOne.mockResolvedValue(mockRefreshToken);
      mockJwtTokenService.verifyHashedToken.mockResolvedValue(false);

      await expect(service.validateRefreshToken(mockUser.id, 'plain-rt')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeToken', () => {
    it('should update revoked status to true for token', async () => {
      await service.revokeToken('token-123');
      expect(mockRepo.update).toHaveBeenCalledWith('token-123', { revoked: true });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for user', async () => {
      await service.revokeAllUserTokens('user-123');
      expect(mockRepo.update).toHaveBeenCalledWith({ userId: 'user-123' }, { revoked: true });
    });
  });
});
