import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

// Mock Stripe module
jest.mock('stripe');

describe('StripeService', () => {
  let service: StripeService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockStripeInstance: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_51234567890',
          FRONTEND_URL: 'http://localhost:3000',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_1234567890',
        };
        return config[key];
      }),
    } as any;

    mockStripeInstance = {
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripeInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session for PRO plan', async () => {
      const userId = 'user-pro-123';
      const plan = 'PRO';
      const amount = 9.99;

      const mockSession = {
        id: 'cs_test_pro_123',
        url: 'https://checkout.stripe.com/pay/cs_test_pro_123',
        client_secret: 'cs_test_pro_123_secret',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const result = await service.createCheckoutSession(userId, plan, amount);

      expect(result).toEqual({
        url: mockSession.url,
        sessionId: mockSession.id,
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'DeepSkyn PRO Subscription',
                description: 'Upgrade to PRO plan for enhanced skincare features.',
              },
              unit_amount: 999, // 9.99 * 100 cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: expect.stringContaining('/payment/success?session_id='),
        cancel_url: expect.stringContaining('/payment/cancel'),
        metadata: {
          userId,
          plan,
        },
      });
    });

    it('should create a checkout session for PREMIUM plan', async () => {
      const userId = 'user-premium-456';
      const plan = 'PREMIUM';
      const amount = 19.99;

      const mockSession = {
        id: 'cs_test_premium_456',
        url: 'https://checkout.stripe.com/pay/cs_test_premium_456',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const result = await service.createCheckoutSession(userId, plan, amount);

      expect(result.sessionId).toBe(mockSession.id);
      expect(result.url).toBe(mockSession.url);

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'DeepSkyn PREMIUM Subscription',
                description: 'Upgrade to PREMIUM plan for enhanced skincare features.',
              },
              unit_amount: 1999, // 19.99 * 100 cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: expect.stringContaining('/payment/success?session_id='),
        cancel_url: expect.stringContaining('/payment/cancel'),
        metadata: {
          userId,
          plan,
        },
      });
    });

    it('should correctly convert amount to cents', async () => {
      const userId = 'user-cents-123';
      const plan = 'PRO';
      const amount = 15.50;

      const mockSession = {
        id: 'cs_test_cents_123',
        url: 'https://checkout.stripe.com/pay/cs_test_cents_123',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession as any);

      await service.createCheckoutSession(userId, plan, amount);

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 1550, // 15.50 * 100
              }),
            }),
          ],
        })
      );
    });

    it('should include correct URLs from config', async () => {
      const userId = 'user-url-test';
      const plan = 'PRO';
      const amount = 9.99;

      const mockSession = {
        id: 'cs_test_url_123',
        url: 'https://checkout.stripe.com/pay/cs_test_url_123',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession as any);

      await service.createCheckoutSession(userId, plan, amount);

      const callArgs = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
      expect(callArgs.success_url).toContain('http://localhost:3000/payment/success');
      expect(callArgs.cancel_url).toContain('http://localhost:3000/payment/cancel');
    });

    it('should use default frontend URL when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | null> = {
          STRIPE_SECRET_KEY: 'sk_test_default',
          FRONTEND_URL: null,
          STRIPE_WEBHOOK_SECRET: 'whsec_test_default',
        };
        return config[key] || 'http://localhost:3000';
      });

      const userId = 'user-default-url';
      const plan = 'PRO';
      const amount = 9.99;

      const mockSession = {
        id: 'cs_test_default_url',
        url: 'https://checkout.stripe.com/pay/cs_test_default_url',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession as any);

      await service.createCheckoutSession(userId, plan, amount);

      const callArgs = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
      expect(callArgs.success_url).toContain('http://localhost:3000');
    });

    it('should handle Stripe errors gracefully', async () => {
      const userId = 'user-error-test';
      const plan = 'PRO';
      const amount = 9.99;

      mockStripeInstance.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API Error: Invalid API key')
      );

      expect(service.createCheckoutSession(userId, plan, amount)).rejects.toThrow();
    });
  });

  describe('retrieveSession', () => {
    it('should retrieve a checkout session by ID', async () => {
      const sessionId = 'cs_test_retrieve_123';
      const mockSession = {
        id: sessionId,
        payment_status: 'paid',
        status: 'complete',
        customer_email: 'user@example.com',
        metadata: {
          userId: 'user-123',
          plan: 'PRO',
        },
      };

      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession as any);

      const result = await service.retrieveSession(sessionId);

      expect(result).toEqual(mockSession);
      expect(mockStripeInstance.checkout.sessions.retrieve).toHaveBeenCalledWith(sessionId);
    });

    it('should return session with payment status = paid', async () => {
      const sessionId = 'cs_test_paid_status';
      const mockSession = {
        id: sessionId,
        payment_status: 'paid',
        status: 'complete',
        amount_total: 1999,
        currency: 'usd',
      };

      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession as any);

      const result = await service.retrieveSession(sessionId);

      expect(result.payment_status).toBe('paid');
      expect(result.status).toBe('complete');
    });

    it('should return session with payment status = unpaid', async () => {
      const sessionId = 'cs_test_unpaid_status';
      const mockSession = {
        id: sessionId,
        payment_status: 'unpaid',
        status: 'open',
      };

      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession as any);

      const result = await service.retrieveSession(sessionId);

      expect(result.payment_status).toBe('unpaid');
      expect(result.status).toBe('open');
    });

    it('should handle session not found error', async () => {
      const sessionId = 'cs_test_not_found';

      mockStripeInstance.checkout.sessions.retrieve.mockRejectedValue(
        new Error(`No such checkout.session: '${sessionId}'`)
      );

      expect(service.retrieveSession(sessionId)).rejects.toThrow();
    });
  });

  describe('constructEvent', () => {
    it('should construct webhook event from Stripe signature', async () => {
      const body = JSON.stringify({ type: 'checkout.session.completed' });
      const signature = 't=1234567890,v1=test_signature';

      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = await service.constructEvent(body, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        body,
        signature,
        'whsec_test_1234567890'
      );
    });

    it('should handle webhook signature verification failure', async () => {
      const body = JSON.stringify({ type: 'checkout.session.completed' });
      const invalidSignature = 't=1234567890,v1=invalid_signature';

      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No matching valid signature found');
      });

      expect(service.constructEvent(body, invalidSignature)).rejects.toThrow('No matching valid signature found');
    });

    it('should handle payment_intent.succeeded event', async () => {
      const body = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123', amount: 1999 } },
      });
      const signature = 't=1234567890,v1=test_signature';

      const mockEvent = {
        id: 'evt_test_pi_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 1999,
            status: 'succeeded',
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = await service.constructEvent(body, signature);

      expect(result.type).toBe('payment_intent.succeeded');
    });

    it('should handle charge.failed event', async () => {
      const body = JSON.stringify({
        type: 'charge.failed',
        data: { object: { id: 'ch_test_failed' } },
      });
      const signature = 't=1234567890,v1=test_signature';

      const mockEvent = {
        id: 'evt_test_failed',
        type: 'charge.failed',
        data: {
          object: {
            id: 'ch_test_failed',
            status: 'failed',
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = await service.constructEvent(body, signature);

      expect(result.type).toBe('charge.failed');
    });
  });
});
