import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import * as faceLib from '../lib/face';
import * as authSession from '@/lib/authSession';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>
  };
});

// Mock face library
vi.mock('../lib/face', () => ({
  loadFaceModels: vi.fn().mockResolvedValue(true),
  getFaceDescriptor: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
}));

// Mock authSession
vi.mock('@/lib/authSession', () => ({
  setSession: vi.fn()
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  },
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: { id: '1' } })
    });
  });

  it('renders registration form', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByText(/Create an Account/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/First Name/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Email/i)).toBeDefined();
  });

  it('handles camera opening and face capture', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );
    });

    const enableCamBtn = screen.getByText(/Enable Camera/i);
    fireEvent.click(enableCamBtn);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(screen.getByText(/Capture Face/i)).toBeDefined();
    });

    const captureBtn = screen.getByText(/Capture Face/i);
    fireEvent.click(captureBtn);

    await waitFor(() => {
      expect(faceLib.getFaceDescriptor).toHaveBeenCalled();
      expect(screen.getByText(/Face captured successfully/i)).toBeDefined();
    });
  });

  it('handles successful registration', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );
    });

    // Fill fields
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'Password123!' } });

    // Mock captured face (state update)
    const enableCamBtn = screen.getByText(/Enable Camera/i);
    fireEvent.click(enableCamBtn);
    await waitFor(() => screen.getByText(/Capture Face/i));
    fireEvent.click(screen.getByText(/Capture Face/i));
    await waitFor(() => screen.getByText(/Face captured successfully/i));

    const signUpBtn = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(signUpBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"firstName":"John"')
      }));
      expect(authSession.setSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows error if face is not captured', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );
    });

    const signUpBtn = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(signUpBtn);

    expect(screen.getByText(/Please capture your face/i)).toBeDefined();
  });
});
