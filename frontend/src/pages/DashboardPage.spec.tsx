import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfessionalDashboard from './DashboardPage';
import * as authSession from '@/lib/authSession';
import { dashboardService } from '@/services/dashboardService';
import { skinAgeInsightsService } from '@/services/skinAgeInsightsService';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>
  };
});

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key
  })
}));

// Mock chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />
}));

// Mock components
vi.mock('@/components/dashboard/WeatherAdaptiveWidget', () => ({
  WeatherAdaptiveWidget: () => <div data-testid="weather-widget" />
}));
vi.mock('@/components/dashboard/RiskAlerts', () => ({
  RiskAlerts: () => <div data-testid="risk-alerts" />
}));
vi.mock('@/components/insights/SkinAgeInsightCard', () => ({
  default: () => <div data-testid="skin-age-insight" />
}));

// Mock services
vi.mock('@/services/dashboardService', () => ({
  dashboardService: {
    getMetrics: vi.fn(),
    getMonthlyData: vi.fn()
  }
}));

vi.mock('@/services/skinAgeInsightsService', () => ({
  skinAgeInsightsService: {
    getInsights: vi.fn()
  }
}));

vi.mock('@/lib/authSession', () => ({
  getUser: vi.fn(),
  authFetch: vi.fn()
}));

describe('ProfessionalDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authSession.getUser as any).mockReturnValue({ id: 'user-123', email: 'test@test.com' });
    (authSession.authFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'PRO' })
    });
    (dashboardService.getMetrics as any).mockResolvedValue({
      averageScore: 85.5,
      bestScore: 92,
      totalAnalyses: 15,
      trendPercentage: 5
    });
    (dashboardService.getMonthlyData as any).mockResolvedValue([
      { month: 'Jan', averageScore: 80 },
      { month: 'Feb', averageScore: 85 }
    ]);
    (skinAgeInsightsService.getInsights as any).mockResolvedValue({ id: 'insight-1' });
  });

  it('shows loading state initially', async () => {
    // Keep one promise pending
    (authSession.authFetch as any).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(
        <BrowserRouter>
          <ProfessionalDashboard />
        </BrowserRouter>
      );
    });

    expect(screen.getByText(/Synchronizing clinical data/i)).toBeDefined();
  });

  it('renders dashboard with metrics after loading', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <ProfessionalDashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('85.5')).toBeDefined();
      expect(screen.getByText('92')).toBeDefined();
      expect(screen.getByText('15')).toBeDefined();
      expect(screen.getByTestId('mock-line-chart')).toBeDefined();
    });
  });

  it('renders PRO features if user has PRO plan', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <ProfessionalDashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('skin-age-insight')).toBeDefined();
    });
  });

  it('renders upgrade prompt if user has FREE plan', async () => {
    (authSession.authFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'FREE' })
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ProfessionalDashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Activate Pro Engine/i)).toBeDefined();
    });
  });

  it('redirects to login if no user session', async () => {
    (authSession.getUser as any).mockReturnValue(null);

    await act(async () => {
      render(
        <BrowserRouter>
          <ProfessionalDashboard />
        </BrowserRouter>
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
  });
});
