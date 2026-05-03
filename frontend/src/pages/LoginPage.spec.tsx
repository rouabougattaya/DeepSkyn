import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as authSession from '@/lib/authSession';
import * as twoFASession from '@/lib/twoFASession';
import { historyService } from '@/services/historyService';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: {} }),
    Link: ({ children, to }: any) => <a href={to}>{children}</a>
  };
});

// Mock ReCAPTCHA
vi.mock('react-google-recaptcha', () => ({
  default: vi.fn().mockImplementation(({ onChange }) => (
    <button data-testid="mock-recaptcha" onClick={() => onChange('fake-token')}>
      Verify Captcha
    </button>
  ))
}));

// Mock services
vi.mock('@/lib/authSession', () => ({
  setSession: vi.fn()
}));

vi.mock('@/lib/twoFASession', () => ({
  saveTwoFASession: vi.fn()
}));

vi.mock('@/services/historyService', () => ({
  historyService: {
    recordLoginAttempt: vi.fn()
  }
}));

vi.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({ isLoading: false }),
  signInWithGoogleRedirect: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn();

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: '1', email: 'test@test.com', role: 'USER' }
      })
    });
  });

  it('renders login form correctly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByText(/Welcome Back/i)).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
  });

  it('shows validation errors for empty fields', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );
    });

    // Simulate captcha validation first
    fireEvent.click(screen.getByTestId('mock-recaptcha'));

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/L'email est requis/i)).toBeDefined();
    });
  });

  it('handles successful login and redirects to home', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Password123!' } });
    
    // Validate captcha
    fireEvent.click(screen.getByTestId('mock-recaptcha'));

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authSession.setSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('handles 2FA requirement', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        requiresTwoFa: true,
        user: { id: '1', email: 'test@test.com' }
      })
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByTestId('mock-recaptcha'));

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(twoFASession.saveTwoFASession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth/2fa', expect.anything());
    });
  });

  it('shows error on failed login', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' })
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByTestId('mock-recaptcha'));

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeDefined();
      expect(historyService.recordLoginAttempt).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    });
  });
});
