// backend/src/auth/session/session.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';

import { SessionService } from '../session/session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]), // ← Ceci rend SessionRepository disponible
  ],
  controllers: [],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}