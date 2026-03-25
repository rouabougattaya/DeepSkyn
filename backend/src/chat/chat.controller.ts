import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAccessGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start')
  async startSession(@CurrentUser() user: any) {
    const userId = user?.id || user?.userId;
    const session = await this.chatService.startSession(userId);
    return {
      success: true,
      sessionId: session.id,
    };
  }
}
