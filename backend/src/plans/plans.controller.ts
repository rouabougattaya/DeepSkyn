import { Controller, Get } from '@nestjs/common';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: 'USD',
    period: 'forever',
    description: 'Perfect for getting started with AI skin analysis.',
    features: [
      { label: '5 AI skin analyses / month', included: true },
      { label: '20 AI chat messages / day', included: true },
      { label: 'Basic skin score', included: true },
      { label: 'Routine suggestions', included: true },
      { label: 'Community access', included: true },
      { label: 'Advanced analysis reports', included: false },
      { label: 'Priority AI responses', included: false },
      { label: 'Smart product recommendations', included: false },
      { label: 'Progress tracking & charts', included: false },
      { label: 'Export analysis PDF', included: false },
      { label: 'Dedicated support', included: false },
    ],
    badge: null,
    highlighted: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 20,
    currency: 'USD',
    period: 'month',
    description: 'For skin enthusiasts who want deeper insights and more AI power.',
    features: [
      { label: '50 AI skin analyses / month', included: true },
      { label: '200 AI chat messages / day', included: true },
      { label: 'Detailed skin score', included: true },
      { label: 'Smart routine suggestions', included: true },
      { label: 'Community access', included: true },
      { label: 'Advanced analysis reports', included: true },
      { label: 'Priority AI responses', included: true },
      { label: 'Smart product recommendations', included: true },
      { label: 'Progress tracking & charts', included: true },
      { label: 'Export analysis PDF', included: true },
      { label: 'Dedicated support', included: false },
    ],
    badge: 'Most Popular',
    highlighted: true,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 50,
    currency: 'USD',
    period: 'month',
    description: 'Unlimited everything for the ultimate skincare experience.',
    features: [
      { label: 'Unlimited AI skin analyses', included: true },
      { label: 'Unlimited AI chat messages', included: true },
      { label: 'Full dermatologist-level score', included: true },
      { label: 'AI-personalized routines', included: true },
      { label: 'VIP community access', included: true },
      { label: 'Full advanced analysis reports', included: true },
      { label: 'Instant AI priority responses', included: true },
      { label: 'Curated product store access', included: true },
      { label: 'Progress tracking & charts', included: true },
      { label: 'Export analysis PDF', included: true },
      { label: 'Dedicated premium support', included: true },
    ],
    badge: 'Best Value',
    highlighted: false,
  },
];

@Controller('plans')
export class PlansController {
  @Get()
  getPlans() {
    return PLANS;
  }
}
