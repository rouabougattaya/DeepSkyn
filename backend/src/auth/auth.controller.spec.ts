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
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../sessions/session.service';
import { RecaptchaService } from './services/recaptcha.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'NODE_ENV') return 'development';
      return null;
    }),
  };

  const mockSessionService = {
    getUserSessions: jest.fn().mockResolvedValue([]),
    getCurrentSession: jest.fn().mockResolvedValue(null),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockRecaptchaService = {
    validateToken: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: RecaptchaService, useValue: mockRecaptchaService },
      ],
    }).overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user and return tokens', async () => {
      const dto: RegisterDto = {
        email: 'test@test.com',
        password: 'password',
        firstName: 'test',
        lastName: 'test',
        birthDate: '2000-01-01',
      };

      const mockRes = {
        cookie: jest.fn(),
        json: jest.fn().mockImplementation(data => data),
      } as any;
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'agent' } } as any;

      const mockResult = {
        success: true,
        accessToken: 'at',
        refreshToken: 'rt',
        refreshTokenExpiresAt: new Date(Date.now() + 10000).toISOString(),
        user: { id: 'user-id' }
      };

      mockAuthService.register.mockResolvedValue(mockResult);

      const response = await controller.register(dto, mockReq, mockRes);

      expect(authService.register).toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.any(Object));
      expect(response).toEqual(expect.objectContaining({
        success: true,
        accessToken: 'at',
        user: { id: 'user-id' }
      }));
    });
  });

  describe('login', () => {
    it('should set refresh token in cookie and return user info', async () => {
      const dto = { email: 'test@test.com', password: 'password', captchaToken: 'valid-captcha' };
      const mockRes = { cookie: jest.fn(), json: jest.fn().mockImplementation(data => data) } as any;
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'agent' } } as any;

      const mockResult = {
        success: true,
        accessToken: 'at',
        refreshToken: 'rt',
        refreshTokenExpiresAt: new Date(Date.now() + 10000).toISOString(),
        user: { id: 'user-id' }
      };

      mockAuthService.login.mockResolvedValue(mockResult);

      const response = await controller.login(dto as any, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.any(Object));
      expect(response.accessToken).toBe('at');
    });

    it('should handle missing IP and user-agent safely', async () => {
      const dto = { email: 'test@test.com', password: 'pwd', captchaToken: 'valid-captcha' };
      const mockRes = { cookie: jest.fn(), json: jest.fn().mockImplementation(data => data) } as any;
      const mockReq = { headers: {} } as any;

      const mockResult = { success: true, accessToken: 'at', refreshToken: 'rt', user: {} };
      mockAuthService.login.mockResolvedValue(mockResult);

      const response = await controller.login(dto as any, mockReq, mockRes);
      expect(authService.login).toHaveBeenCalledWith(dto, { ipAddress: null, userAgent: null }, mockReq);
      expect(response.accessToken).toBe('at');
    });

    it('should return requiresTwoFa without setting cookies if 2Fa is required', async () => {
      const dto = { email: 'test@test.com', password: 'pwd', captchaToken: 'valid-captcha' };
      const mockRes = { cookie: jest.fn(), json: jest.fn().mockImplementation(data => data) } as any;
      const mockReq = { headers: {} } as any;

      const mockResult = { success: true, requiresTwoFa: true, user: {} };
      mockAuthService.login.mockResolvedValue(mockResult);

      const response = await controller.login(dto as any, mockReq, mockRes);
      expect(mockRes.cookie).not.toHaveBeenCalled();
      expect(response.requiresTwoFa).toBe(true);
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const mockReq = {
        user: { id: '1' },
        cookies: { refreshToken: 'old-rt' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'agent' }
      } as any;
      const mockRes = { cookie: jest.fn(), json: jest.fn().mockImplementation(data => data) } as any;

      const mockResult = {
        success: true,
        accessToken: 'new-at',
        newRefreshToken: 'new-rt',
        refreshTokenExpiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      mockAuthService.refresh.mockResolvedValue(mockResult);

      const response = await controller.refresh(mockReq.user, mockReq, mockRes, {});
      
      expect(authService.refresh).toHaveBeenCalledWith(mockReq.user, 'old-rt', expect.any(Object), mockReq);
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'new-rt', expect.any(Object));
      expect(response.accessToken).toBe('new-at');
    });
  });

  describe('logout', () => {
    it('should clear cookie and call logout on service', async () => {
      const mockReq = { user: { id: '1' } } as any;
      const mockRes = { clearCookie: jest.fn(), json: jest.fn() } as any;

      await controller.logout(mockReq.user, mockRes);

      expect(authService.logout).toHaveBeenCalledWith('1');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Déconnexion réussie.' });
    });
  });
});
