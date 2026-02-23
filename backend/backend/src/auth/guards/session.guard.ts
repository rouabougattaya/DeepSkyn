// backend/src/auth/guards/session.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SessionService } from '../session/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const sessionId = request.params.id;

    if (!user || !sessionId) {
      throw new ForbiddenException('Accès interdit');
    }

    // Vérifier que la session appartient bien à l'utilisateur
    const session = await this.sessionService.validateSession(sessionId);
    
    if (!session || session.userId !== user.id) {
      throw new ForbiddenException('Session non trouvée ou accès non autorisé');
    }

    return true;
  }
}