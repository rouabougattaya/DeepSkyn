import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkinProfileForm } from './SkinProfileForm';
import { DEFAULT_QUESTIONNAIRE } from '../../types/skinQuestionnaire';
import type { UserSkinProfile } from '../../types/aiAnalysis';

describe('SkinProfileForm Component', () => {
  const mockProfile: UserSkinProfile = {
    skinType: 'Normal',
    gender: 'Female',
    age: 25,
    ethnicity: 'Type III',
    concerns: []
  };

  const mockQuestionnaire = { ...DEFAULT_QUESTIONNAIRE };

  const mockSetProfile = vi.fn();
  const mockSetQuestionnaire = vi.fn();

  it('renders correctly with initial data', () => {
    render(
      <SkinProfileForm
        profile={mockProfile}
        setProfile={mockSetProfile}
        questionnaire={mockQuestionnaire}
        setQuestionnaire={mockSetQuestionnaire}
      />
    );

    expect(screen.getByText(/Grasse/i)).toBeDefined();
    expect(screen.getByText(/Sèche/i)).toBeDefined();
  });

  it('calls setProfile when skin type is selected', () => {
    render(
      <SkinProfileForm
        profile={mockProfile}
        setProfile={mockSetProfile}
        questionnaire={mockQuestionnaire}
        setQuestionnaire={mockSetQuestionnaire}
      />
    );

    const oilyButton = screen.getByText(/Grasse/i).closest('button');
    if (oilyButton) fireEvent.click(oilyButton);
    
    expect(mockSetProfile).toHaveBeenCalled();
  });

  it('displays sub-sections when enabled in questionnaire', () => {
    const activeQuestionnaire = {
      ...mockQuestionnaire,
      acne: { ...mockQuestionnaire.acne, enabled: true }
    };

    render(
      <SkinProfileForm
        profile={mockProfile}
        setProfile={mockSetProfile}
        questionnaire={activeQuestionnaire}
        setQuestionnaire={mockSetQuestionnaire}
      />
    );

    expect(screen.getByText(/Acné — Diagnostic Détaillé/i)).toBeDefined();
  });

  it('updates acne severity when a level is clicked', () => {
    const activeQuestionnaire = {
      ...mockQuestionnaire,
      acne: { ...mockQuestionnaire.acne, enabled: true }
    };

    render(
      <SkinProfileForm
        profile={mockProfile}
        setProfile={mockSetProfile}
        questionnaire={activeQuestionnaire}
        setQuestionnaire={mockSetQuestionnaire}
      />
    );

    const moderateButton = screen.getByText(/Modéré/i).closest('button');
    if (moderateButton) fireEvent.click(moderateButton);

    expect(mockSetQuestionnaire).toHaveBeenCalled();
  });

  it('updates sensitivity level when clicked', () => {
    const activeQuestionnaire = {
      ...mockQuestionnaire,
      sensitivity: { ...mockQuestionnaire.sensitivity, enabled: true }
    };

    render(
      <SkinProfileForm
        profile={mockProfile}
        setProfile={mockSetProfile}
        questionnaire={activeQuestionnaire}
        setQuestionnaire={mockSetQuestionnaire}
      />
    );

    const reactiveButton = screen.getByText(/Réactive/i).closest('button');
    if (reactiveButton) fireEvent.click(reactiveButton);

    expect(mockSetQuestionnaire).toHaveBeenCalled();
  });

  it('updates redness level when clicked', () => {
    const activeQuestionnaire = {
      ...mockQuestionnaire,
      redness: { ...mockQuestionnaire.redness, enabled: true }
    };

    render(
      <SkinProfileForm
        profile={mockProfile}
        setProfile={mockSetProfile}
        questionnaire={activeQuestionnaire}
        setQuestionnaire={mockSetQuestionnaire}
      />
    );

    const diffuseButton = screen.getByText(/Diffuse/i).closest('button');
    if (diffuseButton) fireEvent.click(diffuseButton);

    expect(mockSetQuestionnaire).toHaveBeenCalled();
  });
});
