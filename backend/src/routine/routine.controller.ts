import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoutineService } from './routine.service';
import { RoutinePersonalizationService } from './routine-personalization.service';
import { UpdateRoutineDto } from './routine-personalization.dto';

@Controller('routine')
export class RoutineController {
  constructor(
    private readonly routineService: RoutineService,
    private readonly personalizationService: RoutinePersonalizationService,
  ) { }

  @Get(':userId')
  @UseGuards(JwtAccessGuard)
  async getRoutine(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    // Sécurité: le user ne peut récupérer que sa propre routine
    const tokenUserId = user?.id || user?.userId;
    if (tokenUserId && tokenUserId !== userId) {
      throw new ForbiddenException('You cannot access another user routine.');
    }

    const result = await this.routineService.getOrGenerateRoutine(userId);
    return result;
  }

  /**
   * POST /routine/update
   * Personnalise la routine selon l'historique, les tendances (dashboard)
   * et applique un ajustement automatique des produits.
   */
  @Post('update')
  @UseGuards(JwtAccessGuard)
  async updateRoutine(
    @CurrentUser() user: any,
    @Body() dto: UpdateRoutineDto,
  ) {
    const userId = user?.id || user?.userId;
    return this.personalizationService.personalizeRoutine(userId, dto);
  }
}
