import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationSetting } from './notification-setting.entity';
import { Subject } from 'rxjs';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  public events$ = new Subject<NotificationPayload>();

  constructor(
    @InjectRepository(NotificationSetting)
    private readonly notificationSettingRepo: Repository<NotificationSetting>,
  ) {}

  async getSettings(userId: string) {
    return this.notificationSettingRepo.find({ where: { userId } });
  }

  async saveSetting(userId: string, data: { type: string; time: string; message: string; isActive: boolean }) {
    let setting = await this.notificationSettingRepo.findOne({ where: { userId, type: data.type } });
    if (!setting) {
      setting = this.notificationSettingRepo.create({ userId, type: data.type });
    }
    setting.time = data.time;
    setting.message = data.message;
    if (data.isActive !== undefined) {
       setting.isActive = data.isActive;
    }
    return this.notificationSettingRepo.save(setting);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    this.logger.debug(`Checking notifications for time: ${currentTimeStr}`);

    const activeSettings = await this.notificationSettingRepo.find({
      where: { isActive: true, time: currentTimeStr },
    });

    if (activeSettings.length > 0) {
      for (const setting of activeSettings) {
        this.emitNotification({
          userId: setting.userId,
          title: `Skincare Reminder (${setting.type})`,
          message: setting.message || "Time for your skincare routine!",
          type: setting.type
        });
      }
    }
  }

  emitNotification(payload: NotificationPayload) {
    this.events$.next(payload);
  }
}
