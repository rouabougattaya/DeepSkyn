import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './authService.CORRECTED';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => {
      const instance = vi.fn();
      Object.assign(instance, {
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
        post: vi.fn(),
        get: vi.fn(),
        defaults: { headers: { common: {} } },
      });
      return instance;
    }),
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

  it('devrait s\'inscrire avec succès', async () => {
    const mockUser = { id: '2', email: 'new@example.com', name: 'New User' };
    const mockResponse = {
      data: {
        accessToken: 'fake-access-token',
        user: mockUser,
        expiresIn: 3600,
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    const user = await authService.register('new@example.com', 'password', 'New User');

    expect(user).toEqual(mockUser);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register', {
      email: 'new@example.com',
      password: 'password',
      name: 'New User',
    });
  });

  it('devrait se connecter avec Google', async () => {
    const mockUser = { id: '3', email: 'google@example.com', name: 'Google User' };
    const mockResponse = {
      data: {
        accessToken: 'google-token',
        user: mockUser,
        expiresIn: 3600,
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    const user = await authService.loginWithGoogle('google-id-token');

    expect(user).toEqual(mockUser);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/google', {
      token: 'google-id-token',
    });
  });

  it('devrait rafraîchir le token', async () => {
    const mockResponse = {
      data: {
        accessToken: 'refreshed-token',
        expiresIn: 3600,
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    await authService.refreshAccessToken();

    expect(authService.getAccessToken()).toBe('refreshed-token');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh');
  });

  it('devrait vérifier le 2FA', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockResponse = {
      data: {
        accessToken: '2fa-token',
        user: mockUser,
        expiresIn: 3600,
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    const user = await authService.verify2FA('123456');

    expect(user).toEqual(mockUser);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/twofactor/verify', {
      token: '123456',
    });
  });

  it('devrait demander une réinitialisation de mot de passe', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { success: true } });

    await authService.requestPasswordReset('test@example.com');

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'test@example.com',
    });
  });

  it('devrait réinitialiser le mot de passe', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { success: true } });

    await authService.resetPassword('reset-token', 'new-password');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'reset-token',
      newPassword: 'new-password',
    });
  });

  it('devrait gérer les erreurs 401 via l\'intercepteur', async () => {
    // Mock refresh succeeding
    const refreshResponse = {
      data: {
        accessToken: 'new-token',
        expiresIn: 3600,
      },
    };

    // Setup the interceptor call
    const originalRequest = { headers: {}, _retry: false };
    const error = {
      config: originalRequest,
      response: { status: 401 }
    };

    // We need to trigger the interceptor. Since it's private, we'll mock the internal call.
    mockAxiosInstance.post.mockResolvedValueOnce(refreshResponse);
    
    // @ts-ignore - access private interceptor handler
    const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
    
    // Set a mock for the retried call
    mockAxiosInstance.mockReturnValue(Promise.resolve({ data: 'success' }));

    const result = await responseInterceptor(error);
    
    expect(result.data).toBe('success');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh');
  });
});
