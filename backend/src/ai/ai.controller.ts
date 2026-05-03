import { Controller, Get, Post, Query, Body, Param, HttpException, HttpStatus, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import axios from 'axios';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AiAnalysisService } from './ai-analysis.service';
import { ImageValidationService } from './image-validation.service';
import { RiskPredictionService } from './risk-prediction.service';
import { SvrRoutineService } from './svr-routine.service';
import { ConditionWeights, UserSkinProfile } from './detection.interface';
import { SkinRiskInput, SkinRiskResponse } from './skin-risk.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly imageValidationService: ImageValidationService,
    private readonly riskPredictionService: RiskPredictionService,
    private readonly svrRoutineService: SvrRoutineService
  ) { }

  @Get('health/openrouter')
  @UseGuards(JwtAccessGuard)
  async checkOpenRouterHealth() {
    try {
      console.log('[AiController] Testing OpenRouter health...');
      const testProfile: UserSkinProfile = {
        skinType: 'Oily',
        age: 30,
        concerns: [],
        acneLevel: 50,
        blackheadsLevel: 50,
        poreSize: 50,
        rednessLevel: 50,
        hydrationLevel: 50,
        wrinklesDepth: 50,
        sensitivityLevel: 50,
      };

      // Don't call with images to avoid validation issues
      const result = await this.aiAnalysisService.analyzeSkinWithLLM(testProfile, 'test');

      return {
        success: true,
        message: 'OpenRouter API is working',
        data: {
          globalScore: result.globalScore,
          conditionCount: result.conditionScores?.length || 0
        }
      };
    } catch (error: any) {
      console.error('[AiController] OpenRouter health check failed:', error.message);
      return {
        success: false,
        message: 'OpenRouter API check failed',
        error: error.message
      };
    }
  }

  @Post('analyze')
  @UseGuards(JwtAccessGuard)
  async analyzeImage(
    @Body() body: {
      imageId?: string;
      weights?: Partial<ConditionWeights>;
      testType?: 'severe' | 'mild' | 'mixed';
      age?: number; // Add age from analysis form
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
        userId,
        body.age // Pass age to service
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze/test-no-images')
  @UseGuards(JwtAccessGuard)
  async analyzeTestNoImages(
    @Body() profile: Partial<UserSkinProfile>,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      console.log('[AiController] Test analyze (no images) called');

      // Force no images
      const testProfile: UserSkinProfile = {
        skinType: profile?.skinType || 'Oily',
        age: profile?.age || 30,
        concerns: profile?.concerns || [],
        acneLevel: profile?.acneLevel ?? 50,
        blackheadsLevel: profile?.blackheadsLevel ?? 50,
        poreSize: profile?.poreSize ?? 50,
        rednessLevel: profile?.rednessLevel ?? 50,
        hydrationLevel: profile?.hydrationLevel ?? 50,
        wrinklesDepth: profile?.wrinklesDepth ?? 50,
        sensitivityLevel: profile?.sensitivityLevel ?? 50,
      };

      console.log('[AiController] Calling analyzeSkinWithLLM without images...');
      const result = await this.aiAnalysisService.analyzeSkinWithLLM(testProfile, userId);
      console.log('[AiController] Test analysis completed successfully');

      return {
        success: true,
        message: 'Test analysis without images succeeded',
        data: result,
      };
    } catch (error: any) {
      console.error('[AiController] Test analyze error:', error.message);
      console.error('[AiController] Error stack:', error.stack);
      throw new HttpException(
        {
          success: false,
          error: error.message,
          errorType: error.constructor.name,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAccessGuard)
  @Post('analyze/unified')
  async analyzeUnified(
    @Body() profile: UserSkinProfile,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      console.log(`[AiController] analyzeUnified called | userId: ${userId}`);

      await this.validateProfileImages(profile);

      console.log(`[AiController] Image validation passed, calling analyzeSkinWithLLM...`);
      const result = await this.aiAnalysisService.analyzeSkinWithLLM(profile, userId);
      console.log(`[AiController] Analysis completed successfully`);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      if (error.message && error.message.includes('NOT_A_FACE')) {
        throw new HttpException(
          { success: false, message: "Veuillez fournir une photo d'un visage humain valide." },
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        { success: false, error: error.message, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async validateProfileImages(profile: UserSkinProfile): Promise<void> {
    const images = profile.imagesBase64 || (profile.imageBase64 ? [profile.imageBase64] : []);
    
    for (const [idx, img] of images.entries()) {
      console.log(`[AiController] Validating image ${idx + 1}...`);
      const validation = await this.imageValidationService.validateImageBeforeAnalysis(img);
      if (!validation.isValid) {
        throw new Error('NOT_A_FACE');
      }
    }
  }

  @Get('analyze/random')
  @UseGuards(JwtAccessGuard)
  async analyzeRandom(
    @Query('seed') seed?: string,
    @Query('weights') weights?: string,
    @Query('age') age?: string,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new HttpException('User ID is required for skin analysis', HttpStatus.UNAUTHORIZED);
      }

      let parsedWeights;
      try {
        parsedWeights = weights ? JSON.parse(weights) : undefined;
      } catch (e) {
        throw new HttpException('Invalid weights JSON format', HttpStatus.BAD_REQUEST);
      }
      
      const seedNum = seed ? parseInt(seed, 10) : undefined;
      const analysisAge = age ? parseInt(age, 10) : undefined;

      const result = await this.aiAnalysisService.analyzeWithRandomDetections(
        seedNum,
        parsedWeights,
        userId,
        analysisAge
      );

      return {
        success: true,
        data: result,
        seed: seedNum,
      };
    } catch (error: any) {
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
    @Query('age') age?: string,
    @CurrentUser() user?: any
  ) {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new HttpException('User ID is required for skin analysis', HttpStatus.UNAUTHORIZED);
      }

      let parsedWeights;
      try {
        parsedWeights = weights ? JSON.parse(weights) : undefined;
      } catch (e) {
        throw new HttpException('Invalid weights JSON format', HttpStatus.BAD_REQUEST);
      }
      
      const analysisAge = age ? parseInt(age, 10) : undefined;

      const result = await this.aiAnalysisService.analyzeImage(
        undefined,
        parsedWeights,
        testType,
        userId,
        analysisAge
      );

      return {
        success: true,
        data: result,
        testType,
      };
    } catch (error: any) {
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
    } catch (error: any) {
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

  @Post('skin-risk')
  @UseGuards(JwtAccessGuard)
  async predictSkinRisk(
    @Body() riskInput: SkinRiskInput,
    @CurrentUser() user?: any
  ): Promise<{ success: boolean; data: SkinRiskResponse }> {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new HttpException('User ID is required for risk prediction', HttpStatus.UNAUTHORIZED);
      }

      const riskAnalysis = await this.riskPredictionService.predictSkinRisks(riskInput);

      return {
        success: true,
        data: riskAnalysis,
      };
    } catch (error: any) {
      console.error('[AiController] Error in predictSkinRisk:', error.message);
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('svr-routine')
  @Public() // Allow for now to test easily, as requested
  async generateSvrRoutine(
    @Body() profile: UserSkinProfile
  ) {
    try {
      console.log(`[AiController] Generating SVR routine for profile: ${profile.skinType}, age: ${profile.age}`);

      const result = await this.svrRoutineService.generateRoutine(profile);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('[AiController] Error in generateSvrRoutine:', error.message);
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('svr-image-proxy')
  @Public()
  async proxyImageSvr(
    @Query('url') imageUrl: string,
    @Res() res: Response
  ) {
    try {
      if (!imageUrl) {
        throw new Error('Missing image URL');
      }

      // Only allow SVR-related image URLs (security)
      const allowedDomains = ['cdn.shopify.com', 'fr.svr.com', 'tn.svr.com', 'www.svr.com'];
      const urlObj = new URL(imageUrl);

      if (!allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain))) {
        throw new Error('Image URL not allowed');
      }

      // Fetch the image from the source
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'DeepSkyn/1.0 (+https://deepskyn.app)',
        }
      });

      // Set appropriate headers and serve the image
      const contentType = (response.headers['content-type'] as string) || 'image/jpeg';
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(response.data);

    } catch (error: any) {
      console.error('[AiController] SVR image proxy error:', error.message);

      // Return a 404 with error info
      res.status(404).json({
        error: 'Failed to fetch SVR image',
        message: error.message
      });
    }
  }

  @Get('svr-routine-debug')
  @Public()
  async debugSvrRoutine() {
    try {
      const products = this.svrRoutineService.getDebugProducts();

      return {
        success: true,
        data: {
          totalProducts: products.length,
          productsWithImages: products.filter((p: any) => p.imageUrl).length,
          sampleProducts: products.slice(0, 3).map((p: any) => ({
            name: p.name,
            imageUrl: p.imageUrl ? p.imageUrl.substring(0, 100) + '...' : 'MISSING',
          }))
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}