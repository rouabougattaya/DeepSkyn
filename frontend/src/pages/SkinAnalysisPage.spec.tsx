import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SkinAnalysisPage from './SkinAnalysisPage';
import { BrowserRouter } from 'react-router-dom';
import * as authSession from '@/lib/authSession';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { comparisonService } from '../services/comparison.service';
import { svrRoutineService } from '../services/svrRoutineService';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
        if (options?.returnObjects) return [];
        if (key.includes('interpretation') || key.includes('optimal') || key.includes('moderate') || key.includes('critical')) {
            return `${key} : details`;
        }
        return `${options?.defaultValue || key}`;
    },
    i18n: { changeLanguage: vi.fn(), language: 'fr' },
  }),
}));

// Mock Lucide (simplified)
vi.mock('lucide-react', () => {
  const Icon = () => <div />;
  return {
    Sparkles: Icon, ArrowLeft: Icon, Zap: Icon, AlertCircle: Icon, GitCompare: Icon, 
    CheckCircle: Icon, RefreshCw: Icon, Activity: Icon, BarChart2: Icon, Info: Icon, 
    Waves: Icon, Flame: Icon, Microscope: Icon, Bandage: Icon, CircleDot: Icon, 
    HeartPulse: Icon, CircleCheck: Icon, AlertTriangle: Icon, BarChart3: Icon, 
    Upload: Icon, X: Icon, Download: Icon, Volume2: Icon, VolumeX: Icon, Send: Icon, 
    Loader2: Icon, Bot: Icon, ArrowUpCircle: Icon, Lock: Icon, Calendar: Icon, 
    FlaskConical: Icon, Sun: Icon, Moon: Icon, UserCircle: Icon,
  };
});

// Mock services
vi.mock('../services/aiAnalysisService', () => ({ aiAnalysisService: { analyzeUnified: vi.fn(), analyzeImage: vi.fn() } }));
vi.mock('../services/apiClient', () => ({
  apiGet: vi.fn(() => Promise.resolve({ plan: 'FREE' })),
  apiPost: vi.fn(() => Promise.resolve({ success: true, data: {} })),
}));
vi.mock('../services/comparison.service', () => ({ comparisonService: { getUserAnalyses: vi.fn(() => Promise.resolve({data:[]})) } }));
vi.mock('../services/svrRoutineService', () => ({ svrRoutineService: { generateRoutine: vi.fn(() => Promise.resolve({morning:[], night:[], generalAdvice: ""})) } }));
vi.mock('../lib/authSession', () => ({ getUser: vi.fn(() => ({id:'123'})) }));
vi.mock('react-chartjs-2', () => ({ Line: () => <div /> }));

// Mock components
vi.mock('../components/analysis/SkinProfileForm', () => ({ 
    SkinProfileForm: ({ profile, setProfile }: any) => (
        <div>
          <input 
            data-testid="age-input" 
            type="number" 
            value={profile.age || ''} 
            onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
          />
        </div>
    )
}));

// Mock Web Speech API
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
    text, lang: '', onend: null,
}));

describe('SkinAnalysisPage - Robust Tests', () => {
  const mockResult = {
    globalScore: 82,
    totalDetections: 5,
    conditionScores: [
      { type: 'Acne', score: 45, severity: 0.6, count: 2, evaluated: true }
    ],
    analysis: { bestCondition: 'Hydration', worstCondition: 'Acne' },
    metaWeighting: { aiWeight: 0.5, userWeight: 0.5 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    (authSession.getUser as any).mockReturnValue({ id: 'user-123' });
    (aiAnalysisService.analyzeUnified as any).mockResolvedValue(mockResult);
  });

  const renderPage = async () => {
    return await act(async () => render(<BrowserRouter><SkinAnalysisPage /></BrowserRouter>));
  };

  it('renders correctly', async () => {
    await renderPage();
    expect(screen.getByText(/analysis.title/)).toBeDefined();
  });

  it('restores result from sessionStorage', async () => {
    sessionStorage.setItem('skinAnalysisResult', JSON.stringify(mockResult));
    await renderPage();
    expect(screen.getAllByText('82').length).toBeGreaterThan(0);
  });

  it('opens condition detail drawer on click', async () => {
    sessionStorage.setItem('skinAnalysisResult', JSON.stringify(mockResult));
    await renderPage();

    // Find the condition bar for Acne
    const acneBars = screen.getAllByText(/Acne/);
    const acneBtn = acneBars.find(el => el.closest('[role="button"]'))?.closest('[role="button"]');
    
    expect(acneBtn).toBeDefined();
    
    await act(async () => {
      fireEvent.click(acneBtn!);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    }, { timeout: 2000 });
  });

  it('handles analysis submission', async () => {
    await renderPage();

    const ageInput = screen.getByTestId('age-input');
    fireEvent.change(ageInput, { target: { value: '25' } });

    const analyzeBtn = screen.getByText(/analysis.profile.launch_analysis/);
    
    await waitFor(() => expect(analyzeBtn.getAttribute('disabled')).toBeNull());
    
    await act(async () => {
        fireEvent.click(analyzeBtn);
    });

    // We wait for the analysis to complete (it has internal timeouts total ~2s)
    await waitFor(() => {
      expect(aiAnalysisService.analyzeUnified).toHaveBeenCalled();
      expect(screen.getAllByText('82').length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it('handles speech synthesis toggle', async () => {
    (global as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    };

    sessionStorage.setItem('skinAnalysisResult', JSON.stringify(mockResult));
    await renderPage();

    const speakBtn = screen.getByText(/analysis.listen_analysis/);
    await act(async () => {
        fireEvent.click(speakBtn);
    });

    expect(global.speechSynthesis.speak).toHaveBeenCalled();
  });
});
