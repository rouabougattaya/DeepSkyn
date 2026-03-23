// backend/src/auth/session/session.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { FingerprintService } from '../auth/services/fingerprint.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    AiModule,
  ],
  controllers: [SessionController],
  providers: [
    SessionService,
    FingerprintService,
  ],
  exports: [SessionService],
})
export class SessionModule { }