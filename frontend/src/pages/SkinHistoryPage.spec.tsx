import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import SkinHistoryPage from './SkinHistoryPage';
import { MemoryRouter } from 'react-router-dom';
import * as authSession from '@/lib/authSession';
import * as apiClient from '@/services/apiClient';
import * as comparisonService from '@/services/comparison.service';

// Mock lucide-react
vi.mock('lucide-react', () => {
  const Icon = ({ className, "data-testid": testId }: any) => <div className={className} data-testid={testId} />;
  return {
    History: (props: any) => <Icon {...props} data-testid="history-icon" />,
    ArrowLeft: (props: any) => <Icon {...props} data-testid="arrowleft-icon" />,
    ChevronRight: (props: any) => <Icon {...props} data-testid="chevronright-icon" />,
    ChevronLeft: (props: any) => <Icon {...props} data-testid="chevronleft-icon" />,
    Activity: (props: any) => <Icon {...props} data-testid="activity-icon" />,
    Search: (props: any) => <Icon {...props} data-testid="search-icon" />,
    BarChart3: (props: any) => <Icon {...props} data-testid="barchart-icon" />,
    Maximize2: (props: any) => <Icon {...props} data-testid="maximize-icon" />,
    Lock: (props: any) => <Icon {...props} data-testid="lock-icon" />,
    Crown: (props: any) => <Icon {...props} data-testid="crown-icon" />,
  };
});

// Mock child components
vi.mock('@/components/insights/TimelineView', () => ({
  default: () => <div data-testid="timeline-view">Timeline</div>,
}));
vi.mock('@/components/insights/HistoryTimelineModal', () => ({
  default: () => <div data-testid="timeline-modal">Modal</div>,
}));
vi.mock('@/components/Navbar', () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

// Mock services
vi.mock('@/lib/authSession', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  apiGet: vi.fn(),
}));

vi.mock('@/services/comparison.service', () => ({
  comparisonService: {
    getUserAnalyses: vi.fn(),
  },
}));

describe('SkinHistoryPage', () => {
  const mockUser = { id: 'user-123' };
  const mockAnalyses = [
    { id: '1', skinScore: 80, createdAt: '2023-10-27T10:00:00Z', summary: 'Good' },
    { id: '2', skinScore: 60, createdAt: '2023-10-26T10:00:00Z', summary: 'Fair' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (authSession.getUser as any).mockReturnValue(mockUser);
    (apiClient.apiGet as any).mockResolvedValue({ plan: 'PRO' });
    (comparisonService.comparisonService.getUserAnalyses as any).mockResolvedValue({
      data: mockAnalyses,
      total: 2,
    });
  });

  const renderPage = async () => {
    return await act(async () => render(
      <MemoryRouter>
        <SkinHistoryPage />
      </MemoryRouter>
    ));
  };

  it('renders correctly for PRO users with analyses', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Skin Analysis History/i)).toBeDefined();
      expect(screen.getByText(/80/)).toBeDefined();
      expect(screen.getByText(/60/)).toBeDefined();
    });
  });

  it('shows lock overlay for FREE users', async () => {
    (apiClient.apiGet as any).mockResolvedValue({ plan: 'FREE' });
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Historique Complet/i)).toBeDefined();
      expect(screen.getByTestId('lock-icon')).toBeDefined();
    });
  });

  it('handles search correctly', async () => {
    await renderPage();
    const searchInput = screen.getByPlaceholderText(/Search by date or score.../i);
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '80' } });
    });

    expect(screen.getByText(/80/)).toBeDefined();
    expect(screen.queryByText(/60/)).toBeNull();
  });

  it('handles error during data fetching', async () => {
    (comparisonService.comparisonService.getUserAnalyses as any).mockRejectedValue(new Error('Fetch failed'));
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Unable to load your history/i)).toBeDefined();
    });
  });

  it('navigates to details when clicking View Details', async () => {
    await renderPage();
    const viewDetailsLinks = screen.getAllByText(/View Details/i);
    expect(viewDetailsLinks[0].closest('a')?.getAttribute('href')).toBe('/analysis/details/1');
  });

  it('shows empty state if no analyses found', async () => {
    (comparisonService.comparisonService.getUserAnalyses as any).mockResolvedValue({ data: [], total: 0 });
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Analyze Skin Now/i)).toBeDefined();
    });
  });
});
