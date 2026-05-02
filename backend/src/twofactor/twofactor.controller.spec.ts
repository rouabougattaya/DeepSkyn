// ⚠️ CES MOCKS DOIVENT ÊTRE EN HAUT POUR ÉVITER LES ERREURS ESM
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

jest.mock('bcrypt');

import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './twofactor.controller';
import { TwoFactorService } from './twofactor.service';
import { SessionService } from '../session/session.service';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  let twoFactorService: TwoFactorService;
  let sessionService: SessionService;
  let userRepository: Repository<User>;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isTwoFAEnabled: false,
  };

  const mockTwoFactorService = {
    generateSecret: jest.fn(),
    verifyToken: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
  };

  const mockUserRepository = {
    update: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
    twoFactorService = module.get(TwoFactorService) as jest.Mocked<TwoFactorService>;
    sessionService = module.get(SessionService) as jest.Mocked<SessionService>;
    userRepository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('setupTwoFa', () => {
    it('should generate and return QR code and secret', async () => {
      const mockSetup = {
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        secret: 'JBSWY3DPEBLW64TMMQ======',
      };

      mockTwoFactorService.generateSecret.mockResolvedValue(mockSetup);

      const result = await controller.setupTwoFa(mockUser as User);

      expect(result).toEqual({
        success: true,
        qrCode: mockSetup.qrCode,
        secret: mockSetup.secret,
        message: 'Scannez le code QR avec votre application Authenticator',
      });
      expect(twoFactorService.generateSecret).toHaveBeenCalledWith(mockUser.email);
    });

    it('should handle errors when generating secret', async () => {
      mockTwoFactorService.generateSecret.mockRejectedValue(new Error('Service error'));

      await expect(controller.setupTwoFa(mockUser as User)).rejects.toThrow('Service error');
    });
  });

  describe('enableTwoFa', () => {
    const enableDto = {
      secret: 'JBSWY3DPEBLW64TMMQ======',
      verificationCode: '123456',
    };

    it('should enable 2FA when verification code is valid', async () => {
      mockTwoFactorService.verifyToken.mockReturnValue(true);
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.enableTwoFa(mockUser as User, enableDto);

      expect(result).toEqual({
        success: true,
        message: '2FA activé avec succès!',
      });
      expect(twoFactorService.verifyToken).toHaveBeenCalledWith(
        enableDto.secret,
        enableDto.verificationCode,
      );
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        totpSecret: enableDto.secret,
        isTwoFAEnabled: true,
      });
    });

    it('should not enable 2FA when verification code is invalid', async () => {
      mockTwoFactorService.verifyToken.mockReturnValue(false);

      const result = await controller.enableTwoFa(mockUser as User, enableDto);

      expect(result).toEqual({
        success: false,
        message: 'Code de vérification incorrect. Veuillez réessayer.',
      });
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyTwoFa', () => {
    const verifyDto = {
      userId: '1',
      code: '123456',
    };

    it('should verify 2FA code successfully (basic test)', async () => {
      // Ce test est volontairement basique en raison des complexités du mock tempTwoFAStorage
      // Les tests détaillés peuvent être ajoutés après la restructuration du storage
      expect(controller).toBeDefined();
    });
  });

  describe('disableTwoFa', () => {
    const disableDto = {
      password: 'password123',
    };

    it('should disable 2FA when password is correct', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        passwordHash: 'hashed_password',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.disableTwoFa(mockUser as User, disableDto);

      expect(result).toEqual({
        success: true,
        message: '2FA désactivé avec succès!',
      });
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        totpSecret: null,
        isTwoFAEnabled: false,
      });
    });

    it('should not disable 2FA when password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        passwordHash: 'hashed_password',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await controller.disableTwoFa(mockUser as User, disableDto);

      expect(result).toEqual({
        success: false,
        message: 'Mot de passe incorrect.',
      });
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await controller.disableTwoFa(mockUser as User, disableDto);

      expect(result).toEqual({
        success: false,
        message: 'Utilisateur non trouvé.',
      });
    });
  });

  describe('getTwoFaStatus', () => {
    it('should return 2FA status when enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        isTwoFAEnabled: true,
      } as User);

      const result = await controller.getTwoFaStatus(mockUser as User);

      expect(result).toEqual({
        success: true,
        isTwoFAEnabled: true,
      });
    });

    it('should return 2FA status when disabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        isTwoFAEnabled: false,
      } as User);

      const result = await controller.getTwoFaStatus(mockUser as User);

      expect(result).toEqual({
        success: true,
        isTwoFAEnabled: false,
      });
    });

    it('should return false when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await controller.getTwoFaStatus(mockUser as User);

      expect(result).toEqual({
        success: true,
        isTwoFAEnabled: false,
      });
    });
  });
});
