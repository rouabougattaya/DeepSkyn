import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Put,
  Req,
  Res,  Delete,
  UseGuards,
  UnauthorizedException,
  InternalServerErrorException,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  SignUpDto,
  GoogleAuthDto,
  CheckUserDto,
  UpdateAIScoreDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginFaceDto } from './dto/login-face.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { User } from '../user/user.entity';
import { SessionService } from '../sessions/session.service.simple';
import { RecaptchaService } from './services/recaptcha.service'; // ← IMPORT AJOUTÉ

function getSessionMetadata(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  const userAgent = (req.headers['user-agent'] as string) ?? null;
  return { ipAddress: ip, userAgent };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly recaptchaService: RecaptchaService, // ← AJOUTÉ
  ) { }

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user (Legacy)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async signup(@Body() signUpDto: SignUpDto) {
    try {
      const token = await this.authService.signUp(signUpDto);
      return {
        token,
        user: { email: signUpDto.email, name: signUpDto.name }
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Modern Register (JWT + Refresh Cookies)' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    const metadata = getSessionMetadata(req);
    const result = await this.authService.register(dto, metadata, req);

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

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modern Login (JWT + Refresh Cookies)' })
  async login(
    @Body() dto: LoginDto & { captchaToken?: string }, // ← AJOUTÉ captchaToken
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    // ✅ Validation captcha
    if (!dto.captchaToken) {
      throw new UnauthorizedException('Captcha requis');
    }

    const isValidCaptcha = await this.recaptchaService.validateToken(dto.captchaToken);
    if (!isValidCaptcha) {
      throw new UnauthorizedException('Validation captcha échouée');
    }

    const metadata = getSessionMetadata(req);
    const result = await this.authService.login(dto, metadata, req);

    if (result.requiresTwoFa) {
      return res.json(result);
    }

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

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login-face')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with face recognition' })
  async loginFace(
    @Body() dto: LoginFaceDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    const metadata = getSessionMetadata(req);
    const result = await this.authService.loginFace(dto, metadata, req);

    if (result.requiresTwoFa) {
      return res.json(result);
    }

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

  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google' })
  async googleAuth(@Body() googleUser: GoogleAuthDto, @Req() req: Request) {
    try {
      const { token, user } = await this.authService.loginWithGoogle(
        googleUser,
        req.ip,
        req.headers['user-agent'],
      );
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          authMethod: 'google',
          aiScore: user.aiScore,
          photoAnalysis: user.photoAnalysis,
          emailAnalysis: user.emailAnalysis,
          createdAt: user.createdAt,
          googleId: user.googleId,
        }
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('check-user')
  @Public()
  @HttpCode(HttpStatus.OK)
  async checkUser(@Body() checkUserDto: CheckUserDto) {
    return this.authService.checkUser(checkUserDto);
  }

  @Put('update-ai-score')
  @HttpCode(HttpStatus.OK)
  async updateAIScore(@Body() updateAIScoreDto: UpdateAIScoreDto) {
    return this.authService.updateAIScore(updateAIScoreDto);
  }

  @Post('forgot-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotDto: ForgotPasswordDto, @Req() req: Request) {
    const analysis = await this.authService.analyzeAbuseBehavior(forgotDto.email, {
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    if (analysis.riskScore > 0.8) {
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    return this.authService.forgotPassword(forgotDto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    try {
      return await this.authService.resetPassword(resetDto);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

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

  @UseGuards(JwtAccessGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<any> {
    await this.authService.logout(user.id);
    res.clearCookie('refreshToken');
    return res.json({
      success: true,
      message: 'Déconnexion réussie.',
    });
  }

  @Public()
  @Post('register-fingerprint/options')
  async registerFingerprintOptions(@Body('email') email: string) {
    return this.authService.generateFingerprintRegistrationOptions(email);
  }

  @Public()
  @Post('register-fingerprint/verify')
  async verifyFingerprint(@Body() body: any) {
    return this.authService.verifyFingerprintRegistration(body);
  }

  @Public()
  @Post('login-fingerprint/options')
  async generateFingerprintLoginOptions(@Body('email') email: string) {
    return this.authService.generateFingerprintLoginOptions(email);
  }

  @Public()
  @Post('login-fingerprint/verify')
  async verifyFingerprintLogin(@Body() body: any) {
    return this.authService.verifyFingerprintLogin(body);
  }

  @Public()
  @Get('csrf-token')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request, @Res() res: Response): void {
    const csrfToken = (res as any).locals?.csrfToken;
    res.json({ csrfToken });
  }

  /* ===== ROUTES DE GESTION DES SESSIONS ===== */

  @UseGuards(JwtAccessGuard)
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  async getSessions(@CurrentUser() user: User, @Req() req: Request) {
    const userId = user.id;
    const sessions = await this.sessionService.getUserSessions(userId);
    
    const refreshToken = req.cookies?.refreshToken;
    const currentSession = await this.sessionService.getCurrentSession(refreshToken);
    
    return sessions.map(session => ({
      id: session.id,
      fingerprint: {
        browser: session.fingerprint?.browser || 'Inconnu',
        os: session.fingerprint?.os || 'Inconnu',
        ip: session.fingerprint?.ip,
        isMobile: session.fingerprint?.isMobile || false,
      },
      riskLevel: session.riskLevel,
      riskAnalysis: session.riskAnalysis,
      lastActivity: session.lastActivity,
      isCurrent: currentSession?.id === session.id,
    }));
  }

  @UseGuards(JwtAccessGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const userId = user.id;
    const refreshToken = req.cookies?.refreshToken;
    const currentSession = await this.sessionService.getCurrentSession(refreshToken);
    
    if (currentSession?.id === sessionId) {
      throw new BadRequestException('Impossible de révoquer votre session courante');
    }
    
    await this.sessionService.revokeSession(sessionId, userId);
  }

  @UseGuards(JwtAccessGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all other sessions' })
  async revokeAllSessions(
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const userId = user.id;
    const refreshToken = req.cookies?.refreshToken;
    const currentSession = await this.sessionService.getCurrentSession(refreshToken);
    
    await this.sessionService.revokeAllUserSessions(userId, currentSession?.id);
  }

  /* ===== FIN ROUTES SESSIONS ===== */

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  async health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'DeepSkyn Auth API'
    };
  }
}