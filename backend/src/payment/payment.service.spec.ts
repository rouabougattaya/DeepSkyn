import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment } from './payment.entity';
import { Subscription } from '../subscription/subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentRepository: jest.Mocked<Repository<Payment>>;
  let mockSubscriptionRepository: jest.Mocked<Repository<Subscription>>;

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
    mockPaymentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    } as any;

    mockSubscriptionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should upgrade from FREE to PRO plan', async () => {
      const dto: SubscribeDto = {
        userId: 'user-free-to-pro',
        plan: 'PRO',
        cardHolder: 'John Doe',
        cardLast4: '4242',
      };

      const existingSubscription = createMockSubscription({
        id: 'sub-123',
        userId: dto.userId,
        plan: 'FREE',
        imagesUsed: 2,
        messagesUsed: 10,
      });

      const newPayment: Payment = {
        id: 'pay-123',
        userId: dto.userId,
        subscriptionId: existingSubscription.id,
        amount: 9.99,
        currency: 'USD',
        status: 'PAID',
        konnectTransactionId: `sim_${Date.now()}`,
        createdAt: new Date(),
      };

      const updatedSubscription = createMockSubscription({
        id: 'sub-123',
        userId: dto.userId,
        plan: 'PRO',
        imagesUsed: 2,
        messagesUsed: 10,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockPaymentRepository.create.mockReturnValue(newPayment);
      mockPaymentRepository.save.mockResolvedValue(newPayment);
      mockSubscriptionRepository.save.mockResolvedValue(updatedSubscription);

      const result = await service.subscribe(dto);

      expect(result.subscription.plan).toBe('PRO');
      expect(result.subscription.status).toBe('ACTIVE');
      expect(result.payment.amount).toBe(9.99);
      expect(result.payment.status).toBe('PAID');
      expect(mockPaymentRepository.save).toHaveBeenCalled();
      expect(mockSubscriptionRepository.save).toHaveBeenCalled();
    });

    it('should upgrade from FREE to PREMIUM plan', async () => {
      const dto: SubscribeDto = {
        userId: 'user-free-to-premium',
        plan: 'PREMIUM',
        cardHolder: 'Jane Doe',
        cardLast4: '5555',
      };

      const existingSubscription = createMockSubscription({
        id: 'sub-456',
        userId: dto.userId,
        plan: 'FREE',
      });

      const newPayment: Payment = {
        id: 'pay-456',
        userId: dto.userId,
        subscriptionId: existingSubscription.id,
        amount: 19.99,
        currency: 'USD',
        status: 'PAID',
        konnectTransactionId: `sim_${Date.now()}`,
        createdAt: new Date(),
      };

      const updatedSubscription = createMockSubscription({
        id: 'sub-456',
        userId: dto.userId,
        plan: 'PREMIUM',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockPaymentRepository.create.mockReturnValue(newPayment);
      mockPaymentRepository.save.mockResolvedValue(newPayment);
      mockSubscriptionRepository.save.mockResolvedValue(updatedSubscription);

      const result = await service.subscribe(dto);

      expect(result.subscription.plan).toBe('PREMIUM');
      expect(result.payment.amount).toBe(19.99);
    });

    it('should upgrade from PRO to PREMIUM plan', async () => {
      const dto: SubscribeDto = {
        userId: 'user-pro-to-premium',
        plan: 'PREMIUM',
        cardHolder: 'Bob Smith',
        cardLast4: '1234',
      };

      const existingSubscription = createMockSubscription({
        id: 'sub-789',
        userId: dto.userId,
        plan: 'PRO',
        imagesUsed: 30,
        messagesUsed: 150,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-02-01'),
      });

      const newPayment: Payment = {
        id: 'pay-789',
        userId: dto.userId,
        subscriptionId: existingSubscription.id,
        amount: 19.99,
        currency: 'USD',
        status: 'PAID',
        konnectTransactionId: `sim_${Date.now()}`,
        createdAt: new Date(),
      };

      const updatedSubscription = createMockSubscription({
        id: 'sub-789',
        userId: dto.userId,
        plan: 'PREMIUM',
        imagesUsed: 30,
        messagesUsed: 150,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockPaymentRepository.create.mockReturnValue(newPayment);
      mockPaymentRepository.save.mockResolvedValue(newPayment);
      mockSubscriptionRepository.save.mockResolvedValue(updatedSubscription);

      const result = await service.subscribe(dto);

      expect(result.subscription.plan).toBe('PREMIUM');
      expect(result.payment.status).toBe('PAID');
    });

    it('should create new subscription if user does not have one', async () => {
      const dto: SubscribeDto = {
        userId: 'user-new-sub',
        plan: 'PRO',
        cardHolder: 'New User',
        cardLast4: '9999',
      };

      const newSubscription = createMockSubscription({
        id: 'sub-new',
        userId: dto.userId,
        plan: 'FREE',
      });

      const newPayment: Payment = {
        id: 'pay-new',
        userId: dto.userId,
        subscriptionId: newSubscription.id,
        amount: 9.99,
        currency: 'USD',
        status: 'PAID',
        konnectTransactionId: `sim_${Date.now()}`,
        createdAt: new Date(),
      };

      const upgradedSubscription = createMockSubscription({
        id: 'sub-new',
        userId: dto.userId,
        plan: 'PRO',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });

      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockSubscriptionRepository.create.mockReturnValue(newSubscription);
      mockSubscriptionRepository.save
        .mockResolvedValueOnce(newSubscription)
        .mockResolvedValueOnce(upgradedSubscription);
      mockPaymentRepository.create.mockReturnValue(newPayment);
      mockPaymentRepository.save.mockResolvedValue(newPayment);

      const result = await service.subscribe(dto);

      // First save creates default FREE subscription
      expect(mockSubscriptionRepository.save).toHaveBeenCalledTimes(2);
      expect(result.subscription.plan).toBe('PRO');
      expect(result.payment.status).toBe('PAID');
    });

    it('should handle attempt to downgrade (stay at same level)', async () => {
      const dto: SubscribeDto = {
        userId: 'user-downgrade-attempt',
        plan: 'PRO',
        cardHolder: 'Downgrade User',
        cardLast4: '6666',
      };

      const existingSubscription = createMockSubscription({
        id: 'sub-downgrade',
        userId: dto.userId,
        plan: 'PREMIUM',
        imagesUsed: 500,
        messagesUsed: 900,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-02-01'),
      });

      const payment: Payment = {
        id: 'pay-downgrade',
        userId: dto.userId,
        subscriptionId: existingSubscription.id,
        amount: 9.99,
        currency: 'USD',
        status: 'PAID',
        konnectTransactionId: `sim_${Date.now()}`,
        createdAt: new Date(),
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockPaymentRepository.create.mockReturnValue(payment);
      mockPaymentRepository.save.mockResolvedValue(payment);

      const result = await service.subscribe(dto);

      // Should still be PREMIUM (no downgrade)
      expect(result.subscription.plan).toBe('PREMIUM');
      expect(result.payment.status).toBe('PAID');
    });

    it('should set correct subscription dates', async () => {
      const dto: SubscribeDto = {
        userId: 'user-dates-test',
        plan: 'PRO',
        cardHolder: 'Date Test',
        cardLast4: '7777',
      };

      const existingSubscription = createMockSubscription({
        id: 'sub-dates',
        userId: dto.userId,
        plan: 'FREE',
      });

      const newPayment: Payment = {
        id: 'pay-dates',
        userId: dto.userId,
        subscriptionId: existingSubscription.id,
        amount: 9.99,
        currency: 'USD',
        status: 'PAID',
        konnectTransactionId: `sim_${Date.now()}`,
        createdAt: new Date(),
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockPaymentRepository.create.mockReturnValue(newPayment);
      mockPaymentRepository.save.mockResolvedValue(newPayment);

      let savedSubscription: Subscription;
      mockSubscriptionRepository.save.mockImplementation((sub) => {
        savedSubscription = sub as Subscription;
        return Promise.resolve(savedSubscription);
      });

      await service.subscribe(dto);

      expect(savedSubscription.startDate).toBeInstanceOf(Date);
      expect(savedSubscription.endDate).toBeInstanceOf(Date);
      expect(savedSubscription.endDate.getTime()).toBeGreaterThan(savedSubscription.startDate.getTime());
    });
  });

  describe('getHistory', () => {
    it('should return all payments for a user in descending order', async () => {
      const userId = 'user-history-123';
      const mockPayments: Payment[] = [
        {
          id: 'pay-3',
          userId,
          subscriptionId: 'sub-1',
          amount: 19.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_3',
          createdAt: new Date('2025-03-01'),
        },
        {
          id: 'pay-2',
          userId,
          subscriptionId: 'sub-1',
          amount: 9.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_2',
          createdAt: new Date('2025-02-01'),
        },
        {
          id: 'pay-1',
          userId,
          subscriptionId: 'sub-1',
          amount: 9.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getHistory(userId);

      expect(result).toEqual(mockPayments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when user has no payments', async () => {
      const userId = 'user-no-payments';

      mockPaymentRepository.find.mockResolvedValue([]);

      const result = await service.getHistory(userId);

      expect(result).toEqual([]);
    });

    it('should return payments sorted by most recent first', async () => {
      const userId = 'user-sorted';
      const mockPayments: Payment[] = [
        {
          id: 'pay-latest',
          userId,
          subscriptionId: 'sub-1',
          amount: 19.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_latest',
          createdAt: new Date(),
        },
        {
          id: 'pay-old',
          userId,
          subscriptionId: 'sub-1',
          amount: 9.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_old',
          createdAt: new Date(Date.now() - 86400000),
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getHistory(userId);

      expect(result[0].id).toBe('pay-latest');
      expect(result[1].id).toBe('pay-old');
    });

    it('should handle multiple transactions with same timestamp', async () => {
      const userId = 'user-same-time';
      const timestamp = new Date();
      const mockPayments: Payment[] = [
        {
          id: 'pay-a',
          userId,
          subscriptionId: 'sub-1',
          amount: 9.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_a',
          createdAt: timestamp,
        },
        {
          id: 'pay-b',
          userId,
          subscriptionId: 'sub-1',
          amount: 19.99,
          currency: 'USD',
          status: 'PAID',
          konnectTransactionId: 'sim_b',
          createdAt: timestamp,
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getHistory(userId);

      expect(result.length).toBe(2);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle subscription save error', async () => {
      const dto: SubscribeDto = {
        userId: 'user-error',
        plan: 'PRO',
        cardHolder: 'Error User',
        cardLast4: '0000',
      };

      const subscription = createMockSubscription({
        id: 'sub-error',
        userId: dto.userId,
        plan: 'FREE',
      });

      mockSubscriptionRepository.findOne.mockResolvedValue(subscription);
      mockSubscriptionRepository.save.mockRejectedValue(new Error('Database error'));

      expect(service.subscribe(dto)).rejects.toThrow('Database error');
    });

    it('should handle payment save error', async () => {
      const dto: SubscribeDto = {
        userId: 'user-payment-error',
        plan: 'PRO',
        cardHolder: 'Payment Error',
        cardLast4: '1111',
      };

      const subscription = createMockSubscription({
        id: 'sub-perror',
        userId: dto.userId,
        plan: 'FREE',
      });

      mockSubscriptionRepository.findOne.mockResolvedValue(subscription);
      mockPaymentRepository.create.mockReturnValue({} as Payment);
      mockPaymentRepository.save.mockRejectedValue(new Error('Payment failed'));

      expect(service.subscribe(dto)).rejects.toThrow('Payment failed');
    });
  });
});
