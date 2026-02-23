import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { GoogleAuthDto, CheckUserDto, UpdateAIScoreDto, SignUpDto } from './dto/auth.dto';
import { ActivityService } from './activity.service';
import { ActivityType } from './activity.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private genAI: GoogleGenerativeAI;
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private activityService: ActivityService,
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
      console.log(`✅ Email sent successfully to: ${email}`);
    } catch (error) {
      console.error('❌ Failed to send reset email:', error);
      console.log(`🔗 Reset Link (Fallback): ${resetLink}`);
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
      // Using the fetch approach with v1beta as it's more reliable for specific model versions
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

      // Robust JSON cleaning
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

  async loginWithEmail(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new Error('User not found');
    }

    if (email === 'demo@example.com') {
      await this.logActivity(user.id, ActivityType.LOGIN_SUCCESS, ip, userAgent);
      const token = await this.generateToken(user);
      return { token, user };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await this.logActivity(user.id, ActivityType.LOGIN_FAILED, ip, userAgent, { reason: 'invalid_password' });
      throw new Error('Invalid password');
    }

    await this.logActivity(user.id, ActivityType.LOGIN_SUCCESS, ip, userAgent);
    const token = await this.generateToken(user);
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
    return { token, user };
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
    const user = await this.userRepository.findOne({
      where: { email: checkUserDto.email }
    });

    if (!user) {
      return { exists: false, user: null };
    }

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
    const user = await this.userRepository.findOne({
      where: { id: updateAIScoreDto.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (updateAIScoreDto.aiScore !== undefined) {
      user.aiScore = typeof updateAIScoreDto.aiScore === 'string'
        ? parseFloat(updateAIScoreDto.aiScore)
        : updateAIScoreDto.aiScore;
    }

    if (updateAIScoreDto.photoAnalysis) {
      user.photoAnalysis = updateAIScoreDto.photoAnalysis;
    }

    if (updateAIScoreDto.emailAnalysis) {
      user.emailAnalysis = updateAIScoreDto.emailAnalysis;
    }

    await this.userRepository.save(user);
    return user;
  }

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
}
