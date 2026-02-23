import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Put,
  Req,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import * as AuthDto from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: AuthDto.LoginDto, @Req() req: Request) {
    try {
      const { token, user } = await this.authService.loginWithEmail(
        loginDto.email,
        loginDto.password,
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
          authMethod: 'email',
          aiScore: user.aiScore,
          photoAnalysis: user.photoAnalysis,
          emailAnalysis: user.emailAnalysis,
          createdAt: user.createdAt,
        }
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google' })
  @ApiResponse({ status: 200, description: 'Google auth successful' })
  @ApiResponse({ status: 401, description: 'Google auth failed' })
  async googleAuth(@Body() googleUser: AuthDto.GoogleAuthDto, @Req() req: Request) {
    try {
      const { token, user } = await this.authService.loginWithGoogle(
        googleUser,
        req.ip,
        req.headers['user-agent'],
      );
      console.log(`📡 Returning user to frontend: ID=${user.id}, Email=${user.email}`);
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
      console.error('Google auth error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('check-user')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user exists' })
  @ApiResponse({ status: 200, description: 'User check completed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async checkUser(@Body() checkUserDto: AuthDto.CheckUserDto) {
    try {
      const result = await this.authService.checkUser(checkUserDto);
      return result;
    } catch (error) {
      console.error('Check user error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Put('update-ai-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user AI score and analysis' })
  @ApiResponse({ status: 200, description: 'AI score updated successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateAIScore(@Body() updateAIScoreDto: AuthDto.UpdateAIScoreDto) {
    try {
      const user = await this.authService.updateAIScore(updateAIScoreDto);
      return user;
    } catch (error) {
      console.error('Update AI score error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'DeepSkyn Auth API'
    };
  }
}
