import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { GoogleAuthDto, CheckUserDto, UpdateAIScoreDto, SignUpDto } from './dto/auth.dto';

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
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
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
      // Don't reveal if user exists for security
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
      // Fallback to logs for development visibility
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

    // Add current attempt to history
    const currentAttempt = {
      timestamp: new Date().toISOString(),
      ip: context.ip,
      action: 'PASSWORD_RESET_REQUEST',
    };

    if (user) {
      user.authHistory = [...history, currentAttempt].slice(-10); // Keep last 10
      await this.userRepository.save(user);
    }

    if (!process.env.GOOGLE_GENAI_API_KEY) {
      console.warn('⚠️ Gemini API Key is missing in environment variables');
      return { riskScore: 0.1, reason: 'No API Key' };
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analyze if this password reset request is suspicious. 
    User Email: ${email}
    Current IP: ${context.ip}
    Recent History: ${JSON.stringify(history)}
    Respond only with a JSON object: { "riskScore": 0.0 to 1.0, "reason": "short explanation" }`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      if (error.status === 404) {
        console.warn('⚠️ Gemini Model not found (404). Behavioral analysis skipped.');
      } else {
        console.error('⚠️ Gemini analysis failed:', error.message || error);
      }
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
    console.log('✅ Created new local user:', user.email);

    return this.generateToken(user);
  }

  async loginWithEmail(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new Error('User not found');
    }

    // For demo, accept any password for demo user
    if (email === 'demo@example.com') {
      return this.generateToken(user);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    return this.generateToken(user);
  }

  async loginWithGoogle(googleUser: GoogleAuthDto) {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { googleId: googleUser.id },
        { email: googleUser.email }
      ]
    });

    let user;
    if (!existingUser) {
      // Create new user
      user = this.userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.id,
        avatarUrl: googleUser.picture,
        photoAnalysis: googleUser.photoAnalysis || {},
        emailAnalysis: googleUser.emailAnalysis || {},
        aiScore: googleUser.aiScore || 0.5,
      });

      await this.userRepository.save(user);
      console.log('✅ Created new Google user:', user.email);
    } else {
      // Update existing user
      user = existingUser;
      user.name = googleUser.name;
      user.avatarUrl = googleUser.picture;
      user.photoAnalysis = googleUser.photoAnalysis || {};
      user.emailAnalysis = googleUser.emailAnalysis || {};
      user.aiScore = googleUser.aiScore || 0.5;

      await this.userRepository.save(user);
      console.log('✅ Updated existing Google user:', user.email);
    }

    return this.generateToken(user);
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
        aiScore: user.aiScore,
        photoAnalysis: user.photoAnalysis,
        emailAnalysis: user.emailAnalysis,
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

    user.aiScore = parseFloat(updateAIScoreDto.aiScore);
    user.photoAnalysis = updateAIScoreDto.photoAnalysis;
    user.emailAnalysis = updateAIScoreDto.emailAnalysis;

    await this.userRepository.save(user);
    return user;
  }

  private generateToken(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
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
