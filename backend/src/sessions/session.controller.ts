import { Controller, Get, Delete, Param, UseGuards, Req, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from './session.service';

@Controller('auth/sessions')
@UseGuards(AuthGuard('jwt')) // ← Ça devrait maintenant fonctionner
export class SessionController {
  constructor(private sessionService: SessionService) {}

  @Get()
  async getSessions(@Req() req) {
    const userId = req.user.userId; // ← req.user est maintenant peuplé par JwtStrategy
    const sessions = await this.sessionService.getUserSessions(userId);
    
    const refreshToken = req.cookies?.refreshToken || 
                        req.headers['x-refresh-token'];
    const currentSession = await this.sessionService.getCurrentSession(refreshToken);
    
    return sessions.map(session => ({
      id: session.id,
      fingerprint: session.fingerprint,
      riskLevel: session.riskLevel,
      riskAnalysis: session.riskAnalysis,
      lastActivity: session.lastActivity,
      isCurrent: currentSession?.id === session.id,
    }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Param('id') sessionId: string, @Req() req) {
    const userId = req.user.userId;
    if (!sessionId) {
      throw new BadRequestException('Session ID manquant');
    }

    await this.sessionService.revokeSession(sessionId, userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllOtherSessions(@Req() req) {
    const userId = req.user.userId;

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