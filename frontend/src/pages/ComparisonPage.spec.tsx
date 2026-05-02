import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComparisonPage from './ComparisonPage';
import { comparisonService } from '../services/comparison.service';
import * as authSession from '../lib/authSession';
import { apiGet } from '../services/apiClient';

// Mocks
vi.mock('../services/comparison.service', () => ({
  comparisonService: {
    getUserAnalyses: vi.fn(),
    compare: vi.fn()
  }
}));

vi.mock('../lib/authSession', () => ({
  getUser: vi.fn()
}));

vi.mock('../services/apiClient', () => ({
  apiGet: vi.fn()
}));

// Mock window.matchMedia if it exists in components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(''), vi.fn()]
  };
});

describe('ComparisonPage Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authSession.getUser as any).mockReturnValue({ id: 'user-123' });
    (apiGet as any).mockResolvedValue({ plan: 'PRO' });
    
    (comparisonService.getUserAnalyses as any).mockResolvedValue({
      data: [
        { id: '1', createdAt: '2023-01-01', skinScore: 80, metrics: { hydration: 80, oil: 50, acne: 10, wrinkles: 20 } },
        { id: '2', createdAt: '2023-02-01', skinScore: 85, metrics: { hydration: 85, oil: 45, acne: 5, wrinkles: 15 } }
      ]
    });

    (comparisonService.compare as any).mockResolvedValue({
      globalTrend: 'improvement',
      differences: [
        { metric: 'hydration', delta: 5, trend: 'improvement' }
      ]
    });
  });

  it('renders the free plan lock overlay if user is FREE', async () => {
    (apiGet as any).mockResolvedValue({ plan: 'FREE' });

    render(
      <BrowserRouter>
        <ComparisonPage />
      </BrowserRouter>
    );

    // Should wait for plan fetch and show lock
    await waitFor(() => {
      expect(screen.getByText(/Comparaison d'Analyses/i)).toBeDefined();
      expect(screen.getByText(/réservés aux membres PRO/i)).toBeDefined();
    });
  });

  it('renders the comparison tools if user is PRO', async () => {
    (apiGet as any).mockResolvedValue({ plan: 'PRO' });

    render(
      <BrowserRouter>
        <ComparisonPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/réservés aux membres PRO/i)).toBeNull();
      expect(screen.getByText(/First analysis/i)).toBeDefined();
    });
  });

  it('allows selecting two analyses and clicking compare', async () => {
    (apiGet as any).mockResolvedValue({ plan: 'PRO' });

    render(
      <BrowserRouter>
        <ComparisonPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(comparisonService.getUserAnalyses).toHaveBeenCalled();
    });

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    // Simulate changing selects
    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(selects[1], { target: { value: '2' } });

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
