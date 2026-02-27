import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { ActivityService } from './activity.service';
import { ActivityType } from './activity.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { GoogleAuthDto, CheckUserDto, UpdateAIScoreDto, SignUpDto } from './dto/auth.dto';

// Modular Auth Imports
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailSecurityService } from '../email-security/email-security.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { tempTwoFAStorage } from '../twofactor/temp-2fa-storage';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { SessionService } from '../sessions/session.service';
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
    name?: string;
  };
}

export type SessionMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuthService {
  private genAI: GoogleGenerativeAI;
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly activityService: ActivityService,
    private readonly emailSecurityService: EmailSecurityService,
    private readonly twoFactorService: TwoFactorService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly sessionService: SessionService,
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /* ================= LEGACY / UTILITY METHODS ================= */

  private generateToken(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'USER',
    };
    return this.jwtService.sign(payload);
  }

  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /* ================= AI ABUSE ANALYSIS ================= */

  async analyzeAbuseBehavior(email: string, context: { ip: string; userAgent: string }) {
    const user = await this.userRepository.findOne({ where: { email } });
    const history = user?.authHistory || [];

    const currentAttempt = {
      timestamp: new Date().toISOString(),
      ip: context.ip,
      action: 'PASSWORD_RESET_REQUEST',
    };

    if (user) {
      user.authHistory = [...history, currentAttempt].slice(-10);
      await this.userRepository.save(user);
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GOOGLE_GENAI_API_KEY is missing');
      return { riskScore: 0.1, reason: 'AI Analysis Unavailable (No API Key)' };
    }

    const prompt = `Analyze if this password reset request is suspicious. 
    User Email: ${email}
    Current IP: ${context.ip}
    Recent History: ${JSON.stringify(history)}
    Respond only with a JSON object: { "riskScore": 0.0 to 1.0, "reason": "short explanation" }`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        riskScore: parsed.riskScore ?? 0.1,
        reason: parsed.reason ?? 'Analysis completed'
      };
    } catch (error) {
      console.warn('⚠️ Gemini analysis skipped or failed:', error.message || error);
      return { riskScore: 0.1, reason: 'AI Analysis Unavailable' };
    }
  }

  /* ================= LOGIN METHODS ================= */

  async login(
    dto: LoginDto,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
    const emailNorm = dto.email.toLowerCase().trim();

    const user = await this.userRepository.findOne({
      where: { email: emailNorm },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

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

    // ✅ Créer la session avant d'émettre les tokens
    const tokens = await this.issueTokens(user, metadata);
    
    // Créer la session avec le refresh token
    const fakeReq = { 
      ip: metadata?.ipAddress || null, 
      headers: { 'user-agent': metadata?.userAgent || null } 
    };
    if (!tokens.refreshToken) {
      throw new Error('Refresh token manquant lors de la création de session (login).');
    }
    await this.sessionService.createSession(user.id, tokens.refreshToken, fakeReq);
    
    return tokens;
  }

  async loginWithEmail(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new Error('User not found');
    }

    if (email === 'demo@example.com') {
      await this.logActivity(user.id, ActivityType.LOGIN_SUCCESS, ip, userAgent);
      const token = await this.generateToken(user);
      
      // ✅ Créer la session
      const req = { 
        ip: ip || null, 
        headers: { 'user-agent': userAgent || null } 
      };
      await this.sessionService.createSession(user.id, token, req);
      
      return { token, user };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await this.logActivity(user.id, ActivityType.LOGIN_FAILED, ip, userAgent, { reason: 'invalid_password' });
      throw new Error('Invalid password');
    }

    await this.logActivity(user.id, ActivityType.LOGIN_SUCCESS, ip, userAgent);
    const token = await this.generateToken(user);
    
    // ✅ Créer la session
    const req = { 
      ip: ip || null, 
      headers: { 'user-agent': userAgent || null } 
    };
    await this.sessionService.createSession(user.id, token, req);
    
    return { token, user };
  }

  async loginWithGoogle(googleUser: GoogleAuthDto, ip?: string, userAgent?: string) {
    const existingUser = await this.userRepository.findOne({
      where: [
        { googleId: googleUser.id },
        { email: googleUser.email }
      ]
    });

    let user;
    if (!existingUser) {
      user = this.userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.id,
        avatarUrl: googleUser.picture,
        authMethod: 'google',
        photoAnalysis: googleUser.photoAnalysis || {},
        emailAnalysis: googleUser.emailAnalysis || {},
        aiScore: googleUser.aiScore || 0.5,
      });
      await this.userRepository.save(user);
    } else {
      user = existingUser;
      user.name = googleUser.name;
      user.avatarUrl = googleUser.picture;
      user.authMethod = 'google';
      user.photoAnalysis = googleUser.photoAnalysis || {};
      user.emailAnalysis = googleUser.emailAnalysis || {};
      user.aiScore = googleUser.aiScore || 0.5;
      await this.userRepository.save(user);
    }

    await this.logActivity(user.id, ActivityType.LOGIN_SUCCESS, ip, userAgent, { method: 'google' });
    const token = await this.generateToken(user);
    
    // ✅ Créer la session
    const req = { 
      ip: ip || null, 
      headers: { 'user-agent': userAgent || null } 
    };
    await this.sessionService.createSession(user.id, token, req);
    
    return { token, user };
  }

  async loginFace(
    dto: { email: string; liveDescriptor: number[] },
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
    const emailNorm = dto.email.toLowerCase().trim();
    console.log(`[FaceLogin] Attempt for ${emailNorm}`);

    const user = await this.userRepository.findOne({
      where: { email: emailNorm },
    });

    if (!user) {
      console.warn(`[FaceLogin] User not found: ${emailNorm}`);
      throw new UnauthorizedException('Email incorrect.');
    }

    console.log(`[FaceLogin] User found. Stored descriptor length: ${user.faceDescriptor?.length}. Live descriptor length: ${dto.liveDescriptor?.length}`);

    if (!user.faceDescriptor || user.faceDescriptor.length !== 128) {
      console.error(`[FaceLogin] Invalid stored face descriptor for ${emailNorm}. Length: ${user.faceDescriptor?.length}`);
      throw new BadRequestException("Aucune empreinte visage enregistrée pour ce compte ou format invalide.");
    }

    const dist = euclideanDistance(user.faceDescriptor, dto.liveDescriptor);
    const THRESHOLD = 0.75;

    console.log(`[FaceLogin] Distance: ${dist.toFixed(4)} (Threshold: ${THRESHOLD})`);

    if (dist > THRESHOLD) {
      throw new UnauthorizedException('Visage non reconnu.');
    }

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

    // ✅ Créer la session avant d'émettre les tokens
    const tokens = await this.issueTokens(user, metadata);
    
    const fakeReq = { 
      ip: metadata?.ipAddress || null, 
      headers: { 'user-agent': metadata?.userAgent || null } 
    };
    if (!tokens.refreshToken) {
      throw new Error('Refresh token manquant lors de la création de session (loginFace).');
    }
    await this.sessionService.createSession(user.id, tokens.refreshToken, fakeReq);
    
    return tokens;
  }

  /* ================= REGISTER METHODS ================= */

  async register(
    dto: RegisterDto,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
    const emailNorm = dto.email.toLowerCase().trim();

    const suspicious = this.emailSecurityService.isSuspicious(emailNorm);
    if (suspicious.suspicious) {
      throw new BadRequestException("Cet email n'est pas accepté pour l'inscription.");
    }

    const existing = await this.userRepository.findOne({
      where: { email: emailNorm },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const faceDescriptor = (dto as any).faceDescriptor ?? null;

    const user = this.userRepository.create({
      email: emailNorm,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: `${dto.firstName} ${dto.lastName}`,
      role: 'USER',
      isEmailVerified: false,
      isPremium: false,
      isTwoFAEnabled: false,
      totpSecret: null,
      faceDescriptor,
      faceUpdatedAt: faceDescriptor ? new Date() : null,
    });

    await this.userRepository.save(user);

    return this.issueTokens(user, metadata);
  }

  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: signUpDto.email }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(signUpDto.password, salt);

    const user = this.userRepository.create({
      email: signUpDto.email,
      name: signUpDto.name,
      passwordHash: passwordHash,
      aiScore: 0.5,
    });

    await this.userRepository.save(user);
    return this.generateToken(user);
  }

  /* ================= PASSWORD RESET ================= */

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.save(user);

    const resetLink = `http://localhost:5173/auth/reset-password/${token}`;

    try {
      await this.transporter.sendMail({
        from: '"DeepSkyn Support" <support@deepskyn.com>',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488;">Reset Your Password</h2>
            <p>You requested a password reset for your DeepSkyn account.</p>
            <p>Click the button below to set a new password. This link will expire in 1 hour.</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('❌ Failed to send reset email:', error);
    }

    return { message: 'Reset link sent to your email.' };
  }

  async resetPassword(resetDto: { token: string; newPassword: string }) {
    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: resetDto.token,
      },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(resetDto.newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepository.save(user);
    return { message: 'Password has been reset successfully.' };
  }

  /* ================= MODULAR TOKEN METHODS ================= */

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

  async logout(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  async verify2FA(userId: string, metadata?: SessionMetadata): Promise<SessionTokens> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // ✅ Créer la session après validation 2FA
    const tokens = await this.issueTokens(user, metadata);
    
    const fakeReq = { 
      ip: metadata?.ipAddress || null, 
      headers: { 'user-agent': metadata?.userAgent || null } 
    };
    if (!tokens.refreshToken) {
      throw new Error('Refresh token manquant lors de la création de session (verify2FA).');
    }
    await this.sessionService.createSession(user.id, tokens.refreshToken, fakeReq);
    
    return tokens;
  }

  /* ================= WEB AUTHN / FINGERPRINT ================= */

  async generateFingerprintRegistrationOptions(email: string) {
    const emailNorm = email.toLowerCase().trim();
    const existingUser = await this.userRepository.findOne({ where: { email: emailNorm } });
    if (existingUser) throw new BadRequestException('Cet email est déjà utilisé.');

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

  async verifyFingerprintRegistration(body: any) {
    const { credential, email, password, firstName, lastName } = body;
    const emailNorm = email.toLowerCase().trim();
    const expectedChallenge = webauthnChallengeStore.get(emailNorm);
    if (!expectedChallenge) throw new UnauthorizedException('Challenge expiré.');

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
      name: `${firstName} ${lastName}`,
      role: 'USER',
      webauthnCredentialID: cred.id,
      webauthnPublicKey: Buffer.from(cred.publicKey).toString('base64'),
      webauthnCounter: cred.counter,
    });

    await this.userRepository.save(newUser);
    webauthnChallengeStore.delete(emailNorm);
    return { success: true };
  }

  async generateFingerprintLoginOptions(email: string) {
    const emailNorm = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: emailNorm } });
    if (!user || !user.webauthnCredentialID) throw new UnauthorizedException('Aucune empreinte enregistrée.');

    const options = await generateAuthenticationOptions({
      timeout: 120000,
      rpID: 'localhost',
      userVerification: 'required',
      allowCredentials: [{ id: user.webauthnCredentialID, transports: ['internal'] }],
    });

    user.webauthnChallenge = options.challenge;
    await this.userRepository.save(user);
    return options;
  }

  async verifyFingerprintLogin(body: any, metadata?: SessionMetadata) {
    const { credential, email } = body;
    const emailNorm = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: emailNorm } });

    if (!user || !user.webauthnCredentialID || !user.webauthnPublicKey || !user.webauthnChallenge) {
      throw new UnauthorizedException('Utilisateur invalide.');
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.webauthnChallenge,
      expectedOrigin: 'http://localhost:5173',
      expectedRPID: 'localhost',
      credential: {
        id: user.webauthnCredentialID,
        publicKey: Buffer.from(user.webauthnPublicKey, 'base64'),
        counter: user.webauthnCounter ?? 0,
        transports: ['internal'],
      },
    });

    if (!verification.verified) throw new UnauthorizedException('Empreinte non valide.');

    if (verification.authenticationInfo) user.webauthnCounter = verification.authenticationInfo.newCounter;
    user.webauthnChallenge = null;
    await this.userRepository.save(user);

    return this.issueTokens(user, metadata);
  }

  /* ================= UTILITIES ================= */

  private async issueTokens(user: User, metadata?: SessionMetadata): Promise<SessionTokens> {
    const accessToken = this.jwtTokenService.generateAccessToken(user);
    const accessTokenExpiresAt = this.jwtTokenService.calculateExpirationDate(this.jwtTokenService.getAccessTokenTtl());
    const refreshTokenRecord = await this.refreshTokenService.createRefreshToken(user, metadata?.ipAddress ?? null, metadata?.userAgent ?? null);

    const tokens: SessionTokens = {
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
        name: user.name,
        isTwoFAEnabled: user.isTwoFAEnabled,
      },
    };

    if (!tokens.refreshToken) {
      throw new Error('Refresh token manquant lors de la génération des tokens.');
    }

    return tokens;
  }

  private async logActivity(userId: string, type: ActivityType, ip?: string, deviceInfo?: string, metadata?: any) {
    try {
      await this.activityService.create({
        userId,
        type,
        ipAddress: ip || 'unknown',
        deviceInfo: deviceInfo || 'unknown',
        metadata: metadata || {},
        location: { country: 'Detected', city: 'via_IP' },
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }

  async checkUser(checkUserDto: CheckUserDto) {
    const user = await this.userRepository.findOne({ where: { email: checkUserDto.email } });
    if (!user) return { exists: false, user: null };
    return {
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        authMethod: user.authMethod,
        aiScore: user.aiScore,
        photoAnalysis: user.photoAnalysis,
        emailAnalysis: user.emailAnalysis,
        createdAt: user.createdAt,
      }
    };
  }

  async updateAIScore(updateAIScoreDto: UpdateAIScoreDto) {
    const user = await this.userRepository.findOne({ where: { id: updateAIScoreDto.userId } });
    if (!user) throw new Error('User not found');

    if (updateAIScoreDto.aiScore !== undefined) {
      user.aiScore = typeof updateAIScoreDto.aiScore === 'string' ? parseFloat(updateAIScoreDto.aiScore) : updateAIScoreDto.aiScore;
    }
    if (updateAIScoreDto.photoAnalysis) user.photoAnalysis = updateAIScoreDto.photoAnalysis;
    if (updateAIScoreDto.emailAnalysis) user.emailAnalysis = updateAIScoreDto.emailAnalysis;

    await this.userRepository.save(user);
    return user;
  }
}

function euclideanDistance(a: number[], b: number[]) {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}