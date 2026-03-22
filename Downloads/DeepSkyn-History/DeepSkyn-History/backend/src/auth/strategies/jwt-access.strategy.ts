import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/user.entity';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    console.log('[JwtAccessStrategy] Initialized with secret length:', secret.length);
  }

  async validate(payload: any) {
    console.log('[JwtAccessStrategy] Payload received:', JSON.stringify(payload));

    if (payload.tokenType !== 'access') {
      console.warn('[JwtAccessStrategy] Invalid token type:', payload.tokenType);
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      console.warn('[JwtAccessStrategy] User not found for sub:', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    console.log('[JwtAccessStrategy] User validated:', user.email);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tokenVersion: payload.version,
    };
  }
}
