import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwoFactorService } from './twofactor.service';
import { TwoFactorController } from './twofactor.controller';
import { User } from '../user/user.entity';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SessionModule],
  providers: [TwoFactorService],
  controllers: [TwoFactorController],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
