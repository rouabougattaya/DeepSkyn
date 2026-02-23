// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { SessionService } from './session/session.service';
import { GoogleAuthDto, CheckUserDto, UpdateAIScoreDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  async loginWithEmail(email: string, password: string, req: any) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      throw new Error('User not found');
    }

    // For demo, accept any password for demo user
    if (email === 'demo@example.com') {
      const token = this.generateToken(user);
      
      // Créer la session avec le fingerprint
      await this.sessionService.createSession(
        user.id,
        token,
        req
      );
      
      return {
        token,
        user: { email: user.email }
      };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const token = this.generateToken(user);
    
    // Créer la session avec le fingerprint
    await this.sessionService.createSession(
      user.id,
      token,
      req
    );

    return {
      token,
      user: { email: user.email }
    };
  }

  async loginWithGoogle(googleUser: GoogleAuthDto, req: any) { // ← AJOUTE req
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

    const token = this.generateToken(user);
    
    // ✅ Créer la session pour Google aussi
    await this.sessionService.createSession(
      user.id,
      token,
      req
    );

    return {
      token,
      user: { email: user.email }
    };
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