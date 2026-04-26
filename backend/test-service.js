const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { RoutinePersonalizationService } = require('./dist/src/routine/routine-personalization.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(RoutinePersonalizationService);

  try {
    const res = await service.personalizeRoutine('bc4bb9f6-d366-4535-b8ab-44b1f7910ce8', { forceRegenerate: true });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Service Error:', err.message);
  }

  await app.close();
}
bootstrap();
