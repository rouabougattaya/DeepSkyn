import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoutineService } from './routine.service';

@Controller('routine')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

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
}

