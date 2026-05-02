import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './authService.CORRECTED';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
      post: vi.fn(),
      get: vi.fn(),
    })),
  };
  return { default: mockAxios };
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authService = new AuthService();
    // @ts-ignore - access private member for testing
    mockAxiosInstance = authService.axiosInstance;
  });

  it('devrait être initialisé correctement', () => {
    expect(authService).toBeDefined();
    expect(axios.create).toHaveBeenCalled();
  });

  it('devrait se connecter avec succès', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockResponse = {
      data: {
        accessToken: 'fake-access-token',
        user: mockUser,
        expiresIn: 3600,
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    const user = await authService.login('test@example.com', 'password', 'captcha');

    expect(user).toEqual(mockUser);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
      captchaToken: 'captcha',
    });
    expect(localStorage.getItem('user')).toContain('test@example.com');
  });

  it('devrait gérer l\'échec de connexion', async () => {
    const errorResponse = {
      response: {
        data: { message: 'Invalid credentials' },
      },
    };

    mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

    await expect(authService.login('test@example.com', 'wrong', 'captcha'))
      .rejects.toThrow();
  });

  it('devrait se déconnecter correctement', () => {
    authService.logout();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
