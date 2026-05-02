// ⚠️ CES MOCKS DOIVENT ÊTRE EN HAUT POUR ÉVITER LES ERREURS ESM
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityService } from './activity.service';
import { EmailSecurityService } from '../email-security/email-security.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { SessionService } from '../sessions/session.service';
import { GeminiService } from '../ai/gemini.service';
import * as bcrypt from 'bcryptjs';
import { tempTwoFAStorage } from '../twofactor/temp-2fa-storage';

describe('AuthService', () => {
  let service: AuthService;
  let loginAttemptService: LoginAttemptService;
  let emailSecurityService: EmailSecurityService;
  let jwtTokenService: JwtTokenService;
  let refreshTokenService: RefreshTokenService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    name: 'Test User',
    isTwoFAEnabled: false,
    totpSecret: null,
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockEmptyService = {
    create: jest.fn(),
    generateAccessToken: jest.fn().mockReturnValue('at'),
    calculateExpirationDate: jest.fn().mockReturnValue(new Date()),
    getAccessTokenTtl: jest.fn().mockReturnValue(3600),
    createRefreshToken: jest.fn().mockResolvedValue({ refreshToken: 'rt', expiresAt: new Date() }),
    rotateRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    isBlocked: jest.fn().mockReturnValue(null),
    recordFailure: jest.fn(),
    clearAttempts: jest.fn(),
    getRemainingAttempts: jest.fn().mockReturnValue(3),
    createSession: jest.fn(),
    isSuspicious: jest.fn().mockReturnValue({ suspicious: false }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-value') } },
        { provide: ActivityService, useValue: mockEmptyService },
        { provide: EmailSecurityService, useValue: mockEmptyService },
        { provide: TwoFactorService, useValue: mockEmptyService },
        { provide: JwtTokenService, useValue: mockEmptyService },
        { provide: RefreshTokenService, useValue: mockEmptyService },
        { provide: LoginAttemptService, useValue: mockEmptyService },
        { provide: SessionService, useValue: mockEmptyService },
        { provide: GeminiService, useValue: { generateContent: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    loginAttemptService = module.get<LoginAttemptService>(LoginAttemptService);
    emailSecurityService = module.get<EmailSecurityService>(EmailSecurityService);
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'wrong@test.com', password: 'any' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false) as any);

      await expect(service.login({ email: 'test@example.com', password: 'wrongpassword' }))
        .rejects.toThrow(UnauthorizedException);
      expect(loginAttemptService.recordFailure).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException and block user if max attempts reached', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false) as any);
      (loginAttemptService.getRemainingAttempts as jest.Mock).mockReturnValueOnce(0);

      await expect(service.login({ email: 'test@example.com', password: 'wrongpassword' }))
        .rejects.toThrow('Trop de tentatives. Compte bloqué pendant 3 minutes.');
    });

    it('should throw UnauthorizedException if user is currently blocked', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (loginAttemptService.isBlocked as jest.Mock).mockReturnValueOnce(2); // 2 minutes remaining

      await expect(service.login({ email: 'test@example.com', password: 'any' }))
        .rejects.toThrow('Compte temporairement bloqué. Réessayez dans 2 minute(s).');
    });

    it('should throw UnauthorizedException if user has no password (e.g. google register)', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.login({ email: 'test@example.com', password: 'any' }))
        .rejects.toThrow('Ce compte utilise une autre méthode de connexion (Google).');
    });

    it('should return 2FA requirement info if 2FA is enabled', async () => {
      const userWith2Fa = { ...mockUser, isTwoFAEnabled: true, totpSecret: 'secret' };
      mockRepository.findOne.mockResolvedValue(userWith2Fa);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true) as any);
      const setSpy = jest.spyOn(tempTwoFAStorage, 'set');

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.requiresTwoFa).toBe(true);
      expect(result.success).toBe(true);
      expect(result.accessToken).toBeUndefined(); // no token yet
      expect(setSpy).toHaveBeenCalledWith(userWith2Fa.id, { totpSecret: 'secret' });
    });

    it('should return tokens if login is successful', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true) as any);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user?.email).toBe(mockUser.email);
      expect(loginAttemptService.clearAttempts).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      birthDate: '2000-01-01',
      acceptTerms: true,
    };

    it('should throw BadRequestException if email is suspicious', async () => {
      (emailSecurityService.isSuspicious as jest.Mock).mockReturnValueOnce({ suspicious: true });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already exists', async () => {
      (emailSecurityService.isSuspicious as jest.Mock).mockReturnValueOnce({ suspicious: false });
      mockRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should create and return tokens for new user', async () => {
      (emailSecurityService.isSuspicious as jest.Mock).mockReturnValueOnce({ suspicious: false });
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.create.mockReturnValueOnce(mockUser);
      mockRepository.save.mockResolvedValueOnce(mockUser);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hash') as any);

      const result = await service.register(registerDto);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens if valid', async () => {
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValueOnce(true);
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      (refreshTokenService.rotateRefreshToken as jest.Mock).mockResolvedValueOnce({ refreshToken: 'new-rt', expiresAt: new Date() });

      const result = await service.refresh(mockUser, 'old-rt');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('at');
      expect(result.newRefreshToken).toBe('new-rt');
    });

    it('should throw UnauthorizedException if user not found in refresh', async () => {
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValueOnce(true);
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.refresh(mockUser, 'old-rt')).rejects.toThrow(UnauthorizedException);
    });
  });
});
