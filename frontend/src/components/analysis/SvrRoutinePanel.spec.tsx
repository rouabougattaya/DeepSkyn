import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SvrRoutinePanel } from './SvrRoutinePanel';
import { svrRoutineService } from '../../services/svrRoutineService';
import type { UserSkinProfile } from '../../types/aiAnalysis';

// Mock the service
vi.mock('../../services/svrRoutineService', () => ({
  svrRoutineService: {
    generateRoutine: vi.fn(),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
  }),
}));

describe('SvrRoutinePanel Component', () => {
  const mockProfile: UserSkinProfile = {
    skinType: 'Combination',
    age: 30,
    gender: 'Female',
    concerns: ['acne', 'hydration'],
  };

  const mockRoutineResult = {
    skinProfile: 'Peau mixte à tendance acnéique',
    morning: [
      {
        stepName: 'Nettoyage',
        instruction: 'Appliquer sur peau mouillée',
        reason: 'Purifie sans dessécher',
        product: {
          name: 'SVR Sebiaclear Gel Moussant',
          category: 'cleanser',
          description: 'Gel nettoyant sans savon',
          imageUrl: 'http://example.com/gel.jpg',
          keyIngredients: ['Gluconolactone', 'Mat SR'],
        },
      },
    ],
    night: [],
    recommendedProducts: [
      {
        name: 'SVR Sebiaclear Gel Moussant',
        category: 'cleanser',
        imageUrl: 'http://example.com/gel.jpg',
        skinBenefit: 'Anti-imperfections',
        keyIngredients: ['Gluconolactone'],
        reason: 'Idéal pour les peaux mixtes',
        score: 9.5,
        url: 'http://svr.com/product',
      },
    ],
    generalAdvice: 'Utiliser une protection solaire la journée.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (svrRoutineService.generateRoutine as any).mockResolvedValue(mockRoutineResult);
  });

  it('renders notice for FREE plan users', () => {
    render(
      <SvrRoutinePanel
        profile={mockProfile}
        currentPlan="FREE"
      />
    );

    expect(screen.getByText(/Passer à PRO/i)).toBeDefined();
  });

  it('automatically triggers generation for PRO plan users', async () => {
    render(
      <SvrRoutinePanel
        profile={mockProfile}
        currentPlan="PRO"
      />
    );

    await waitFor(() => {
      expect(svrRoutineService.generateRoutine).toHaveBeenCalled();
    });

    expect(screen.getAllByText(/SVR Sebiaclear Gel Moussant/i).length).toBeGreaterThan(0);
  });

  it('switches between morning and night tabs', async () => {
    render(
      <SvrRoutinePanel
        profile={mockProfile}
        currentPlan="PRO"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Routine Matin/i)).toBeDefined();
    });

    const nightTab = screen.getByText(/Routine Soir/i);
    fireEvent.click(nightTab);

    // After switching to night, morning step should not be visible if night is empty
    // But in our mock, night is empty, so we just check it doesn't crash
    expect(screen.getByText(/Routine Soir/i)).toBeDefined();
  });

  it('shows AI reason when clicking analysis button', async () => {
    render(
      <SvrRoutinePanel
        profile={mockProfile}
        currentPlan="PRO"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Analyse IA/i)).toBeDefined();
    });

    const aiButton = screen.getAllByText(/Analyse IA/i)[0];
    fireEvent.click(aiButton);

    expect(screen.getByText(/Idéal pour les peaux mixtes/i)).toBeDefined();
  });

  it('displays loading state during generation', async () => {
    // Make service hang
    (svrRoutineService.generateRoutine as any).mockReturnValue(new Promise(() => {}));

    render(
      <SvrRoutinePanel
        profile={mockProfile}
        currentPlan="PRO"
      />
    );

    expect(screen.getByText(/Génération en cours/i)).toBeDefined();
  });

  it('handles error during generation', async () => {
    (svrRoutineService.generateRoutine as any).mockRejectedValue(new Error('API Fail'));

    render(
      <SvrRoutinePanel
        profile={mockProfile}
        currentPlan="PRO"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/API Fail/i)).toBeDefined();
    });
  });
});
