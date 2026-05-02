import { apiPost, apiGet } from './apiClient';

export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export interface SubscriptionData {
  id: string;
  userId: string;
  plan: Plan;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  imagesUsed: number;
  messagesUsed: number;
  startDate: string | null;
  endDate: string | null;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  konnectTransactionId: string;
  createdAt: string;
}

export interface SubscribePayload {
  userId: string;
  plan: 'PRO' | 'PREMIUM';
  cardHolder: string;
  cardLast4: string;
}

export interface SubscribeResult {
  subscription: SubscriptionData;
  payment: PaymentRecord;
}

/** POST /payments/subscribe — upgrade plan */
export async function subscribePlan(payload: SubscribePayload): Promise<SubscribeResult> {
  return apiPost<SubscribeResult>('/payments/subscribe', payload);
}

/** GET /payments/history/:userId — payment history */
export async function getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
  return apiGet<PaymentRecord[]>(`/payments/history/${userId}`);
}

/** POST /payments/checkout-session — Get Stripe checkout URL */
export async function createCheckoutSession(userId: string, plan: string): Promise<{ url: string }> {
  return apiPost<{ url: string }>('/payments/checkout-session', { 
    userId, 
    plan,
    origin: window.location.origin 
  });
}
