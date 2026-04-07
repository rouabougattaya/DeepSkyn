import { Controller, Post, Get, Body, Param, UseGuards, Req, Logger, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { DigitalTwinService } from './digital-twin.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { CreateDigitalTwinDto, DigitalTwinResponseDto, DigitalTwinTimelineDto } from './digital-twin.dto';

@Controller('digital-twin')
export class DigitalTwinController {
  private readonly logger = new Logger('DigitalTwinController');

  constructor(private digitalTwinService: DigitalTwinService) {}

  /**
   * POST /api/digital-twin/create
   * Create a new digital twin simulation for the user
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAccessGuard)
  async createDigitalTwin(
    @Req() req: any,
    @Body() dto: CreateDigitalTwinDto,
  ): Promise<DigitalTwinResponseDto> {
    try {
      const userId = req.user.id;
      this.logger.log(`📝 Creating digital twin for user: ${userId}, analysis: ${dto.baseAnalysisId}`);
      
      if (!dto.baseAnalysisId) {
        throw new BadRequestException('baseAnalysisId is required');
      }

      if (!userId) {
        throw new BadRequestException('User ID is missing from auth token');
      }

      const result = await this.digitalTwinService.createDigitalTwin(userId, dto);
      this.logger.log(`✅ Digital twin created successfully: ${result.id}`);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to create digital twin: ${err.message}`, err.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to create digital twin: ${err.message || 'Unknown error'}`
      );
    }
  }

  /**
   * GET /api/digital-twin/latest/data
   * Get the latest digital twin for the user
   * IMPORTANT: Must come BEFORE generic :id route
   */
  @Get('latest/data')
  @UseGuards(JwtAccessGuard)
  async getLatestDigitalTwin(
    @Req() req: any,
  ): Promise<DigitalTwinResponseDto | { message: string }> {
    try {
      const userId = req.user.id;
      this.logger.log(`📖 Fetching latest digital twin for user: ${userId}`);
      
      if (!userId) {
        throw new BadRequestException('User ID is missing from auth token');
      }

      const twin = await this.digitalTwinService.getLatestDigitalTwin(userId);
      
      if (!twin) {
        this.logger.log(`ℹ️ No digital twin found for user: ${userId}`);
        return { message: 'No digital twin simulation found' };
      }

      this.logger.log(`✅ Latest digital twin retrieved: ${twin.id}`);
      return twin;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to get latest digital twin: ${err.message}`, err.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to retrieve latest digital twin: ${err.message || 'Unknown error'}`
      );
    }
  }

  /**
   * GET /api/digital-twin/:id/timeline
   * Get the timeline view with current state and predictions
   */
  @Get(':id/timeline')
  @UseGuards(JwtAccessGuard)
  async getTimeline(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<DigitalTwinTimelineDto> {
    try {
      const userId = req.user.id;
      this.logger.log(`📊 Fetching timeline for digital twin: ${id}, user: ${userId}`);
      
      if (!id) {
        throw new BadRequestException('Digital twin ID is required');
      }

      if (!userId) {
        throw new BadRequestException('User ID is missing from auth token');
      }

      const result = await this.digitalTwinService.getDigitalTwinTimeline(id, userId);
      this.logger.log(`✅ Timeline retrieved for digital twin: ${id}`);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to get timeline: ${err.message}`, err.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to retrieve timeline: ${err.message || 'Unknown error'}`
      );
    }
  }

  /**
   * GET /api/digital-twin/:id
   * Get a specific digital twin simulation
   */
  @Get(':id')
  @UseGuards(JwtAccessGuard)
  async getDigitalTwin(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<DigitalTwinResponseDto> {
    try {
      const userId = req.user.id;
      this.logger.log(`🔍 Fetching digital twin: ${id}, user: ${userId}`);
      
      if (!id) {
        throw new BadRequestException('Digital twin ID is required');
      }

      if (!userId) {
        throw new BadRequestException('User ID is missing from auth token');
      }

      const result = await this.digitalTwinService.getDigitalTwin(id, userId);
      this.logger.log(`✅ Digital twin retrieved: ${id}`);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to get digital twin: ${err.message}`, err.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to retrieve digital twin: ${err.message || 'Unknown error'}`
      );
    }
  }
}
