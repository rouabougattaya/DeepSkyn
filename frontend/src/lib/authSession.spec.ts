import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAccessToken, 
  getRefreshToken, 
  getUser, 
  setSession, 
  clearSession, 
  hasSession,
  logout,
  authFetch,
  updateSessionUser
} from './authSession';

// Mock fetch
global.fetch = vi.fn();

describe('authSession library', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('Token management', () => {
    it('should get access token from localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(getAccessToken()).toBe('test-token');
    });

    it('should fallback to "token" key if "accessToken" is missing', () => {
      localStorage.setItem('token', 'legacy-token');
      expect(getAccessToken()).toBe('legacy-token');
    });

    it('should get refresh token', () => {
      localStorage.setItem('refreshToken', 'refresh-token');
      expect(getRefreshToken()).toBe('refresh-token');
    });

    it('should get and parse user', () => {
      const user = { id: '1', email: 'test@test.com' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(getUser()).toEqual(user);
    });

    it('should return null if user is invalid JSON', () => {
      localStorage.setItem('user', 'invalid');
      expect(getUser()).toBeNull();
    });
  });

  describe('Session lifecycle', () => {
    it('should set session tokens and user', () => {
      const sessionData = {
        accessToken: 'access',
        refreshToken: 'refresh',
        accessTokenExpiresAt: '2026-01-01T00:00:00Z',
        refreshTokenExpiresAt: '2026-01-02T00:00:00Z',
        user: { id: '1', email: 'test@test.com', role: 'ADMIN' as any }
      };
      
      setSession(sessionData as any);
      
      expect(localStorage.getItem('accessToken')).toBe('access');
      expect(localStorage.getItem('refreshToken')).toBe('refresh');
      const savedUser = JSON.parse(localStorage.getItem('user')!);
      expect(savedUser.role).toBe('admin'); // normalized to lowercase
    });

    it('should clear session', () => {
      localStorage.setItem('accessToken', 'access');
      clearSession();
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('should validate session status', () => {
      vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
      
      // No token
      expect(hasSession()).toBe(false);
      
      // Token but no expiration
      localStorage.setItem('accessToken', 'access');
      expect(hasSession()).toBe(false);
      
      // Token and valid expiration
      localStorage.setItem('accessToken', 'access');
      localStorage.setItem('accessTokenExpiresAt', '2026-01-01T11:00:00Z');
      expect(hasSession()).toBe(true);
      
      // Token and expired
      localStorage.setItem('accessToken', 'access');
      localStorage.setItem('accessTokenExpiresAt', '2026-01-01T09:00:00Z');
      expect(hasSession()).toBe(false);
    });
  });

  describe('authFetch', () => {
    it('should add Authorization header if token exists', async () => {
      localStorage.setItem('accessToken', 'valid-token');
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await authFetch('/test');
      
      const lastCall = (global.fetch as any).mock.calls[0];
      expect(lastCall[1].headers['Authorization']).toBe('Bearer valid-token');
    });

    it('should handle token refresh on 401', async () => {
      localStorage.setItem('refreshToken', 'refresh-token');
      localStorage.setItem('accessToken', 'expired-token');
      
      // 1st call fails 401, refresh succeeds, 2nd call succeeds
      (global.fetch as any)
        .mockResolvedValueOnce({ status: 401, ok: false }) // Initial call
        .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'csrf' }) }) // getCsrfToken for refresh
        .mockResolvedValueOnce({ // Refresh call
          ok: true, 
          json: async () => ({ 
            accessToken: 'new-access',
            user: { id: '1' }
          }) 
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: 'success' }) }); // Retried call

      const res = await authFetch('/test');
      expect(localStorage.getItem('accessToken')).toBe('new-access');
      expect(global.fetch).toHaveBeenCalledTimes(4); // original + csrf + refresh + retry
    });
  });

  describe('updateSessionUser', () => {
    it('should update partial user info', () => {
      const user = { id: '1', firstName: 'John', lastName: 'Doe' };
      localStorage.setItem('user', JSON.stringify(user));
      
      updateSessionUser({ firstName: 'Jane' });
      
      const updated = JSON.parse(localStorage.getItem('user')!);
      expect(updated.firstName).toBe('Jane');
      expect(updated.lastName).toBe('Doe');
    });
  });
});
