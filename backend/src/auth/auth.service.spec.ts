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
import { UnauthorizedException } from '@nestjs/common';
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

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;

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
    isBlocked: jest.fn().mockReturnValue(null),
    recordFailure: jest.fn(),
    clearAttempts: jest.fn(),
    getRemainingAttempts: jest.fn().mockReturnValue(3),
    createSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-value') } },
        { provide: ActivityService, useValue: mockEmptyService },
        { provide: EmailSecurityService, useValue: { isSuspicious: jest.fn().mockReturnValue({ suspicious: false }) } },
        { provide: TwoFactorService, useValue: mockEmptyService },
        { provide: JwtTokenService, useValue: mockEmptyService },
        { provide: RefreshTokenService, useValue: mockEmptyService },
        { provide: LoginAttemptService, useValue: mockEmptyService },
        { provide: SessionService, useValue: mockEmptyService },
        { provide: GeminiService, useValue: { generateContent: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
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
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login({ email: 'test@example.com', password: 'wrongpassword' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens if login is successful', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.login({ email: 'test@example.com', password: 'password123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user?.email).toBe(mockUser.email);
    });
  });
});
