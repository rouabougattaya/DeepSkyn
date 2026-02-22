import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS MUST be first (before middleware that could throw errors)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['X-CSRF-Token'],
  });

  // Cookie parser
  app.use(cookieParser());

  // Routes publiques (pas de CSRF requis)
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/2fa/verify',
    '/auth/logout', // Logout est protégé par Bearer token, pas besoin de CSRF
  ];

  const csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });

  // Middleware CSRF intelligente
  app.use((req, res, next) => {
    // Route spéciale: /auth/csrf-token - toujours générer le token (GET ou POST)
    if (req.path === '/auth/csrf-token') {
      return csrfProtection(req, res, next);
    }

    // Routes publiques: pas de CSRF du tout
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // Toutes les autres routes: appliquer CSRF (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return csrfProtection(req, res, next);
    }

    // GET sur les autres routes: générer le token seulement
    if (req.method === 'GET') {
      return csrfProtection(req, res, next);
    }

    return next();
  });

  // Global pipes et filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`✅ JWT Authentication Server running on http://localhost:${port}`);
  console.log(`🔐 CSRF Protection: Enabled (on protected routes)`);
  console.log(`🍪 HttpOnly Cookies: Enabled`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
}
bootstrap();
