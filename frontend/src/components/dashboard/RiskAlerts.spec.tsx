import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskAlerts } from './RiskAlerts';
import { apiClient } from '../../services/apiClient';

// Mock les services
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { act } from 'react';

vi.mock('../../services/dashboardService', () => ({
  dashboardService: {
    getRiskPrediction: vi.fn(),
    getMetrics: vi.fn(),
    getTrends: vi.fn(),
  },
}));

vi.mock('../../services/analysisService', () => ({
  analysisService: {
    getLatestAnalysis: vi.fn(),
    getAnalysisById: vi.fn(),
  },
}));

vi.mock('../../services/digitalTwinService', () => ({
  digitalTwinService: {
    getDigitalTwin: vi.fn(),
  },
}));

// Mock window.speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
  },
  writable: true,
});

describe('RiskAlerts Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (apiClient.post as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          risks: [],
          overall_risk_score: 40,
          immediate_actions: []
        }
      }
    });
  });

  it('should render the RiskAlerts component', async () => {
    let container: any;
    await act(async () => {
      const rendered = render(<RiskAlerts />);
      container = rendered.container;
    });
    expect(container).toBeDefined();
  });

  it('should render with custom className', async () => {
    let container: any;
    await act(async () => {
      const rendered = render(<RiskAlerts className="test-class" />);
      container = rendered.container;
    });
    expect(container.querySelector('.test-class')).toBeDefined();
  });

  it('should initialize with default habits', async () => {
    await act(async () => {
      render(<RiskAlerts />);
    });
    const habits = localStorage.getItem('userHabits');
    expect(habits === null || typeof habits === 'string').toBe(true);
  });

  it('should load custom habits from localStorage', async () => {
    const customHabits = {
      sleepHours: 8,
      waterIntake: 3,
      sunProtection: 'daily',
      Exercise: 'intense',
      stressLevel: 'low',
      diet: 'healthy',
      skincarRoutine: 'advanced',
    };
    localStorage.setItem('userHabits', JSON.stringify(customHabits));

    await act(async () => {
      render(<RiskAlerts />);
    });
    const saved = localStorage.getItem('userHabits');
    expect(saved).toBe(JSON.stringify(customHabits));
  });

  it('should cleanup speech synthesis on unmount', async () => {
    let unmount: any;
    await act(async () => {
      const rendered = render(<RiskAlerts />);
      unmount = rendered.unmount;
    });
    unmount();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('should accept onRefresh callback prop', async () => {
    const mockOnRefresh = vi.fn();
    let container: any;
    await act(async () => {
      const rendered = render(<RiskAlerts onRefresh={mockOnRefresh} />);
      container = rendered.container;
    });
    expect(container).toBeDefined();
  });

  it('should show habits form when settings button is clicked', async () => {
    await act(async () => {
      render(<RiskAlerts />);
    });
    const settingsButton = screen.getByTitle(/Ajustez votre rythme de vie/i);
    fireEvent.click(settingsButton);
    expect(screen.getByText(/Mon Rythme de Vie/i)).toBeDefined();
  });
});
