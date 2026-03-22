import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { Session } from './session.entity';
import { User } from '../user/user.entity';
import {
  SALT_ROUNDS,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  TOKEN_BYTES,
} from './session.constants';

export interface SessionMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionTokensResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  session: Session;
}

export interface ValidatedSessionPayload {
  session: Session;
  user: User;
}

/**
 * Service dédié à la gestion des sessions : création, validation, révocation.
 * Une seule responsabilité : tout ce qui concerne la session en base.
 * Pas de JWT ; tokens opaques (crypto.randomBytes) uniquement.
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Génère un token aléatoire (non prédictible). Uniquement crypto.randomBytes, pas de JWT.
   */
  private generateSecureToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }

  private tokenLookup(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, SALT_ROUNDS);
  }

  /**
   * Crée une nouvelle session : tokens opaques, hash en base, lookups pour validation rapide,
   * métadonnées optionnelles (IP, User-Agent) pour détection de sessions suspectes.
   */
  async createSession(
    user: User,
    metadata?: SessionMetadata,
  ): Promise<SessionTokensResult> {
    const accessToken = this.generateSecureToken();
    const refreshToken = this.generateSecureToken();
    const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const accessTokenHash = await this.hashToken(accessToken);
    const refreshTokenHash = await this.hashToken(refreshToken);
    const accessTokenLookup = this.tokenLookup(accessToken);
    const refreshTokenLookup = this.tokenLookup(refreshToken);

    const session = this.sessionRepository.create({
      userId: user.id,
      accessTokenHash,
      refreshTokenHash,
      accessTokenLookup,
      refreshTokenLookup,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
    });
    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      session,
    };
  }

  /**
   * Valide l'access token : lookup par empreinte, vérification expiration, bcrypt.compare.
   * Retourne la session et l'utilisateur si valide, sinon null (ou throw selon usage).
   */
  async validateAccessToken(token: string): Promise<ValidatedSessionPayload | null> {
    const lookup = this.tokenLookup(token);
    const session = await this.sessionRepository.findOne({
      where: { accessTokenLookup: lookup },
      relations: ['user'],
    });
    if (!session?.user) return null;
    if (session.accessTokenExpiresAt < new Date()) return null;
    const valid = await bcrypt.compare(token, session.accessTokenHash);
    if (!valid) return null;
    return { session, user: session.user as User };
  }

  /**
   * Valide le refresh token : lookup, expiration refresh, bcrypt.compare.
   */
  async validateRefreshToken(token: string): Promise<ValidatedSessionPayload | null> {
    const lookup = this.tokenLookup(token);
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenLookup: lookup },
      relations: ['user'],
    });
    if (!session?.user) return null;
    if (session.refreshTokenExpiresAt < new Date()) return null;
    const valid = await bcrypt.compare(token, session.refreshTokenHash);
    if (!valid) return null;
    return { session, user: session.user as User };
  }

  /**
   * Révoque une session (logout, ou après rotation). Suppression en base.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.delete(sessionId);
  }

  /**
   * Révoque toutes les sessions d'un utilisateur (ex. "déconnecter tous les appareils").
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessionRepository.delete({ userId });
  }

  /**
   * Détection simple de session suspecte : IP ou User-Agent différent de celui enregistré.
   * Utile pour alerter ou exiger une reconnexion (ne bloque pas par défaut).
   */
  isSuspiciousSession(
    session: Session,
    currentIp?: string | null,
    currentUserAgent?: string | null,
  ): boolean {
    if (currentIp != null && session.ipAddress != null && session.ipAddress !== currentIp) {
      return true;
    }
    if (currentUserAgent != null && session.userAgent != null && session.userAgent !== currentUserAgent) {
      return true;
    }
    return false;
  }
}
