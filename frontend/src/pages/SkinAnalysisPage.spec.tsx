import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import SkinAnalysisPage from './SkinAnalysisPage';
import { MemoryRouter } from 'react-router-dom';
import * as authSession from '../lib/authSession';
import * as apiClient from '../services/apiClient';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { comparisonService } from '../services/comparison.service';
import { chatService } from '../services/chat.service';
import { svrRoutineService } from '../services/svrRoutineService';

// Mock lucide-react
vi.mock('lucide-react', () => {
  const Icon = ({ className, "data-testid": testId }: any) => <div className={className} data-testid={testId} />;
  return {
    Sparkles: (props: any) => <Icon {...props} data-testid="sparkles-icon" />,
    ArrowLeft: (props: any) => <Icon {...props} data-testid="arrowleft-icon" />,
    Zap: (props: any) => <Icon {...props} data-testid="zap-icon" />,
    AlertCircle: (props: any) => <Icon {...props} data-testid="alert-icon" />,
    GitCompare: (props: any) => <Icon {...props} data-testid="compare-icon" />,
    CheckCircle: (props: any) => <Icon {...props} data-testid="check-icon" />,
    RefreshCw: (props: any) => <Icon {...props} data-testid="refresh-icon" />,
    Activity: (props: any) => <Icon {...props} data-testid="activity-icon" />,
    BarChart2: (props: any) => <Icon {...props} data-testid="barchart-icon" />,
    Info: (props: any) => <Icon {...props} data-testid="info-icon" />,
    Waves: (props: any) => <Icon {...props} data-testid="waves-icon" />,
    Flame: (props: any) => <Icon {...props} data-testid="flame-icon" />,
    Microscope: (props: any) => <Icon {...props} data-testid="microscope-icon" />,
    Bandage: (props: any) => <Icon {...props} data-testid="bandage-icon" />,
    CircleDot: (props: any) => <Icon {...props} data-testid="circledot-icon" />,
    HeartPulse: (props: any) => <Icon {...props} data-testid="heartpulse-icon" />,
    CircleCheck: (props: any) => <Icon {...props} data-testid="circlecheck-icon" />,
    AlertTriangle: (props: any) => <Icon {...props} data-testid="alerttri-icon" />,
    BarChart3: (props: any) => <Icon {...props} data-testid="barchart3-icon" />,
    Upload: (props: any) => <Icon {...props} data-testid="upload-icon" />,
    X: (props: any) => <Icon {...props} data-testid="x-icon" />,
    Download: (props: any) => <Icon {...props} data-testid="download-icon" />,
    Volume2: (props: any) => <Icon {...props} data-testid="vol2-icon" />,
    VolumeX: (props: any) => <Icon {...props} data-testid="volx-icon" />,
    Send: (props: any) => <Icon {...props} data-testid="send-icon" />,
    Loader2: (props: any) => <Icon {...props} data-testid="loader-icon" />,
    Bot: (props: any) => <Icon {...props} data-testid="bot-icon" />,
    ArrowUpCircle: (props: any) => <Icon {...props} data-testid="arrupc-icon" />,
    Lock: (props: any) => <Icon {...props} data-testid="lock-icon" />,
    Calendar: (props: any) => <Icon {...props} data-testid="cal-icon" />,
    FlaskConical: (props: any) => <Icon {...props} data-testid="flask-icon" />,
    Sun: (props: any) => <Icon {...props} data-testid="sun-icon" />,
    Moon: (props: any) => <Icon {...props} data-testid="moon-icon" />,
    UserCircle: (props: any) => <Icon {...props} data-testid="userc-icon" />,
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.returnObjects) return []; // Return empty array for list requests
      return options?.defaultValue || key;
    },
    i18n: { language: 'fr' },
  }),
}));

// Mock services
vi.mock('../lib/authSession', () => ({
  getUser: vi.fn(),
}));

vi.mock('../services/apiClient', () => ({
  apiGet: vi.fn(),
}));

vi.mock('../services/aiAnalysisService', () => ({
  aiAnalysisService: {
    analyzeUnified: vi.fn(),
  },
}));

vi.mock('../services/comparison.service', () => ({
  comparisonService: {
    getUserAnalyses: vi.fn(),
  },
}));

vi.mock('../services/chat.service', () => ({
  chatService: {
    sendPersonalizedMessage: vi.fn(),
  },
}));

vi.mock('../services/svrRoutineService', () => ({
  svrRoutineService: {
    generateRoutine: vi.fn(() => Promise.resolve({ morning: [], night: [] })),
  },
}));

// Mock child components
vi.mock('../components/analysis/SkinProfileForm', () => ({
  SkinProfileForm: ({ profile, setProfile }: any) => (
    <div data-testid="profile-form">
      <input 
        data-testid="age-input" 
        value={profile.age} 
        onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })} 
      />
    </div>
  ),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../components/analysis/SvrRoutinePanel', () => ({
  SvrRoutinePanel: () => <div data-testid="svr-panel">SVR Routine</div>,
}));

vi.mock('../components/insights/TimelineView', () => ({
  default: () => <div data-testid="timeline-view">Timeline</div>,
}));

// Mock SpeechSynthesis
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
(global as any).speechSynthesis = {
  speak: mockSpeak,
  cancel: mockCancel,
  getVoices: vi.fn(() => []),
};
(global as any).SpeechSynthesisUtterance = vi.fn();

describe('SkinAnalysisPage', () => {
  const mockUser = { id: 'user-123' };
  const mockResult = {
    globalScore: 82,
    skinAge: 28,
    totalDetections: 5,
    metaWeighting: { aiWeight: 0.6, userWeight: 0.4 },
    conditionScores: [
      { type: 'Acne', score: 85, evaluated: true, count: 1, severity: 0.2 },
      { type: 'Hydration', score: 60, evaluated: true, count: 0, severity: 0.4 },
    ],
    analysis: {
      bestCondition: 'Acne',
      worstCondition: 'Hydration',
      dominantCondition: 'Acne',
    },
    combinedInsights: {
      'Acne': { aiScore: 80, userScore: 90, combinedScore: 85 },
      'Hydration': { aiScore: 50, userScore: 70, combinedScore: 60 },
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    (authSession.getUser as any).mockReturnValue(mockUser);
    (apiClient.apiGet as any).mockResolvedValue({ plan: 'PRO' });
    (comparisonService.getUserAnalyses as any).mockResolvedValue({ data: [], total: 0 });
  });

  const renderPage = async () => {
    return await act(async () => render(
      <MemoryRouter>
        <SkinAnalysisPage />
      </MemoryRouter>
    ));
  };

  it('renders correctly in idle state', async () => {
    await renderPage();
    expect(screen.getByText(/analysis.title/i)).toBeDefined();
    expect(screen.getByTestId('profile-form')).toBeDefined();
  });

  it('handles image upload and removal', async () => {
    await renderPage();
    
    // Mock FileReader
    const mockReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/png;base64,test',
      onloadend: null as any,
    };
    vi.stubGlobal('FileReader', vi.fn(() => mockReader));

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(hiddenInput, { target: { files: [file] } });
    });

    // Trigger the reader callback
    await act(async () => {
      if (mockReader.onloadend) mockReader.onloadend();
    });

    // Image should be visible (icon-x means image is there)
    expect(screen.getByTestId('x-icon')).toBeDefined();

    // Remove image
    const removeBtn = screen.getByTestId('x-icon').closest('button')!;
    await act(async () => fireEvent.click(removeBtn));
    expect(screen.queryByTestId('x-icon')).toBeNull();
  });

  it('runs analysis and displays results', async () => {
    (aiAnalysisService.analyzeUnified as any).mockResolvedValue(mockResult);
    (svrRoutineService.generateRoutine as any).mockResolvedValue({ morning: [], night: [] });

    await renderPage();

    // Set age
    const ageInput = screen.getByTestId('age-input');
    fireEvent.change(ageInput, { target: { value: '25' } });

    const analyzeBtn = screen.getByText(/analysis.profile.launch_analysis/i);
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    // Check phases
    await waitFor(() => {
      expect(screen.getAllByText('82').length).toBeGreaterThan(0);
      expect(screen.getByText(/analysis.scan.done/i)).toBeDefined();
    }, { timeout: 30000 });

    // Check condition bars
    expect(screen.getAllByText(/analysis.conditions.Acne/i)[0]).toBeDefined();
    expect(screen.getAllByText(/85/)[0]).toBeDefined();
  }, 30000);

  it('opens condition detail drawer', async () => {
    sessionStorage.setItem('skinAnalysisResult', JSON.stringify(mockResult));
    await renderPage();

    const acneBar = screen.getByTestId('condition-bar-Acne');
    await act(async () => fireEvent.click(acneBar));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(within(dialog).getAllByText(/Acne/i).length).toBeGreaterThan(0);
    
    const closeBtn = screen.getByTestId('x-icon').closest('button')!;
    await act(async () => fireEvent.click(closeBtn));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('triggers speech synthesis', async () => {
    sessionStorage.setItem('skinAnalysisResult', JSON.stringify(mockResult));
    await renderPage();

    const listenBtn = screen.getByText(/analysis.listen_analysis/i);
    await act(async () => fireEvent.click(listenBtn));

    expect(mockSpeak).toHaveBeenCalled();
  });

  it('handles errors during analysis', async () => {
    (aiAnalysisService.analyzeUnified as any).mockRejectedValue(new Error('Connection failed'));
    
    await renderPage();
    fireEvent.change(screen.getByTestId('age-input'), { target: { value: '25' } });
    
    const analyzeBtn = screen.getByText(/analysis.profile.launch_analysis/i);
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    const errorMsg = await screen.findAllByText(/Connection failed/i, {}, { timeout: 30000 });
    expect(errorMsg.length).toBeGreaterThan(0);
  }, 30000);
});
