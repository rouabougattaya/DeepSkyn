import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Controller('chat')
@UseGuards(JwtAccessGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly subscriptionService: SubscriptionService
  ) { }

  @Post('start')
  async startSession(@CurrentUser() user: any, @Body() body?: { forceNew?: boolean }) {
    const userId = user?.id || user?.userId;
    const session = await this.chatService.startSession(userId, body?.forceNew);
    const usage = await this.subscriptionService.getUsageSummary(userId);
    return {
      success: true,
      sessionId: session.id,
      usage,
    };
  }

  @Post('message')
  async handleMessage(
    @CurrentUser() user: any,
    @Body() body: { sessionId?: string; userId?: string; message: string },
  ) {
    const { sessionId, userId, message } = body;
    const authenticatedUserId = user?.id || user?.userId;

    if (!message || (!sessionId && !userId && !authenticatedUserId)) {
      return { success: false, error: 'Missing required fields: message and (sessionId or userId)' };
    }

    const response = await this.chatService.handleChatMessage({
      sessionId,
      userId: authenticatedUserId || userId,
      message,
    });

    const usage = await this.subscriptionService.getUsageSummary(authenticatedUserId || userId);

    return {
      success: true,
      response: response.message,
      usage,
      ...response,
    };
  }

  @Post('personalized')
  async getPersonalizedResponse(
    @CurrentUser() user: any,
    @Body() body: { message: string },
  ) {
    const userId = user?.id || user?.userId;
    const response = await this.chatService.getPersonalizedResponse(body.message, userId);
    return {
      success: true,
      response,
    };
  }

  @Post('history')
  async getUserHistory(@CurrentUser() user: any) {
    const userId = user?.id || user?.userId;
    const sessions = await this.chatService.getUserSessions(userId);
    const usage = await this.subscriptionService.getUsageSummary(userId);
    return {
      success: true,
      sessions,
      usage,
    };
  }

  @Post('session-messages')
  async getSessionMessages(
    @CurrentUser() _user: any,
    @Body() body: { sessionId: string },
  ) {
    const messages = await this.chatService.getSessionHistory(body.sessionId);
    return {
      success: true,
      messages,
    };
  }

  @Post('delete-session')
  async deleteSession(
    @CurrentUser() user: any,
    @Body() body: { sessionId: string },
  ) {
    const userId = user?.id || user?.userId;
    await this.chatService.deleteSession(body.sessionId, userId);
    return {
      success: true,
    };
  }

  @Post('rename-session')
  async renameSession(
    @CurrentUser() user: any,
    @Body() body: { sessionId: string; title: string },
  ) {
    const userId = user?.id || user?.userId;
    await this.chatService.renameSession(body.sessionId, userId, body.title);
    return {
      success: true,
    };
  }
}

