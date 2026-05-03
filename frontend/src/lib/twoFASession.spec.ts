import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  saveTwoFASession, 
  getTwoFASession, 
  clearTwoFASession, 
  isTwoFASessionValid 
} from './twoFASession';

describe('twoFASession library', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should save 2FA session data', () => {
    const loginData = {
      user: { id: 'user-123', email: 'test@test.com', firstName: 'John', lastName: 'Doe' },
      requiresTwoFa: true
    };
    
    saveTwoFASession(loginData);
    
    const stored = JSON.parse(sessionStorage.getItem('deepskyn_2fa_session')!);
    expect(stored.userId).toBe('user-123');
    expect(stored.requiresTwoFa).toBe(true);
    expect(stored.timestamp).toBeDefined();
  });

  it('should retrieve 2FA session if not expired', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const sessionData = {
      userId: 'user-123',
      timestamp: now
    };
    
    sessionStorage.setItem('deepskyn_2fa_session', JSON.stringify(sessionData));
    
    expect(getTwoFASession()).toEqual(sessionData);
    expect(isTwoFASessionValid()).toBe(true);
  });

  it('should return null and clear if session is expired', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const sessionData = {
      userId: 'user-123',
      timestamp: now - (11 * 60 * 1000) // 11 minutes ago (timeout is 10)
    };
    
    sessionStorage.setItem('deepskyn_2fa_session', JSON.stringify(sessionData));
    
    expect(getTwoFASession()).toBeNull();
    expect(sessionStorage.getItem('deepskyn_2fa_session')).toBeNull();
  });

  it('should clear session explicitly', () => {
    sessionStorage.setItem('deepskyn_2fa_session', 'data');
    clearTwoFASession();
    expect(sessionStorage.getItem('deepskyn_2fa_session')).toBeNull();
  });
});
