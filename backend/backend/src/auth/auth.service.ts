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
import { LoginDto } from './dto/login.dto';
import { EmailSecurityService } from '../email-security/email-security.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { tempTwoFAStorage } from '../twofactor/temp-2fa-storage';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginAttemptService } from './services/login-attempt.service';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { randomUUID } from 'crypto';

const webauthnChallengeStore = new Map<string, string>();
const SALT_ROUNDS = 12;

export interface SessionTokens {
  success?: boolean;
  requiresTwoFa?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isTwoFAEnabled?: boolean;
  };
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
 * - (AJOUT) Login via reconnaissance faciale
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
  ) { }

  /**
   * LOGIN: email + password
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

    // Blocage login
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

    // 2FA
    if (user.isTwoFAEnabled && user.totpSecret) {
      tempTwoFAStorage.set(user.id, { totpSecret: user.totpSecret });

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

    return this.issueTokens(user, metadata);
  }

  /**
   * REGISTER: crée user + stocke (optionnel) faceDescriptor
   */
  async register(
    dto: RegisterDto,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
    const emailNorm = dto.email.toLowerCase().trim();

    // Email suspect
    const suspicious = this.emailSecurityService.isSuspicious(emailNorm);
    if (suspicious.suspicious) {
      throw new BadRequestException("Cet email n'est pas accepté pour l'inscription.");
    }

    // Doublon
    const existing = await this.userRepository.findOne({
      where: { email: emailNorm },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // ✅ si RegisterDto contient faceDescriptor?: number[]
    const faceDescriptor = (dto as any).faceDescriptor ?? null;

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

      // ✅ AJOUT visage
      faceDescriptor,
      faceUpdatedAt: faceDescriptor ? new Date() : null,
    });

    await this.userRepository.save(user);

    return this.issueTokens(user, metadata);
  }

  /**
   * LOGIN FACE: email + liveDescriptor(128)
   */
  async loginFace(
    dto: { email: string; liveDescriptor: number[] },
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
        'role',
        'isTwoFAEnabled',
        'totpSecret',
        'faceDescriptor', // ✅ IMPORTANT
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Email incorrect.');
    }

    if (!user.faceDescriptor || user.faceDescriptor.length !== 128) {
      throw new BadRequestException("Aucune empreinte visage enregistrée pour ce compte.");
    }

    const dist = euclideanDistance(user.faceDescriptor, dto.liveDescriptor);


    // ✅ seuil à ajuster
    const THRESHOLD = 0.75;;
    if (dist > THRESHOLD) {
      throw new UnauthorizedException('Visage non reconnu.');
    }
    console.log('-------------------------');
console.log('Distance visage:', dist);
console.log('Threshold:', THRESHOLD);
console.log('-------------------------');
    // 2FA (même logique que login)
    if (user.isTwoFAEnabled && user.totpSecret) {
      tempTwoFAStorage.set(user.id, { totpSecret: user.totpSecret });

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

    return this.issueTokens(user, metadata);
  }

  /**
   * REFRESH
   */
  async refresh(
    user: any,
    refreshToken: string,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<any> {
    await this.refreshTokenService.validateRefreshToken(user.id, refreshToken);

    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    const newVersion = (user.tokenVersion || 1) + 1;

    const rotatedToken = await this.refreshTokenService.rotateRefreshToken(
      fullUser,
      refreshToken,
      newVersion,
      metadata?.ipAddress ?? undefined,
      metadata?.userAgent ?? undefined,
    );

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
   * LOGOUT
   */
  async logout(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * VERIFY 2FA
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
  /* ================= WEB AUTHN - FINGERPRINT ================= */

async generateFingerprintRegistrationOptions(email: string) {
  const emailNorm = email.toLowerCase().trim();

  const existingUser = await this.userRepository.findOne({
    where: { email: emailNorm },
  });

  if (existingUser) {
    throw new BadRequestException('Cet email est déjà utilisé.');
  }

  const userId = randomUUID();

  const options = await generateRegistrationOptions({
    rpName: 'DeepSkyn',
    rpID: 'localhost',
    userID: new TextEncoder().encode(userId),
    userName: emailNorm,
    timeout: 60000,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
  });

  webauthnChallengeStore.set(emailNorm, options.challenge);

  return options;
}

/* ================= VERIFY REGISTER ================= */

async verifyFingerprintRegistration(body: any) {
  const { credential, email, password, firstName, lastName } = body;

  const emailNorm = email.toLowerCase().trim();
  const expectedChallenge = webauthnChallengeStore.get(emailNorm);

  if (!expectedChallenge) {
    throw new UnauthorizedException('Challenge expiré.');
  }

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: 'http://localhost:5173',
    expectedRPID: 'localhost',
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new UnauthorizedException('Échec vérification biométrique.');
  }

  const { credential: cred } = verification.registrationInfo;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = this.userRepository.create({
    email: emailNorm,
    passwordHash,
    firstName,
    lastName,
    role: 'USER',
    isEmailVerified: false,
    isPremium: false,
    isTwoFAEnabled: false,

    // ✅ IMPORTANT : on ne modifie PAS l’id
    webauthnCredentialID: cred.id,

    // ✅ PublicKey en base64 pour stockage
    webauthnPublicKey: Buffer.from(cred.publicKey).toString('base64'),

    webauthnCounter: cred.counter,
  });

  await this.userRepository.save(newUser);
  webauthnChallengeStore.delete(emailNorm);

  return { success: true };
}

/* ================= LOGIN OPTIONS ================= */

async generateFingerprintLoginOptions(email: string) {
  const emailNorm = email.toLowerCase().trim();

  const user = await this.userRepository.findOne({
    where: { email: emailNorm },
  });

  if (!user || !user.webauthnCredentialID) {
    throw new UnauthorizedException('Aucune empreinte enregistrée.');
  }

  const options = await generateAuthenticationOptions({
    timeout: 120000,
    rpID: 'localhost',
    userVerification: 'required',
    allowCredentials: [
      {
        id: user.webauthnCredentialID, // ✅ STRING EXACTEMENT stockée
        transports: ['internal'],
      },
    ],
  });

  user.webauthnChallenge = options.challenge;
  await this.userRepository.save(user);

  return options;
}

/* ================= VERIFY LOGIN ================= */

async verifyFingerprintLogin(body: any, metadata?: SessionMetadata) {
  const { credential, email } = body;
  const emailNorm = email.toLowerCase().trim();

  const user = await this.userRepository.findOne({
    where: { email: emailNorm },
  });

  if (
    !user ||
    !user.webauthnCredentialID ||
    !user.webauthnPublicKey ||
    !user.webauthnChallenge
  ) {
    throw new UnauthorizedException('Utilisateur invalide.');
  }

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: user.webauthnChallenge,
    expectedOrigin: 'http://localhost:5173',
    expectedRPID: 'localhost',
    credential: {
      id: user.webauthnCredentialID, // ✅ STRING
      publicKey: Buffer.from(user.webauthnPublicKey, 'base64'),
      counter: user.webauthnCounter ?? 0,
      transports: ['internal'],
    },
  });

  if (!verification.verified) {
    throw new UnauthorizedException('Empreinte non valide.');
  }

  if (verification.authenticationInfo) {
    user.webauthnCounter = verification.authenticationInfo.newCounter;
  }

  user.webauthnChallenge = null;
  await this.userRepository.save(user);

  return this.issueTokens(user, metadata);
}
  /**
   * Helper: tokens
   */

  private async issueTokens(
    user: User,
    metadata?: SessionMetadata,
  ): Promise<SessionTokens> {
    const accessToken = this.jwtTokenService.generateAccessToken(user);
    const accessTokenExpiresAt = this.jwtTokenService.calculateExpirationDate(
      this.jwtTokenService.getAccessTokenTtl(),
    );

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

/**
 * ✅ Fonction UTILITAIRE (en dehors de la classe)
 */
function euclideanDistance(a: number[], b: number[]) {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}
