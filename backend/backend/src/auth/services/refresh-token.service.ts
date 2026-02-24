import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../user/user.entity';
import { JwtTokenService } from './jwt-token.service';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  /**
   * Crée et stocke un nouveau refresh token
   */
  async createRefreshToken(
    user: User,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<RefreshToken & { refreshToken: string }> {
    const refreshToken = this.jwtTokenService.generateRefreshToken(user, 1);
    const hashedToken = await this.jwtTokenService.hashToken(refreshToken);

    const record = this.refreshTokenRepository.create({
      userId: user.id,
      hashedToken,
      version: 1,
      revoked: false,
      expiresAt: this.jwtTokenService.calculateExpirationDate(
        this.jwtTokenService.getRefreshTokenTtl(),
      ),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await this.refreshTokenRepository.save(record);
    return { ...record, refreshToken };
  }

  /**
   * Effectue la rotation du refresh token
   * - Valide l'ancien token
   * - Le marque comme révoqué
   * - Crée un nouveau token avec une version incrémentée
   */
  async rotateRefreshToken(
    user: User,
    oldRefreshToken: string,
    newTokenVersion: number,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<RefreshToken & { refreshToken: string }> {
    // Décoder l'ancien token pour obtenir le version
    const decoded = this.jwtTokenService.verifyRefreshToken(oldRefreshToken);
    if (!decoded) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    // Récupérer le record en BD
    const oldRecord = await this.refreshTokenRepository.findOne({
      where: {
        userId: user.id,
        version: decoded.version,
      },
    });

    if (!oldRecord) {
      throw new UnauthorizedException('Refresh token non trouvé en BD');
    }

    // Vérifier le hash
    const isValid = await this.jwtTokenService.verifyHashedToken(
      oldRefreshToken,
      oldRecord.hashedToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    // Marquer l'ancien comme révoqué
    oldRecord.revoked = true;
    await this.refreshTokenRepository.save(oldRecord);

    // Créer le nouveau token avec version incrémentée
    const newRefreshToken = this.jwtTokenService.generateRefreshToken(user, newTokenVersion);
    const hashedNewToken = await this.jwtTokenService.hashToken(newRefreshToken);

    const newRecord = this.refreshTokenRepository.create({
      userId: user.id,
      hashedToken: hashedNewToken,
      version: newTokenVersion,
      revoked: false,
      expiresAt: this.jwtTokenService.calculateExpirationDate(
        this.jwtTokenService.getRefreshTokenTtl(),
      ),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await this.refreshTokenRepository.save(newRecord);
    return { ...newRecord, refreshToken: newRefreshToken };
  }

  /**
   * Valide un refresh token (existence, non révoqué, non expiré, hash match)
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<RefreshToken> {
    const decoded = this.jwtTokenService.verifyRefreshToken(refreshToken);
    if (!decoded || decoded.sub !== userId) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const record = await this.refreshTokenRepository.findOne({
      where: {
        userId,
        version: decoded.version,
      },
    });

    if (!record || record.revoked) {
      throw new UnauthorizedException('Refresh token révoqué');
    }

    if (new Date() > record.expiresAt) {
      throw new UnauthorizedException('Refresh token expiré');
    }

    const isValid = await this.jwtTokenService.verifyHashedToken(
      refreshToken,
      record.hashedToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Refresh token signature invalide');
    }

    return record;
  }

  /**
   * Révoque un refresh token
   */
  async revokeToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, { revoked: true });
  }

  /**
   * Révoque tous les refresh tokens d'un utilisateur
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ userId }, { revoked: true });
  }
}
