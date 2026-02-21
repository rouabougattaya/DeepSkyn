import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Get,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { 
  LoginDto, 
  GoogleAuthDto, 
  CheckUserDto, 
  UpdateAIScoreDto 
} from './dto/auth.dto';
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const token = await this.authService.loginWithEmail(
        loginDto.email, 
        loginDto.password
      );
      return { 
        token, 
        user: { email: loginDto.email } 
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
  async googleAuth(@Body() googleUser: GoogleAuthDto) {
    try {
      const token = await this.authService.loginWithGoogle(googleUser);
      return { 
        token, 
        user: googleUser 
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
  async checkUser(@Body() checkUserDto: CheckUserDto) {
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
  async updateAIScore(@Body() updateAIScoreDto: UpdateAIScoreDto) {
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
