// backend/src/auth/session/session.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { FingerprintService } from '../auth/services/fingerprint.service';
import { GeminiService } from '../ai/gemini.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)  // ← Ceci doit correspondre à TypeOrmModule.forFeature([Session])
    private sessionRepository: Repository<Session>,
    private fingerprintService: FingerprintService,
    private geminiService: GeminiService,
  ) { }

  async createSession(
    userId: string,
    refreshToken: string,
    req: any
  ): Promise<Session> {
    const fingerprint = await this.fingerprintService.generateFingerprint(req);

    const session = this.sessionRepository.create({
      userId,
      refreshToken,
      fingerprint,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    });

    await this.sessionRepository.save(session);

    // Analyser le risque en arrière-plan
    this.analyzeSessionRisk(session.id).catch(console.error);

    return session;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        isRevoked: false,
      },
      order: {
        lastActivity: 'DESC',
      },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session non trouvée');
    }

    session.isRevoked = true;
    session.revokedAt = new Date();
    await this.sessionRepository.save(session);
  }

  async revokeAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
    const query = this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where('userId = :userId', { userId });

    if (excludeSessionId) {
      query.andWhere('id != :excludeSessionId', { excludeSessionId });
    }

    await query.execute();
  }

  async validateSession(refreshToken: string): Promise<Session | null> {
    const session = await this.sessionRepository.findOne({
      where: {
        refreshToken,
        isRevoked: false,
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await this.revokeSession(session.id, session.userId);
      return null;
    }

    session.lastActivity = new Date();
    await this.sessionRepository.save(session);

    return session;
  }

  private async analyzeSessionRisk(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) return;
    
    // Utilisation de GeminiService à la place d'OpenRouter
    const analysis = await this.geminiService.analyzeSessionRisk({
      userId: session.userId,
      fingerprint: session.fingerprint,
      createdAt: session.createdAt,
    });

    if (analysis.score >= 70) {
      session.riskLevel = 'high';
    } else if (analysis.score >= 30) {
      session.riskLevel = 'medium';
    } else {
      session.riskLevel = 'low';
    }

    session.riskAnalysis = analysis;
    await this.sessionRepository.save(session);
  }

  async getCurrentSession(refreshToken: string): Promise<Session | null> {
    if (!refreshToken) return null;

    return this.sessionRepository.findOne({
      where: {
        refreshToken,
        isRevoked: false,
      },
    });
  }
}