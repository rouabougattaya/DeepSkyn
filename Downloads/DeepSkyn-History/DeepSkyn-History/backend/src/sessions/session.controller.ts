import { Controller, Get, Delete, Param, UseGuards, Req, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from './session.service';

@Controller('auth/sessions')
@UseGuards(AuthGuard('jwt-access')) // ← Utilise la stratégie correcte (jwt-access)
export class SessionController {
  constructor(private sessionService: SessionService) { }

  @Get()
  async getSessions(@Req() req) {
    console.log('[SessionController] GET /sessions | User:', req.user ? JSON.stringify(req.user) : 'UNDEFINED');
    const userId = req.user.id || req.user.userId; // ← Support both as a safety measure
    console.log('[SessionController] Using userId:', userId);
    const sessions = await this.sessionService.getUserSessions(userId);

    const refreshToken = req.cookies?.refreshToken ||
      req.headers['x-refresh-token'];
    const currentSession = await this.sessionService.getCurrentSession(refreshToken);

    return sessions.map(session => ({
      id: session.id,
      fingerprint: {
        browser: session.fingerprint?.browser || 'Unknown',
        os: session.fingerprint?.os || 'Unknown',
        ip: session.fingerprint?.ip || '0.0.0.0',
        isMobile: session.fingerprint?.isMobile || false,
      },
      riskLevel: session.riskLevel,
      riskAnalysis: session.riskAnalysis,
      lastActivity: session.lastActivity,
      isCurrent: currentSession?.id === session.id,
    }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Param('id') sessionId: string, @Req() req) {
    const userId = req.user.id || req.user.userId;
    if (!sessionId) {
      throw new BadRequestException('Session ID manquant');
    }

    await this.sessionService.revokeSession(sessionId, userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllOtherSessions(@Req() req) {
    const userId = req.user.id || req.user.userId;

    const refreshToken =
      req.cookies?.refreshToken || req.headers['x-refresh-token'];

    const currentSession = refreshToken
      ? await this.sessionService.getCurrentSession(refreshToken)
      : null;

    await this.sessionService.revokeAllUserSessions(
      userId,
      currentSession?.id,
    );
  }
}