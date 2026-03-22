import { Controller, Get, Post, Query, Body, Param, HttpException, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AiAnalysisService } from './ai-analysis.service';
import { ConditionWeights, UserSkinProfile } from './detection.interface';
import { Req } from '@nestjs/common';

@Controller('ai')
export class AiController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) { }

  @Post('analyze')
  @UseGuards(JwtAccessGuard)
  async analyzeImage(
    @Body() body: {
      imageId?: string;
      weights?: Partial<ConditionWeights>;
      testType?: 'severe' | 'mild' | 'mixed';
    },
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new HttpException('User ID is required for skin analysis', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.aiAnalysisService.analyzeImage(
        body.imageId,
        body.weights,
        body.testType,
        userId
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post('analyze/unified')
  async analyzeUnified(
    @Body() profile: UserSkinProfile,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      console.log(`[AiController] analyzeUnified called | userId: ${userId}`);

      const result = await this.aiAnalysisService.analyzeSkinWithLLM(profile, userId);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[AiController] Error in analyzeUnified:', error.message, error.stack);
      throw new HttpException(
        { success: false, error: error.message, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analyze/random')
  @UseGuards(JwtAccessGuard)
  async analyzeRandom(
    @Query('seed') seed?: string,
    @Query('weights') weights?: string,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new HttpException('User ID is required for skin analysis', HttpStatus.UNAUTHORIZED);
      }

      const parsedWeights = weights ? JSON.parse(weights) : undefined;
      const seedNum = seed ? parseInt(seed, 10) : undefined;

      const result = await this.aiAnalysisService.analyzeWithRandomDetections(
        seedNum,
        parsedWeights,
        userId
      );

      return {
        success: true,
        data: result,
        seed: seedNum,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analyze/test/:testType')
  @UseGuards(JwtAccessGuard)
  async analyzeTestCase(
    @Param('testType') testType: 'severe' | 'mild' | 'mixed',
    @Query('weights') weights?: string,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new HttpException('User ID is required for skin analysis', HttpStatus.UNAUTHORIZED);
      }

      const parsedWeights = weights ? JSON.parse(weights) : undefined;

      const result = await this.aiAnalysisService.analyzeImage(
        undefined,
        parsedWeights,
        testType,
        userId
      );

      return {
        success: true,
        data: result,
        testType,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('debug')
  async debugAnalysis(
    @Query('imageId') imageId?: string,
    @Query('weights') weights?: string
  ) {
    try {
      const parsedWeights = weights ? JSON.parse(weights) : undefined;

      const debugData = await this.aiAnalysisService.debugAnalysis(
        imageId,
        parsedWeights
      );

      return {
        success: true,
        data: debugData,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('weights/default')
  getDefaultWeights() {
    return {
      success: true,
      data: this.aiAnalysisService.getDefaultWeights(),
    };
  }

  @Post('weights/validate')
  validateWeights(@Body() weights: Partial<ConditionWeights>) {
    const isValid = this.aiAnalysisService.validateWeights(weights);

    return {
      success: true,
      data: {
        isValid,
        weights,
      },
    };
  }

  @Get('test-cases')
  getTestCases() {
    return {
      success: true,
      data: {
        available: ['severe', 'mild', 'mixed'],
        descriptions: {
          severe: 'Cas sévère avec beaucoup de détections',
          mild: 'Cas léger avec quelques détections',
          mixed: 'Cas mixte équilibré',
        },
      },
    };
  }
}