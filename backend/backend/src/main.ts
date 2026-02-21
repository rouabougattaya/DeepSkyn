import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix('api'); // ← ajouter ici

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('DeepSkyn API')
    .setDescription('DeepSkyn Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // ← 'docs' au lieu de 'api'

  await app.listen(process.env.PORT || 3001);
  
  console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3001}`);
  console.log(`📚 Swagger docs at http://localhost:${process.env.PORT || 3001}/docs`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
}
bootstrap();
