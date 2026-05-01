import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { ExecutionContext } from '@nestjs/common';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  const mockUser = { id: 'user-123' };

  beforeEach(async () => {
    const mockChatService = {
      startSession: jest.fn(),
      handleChatMessage: jest.fn(),
      getPersonalizedResponse: jest.fn(),
      getUserSessions: jest.fn(),
      getSessionHistory: jest.fn(),
      deleteSession: jest.fn(),
      renameSession: jest.fn(),
    };

    const mockSubscriptionService = {
      getUsageSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({ canActivate: (context: ExecutionContext) => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
    subscriptionService = module.get(SubscriptionService);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('startSession', () => {
    it('devrait démarrer une session et retourner l usage', async () => {
      chatService.startSession.mockResolvedValue({ id: 'sess-1' } as any);
      subscriptionService.getUsageSummary.mockResolvedValue({ used: 1, limit: 10 } as any);

      const result = await controller.startSession(mockUser, { forceNew: true });

      expect(result).toEqual({
        success: true,
        sessionId: 'sess-1',
        usage: { used: 1, limit: 10 },
      });
      expect(chatService.startSession).toHaveBeenCalledWith('user-123', true);
    });
  });

  describe('handleMessage', () => {
    it('devrait traiter un message et retourner la réponse', async () => {
      chatService.handleChatMessage.mockResolvedValue({ message: 'Hello back' } as any);
      subscriptionService.getUsageSummary.mockResolvedValue({ used: 2, limit: 10 } as any);

      const result = await controller.handleMessage(mockUser, { message: 'Hi', sessionId: 'sess-1' });

      expect(result).toEqual({
        success: true,
        response: 'Hello back',
        message: 'Hello back',
        usage: { used: 2, limit: 10 },
      });
    });

    it('devrait retourner une erreur si le message est manquant', async () => {
        const result = await controller.handleMessage(mockUser, { message: '' } as any);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
  });

  describe('deleteSession', () => {
    it('devrait appeler le service de suppression', async () => {
      await controller.deleteSession(mockUser, { sessionId: 'sess-1' });
      expect(chatService.deleteSession).toHaveBeenCalledWith('sess-1', 'user-123');
    });
  });
});
