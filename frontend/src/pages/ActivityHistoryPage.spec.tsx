import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import ActivityHistoryPage from './ActivityHistoryPage';
import { historyService } from '@/services/historyService';
import { MemoryRouter } from 'react-router-dom';

// Mock lucide-react
vi.mock('lucide-react', () => {
  const Icon = ({ className, "data-testid": testId }: any) => <div className={className} data-testid={testId} />;
  return {
    Shield: (props: any) => <Icon {...props} data-testid="shield-icon" />,
    MapPin: (props: any) => <Icon {...props} data-testid="mappin-icon" />,
    Monitor: (props: any) => <Icon {...props} data-testid="monitor-icon" />,
    Clock: (props: any) => <Icon {...props} data-testid="clock-icon" />,
    AlertTriangle: (props: any) => <Icon {...props} data-testid="alert-icon" />,
    CheckCircle: (props: any) => <Icon {...props} data-testid="check-icon" />,
    XCircle: (props: any) => <Icon {...props} data-testid="x-icon" />,
    TrendingUp: (props: any) => <Icon {...props} data-testid="trending-icon" />,
    User: (props: any) => <Icon {...props} data-testid="user-icon" />,
    Mail: (props: any) => <Icon {...props} data-testid="mail-icon" />,
    Lock: (props: any) => <Icon {...props} data-testid="lock-icon" />,
    Activity: (props: any) => <Icon {...props} data-testid="activity-icon" />,
  };
});

// Mock historyService
vi.mock('@/services/historyService', () => ({
  historyService: {
    getSessionHistory: vi.fn(),
    getUserScore: vi.fn(),
  },
}));

describe('ActivityHistoryPage', () => {
  const mockSessions = [
    {
      id: '1',
      loginTime: '2023-10-27T10:00:00Z',
      loginMethod: 'email',
      loginStatus: 'success',
      location: { city: 'Paris', country: 'France' },
      device: { browser: 'Chrome' },
      used2FA: true,
      riskScore: 10,
    },
    {
        id: '2',
        loginTime: '2023-10-26T10:00:00Z',
        loginMethod: 'google',
        loginStatus: 'failed',
        location: { city: 'London', country: 'UK' },
        device: { browser: 'Firefox' },
        used2FA: false,
        riskScore: 80,
      },
  ];

  const mockScore = {
    totalScore: 85,
    profileConsistency: 90,
    securityScore: 80,
    factors: {
      twoFAUsage: 100,
      nameConsistency: 90,
      failedLogins: 5,
      unusualLocations: 0,
      bioConsistency: 100,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = async () => {
    return await act(async () => render(
      <MemoryRouter>
        <ActivityHistoryPage />
      </MemoryRouter>
    ));
  };

  it('renders loading state initially', async () => {
    (historyService.getSessionHistory as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <ActivityHistoryPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading activity data.../i)).toBeDefined();
  });

  it('renders session history and score correctly', async () => {
    (historyService.getSessionHistory as any).mockResolvedValue(mockSessions);
    (historyService.getUserScore as any).mockResolvedValue(mockScore);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Activity History/i)).toBeDefined();
      expect(screen.getByText(/85%/)).toBeDefined(); // Total Score
      expect(screen.getByText(/Paris, France/)).toBeDefined();
      expect(screen.getByText(/London, UK/)).toBeDefined();
    });

    expect(screen.getByText(/Success/i)).toBeDefined();
    expect(screen.getByText(/Failed/i)).toBeDefined();
  });

  it('handles error during data loading', async () => {
    (historyService.getSessionHistory as any).mockRejectedValue(new Error('Fetch failed'));
    (historyService.getUserScore as any).mockResolvedValue(null);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Unable to load activity data/i)).toBeDefined();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    (historyService.getSessionHistory as any).mockResolvedValue(mockSessions);
    (historyService.getUserScore as any).mockResolvedValue(mockScore);

    await renderPage();

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    
    (historyService.getSessionHistory as any).mockResolvedValue([]);
    
    await act(async () => {
        fireEvent.click(refreshBtn);
    });

    await waitFor(() => {
        expect(historyService.getSessionHistory).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/No activity recorded/i)).toBeDefined();
    });
  });

  it('shows "No activity recorded" if sessions list is empty', async () => {
    (historyService.getSessionHistory as any).mockResolvedValue([]);
    (historyService.getUserScore as any).mockResolvedValue(null);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No activity recorded/i)).toBeDefined();
    });
  });
});
