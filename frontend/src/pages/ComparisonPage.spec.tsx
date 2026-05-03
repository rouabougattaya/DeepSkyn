import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ComparisonPage from './ComparisonPage';
import { MemoryRouter } from 'react-router-dom';
import * as comparisonServiceModule from '../services/comparison.service';
import * as apiClientModule from '../services/apiClient';
import * as authSessionModule from '@/lib/authSession';

vi.setConfig({ testTimeout: 20000 });

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
        if (options?.returnObjects) return [];
        return `${options?.defaultValue || key}`;
    },
    i18n: { changeLanguage: vi.fn(), language: 'fr' },
  }),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => {
    const Icon = ({ "data-testid": testId }: any) => <div data-testid={testId} />;
    return {
        ArrowLeft: (props: any) => <Icon {...props} data-testid="icon-arrow-left" />,
        TrendingUp: (props: any) => <Icon {...props} data-testid="icon-trending-up" />,
        TrendingDown: (props: any) => <Icon {...props} data-testid="icon-trending-down" />,
        Minus: (props: any) => <Icon {...props} data-testid="icon-minus" />,
        GitCompare: (props: any) => <Icon {...props} data-testid="icon-git-compare" />,
        Calendar: (props: any) => <Icon {...props} data-testid="icon-calendar" />,
        BarChart2: (props: any) => <Icon {...props} data-testid="icon-bar-chart-2" />,
        Loader2: (props: any) => <Icon {...props} data-testid="icon-loader-2" />,
        Sparkles: (props: any) => <Icon {...props} data-testid="icon-sparkles" />,
        AlertCircle: (props: any) => <Icon {...props} data-testid="icon-alert-circle" />,
        CheckCircle: (props: any) => <Icon {...props} data-testid="icon-check-circle" />,
        Info: (props: any) => <Icon {...props} data-testid="icon-info" />,
        Lock: (props: any) => <Icon {...props} data-testid="icon-lock" />,
        Crown: (props: any) => <Icon {...props} data-testid="icon-crown" />,
    };
});

// Mock react-router-dom partials
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useSearchParams: () => {
            const params = new URLSearchParams(window.location.search);
            return [params, vi.fn()];
        },
    };
});

vi.mock('../services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock('../services/comparison.service', () => ({
  comparisonService: {
    getUserAnalyses: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('../lib/authSession', () => ({
  getUser: vi.fn(),
}));

describe('ComparisonPage', () => {
  const mockUser = { id: 'user-123' };
  const mockAnalyses = [
    { id: '1', skinScore: 80, createdAt: '2023-01-01T10:00:00Z', metrics: { hydration: 70, oil: 30, acne: 10, wrinkles: 5 } },
    { id: '2', skinScore: 85, createdAt: '2023-02-01T10:00:00Z', metrics: { hydration: 75, oil: 25, acne: 5, wrinkles: 5 } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
    vi.spyOn(authSessionModule, 'getUser').mockReturnValue(mockUser as any);
    vi.spyOn(apiClientModule, 'apiGet').mockResolvedValue({ plan: 'PRO' });
    vi.spyOn(comparisonServiceModule.comparisonService, 'getUserAnalyses').mockResolvedValue({ data: mockAnalyses } as any);
  });

  const renderPage = async () => {
      let result: any;
      await act(async () => {
          result = render(<MemoryRouter><ComparisonPage /></MemoryRouter>);
      });
      return result;
  };

  it('renders correctly after loading analyses', async () => {
    await renderPage();
    expect(screen.getByText(/Comparative Analysis/i)).toBeDefined();
    await waitFor(() => {
        expect(screen.getAllByText(/80/).length).toBeGreaterThan(0);
    });
  });

  it('shows lock overlay for FREE users', async () => {
    vi.spyOn(apiClientModule, 'apiGet').mockResolvedValue({ plan: 'FREE' });
    await renderPage();
    await waitFor(() => {
        expect(screen.getByTestId('icon-lock')).toBeDefined();
        expect(screen.getAllByText(/PRO/i).length).toBeGreaterThan(0);
    });
  });

  it('displays comparison results correctly', async () => {
    window.history.pushState({}, '', '/?firstId=1&secondId=2');
    
    const mockCompareResult = {
      summaryText: 'Overall improvement detected.',
      first: { id: '1', skinScore: 80, skinAge: 25, realAge: 25, createdAt: '2023-01-01', metrics: mockAnalyses[0].metrics, summary: "" },
      second: { id: '2', skinScore: 85, skinAge: 24, realAge: 25, createdAt: '2023-02-01', metrics: mockAnalyses[1].metrics, summary: "" },
      differences: [
        { metric: 'hydration', firstValue: 70, secondValue: 75, delta: 5, trend: 'improvement' },
      ],
      globalTrend: 'improvement'
    };
    vi.spyOn(comparisonServiceModule.comparisonService, 'compare').mockResolvedValue(mockCompareResult as any);

    await renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/Overall improvement/i).length).toBeGreaterThan(0);
    }, { timeout: 15000 });
  });

  it.skip('handles manual selection and compare click', async () => {
    const { container } = await renderPage();

    await waitFor(() => {
        expect(screen.getAllByText(/80/).length).toBeGreaterThan(0);
    });

    const selects = screen.getAllByRole('combobox');
    
    await act(async () => {
        fireEvent.change(selects[0], { target: { value: '1' } });
        fireEvent.change(selects[1], { target: { value: '2' } });
    });

    expect(selects[0].value).toBe('1');
    expect(selects[1].value).toBe('2');

    const mockCompareResult = {
        summaryText: 'Manual compare result.',
        first: { id: '1', skinScore: 80, skinAge: 25, realAge: 25, createdAt: '2023-01-01', metrics: mockAnalyses[0].metrics, summary: "" },
        second: { id: '2', skinScore: 85, skinAge: 24, realAge: 25, createdAt: '2023-02-01', metrics: mockAnalyses[1].metrics, summary: "" },
        differences: [],
        globalTrend: 'improvement'
    } as any;
    vi.spyOn(comparisonServiceModule.comparisonService, 'compare').mockResolvedValue(mockCompareResult);

    const form = container.querySelector('form')!;
    
    await act(async () => {
        fireEvent.submit(form);
    });

    await waitFor(() => {
        expect(comparisonServiceModule.comparisonService.compare).toHaveBeenCalledWith('1', '2');
        expect(screen.getByText(/Manual compare result/i)).toBeDefined();
    }, { timeout: 15000 });
  });
});
