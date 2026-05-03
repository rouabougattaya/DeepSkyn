import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });

  // Routes publiques qui n'ont pas besoin de CSRF
  private publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/2fa/verify',
    '/auth/csrf-token',
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // Pour GET, générer le token CSRF
    if (req.method === 'GET') {
      return this.csrfProtection(req, res, next);
    }

    // Pour les routes publiques, ne pas appliquer CSRF
    if (this.publicRoutes.includes(req.path)) {
      return next();
    }

    // Pour tous les autres POST/PUT/PATCH/DELETE, appliquer CSRF
    return this.csrfProtection(req, res, next);
  }
}
