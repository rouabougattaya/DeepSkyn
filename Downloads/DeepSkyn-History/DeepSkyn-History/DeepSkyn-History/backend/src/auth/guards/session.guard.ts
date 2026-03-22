import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SessionService } from '../../session/session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** Clé pour récupérer le user attaché par le guard */
export const REQUEST_USER_KEY = 'user';

/** Clé pour récupérer la session attachée par le guard */
export const REQUEST_SESSION_KEY = 'session';

/**
 * Guard global : vérifie l'access token (Bearer) sur toute requête sauf routes marquées @Public().
 * - Valide le token via SessionService (lookup + expiration + bcrypt).
 * - Bloque toute requête non authentifiée par défaut (401).
 * - Attache user et session au request pour les routes protégées.
 * Pas de JWT ; token opaque uniquement.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Token manquant ou invalide.');
    }
    const payload = await this.sessionService.validateAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException('Session expirée ou invalide. Veuillez vous reconnecter.');
    }
    request[REQUEST_USER_KEY] = payload.user;
    request[REQUEST_SESSION_KEY] = payload.session;
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth || typeof auth !== 'string') return null;
    const [type, token] = auth.split(' ');
    if (type !== 'Bearer' || !token?.trim()) return null;
    return token.trim();
  }
}
