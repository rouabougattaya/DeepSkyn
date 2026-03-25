import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../user/user.entity';

@Injectable()
export class JwtTokenService {
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenTtl = +configService.get<number>('JWT_ACCESS_TTL', 900);
    this.refreshTokenTtl = +configService.get<number>('JWT_REFRESH_TTL', 604800);
  }

  /**
   * Génère un JWT access token (Bearer token dans le header)
   */
  generateAccessToken(user: User, tokenVersion: number = 1): string {
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tokenType: 'access',
      version: tokenVersion,
      jti: crypto.randomUUID(), // Assure l'unicité même dans la même seconde
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: `${this.accessTokenTtl}s`,
    });
  }

  /**
   * Génère un JWT refresh token (stocké en HttpOnly cookie)
   */
  generateRefreshToken(user: User, tokenVersion: number = 1): string {
    const payload = {
      sub: user.id,
      email: user.email,
      tokenType: 'refresh',
      version: tokenVersion,
      jti: crypto.randomUUID(), // Crucial pour la contrainte UNIQUE en base
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${this.refreshTokenTtl}s`,
    });
  }

  /**
   * Valide et décode un JWT access token
   */
  verifyAccessToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }
  }

  /**
   * Valide et décode un JWT refresh token
   */
  verifyRefreshToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return null;
    }
  }

  /**
   * Hash un token pour le stocker en BD (security best practice)
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Compare un token avec sa version hashée
   */
  async verifyHashedToken(plainToken: string, hashedToken: string): Promise<boolean> {
    return bcrypt.compare(plainToken, hashedToken);
  }

  /**
   * Calcule la date d'expiration basée sur le TTL
   */
  calculateExpirationDate(ttlSeconds: number): Date {
    return new Date(Date.now() + ttlSeconds * 1000);
  }

  getAccessTokenTtl(): number {
    return this.accessTokenTtl;
  }

  getRefreshTokenTtl(): number {
    return this.refreshTokenTtl;
  }
}
