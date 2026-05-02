import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SkinDigitalTwinPage from './SkinDigitalTwinPage';
import { digitalTwinService } from '@/services/digitalTwinService';
import * as authSession from '@/lib/authSession';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
    useParams: () => ({ analysisId: 'test-analysis-123' })
  };
});

vi.mock('@/services/digitalTwinService', () => ({
  digitalTwinService: {
    getLatestDigitalTwin: vi.fn(),
    getDigitalTwinTimeline: vi.fn(),
    createDigitalTwin: vi.fn()
  }
}));

vi.mock('@/lib/authSession', () => ({
  getUser: vi.fn(),
  authFetch: vi.fn()
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

// Mock SpeechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    cancel: vi.fn(),
    speak: vi.fn()
  }
});

// Mock SpeechSynthesisUtterance
(global as any).SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
  lang: '',
  rate: 1,
  onend: null,
  onerror: null
}));

describe('SkinDigitalTwinPage Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (authSession.getUser as any).mockReturnValue({ id: 'user-123' });
    (authSession.authFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'PRO' })
    });
    
    (digitalTwinService.getLatestDigitalTwin as any).mockResolvedValue(null);
  });

  it('shows loading state initially', () => {
    // Keep getLatestDigitalTwin unresolved to test loading
    let resolveMock: any;
    (digitalTwinService.getLatestDigitalTwin as any).mockReturnValue(new Promise(resolve => {
      resolveMock = resolve;
    }));

    render(
      <BrowserRouter>
        <SkinDigitalTwinPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading your skin future/i)).toBeDefined();
    
    // Resolve to clean up
    resolveMock(null);
  });

  it('renders creation form if PRO and no existing twin', async () => {
    render(
      <BrowserRouter>
        <SkinDigitalTwinPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Create Your Skin Digital Twin/i)).toBeDefined();
      expect(screen.getByText(/Routine Consistency/i)).toBeDefined();
    });
  });

  it('renders upgrade prompt if FREE and no existing twin', async () => {
    (authSession.authFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'FREE' })
    });

    render(
      <BrowserRouter>
        <SkinDigitalTwinPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unlock Advanced Skin Simulation/i)).toBeDefined();
      expect(screen.getByText(/exclusively available for PRO members/i)).toBeDefined();
    });
  });

  it('can create a new digital twin and show the timeline', async () => {
    (digitalTwinService.createDigitalTwin as any).mockResolvedValue({ id: 'new-twin-id' });
    (digitalTwinService.getDigitalTwinTimeline as any).mockResolvedValue({
      currentState: { skinScore: 80, skinAge: 30, metrics: { hydration: 80, oil: 50, acne: 10, wrinkles: 20 } },
      trends: { overallTrajectory: 'Improving' },
      intervals: [],
      predictions: {
        month1: { skinScore: 82, skinAge: 30, metrics: { hydration: 82, oil: 48, acne: 8, wrinkles: 18 }, improvements: [], concerns: [], degradations: [] },
        month3: { skinScore: 85, skinAge: 29, metrics: { hydration: 85, oil: 45, acne: 5, wrinkles: 15 }, improvements: [], concerns: [], degradations: [] },
        month6: { skinScore: 88, skinAge: 28, metrics: { hydration: 88, oil: 40, acne: 2, wrinkles: 12 }, improvements: [], concerns: [], degradations: [] }
      }
    });

    render(
      <BrowserRouter>
        <SkinDigitalTwinPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Create Your Skin Digital Twin/i)).toBeDefined();
    });

    const createBtn = screen.getByRole('button', { name: /Simulate My Future Skin/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(digitalTwinService.createDigitalTwin).toHaveBeenCalledWith('test-analysis-123', {
        routineConsistency: 'medium',
        lifestyleFactors: []
      });
      expect(screen.getByText(/Your Personalized Recommendation/i)).toBeDefined();
    });
  });
});
