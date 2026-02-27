import { Controller, Get, Post, Query, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiAnalysisService } from './ai-analysis.service';
import { ConditionWeights } from './detection.interface';

@Public()
@Controller('ai')
export class AiController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) { }

  @Post('analyze')
  async analyzeImage(
    @Body() body: {
      imageId?: string;
      weights?: Partial<ConditionWeights>;
      testType?: 'severe' | 'mild' | 'mixed';
    },
    @CurrentUser() user?: any
  ) {
    try {
      const result = await this.aiAnalysisService.analyzeImage(
        body.imageId,
        body.weights,
        body.testType,
        user?.userId || user?.id
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

  @Get('analyze/random')
  async analyzeRandom(
    @Query('seed') seed?: string,
    @Query('weights') weights?: string,
    @CurrentUser() user?: any
  ) {
    try {
      const parsedWeights = weights ? JSON.parse(weights) : undefined;
      const seedNum = seed ? parseInt(seed, 10) : undefined;

      const result = await this.aiAnalysisService.analyzeWithRandomDetections(
        seedNum,
        parsedWeights,
        user?.userId || user?.id
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
  async analyzeTestCase(
    @Param('testType') testType: 'severe' | 'mild' | 'mixed',
    @Query('weights') weights?: string,
    @CurrentUser() user?: any
  ) {
    try {
      const parsedWeights = weights ? JSON.parse(weights) : undefined;

      const result = await this.aiAnalysisService.analyzeImage(
        undefined,
        parsedWeights,
        testType,
        user?.userId || user?.id
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
