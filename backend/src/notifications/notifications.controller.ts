import { Controller, Get, Post, Body, UseGuards, Sse, Query, UnauthorizedException } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { NotificationsService, NotificationPayload } from './notifications.service';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';

@Controller('notifications')
export class NotificationsController {
  constructor(
     private readonly notificationsService: NotificationsService,
     private readonly jwtService: JwtService
  ) {}

  @Get('settings')
  @UseGuards(JwtAccessGuard)
  async getSettings(@CurrentUser() user: any) {
    const userId = user?.id || user?.userId;
    const settings = await this.notificationsService.getSettings(userId);
    return { success: true, settings };
  }

  @Post('settings')
  @UseGuards(JwtAccessGuard)
  async saveSetting(
    @CurrentUser() user: any,
    @Body() body: { type: string; time: string; message: string; isActive: boolean }
  ) {
    const userId = user?.id || user?.userId;
    const setting = await this.notificationsService.saveSetting(userId, body);
    return { success: true, setting };
  }

  @Sse('stream')
  @Public()
  stream(@Query('token') token: string): Observable<any> {
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const decoded = this.jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET || 'deepskyn_secret_key' });
      const userId = decoded.sub || decoded.id || decoded.userId;
      return this.notificationsService.events$.pipe(
        filter((payload: NotificationPayload) => payload.userId === userId),
        map((payload: NotificationPayload) => ({ data: payload }))
      );
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
