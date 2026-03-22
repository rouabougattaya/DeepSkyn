import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector, APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../user/user.entity';
import { Activity } from './activity.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TwoFactorModule } from '../twofactor/twofactor.module';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { EmailSecurityModule } from '../email-security/email-security.module';
import { SessionModule } from '../sessions/session.module'; // ← Garde cette ligne
import { RecaptchaService } from './services/recaptcha.service';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    TypeOrmModule.forFeature([User, Activity, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }), 
    SessionModule, // ← SessionModule est importé
    TwoFactorModule,
    EmailSecurityModule,
  ],
  controllers: [AuthController, ActivityController],
  providers: [
    AuthService,
    ActivityService,
    JwtStrategy,
    JwtAuthGuard,
    Reflector,
    JwtTokenService,
    RefreshTokenService,
    LoginAttemptService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAccessGuard,
    JwtRefreshGuard,
     RecaptchaService,
    {
      provide: APP_GUARD,
      useClass: JwtAccessGuard,
    },
  ],
  exports: [
    AuthService, 
    ActivityService, 
    JwtTokenService, 
    RefreshTokenService,
    // SessionService, // ← SUPPRIME cette ligne
  ],
})
export class AuthModule { }