import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'your_super_secret_jwt_key_here_change_in_production_12345',
        });
    }

    async validate(payload: any) {
        return {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            role: payload.role || 'USER',
        };
    }
}
