import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration CORS avec plusieurs origines autorisées
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,                    // Variable d'environnement
      'http://localhost:5173',                      // Port Vite par défaut
      'http://localhost:5174',                      // Ton port actuel
      'http://localhost:3000',                      // Port React par défaut
    ].filter(Boolean),                              // Enlève les valeurs null/undefined
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('DeepSkyn API')
    .setDescription('DeepSkyn Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3001);
  
  console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3001}`);
  console.log(`📚 Swagger docs at http://localhost:${process.env.PORT || 3001}/docs`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
}
bootstrap();