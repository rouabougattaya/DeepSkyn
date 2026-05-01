import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './subscription.entity';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockRepository: jest.Mocked<Repository<Subscription>>;

  // Helper to create mock subscription with all required properties
  const createMockSubscription = (overrides: any = {}): Subscription => ({
    id: 'sub-default',
    userId: 'user-default',
    planId: null,
    plan: 'FREE' as const,
    status: 'ACTIVE' as const,
    imagesUsed: 0,
    messagesUsed: 0,
    startDate: null,
    endDate: null,
    lastMessageAt: null,
    lastImageAt: null,
    ...overrides,
  } as Subscription);

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscription', () => {
    it('should return existing subscription for user', async () => {
      const userId = 'user-existing-123';
      const mockSubscription = createMockSubscription({
        id: 'sub-existing-123',
        userId,
        plan: 'PRO',
        imagesUsed: 25,
        messagesUsed: 150,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-02-01'),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription(userId);

      expect(result).toEqual(mockSubscription);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should create FREE subscription if user does not have one', async () => {
      const userId = 'user-new-sub';

      const newSubscription = createMockSubscription({
        id: 'sub-new',
        userId,
      });

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newSubscription);
      mockRepository.save.mockResolvedValue(newSubscription);

      const result = await service.getSubscription(userId);

      expect(result.plan).toBe('FREE');
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        imagesUsed: 0,
        messagesUsed: 0,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fix subscription with empty plan to FREE', async () => {
      const userId = 'user-empty-plan';

      const brokenSubscription = createMockSubscription({
        id: 'sub-broken',
        userId,
        plan: null as any,
        imagesUsed: 10,
        messagesUsed: 50,
      });

      const fixedSubscription = createMockSubscription({
        id: 'sub-broken',
        userId,
        plan: 'FREE',
        imagesUsed: 10,
        messagesUsed: 50,
      });

      mockRepository.findOne.mockResolvedValue(brokenSubscription);
      mockRepository.save.mockResolvedValue(fixedSubscription);

      const result = await service.getSubscription(userId);

      expect(result.plan).toBe('FREE');
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('checkChatLimit', () => {
    it('should allow chat for FREE user with messages below limit', async () => {
      const userId = 'user-free-chat';
      const mockSubscription = createMockSubscription({
        id: 'sub-free-chat',
        userId,
        plan: 'FREE',
        messagesUsed: 10,
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkChatLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10); // 20 - 10
      expect(result.limit).toBe(20);
    });

    it('should reject chat for FREE user at limit', async () => {
      const userId = 'user-free-limit';
      const mockSubscription = createMockSubscription({
        id: 'sub-free-limit',
        userId,
        plan: 'FREE',
        messagesUsed: 20,
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkChatLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(20);
    });

    it('should allow PRO user with high message limit', async () => {
      const userId = 'user-pro-chat';
      const mockSubscription = createMockSubscription({
        id: 'sub-pro-chat',
        userId,
        plan: 'PRO',
        messagesUsed: 100,
        startDate: new Date(),
        endDate: new Date(),
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkChatLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100); // 200 - 100
      expect(result.limit).toBe(200);
    });

    it('should allow PREMIUM user with unlimited messages', async () => {
      const userId = 'user-premium-chat';
      const mockSubscription = createMockSubscription({
        id: 'sub-premium-chat',
        userId,
        plan: 'PREMIUM',
        messagesUsed: 900000,
        startDate: new Date(),
        endDate: new Date(),
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkChatLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.limit).toBe(999999);
    });

    it('should reset messages on new day', async () => {
      const userId = 'user-reset-chat';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockSubscription = createMockSubscription({
        id: 'sub-reset-chat',
        userId,
        plan: 'FREE',
        messagesUsed: 15,
        lastMessageAt: yesterday,
      });

      const resetSubscription = createMockSubscription({
        id: 'sub-reset-chat',
        userId,
        plan: 'FREE',
        messagesUsed: 0,
        lastMessageAt: yesterday,
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);
      mockRepository.save.mockResolvedValue(resetSubscription);

      const result = await service.checkChatLimit(userId);

      expect(result.remaining).toBe(20); // Full limit after reset
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('checkAnalysisLimit', () => {
    it('should allow analysis for FREE user below limit', async () => {
      const userId = 'user-free-analysis';
      const mockSubscription = createMockSubscription({
        id: 'sub-free-analysis',
        userId,
        plan: 'FREE',
        imagesUsed: 3,
        lastImageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkAnalysisLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 5 - 3
      expect(result.limit).toBe(5);
    });

    it('should reject analysis for FREE user at limit', async () => {
      const userId = 'user-free-analysis-limit';
      const mockSubscription = createMockSubscription({
        id: 'sub-free-analysis-limit',
        userId,
        plan: 'FREE',
        imagesUsed: 5,
        lastImageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkAnalysisLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(5);
    });

    it('should allow PRO user with higher image limit', async () => {
      const userId = 'user-pro-analysis';
      const mockSubscription = createMockSubscription({
        id: 'sub-pro-analysis',
        userId,
        plan: 'PRO',
        imagesUsed: 30,
        startDate: new Date(),
        endDate: new Date(),
        lastImageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkAnalysisLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20); // 50 - 30
      expect(result.limit).toBe(50);
    });

    it('should allow PREMIUM user with unlimited analysis', async () => {
      const userId = 'user-premium-analysis';
      const mockSubscription = createMockSubscription({
        id: 'sub-premium-analysis',
        userId,
        plan: 'PREMIUM',
        imagesUsed: 50000,
        startDate: new Date(),
        endDate: new Date(),
        lastImageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkAnalysisLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.limit).toBe(999999);
    });

    it('should reset images on new month', async () => {
      const userId = 'user-reset-analysis';

      // Last image was in previous month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const mockSubscription = createMockSubscription({
        id: 'sub-reset-analysis',
        userId,
        plan: 'FREE',
        imagesUsed: 4,
        lastImageAt: lastMonth,
      });

      const resetSubscription = createMockSubscription({
        id: 'sub-reset-analysis',
        userId,
        plan: 'FREE',
        imagesUsed: 0,
        lastImageAt: lastMonth,
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);
      mockRepository.save.mockResolvedValue(resetSubscription);

      const result = await service.checkAnalysisLimit(userId);

      expect(result.remaining).toBe(5); // Full limit after reset
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should not reset if still in same month', async () => {
      const userId = 'user-no-reset-analysis';
      const today = new Date();

      const mockSubscription = createMockSubscription({
        id: 'sub-no-reset-analysis',
        userId,
        plan: 'FREE',
        imagesUsed: 2,
        lastImageAt: today,
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkAnalysisLimit(userId);

      expect(result.remaining).toBe(3); // 5 - 2
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('incrementMessages', () => {
    it('should increment messages and update timestamp', async () => {
      const userId = 'user-increment-msg';
      const mockSubscription = createMockSubscription({
        id: 'sub-increment-msg',
        userId,
        plan: 'FREE',
        messagesUsed: 5,
        lastMessageAt: null,
      });

      const updatedSubscription = createMockSubscription({
        id: 'sub-increment-msg',
        userId,
        plan: 'FREE',
        messagesUsed: 6,
        lastMessageAt: expect.any(Date),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);
      mockRepository.save.mockResolvedValue(updatedSubscription);

      await service.incrementMessages(userId);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          messagesUsed: 6,
          lastMessageAt: expect.any(Date),
        })
      );
    });

    it('should handle multiple increments', async () => {
      const userId = 'user-multi-increment-msg';
      const mockSubscription = createMockSubscription({
        id: 'sub-multi-increment-msg',
        userId,
        plan: 'PRO',
        messagesUsed: 99,
        lastMessageAt: null,
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      for (let i = 0; i < 3; i++) {
        mockSubscription.messagesUsed++;
        mockRepository.save.mockResolvedValue(mockSubscription);
        await service.incrementMessages(userId);
      }

      expect(mockRepository.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('incrementImages', () => {
    it('should increment images and update timestamp', async () => {
      const userId = 'user-increment-img';
      const mockSubscription = createMockSubscription({
        id: 'sub-increment-img',
        userId,
        plan: 'FREE',
        imagesUsed: 2,
        lastImageAt: null,
      });

      const updatedSubscription = createMockSubscription({
        id: 'sub-increment-img',
        userId,
        plan: 'FREE',
        imagesUsed: 3,
        lastImageAt: expect.any(Date),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);
      mockRepository.save.mockResolvedValue(updatedSubscription);

      await service.incrementImages(userId);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          imagesUsed: 3,
          lastImageAt: expect.any(Date),
        })
      );
    });
  });

  describe('getUsageSummary', () => {
    it('should return complete usage summary for user', async () => {
      const userId = 'user-summary';
      const mockSubscription = createMockSubscription({
        id: 'sub-summary',
        userId,
        plan: 'PRO',
        imagesUsed: 30,
        messagesUsed: 150,
        startDate: new Date(),
        endDate: new Date(),
        lastImageAt: new Date(),
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getUsageSummary(userId);

      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('chat');
      expect(result).toHaveProperty('analysis');
      expect(result.plan).toBe('PRO');
      expect(result.chat.used).toBe(150);
      expect(result.chat.limit).toBe(200);
      expect(result.analysis.used).toBe(30);
      expect(result.analysis.limit).toBe(50);
    });

    it('should return correct usage for PREMIUM user', async () => {
      const userId = 'user-premium-summary';
      const mockSubscription = createMockSubscription({
        id: 'sub-premium-summary',
        userId,
        plan: 'PREMIUM',
        imagesUsed: 1000,
        messagesUsed: 5000,
        startDate: new Date(),
        endDate: new Date(),
        lastImageAt: new Date(),
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getUsageSummary(userId);

      expect(result.plan).toBe('PREMIUM');
      expect(result.chat.limit).toBe(999999);
      expect(result.analysis.limit).toBe(999999);
    });

    it('should return correct usage for FREE user', async () => {
      const userId = 'user-free-summary';
      const mockSubscription = createMockSubscription({
        id: 'sub-free-summary',
        userId,
        plan: 'FREE',
        imagesUsed: 0,
        messagesUsed: 0,
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getUsageSummary(userId);

      expect(result.plan).toBe('FREE');
      expect(result.chat.used).toBe(0);
      expect(result.chat.limit).toBe(20);
      expect(result.analysis.used).toBe(0);
      expect(result.analysis.limit).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle user with null plan gracefully', async () => {
      const userId = 'user-null-plan';
      const mockSubscription = createMockSubscription({
        id: 'sub-null-plan',
        userId,
        plan: null as any,
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.checkChatLimit(userId);

      expect(result.limit).toBe(20); // Should default to FREE limits
    });

    it('should return 0 remaining when completely at limit', async () => {
      const userId = 'user-zero-remaining';
      const mockSubscription = createMockSubscription({
        id: 'sub-zero-remaining',
        userId,
        plan: 'FREE',
        imagesUsed: 5,
        messagesUsed: 20,
        lastImageAt: new Date(),
        lastMessageAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      const chatResult = await service.checkChatLimit(userId);
      const analysisResult = await service.checkAnalysisLimit(userId);

      expect(chatResult.remaining).toBe(0);
      expect(analysisResult.remaining).toBe(0);
    });
  });
});
