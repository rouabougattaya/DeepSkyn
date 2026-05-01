import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { FitzpatrickQuestionnaire } from '../fitzpatrickQuestionnaire/fitzpatrick-questionnaire.entity';
import { UserProfile } from '../userProfile/user-profile.entity';
import { OpenRouterService } from '../ai/openrouter.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('ChatService', () => {
  let service: ChatService;

  // Mocks des services externes
  const mockOpenRouterService = {
    chat: jest.fn(),
  };

  const mockSubscriptionService = {
    checkChatLimit: jest.fn(),
    incrementMessages: jest.fn(),
    getSubscription: jest.fn(),
  };

  // Mocks des repositories
  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  let sessionRepo: any;
  let messageRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatSession), useFactory: mockRepo },
        { provide: getRepositoryToken(ChatMessage), useFactory: mockRepo },
        { provide: getRepositoryToken(SkinAnalysis), useFactory: mockRepo },
        { provide: getRepositoryToken(SkinMetric), useFactory: mockRepo },
        { provide: getRepositoryToken(FitzpatrickQuestionnaire), useFactory: mockRepo },
        { provide: getRepositoryToken(UserProfile), useFactory: mockRepo },
        { provide: OpenRouterService, useValue: mockOpenRouterService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    sessionRepo = module.get(getRepositoryToken(ChatSession));
    messageRepo = module.get(getRepositoryToken(ChatMessage));

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    it('devrait retourner une session active si elle existe (forceNew = false)', async () => {
      const activeSession = { id: 'session-123', userId: 'user-1', isActive: true };
      sessionRepo.findOne.mockResolvedValue(activeSession);

      const result = await service.startSession('user-1', false);

      expect(sessionRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1', isActive: true }
      }));
      expect(result).toEqual(activeSession);
      expect(sessionRepo.create).not.toHaveBeenCalled();
    });

    it('devrait désactiver les anciennes sessions et en créer une nouvelle si forceNew = true', async () => {
      const newSession = { id: 'session-456', userId: 'user-1', isActive: true };
      sessionRepo.create.mockReturnValue(newSession);
      sessionRepo.save.mockResolvedValue(newSession);

      const result = await service.startSession('user-1', true);

      expect(sessionRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isActive: true },
        { isActive: false }
      );
      expect(sessionRepo.create).toHaveBeenCalledWith({ userId: 'user-1', isActive: true });
      expect(result).toEqual(newSession);
    });
  });

  describe('handleChatMessage', () => {
    it('devrait rejeter le message si la limite de discussion est atteinte', async () => {
      mockSubscriptionService.checkChatLimit.mockResolvedValue({ allowed: false, remaining: 0, limit: 10 });
      sessionRepo.findOne.mockResolvedValue({ userId: 'user-1' });

      await expect(service.handleChatMessage({ sessionId: 'session-1', message: 'Hello' }))
        .rejects.toThrow(new HttpException('LIMIT_REACHED', HttpStatus.FORBIDDEN));
        
      expect(mockSubscriptionService.incrementMessages).not.toHaveBeenCalled();
    });

    it('devrait traiter le message et appeler OpenRouter si autorisé', async () => {
      mockSubscriptionService.checkChatLimit.mockResolvedValue({ allowed: true, remaining: 5, limit: 10 });
      mockSubscriptionService.getSubscription.mockResolvedValue({ plan: 'PREMIUM' });
      mockOpenRouterService.chat.mockResolvedValue('Bonjour, comment puis-je vous aider ?');
      sessionRepo.findOne.mockResolvedValue({ userId: 'user-1', title: 'Nouvelle discussion' });
      messageRepo.find.mockResolvedValue([]); // History
      
      const result = await service.handleChatMessage({ sessionId: 'session-1', message: 'J ai des boutons' });

      expect(mockSubscriptionService.incrementMessages).toHaveBeenCalledWith('user-1');
      expect(mockOpenRouterService.chat).toHaveBeenCalled();
      expect(result.message).toEqual('Bonjour, comment puis-je vous aider ?');
      expect(result.chatLimit?.plan).toEqual('PREMIUM');
    });
  });

  describe('deleteSession', () => {
    it('devrait supprimer les messages puis la session', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 'sess-1' });

      await service.deleteSession('sess-1', 'user-1');

      expect(messageRepo.delete).toHaveBeenCalledWith({ sessionId: 'sess-1' });
      expect(sessionRepo.delete).toHaveBeenCalledWith('sess-1');
    });
  });
});
