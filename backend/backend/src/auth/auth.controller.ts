import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { User } from '../user/user.entity';

function getSessionMetadata(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  const userAgent = (req.headers['user-agent'] as string) ?? null;
  return { ipAddress: ip, userAgent };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Authentifie l'utilisateur et retourne les tokens JWT
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    const metadata = getSessionMetadata(req);
    const result = await this.authService.login(dto, metadata, req);

    // Si 2FA requis, retourner sans tokens
    if (result.requiresTwoFa) {
      return res.json(result);
    }

    // Sinon, mettre le refreshToken en HttpOnly cookie
    if (result.refreshToken && result.refreshTokenExpiresAt) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: new Date(result.refreshTokenExpiresAt).getTime() - Date.now(),
      });

      const { refreshToken, ...responseData } = result;
      return res.json(responseData);
    }

    return res.json(result);
  }

  /**
   * POST /auth/register
   * Crée un nouvel utilisateur et retourne les tokens JWT
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    const metadata = getSessionMetadata(req);
    const result = await this.authService.register(dto, metadata, req);

    // Mettre le refreshToken en HttpOnly cookie
    if (result.refreshToken && result.refreshTokenExpiresAt) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: new Date(result.refreshTokenExpiresAt).getTime() - Date.now(),
      });

      const { refreshToken, ...responseData } = result;
      return res.json(responseData);
    }

    return res.json(result);
  }

  /**
   * POST /auth/refresh
   * Renouvelle l'access token en utilisant le refresh token
   * Effectue la rotation du refresh token (ancien révoqué, nouveau créé)
   */
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    const metadata = getSessionMetadata(req);
    const refreshToken = req.cookies?.refreshToken;
    const result = await this.authService.refresh(user, refreshToken, metadata, req);

    // Mettre le nouveau refreshToken en HttpOnly cookie
    if (result.newRefreshToken && result.refreshTokenExpiresAt) {
      res.cookie('refreshToken', result.newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: new Date(result.refreshTokenExpiresAt).getTime() - Date.now(),
      });

      const { newRefreshToken, refreshTokenExpiresAt, ...responseData } = result;
      return res.json(responseData);
    }

    return res.json(result);
  }

  /**
   * GET /auth/me
   * Retourne le profil de l'utilisateur connecté
   */
  @UseGuards(JwtAccessGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: User): Promise<any> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  /**
   * POST /auth/logout
   * Révoque le refresh token
   */
  @UseGuards(JwtAccessGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<any> {
    await this.authService.logout(user.id);

    // Effacer le cookie
    res.clearCookie('refreshToken');

    return res.json({
      success: true,
      message: 'Déconnexion réussie.',
    });
  }

  /**
   * GET /auth/csrf-token
   * Retourne le token CSRF pour les protections POST/PUT/PATCH/DELETE
   */
  @Public()
  @Get('csrf-token')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request, @Res() res: Response): void {
    const csrfToken = (res as any).locals?.csrfToken;
    res.json({ csrfToken });
  }
}

