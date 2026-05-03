import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RoutinesPage from './RoutinesPage';
import { MemoryRouter } from 'react-router-dom';
import * as authSession from '@/lib/authSession';
import * as apiClient from '@/services/apiClient';
import * as routineService from '@/services/routinePersonalizationService';
import * as reportGenerator from '@/utils/reportGenerator';
import { skinAgeInsightsService, type SkinAgeInsightResponse } from "@/services/skinAgeInsightsService"

vi.setConfig({ testTimeout: 15000 });

// Mock lucide-react
vi.mock('lucide-react', () => {
  const Icon = ({ className, "data-testid": testId }: any) => <div className={className} data-testid={testId} />;
  return {
    Sparkles: (props: any) => <Icon {...props} data-testid="sparkles-icon" />,
    ArrowUpRight: (props: any) => <Icon {...props} data-testid="arrowup-icon" />,
    ArrowDownRight: (props: any) => <Icon {...props} data-testid="arrowdown-icon" />,
    Minus: (props: any) => <Icon {...props} data-testid="minus-icon" />,
    Lock: (props: any) => <Icon {...props} data-testid="lock-icon" />,
    Crown: (props: any) => <Icon {...props} data-testid="crown-icon" />,
    RefreshCw: (props: any) => <Icon {...props} data-testid="refresh-icon" />,
    FileText: (props: any) => <Icon {...props} data-testid="file-icon" />,
    Download: (props: any) => <Icon {...props} data-testid="download-icon" />,
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
  }),
}));

// Mock services
vi.mock('@/lib/authSession', () => ({
  authFetch: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  apiGet: vi.fn(),
}));

vi.mock('@/services/routinePersonalizationService', () => ({
  updateRoutine: vi.fn(),
}));

vi.mock('@/services/skinAgeInsightsService', () => ({
  skinAgeInsightsService: {
    getInsights: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('@/utils/reportGenerator', () => ({
  generateClinicalReport: vi.fn(),
}));

// Mock child component
vi.mock('../components/analysis/SvrRoutinePanel', () => ({
  SvrRoutinePanel: () => <div data-testid="svr-routine-panel">SVR Panel</div>,
}));

describe('RoutinesPage', () => {
  const mockUser = { id: 'user-123', name: 'John Doe' };
  const mockRoutine = {
    message: 'Routine loaded',
    personalizationId: 'p-1',
    inferredSkinType: 'Oily',
    analysisCount: 5,
    trends: {
      hydration: { current: 60, previous: 50, delta: 10, trend: 'improving' },
      oil: { current: 40, previous: 45, delta: -5, trend: 'improving' },
      acne: { current: 10, previous: 15, delta: -5, trend: 'improving' },
      wrinkles: { current: 5, previous: 5, delta: 0, trend: 'stable' },
      globalScoreTrend: 'improving',
    },
    adjustments: [],
    routine: { morning: [], night: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (authSession.getUser as any).mockReturnValue(mockUser);
    (apiClient.apiGet as any).mockResolvedValue({ plan: 'PRO' });
    (authSession.authFetch as any).mockImplementation((path: string) => {
      if (path.includes('/routine/')) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (path.includes('/analysis/user')) return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      return Promise.resolve({ ok: false });
    });
  });

  const renderPage = async () => {
    return await act(async () => render(
      <MemoryRouter>
        <RoutinesPage />
      </MemoryRouter>
    ));
  };

  it('renders correctly for PRO users', async () => {
    await renderPage();
    expect(screen.getByText(/Ta routine AM \/ PM/i)).toBeDefined();
    expect(screen.getByTestId('svr-routine-panel')).toBeDefined();
  });

  it('shows lock overlay for FREE users', async () => {
    (apiClient.apiGet as any).mockResolvedValue({ plan: 'FREE' });
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Routine Personnalisée PRO/i)).toBeDefined();
      expect(screen.getByTestId('lock-icon')).toBeDefined();
    });
  });

  it('loads history from localStorage', async () => {
    localStorage.setItem(`routine_history_${mockUser.id}`, JSON.stringify([mockRoutine]));
    await renderPage();
    
    // Check if main title is there
    expect(screen.getByText(/Ta routine AM \/ PM/i)).toBeDefined();
    
    // Check for Peau (flexible check)
    const skinText = await screen.findByText(/Peau/i, {}, { timeout: 8000 });
    expect(skinText).toBeDefined();
  });

  it('handles routine update manually', async () => {
    localStorage.setItem(`routine_history_${mockUser.id}`, JSON.stringify([mockRoutine]));
    (routineService.updateRoutine as any).mockResolvedValue({ ...mockRoutine, message: 'Updated!' });
    
    await renderPage();
    
    // The Update button is not explicitly in the UI based on the file content (it's called by effects or hidden)
    // Wait, line 165 is handleUpdateRoutine()
    // It's called automatically in an effect if analysis is completed.
    
    // Let's trigger the auto-update
    localStorage.setItem('analysisJustCompleted', 'true');
    
    // We need to wait for the interval or manually trigger the effect
    // Actually, I'll just check if updateRoutine is called when we mock the signals
    await waitFor(() => {
        expect(routineService.updateRoutine).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('generates clinical report when clicking PDF button', async () => {
    localStorage.setItem(`routine_history_${mockUser.id}`, JSON.stringify([mockRoutine]));
    await renderPage();
    
    const pdfBtn = screen.getByRole('button', { name: /Rapport PDF/i });
    await act(async () => {
        fireEvent.click(pdfBtn);
    });
    
    expect(reportGenerator.generateClinicalReport).toHaveBeenCalled();
  });
});
