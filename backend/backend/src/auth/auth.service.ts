import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { GoogleAuthDto, CheckUserDto, UpdateAIScoreDto } from './dto/auth.dto';
import { ActivityService } from './activity.service';
import { ActivityType } from './activity.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private activityService: ActivityService,
  ) { }

  async loginWithEmail(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Potentially log failed attempt for non-existent user? 
      // For now, only for existing users
      throw new Error('User not found');
    }

    // For demo, accept any password for demo user
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
        authMethod: 'google',
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
      user.authMethod = 'google';
      user.photoAnalysis = googleUser.photoAnalysis || {};
      user.emailAnalysis = googleUser.emailAnalysis || {};
      user.aiScore = googleUser.aiScore || 0.5;

      await this.userRepository.save(user);
      console.log('✅ Updated existing Google user:', user.email);
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
        location: { country: 'Detected', city: 'via_IP' }, // Fallback placeholder
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
