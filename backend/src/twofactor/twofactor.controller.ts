import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorService } from './twofactor.service';
import { EnableTwoFaDto, VerifyTwoFaDto, DisableTwoFaDto } from './twofactor.dto';
import { User } from '../user/user.entity';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SessionService } from '../session/session.service';
import { tempTwoFAStorage } from './temp-2fa-storage';
import * as bcrypt from 'bcrypt';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly sessionService: SessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Endpoint pour obtenir la configuration initiale du 2FA
   * Retourne un secret et un QR Code
   */
  @Get('setup')
  @UseGuards(JwtAccessGuard)
  async setupTwoFa(@CurrentUser() user: User) {
    const setup = await this.twoFactorService.generateSecret(user.email);
    return {
      success: true,
      qrCode: setup.qrCode,
      secret: setup.secret,
      message: 'Scannez le code QR avec votre application Authenticator',
    };
  }

  /**
   * Endpoint pour activer le 2FA après vérification du code
   */
  @Post('enable')
  @UseGuards(JwtAccessGuard)
  async enableTwoFa(
    @CurrentUser() user: User,
    @Body() dto: EnableTwoFaDto,
  ) {
    // Vérifier que le code fourni correspond au secret
    const isCodeValid = this.twoFactorService.verifyToken(dto.secret, dto.verificationCode);

    if (!isCodeValid) {
      return {
        success: false,
        message: 'Code de vérification incorrect. Veuillez réessayer.',
      };
    }

    // Activer le 2FA en sauvegardant le secret
    await this.userRepository.update(user.id, {
      totpSecret: dto.secret,
      isTwoFAEnabled: true,
    });

    return {
      success: true,
      message: '2FA activé avec succès!',
    };
  }

  /**
   * Endpoint pour vérifier le code 2FA lors de la connexion
   * Utilisé après saisie du code à 6 chiffres
   */
  @Post('verify')
  @Public()
  async verifyTwoFa(@Body() dto: VerifyTwoFaDto, @Req() req: any) {
    console.log(`[2FA] Verify request for userId: ${dto.userId}, code length: ${dto.code?.length}`);
    
    // Récupérer les données 2FA temporaires du storage
    const tempData = tempTwoFAStorage.get(dto.userId);

    if (!tempData) {
      console.warn(`[2FA] Temporary session not found for userId: ${dto.userId}`);
      return {
        success: false,
        message: 'Session 2FA invalide. Veuillez vous reconnecter.',
      };
    }

    console.log(`[2FA] Temporary session found, verifying code...`);
    
    // Vérifier le code 2FA
    const isCodeValid = this.twoFactorService.verifyToken(tempData.totpSecret, dto.code);

    if (!isCodeValid) {
      console.warn(`[2FA] Invalid 2FA code for userId: ${dto.userId}`);
      return {
        success: false,
        message: 'Code 2FA incorrect. Veuillez réessayer.',
      };
    }

    console.log(`[2FA] Code valid, creating session for userId: ${dto.userId}`);

    // Code valide, récupérer l'utilisateur et créer une session complète
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
      select: ['id', 'email', 'firstName', 'lastName'],
    });

    if (!user) {
      console.error(`[2FA] User not found for userId: ${dto.userId}`);
      return {
        success: false,
        message: 'Utilisateur non trouvé.',
      };
    }

    // Créer une session complète
    const sessionTokens = await this.sessionService.createSession(user);

    // Nettoyer les données temporaires
    tempTwoFAStorage.delete(dto.userId);
    console.log(`[2FA] 2FA verification successful for userId: ${dto.userId}`);

    return {
      success: true,
      message: '2FA vérifié avec succès!',
      accessToken: sessionTokens.accessToken,
      refreshToken: sessionTokens.refreshToken,
      accessTokenExpiresAt: sessionTokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: sessionTokens.refreshTokenExpiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Endpoint pour désactiver le 2FA
   */
  @Post('disable')
  @UseGuards(JwtAccessGuard)
  async disableTwoFa(
    @CurrentUser() user: User,
    @Body() dto: DisableTwoFaDto,
  ) {
    // Vérifier le mot de passe avant de désactiver
    const userWithPassword = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'passwordHash'],
    });

    if (!userWithPassword) {
      return {
        success: false,
        message: 'Utilisateur non trouvé.',
      };
    }

    const passwordValid = await bcrypt.compare(dto.password, userWithPassword.passwordHash);
    if (!passwordValid) {
      return {
        success: false,
        message: 'Mot de passe incorrect.',
      };
    }

    // Désactiver le 2FA
    await this.userRepository.update(user.id, {
      totpSecret: null,
      isTwoFAEnabled: false,
    });

    return {
      success: true,
      message: '2FA désactivé avec succès!',
    };
  }

  /**
   * Endpoint pour vérifier le statut du 2FA de l'utilisateur
   */
  @Get('status')
  @UseGuards(JwtAccessGuard)
  async getTwoFaStatus(@CurrentUser() user: User) {
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['isTwoFAEnabled'],
    });
    
    return {
      success: true,
      isTwoFAEnabled: fullUser?.isTwoFAEnabled || false,
    };
  }
}
