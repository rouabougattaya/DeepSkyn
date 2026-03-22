import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Session } from '../../session/session.entity';
import { REQUEST_SESSION_KEY } from '../guards/session.guard';

/**
 * Récupère la session attachée par SessionGuard (requête authentifiée).
 */
export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Session => {
    const request = ctx.switchToHttp().getRequest();
    return request[REQUEST_SESSION_KEY];
  },
);
