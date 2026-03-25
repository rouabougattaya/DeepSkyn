import { Controller, Get, Param, UseGuards, UnauthorizedException } from '@nestjs/common';
import { SkinAgeInsightsService } from './skin-age-insights.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('skin-age')
export class SkinAgeController {
  constructor(private readonly skinAgeInsightsService: SkinAgeInsightsService) { }

  @UseGuards(JwtAccessGuard)
  @Get('insights/:userId')
  async getSkinAgeInsights(
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string } | undefined,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('User ID is required');
    }
    if (user.id !== userId) {
      throw new UnauthorizedException('You cannot access skin-age insights for another user');
    }

    return this.skinAgeInsightsService.getInsights(userId);
  }
}
