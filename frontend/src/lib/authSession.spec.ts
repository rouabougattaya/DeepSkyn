import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getAccessToken, getRefreshToken, getUser, setSession, clearSession, 
  hasSession, logout, updateSessionUser, authFetch 
} from './authSession';

const mockApiUrl = 'http://localhost:3001/api';

describe('authSession', () => {
  const mockTokens = {
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
    accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
    user: { id: '1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', role: 'ADMIN' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Getters & Setters', () => {
    it('should set and get session properly with normalized role', () => {
      setSession(mockTokens);
      expect(getAccessToken()).toBe('mock-access');
      expect(getRefreshToken()).toBe('mock-refresh');
      const user = getUser();
      expect(user).toBeDefined();
      expect(user?.role).toBe('admin'); // Role should be lowercase normalized
      expect(localStorage.getItem('accessTokenExpiresAt')).toBe(mockTokens.accessTokenExpiresAt);
    });

    it('should fall back to token legacy for access token', () => {
      localStorage.setItem('token', 'legacy-token');
      expect(getAccessToken()).toBe('legacy-token');
    });

    it('should handle invalid user JSON gracefully', () => {
      localStorage.setItem('user', '{invalid-json}');
      expect(getUser()).toBeNull();
    });

    it('should update session user correctly', () => {
      setSession(mockTokens);
      updateSessionUser({ firstName: 'Jane' });
      const user = getUser();
      expect(user?.firstName).toBe('Jane');
      expect(user?.lastName).toBe('Doe'); // Kept original
    });

    it('should do nothing if updating user but no user is set', () => {
      updateSessionUser({ firstName: 'Jane' });
      expect(getUser()).toBeNull();
    });

    it('should clear session completely', () => {
      setSession(mockTokens);
      clearSession();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getUser()).toBeNull();
      expect(localStorage.getItem('accessTokenExpiresAt')).toBeNull();
    });
  });

  describe('hasSession', () => {
    it('should return false if no token', () => {
      expect(hasSession()).toBe(false);
    });

    it('should return false and clear session if no expiresAt is found', () => {
      localStorage.setItem('accessToken', 'mock-access');
      expect(hasSession()).toBe(false);
      expect(getAccessToken()).toBeNull(); // Cleared
    });

    it('should return false and clear session if expiresAt is invalid date', () => {
      localStorage.setItem('accessToken', 'mock-access');
      localStorage.setItem('accessTokenExpiresAt', 'invalid-date');
      expect(hasSession()).toBe(false);
      expect(getAccessToken()).toBeNull(); // Cleared
    });

    it('should return false and clear session if expired', () => {
      vi.useFakeTimers();
      const pastDate = new Date(Date.now() - 1000).toISOString();
      localStorage.setItem('accessToken', 'mock-access');
      localStorage.setItem('accessTokenExpiresAt', pastDate);
      expect(hasSession()).toBe(false);
      expect(getAccessToken()).toBeNull(); // Cleared
      vi.useRealTimers();
    });

    it('should return true if token is present and valid', () => {
      vi.useFakeTimers();
      const futureDate = new Date(Date.now() + 10000).toISOString();
      localStorage.setItem('accessToken', 'mock-access');
      localStorage.setItem('accessTokenExpiresAt', futureDate);
      expect(hasSession()).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('logout', () => {
    it('should call auth/logout and clear session', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
      setSession(mockTokens);
      await logout();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({ method: 'POST' }));
      expect(getAccessToken()).toBeNull();
    });

    it('should clear session even if auth/logout fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      setSession(mockTokens);
      await logout();
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('authFetch', () => {
    it('should add authorization header if access token exists', async () => {
      localStorage.setItem('accessToken', 'mock-access');
      (global.fetch as any).mockResolvedValue({ ok: true });
      
      await authFetch('/test-endpoint');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer mock-access"
          }
        })
      );
    });

    it('should fetch and attach CSRF token for POST requests', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'csrf-123' }) }) // CSRF call
        .mockResolvedValueOnce({ ok: true }); // Actual call
      
      await authFetch('/test-post', { method: 'POST' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-post'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ "X-CSRF-Token": "csrf-123" })
        })
      );
    });

    it('should retry with refresh token on 401', async () => {
      setSession(mockTokens);
      
      // 1. CSRF for refresh (if POST) - wait, refresh is POST
      // 2. Initial fetch 401
      // 3. CSRF for refresh
      // 4. Refresh token call
      // 5. Retry fetch
      (global.fetch as any)
        .mockResolvedValueOnce({ status: 401 }) // Initial call fails
        .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'csrf-123' }) }) // CSRF for refresh
        .mockResolvedValueOnce({ 
          ok: true, 
          json: async () => ({ accessToken: 'new-access', refreshToken: 'new-refresh', user: { role: 'user' } }) 
        }) // Refresh call
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Retry call

      const res = await authFetch('/test-401');
      
      expect(res.status).toBe(200);
      expect(getAccessToken()).toBe('new-access');
    });

    it('should clear session if refresh token fails', async () => {
      setSession(mockTokens);
      
      (global.fetch as any)
        .mockResolvedValueOnce({ status: 401 }) // Initial call fails
        .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'csrf-123' }) }) // CSRF for refresh
        .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) }); // Refresh fails

      await authFetch('/test-401-fail');
      
      expect(getAccessToken()).toBeNull(); // Session cleared
    });
    
    it('should not retry if 401 but no refresh token', async () => {
      localStorage.setItem('accessToken', 'mock-access');
      (global.fetch as any).mockResolvedValue({ status: 401 });
      
      const res = await authFetch('/test-401-no-refresh');
      
      expect(res.status).toBe(401);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should not retry if google temp token is used', async () => {
      setSession({ ...mockTokens, accessToken: 'google_123' });
      (global.fetch as any).mockResolvedValue({ status: 401 });
      
      const res = await authFetch('/test-401-google');
      
      expect(res.status).toBe(401);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });
  });
});
