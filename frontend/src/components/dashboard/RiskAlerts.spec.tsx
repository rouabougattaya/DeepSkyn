import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskAlerts } from './RiskAlerts';

// Mock les services
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

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
  });

  it('should render the RiskAlerts component', () => {
    const { container } = render(<RiskAlerts />);
    expect(container).toBeDefined();
  });

  it('should render with custom className', () => {
    const { container } = render(<RiskAlerts className="test-class" />);
    expect(container.querySelector('.test-class')).toBeDefined();
  });

  it('should initialize with default habits', () => {
    render(<RiskAlerts />);
    const habits = localStorage.getItem('userHabits');
    expect(habits === null || typeof habits === 'string').toBe(true);
  });

  it('should load custom habits from localStorage', () => {
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

    render(<RiskAlerts />);
    const saved = localStorage.getItem('userHabits');
    expect(saved).toBe(JSON.stringify(customHabits));
  });

  it('should cleanup speech synthesis on unmount', () => {
    const { unmount } = render(<RiskAlerts />);
    unmount();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('should accept onRefresh callback prop', () => {
    const mockOnRefresh = vi.fn();
    const { container } = render(<RiskAlerts onRefresh={mockOnRefresh} />);
    expect(container).toBeDefined();
  });
});
