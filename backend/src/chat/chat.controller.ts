import { Controller, Post, UseGuards, Body } from '@nestjs/common';
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

  @Post('message')
  async handleMessage(@Body() body: { sessionId: string; message: string }) {
    const { sessionId, message } = body;
    if (!sessionId || !message) {
      return { success: false, error: 'Missing sessionId or message' };
    }
    const response = await this.chatService.handleChatMessage(sessionId, message);
    return {
      success: true,
      response,
    };
  }
}
