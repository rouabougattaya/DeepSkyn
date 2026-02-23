// backend/src/auth/session/session.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { FingerprintService } from '../services/fingerprint.service';
import { GeminiService } from '../../ai/gemini.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]), // ← Ceci rend SessionRepository disponible
  ],
  controllers: [SessionController],
  providers: [
    SessionService, 
    FingerprintService,
    GeminiService,
  ],
  exports: [SessionService],
})
export class SessionModule {}