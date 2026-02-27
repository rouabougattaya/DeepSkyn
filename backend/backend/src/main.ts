import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CORS - Multiple origins autorisés
  const corsOrigins = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175', // ← TON PORT ACTUEL
    'http://localhost:3000',
  ].filter(Boolean); // Enlève les valeurs null/undefined

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    exposedHeaders: ['X-CSRF-Token'],
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('DeepSkyn API')
    .setDescription('DeepSkyn Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // CSRF Protection configuration
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/login-face',
    '/api/auth/2fa/verify',
    '/api/auth/logout',
    '/api/auth/2fa/setup',
    '/api/auth/2fa/enable',
    '/api/auth/2fa/disable',
    '/api/auth/register-fingerprint/options',
    '/api/auth/register-fingerprint/verify',
    '/api/auth/login-fingerprint/options',
    '/api/auth/login-fingerprint/verify',
    '/api/auth/check-user',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ];

  const csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });

  // CSRF Middleware
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/api/auth/csrf-token') {
      return csrfProtection(req, res, () => {
        const token = req.csrfToken();
        res.setHeader('X-CSRF-Token', token);
        return res.status(200).json({ csrfToken: token });
      });
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !publicRoutes.includes(req.path)) {
      return csrfProtection(req, res, next);
    }

    if (req.method === 'GET' && !publicRoutes.includes(req.path)) {
      return csrfProtection(req, res, next);
    }

    return next();
  });

  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
  console.log(`🔐 CSRF Protection: Enabled (on protected routes)`);
  console.log(`🌐 CORS Origins:`, corsOrigins);
}

bootstrap();