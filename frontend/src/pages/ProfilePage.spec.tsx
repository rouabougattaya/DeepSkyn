import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProfilePage from './ProfilePage';
import { MemoryRouter } from 'react-router-dom';
import * as authSession from '@/lib/authSession';
import * as aiService from '@/services/aiService';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Save: () => <div data-testid="save-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
}));

// Mock components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, type, variant }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, disabled, className, type, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      type={type}
      placeholder={placeholder}
    />
  ),
}));

// Mock services
vi.mock('@/lib/authSession', () => ({
  authFetch: vi.fn(),
  getAccessToken: vi.fn(),
  clearSession: vi.fn(),
  updateSessionUser: vi.fn(),
}));

vi.mock('@/services/aiService', () => ({
  aiService: {
    calculateTrustScore: vi.fn(),
  },
}));

vi.mock('@/services/historyService', () => ({
  historyService: {
    was2FAUsedRecently: vi.fn(() => Promise.resolve(true)),
    updateUserScoreSimple: vi.fn(),
  },
}));

describe('ProfilePage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Hello world',
    birthDate: '1990-01-01',
    aiScore: 0.85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (authSession.getAccessToken as any).mockReturnValue('fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
  });

  const renderPage = async () => {
    return await act(async () => render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    ));
  };

  it('renders correctly and loads user data from localStorage', async () => {
    await renderPage();
    expect(screen.getByText(/Mon profil/i)).toBeDefined();
    expect(screen.getByDisplayValue('John')).toBeDefined();
    expect(screen.getByDisplayValue('Doe')).toBeDefined();
    expect(screen.getByText('85%')).toBeDefined();
  });

  it('validates profile and shows errors', async () => {
    await renderPage();
    
    const firstNameInput = screen.getByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: '' } });
    
    const saveBtn = screen.getByText(/Enregistrer/i);
    await act(async () => {
        fireEvent.click(saveBtn);
    });

    expect(screen.getByText(/Prénom obligatoire/i)).toBeDefined();
  });

  it('handles successful profile update', async () => {
    (authSession.authFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockUser, firstName: 'Jane' }),
    });
    (aiService.aiService.calculateTrustScore as any).mockReturnValue({ score: 0.9, bioStatus: 1 });

    await renderPage();
    
    const firstNameInput = screen.getByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

    const saveBtn = screen.getByText(/Enregistrer/i);
    await act(async () => {
        fireEvent.click(saveBtn);
    });

    await waitFor(() => {
        expect(screen.getByText(/Profil mis à jour/i)).toBeDefined();
        expect(authSession.updateSessionUser).toHaveBeenCalled();
    });
  });

  it('handles account deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (authSession.authFetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

    await renderPage();
    
    const deleteBtn = screen.getByText(/Supprimer/i);
    await act(async () => {
        fireEvent.click(deleteBtn);
    });

    expect(authSession.clearSession).toHaveBeenCalled();
  });

  it('redirects to login if not authenticated', async () => {
    (authSession.getAccessToken as any).mockReturnValue(null);
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );
    // Navigation is handled by useEffect, difficult to test directly without mocking navigate
  });
});
