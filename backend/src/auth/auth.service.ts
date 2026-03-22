import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    role?: 'USER' | 'ADMIN';
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
    private readonly configService: ConfigService,
  ) {
    this.genAI = new GoogleGenerativeAI(this.configService.get<string>('GOOGLE_GENAI_API_KEY') || '');
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
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
          role: user.role || 'USER',
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

  async loginWithGoogleModern(
    googleUser: GoogleAuthDto,
    metadata?: SessionMetadata,
    req?: any,
  ): Promise<SessionTokens> {
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

    await this.logActivity(user.id, ActivityType.LOGIN_SUCCESS, metadata?.ipAddress || undefined, metadata?.userAgent || undefined, { method: 'google' });

    // Utiliser la méthode issueTokens existante
    const tokens = await this.issueTokens(user, metadata);

    // Créer la session
    await this.sessionService.createSession(user.id, tokens.accessToken || '', req);

    return tokens;
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
    const THRESHOLD = 0.45; // Seuil strict : < 0.45 = même personne, > 0.45 = visage différent

    console.log(`[FaceLogin] Distance: ${dist.toFixed(4)} (Threshold: ${THRESHOLD})`);

    if (dist > THRESHOLD) {
      console.warn(`[FaceLogin] Face mismatch for ${emailNorm}. Distance: ${dist.toFixed(4)} > ${THRESHOLD}`);
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
          role: user.role || 'USER',
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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/auth/reset-password/${token}`;

    console.log(`📧 Attempting to send reset email to: ${email}`);
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || '"DeepSkyn Support" <support@deepskyn.com>',
        to: email,
        subject: 'Réinitialisation de votre mot de passe - DeepSkyn',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0d9488; margin: 0;">DeepSkyn</h2>
            </div>
            <h3 style="color: #1e293b;">Réinitialisez votre mot de passe</h3>
            <p style="color: #64748b; line-height: 1.6;">Vous avez demandé la réinitialisation du mot de passe de votre compte DeepSkyn.</p>
            <p style="color: #64748b; line-height: 1.6;">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien expirera dans 1 heure.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Réinitialiser le mot de passe</a>
            </div>
            <p style="margin-top: 24px; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9; padding-top: 24px;">Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet e-mail en toute sécurité.</p>
          </div>
        `,
      });
      console.log('✅ Reset email sent successfully:', info.messageId);
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

  /* ================= ADMIN BIOMETRIC (WebAuthn) ================= */

  /**
   * Enregistrer l'empreinte pour un admin déjà connecté
   * Génère les options WebAuthn avec discoverable credentials (residentKey: required)
   */
  async generateAdminBiometricRegistrationOptions(adminUser: User) {
    if (adminUser.role !== 'ADMIN') {
      throw new UnauthorizedException('Seuls les administrateurs peuvent enregistrer une empreinte.');
    }

    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    const rpOrigin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

    const options = await generateRegistrationOptions({
      rpName: 'DeepSkyn',
      rpID,
      userID: new TextEncoder().encode(adminUser.id),
      userName: adminUser.email,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',  // Clé résidente obligatoire pour login sans email
      },
    });

    webauthnChallengeStore.set(adminUser.id, options.challenge);
    return options;
  }

  /**
   * Vérifier et sauvegarder l'empreinte admin
   */
  async verifyAdminBiometricRegistration(adminUser: User, credential: any) {
    if (adminUser.role !== 'ADMIN') {
      throw new UnauthorizedException('Seuls les administrateurs peuvent enregistrer une empreinte.');
    }

    const expectedChallenge = webauthnChallengeStore.get(adminUser.id);
    if (!expectedChallenge) throw new UnauthorizedException('Challenge expiré.');

    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    const rpOrigin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('Échec vérification biométrique.');
    }

    const { credential: cred } = verification.registrationInfo;

    adminUser.webauthnCredentialID = cred.id;
    adminUser.webauthnPublicKey = Buffer.from(cred.publicKey).toString('base64');
    adminUser.webauthnCounter = cred.counter;
    await this.userRepository.save(adminUser);

    webauthnChallengeStore.delete(adminUser.id);
    return { success: true, message: 'Empreinte enregistrée avec succès.' };
  }

  /**
   * Supprimer l'empreinte d'un admin
   */
  async removeAdminBiometric(adminUser: User) {
    if (adminUser.role !== 'ADMIN') {
      throw new UnauthorizedException('Seuls les administrateurs peuvent supprimer une empreinte.');
    }

    adminUser.webauthnCredentialID = null;
    adminUser.webauthnPublicKey = null;
    adminUser.webauthnCounter = null;
    adminUser.webauthnChallenge = null;
    await this.userRepository.save(adminUser);
    return { success: true, message: 'Empreinte supprimée.' };
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
        role: user.role || 'USER',
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

  /**
   * Generate options for admin biometric LOGIN (discoverable credentials)
   */
  async generateAdminBiometricLoginOptions(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Find the admin by email
    const admin = await this.userRepository.findOne({
      where: { email, role: 'ADMIN' },
    });

    if (!admin || !admin.webauthnCredentialID) {
      throw new BadRequestException('Admin not found or has no biometric registered');
    }

    const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    const tempId = crypto.randomUUID();

    // Generate options WITH challenge and filter to this user's credentials
    const loginOptions = await generateAuthenticationOptions({
      rpID,
      timeout: 60000,
      userVerification: 'required',
      // allowCredentials: Filter to ONLY this admin's credential
      allowCredentials: [
        {
          id: admin.webauthnCredentialID,
          transports: ['internal'],
        },
      ],
    });

    // Store the challenge
    webauthnChallengeStore.set(tempId, loginOptions.challenge);

    return { ...loginOptions, tempId };
  }

  /**
   * Verify admin biometric LOGIN credential (discoverable credentials)
   */
  async verifyAdminBiometricLogin(credential: any, tempId: string) {
    const challenge = webauthnChallengeStore.get(tempId);
    if (!challenge) {
      throw new BadRequestException('No login challenge found. Generate options first.');
    }

    try {
      // Find the user by credentialID
      const user = await this.userRepository.findOne({
        where: { webauthnCredentialID: credential.id },
      });

      if (!user || user.role !== 'ADMIN') {
        throw new UnauthorizedException('Admin not found or invalid credentials');
      }

      if (!user.webauthnPublicKey) {
        throw new BadRequestException('Admin has no registered biometric');
      }

      const publicKeyBuffer = Buffer.from(user.webauthnPublicKey, 'base64');
      const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
      const rpOrigin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: rpOrigin,
        expectedRPID: rpID,
        credential: {
          id: credential.id,
          publicKey: publicKeyBuffer,
          counter: user.webauthnCounter || 0,
          transports: credential.response?.transports || [],
        },
      });

      if (!verification.verified) {
        throw new BadRequestException('Biometric verification failed');
      }

      // Update counter
      user.webauthnCounter = verification.authenticationInfo!.newCounter;
      await this.userRepository.save(user);

      webauthnChallengeStore.delete(tempId);

      // Generate tokens
      const tokens = await this.issueTokens(user, {});

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (err) {
      throw new BadRequestException(err.message || 'Biometric login failed');
    }
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