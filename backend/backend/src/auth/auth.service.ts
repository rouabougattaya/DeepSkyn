import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { EmailSecurityService } from '../email-security/email-security.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { tempTwoFAStorage } from '../twofactor/temp-2fa-storage';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginAttemptService } from './services/login-attempt.service';

const SALT_ROUNDS = 12;

export interface SessionTokens {
  success?: boolean;
  requiresTwoFa?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  user?: { id: string; email: string; firstName: string; lastName: string; isTwoFAEnabled?: boolean };
}

export type SessionMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * JWT Authentication Service
 * - Authentification avec JWT access tokens + refresh tokens
 * - Rotation des refresh tokens
 * - Intégration 2FA
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailSecurityService: EmailSecurityService,
    private readonly twoFactorService: TwoFactorService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly loginAttemptService: LoginAttemptService,
  ) {}

  /**
   * LOGIN: Authentifie l'utilisateur et retourne les tokens JWT
   * Si 2FA activé: retourne requiresTwoFa=true (sans tokens)
   */
  async login(
    dto: LoginDto,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
    const emailNorm = dto.email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: emailNorm },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'passwordHash',
        'role',
        'isTwoFAEnabled',
        'totpSecret',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    // Vérifier le blocage (3 tentatives échouées = blocage 3 min)
    const blockedMinutes = this.loginAttemptService.isBlocked(emailNorm);
    if (blockedMinutes !== null) {
      throw new UnauthorizedException(
        `Compte temporairement bloqué. Réessayez dans ${blockedMinutes} minute(s).`,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      this.loginAttemptService.recordFailure(emailNorm);
      const remaining = this.loginAttemptService.getRemainingAttempts(emailNorm);
      if (remaining === 0) {
        throw new UnauthorizedException(
          'Trop de tentatives. Compte bloqué pendant 3 minutes.',
        );
      }
      throw new UnauthorizedException(
        `Email ou mot de passe incorrect. ${remaining} tentative(s) restante(s).`,
      );
    }

    this.loginAttemptService.clearAttempts(emailNorm);

    // Si 2FA activé, retourner sans tokens
    if (user.isTwoFAEnabled && user.totpSecret) {
      console.log(`[AUTH] 2FA enabled for user ${user.id}, storing temporary session`);
      tempTwoFAStorage.set(user.id, {
        totpSecret: user.totpSecret,
      });
      console.log(`[AUTH] Temporary 2FA session stored for userId: ${user.id}`);

      return {
        success: true,
        requiresTwoFa: true,
        message: 'Veuillez entrer votre code 2FA',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isTwoFAEnabled: true,
        },
      };
    }

    // Sinon, créer et retourner les tokens
    return this.issueTokens(user, metadata);
  }

  /**
   * REGISTER: Crée un nouvel utilisateur et retourne les tokens JWT
   */
  async register(
    dto: RegisterDto,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
    const emailNorm = dto.email.toLowerCase().trim();

    // Vérifier email suspect
    const suspicious = this.emailSecurityService.isSuspicious(emailNorm);
    if (suspicious.suspicious) {
      throw new BadRequestException("Cet email n'est pas accepté pour l'inscription.");
    }

    // Vérifier email en doublon
    const existing = await this.userRepository.findOne({
      where: { email: emailNorm },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    // Hash password et créer user
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepository.create({
      email: emailNorm,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'USER',
      isEmailVerified: false,
      isPremium: false,
      isTwoFAEnabled: false,
      totpSecret: null,
    });

    await this.userRepository.save(user);

    // Créer et retourner les tokens
    return this.issueTokens(user, metadata);
  }

  /**
   * REFRESH: Renouvelle l'access token en effectuant la rotation du refresh token
   * - Valide le refresh token
   * - Crée un nouveau refresh token (ancien révoqué)
   * - Retourne nouveau access token
   */
  async refresh(
    user: any,
    refreshToken: string,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<any> {
    // Valider le refresh token
    await this.refreshTokenService.validateRefreshToken(user.id, refreshToken);

    // Obtenir l'user complet
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    // Effectuer la rotation du refresh token
    const newVersion = (user.tokenVersion || 1) + 1;
    const rotatedToken = await this.refreshTokenService.rotateRefreshToken(
      fullUser,
      refreshToken,
      newVersion,
      metadata?.ipAddress ?? undefined,
      metadata?.userAgent ?? undefined,
    );

    // Générer nouveau access token
    const newAccessToken = this.jwtTokenService.generateAccessToken(fullUser, newVersion);
    const newAccessTokenExpiresAt = this.jwtTokenService.calculateExpirationDate(
      this.jwtTokenService.getAccessTokenTtl(),
    );

    return {
      success: true,
      accessToken: newAccessToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      newRefreshToken: (rotatedToken as any).refreshToken,
      refreshTokenExpiresAt: rotatedToken.expiresAt,
    };
  }

  /**
   * LOGOUT: Révoque le refresh token
   */
  async logout(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * VERIFY 2FA: Après vérification du code 2FA, créer et retourner les tokens
   */
  async verify2FA(userId: string, metadata?: SessionMetadata): Promise<SessionTokens> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isTwoFAEnabled'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user, metadata);
  }

  /**
   * Helper: Génère et stocke les tokens JWT
   */
  private async issueTokens(
    user: User,
    metadata?: SessionMetadata,
  ): Promise<SessionTokens> {
    // Générer access token
    const accessToken = this.jwtTokenService.generateAccessToken(user);
    const accessTokenExpiresAt = this.jwtTokenService.calculateExpirationDate(
      this.jwtTokenService.getAccessTokenTtl(),
    );

    // Créer et stocker refresh token
    const refreshTokenRecord = await this.refreshTokenService.createRefreshToken(
      user,
      metadata?.ipAddress ?? null,
      metadata?.userAgent ?? null,
    );

    return {
      success: true,
      accessToken,
      refreshToken: (refreshTokenRecord as any).refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshTokenRecord.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isTwoFAEnabled: user.isTwoFAEnabled,
      },
    };
  }
}
