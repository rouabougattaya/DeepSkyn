import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveTwoFASession, getTwoFASession, clearTwoFASession, isTwoFASessionValid } from './twoFASession';

const STORAGE_KEY = 'deepskyn_2fa_session';

describe('twoFASession utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockLoginData = {
    user: {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    requiresTwoFa: true,
  };

  it('should save 2FA session correctly', () => {
    const now = 1000000000000;
    vi.setSystemTime(new Date(now));

    saveTwoFASession(mockLoginData);

    const storedStr = sessionStorage.getItem(STORAGE_KEY);
    expect(storedStr).toBeDefined();
    
    const stored = JSON.parse(storedStr!);
    expect(stored).toEqual({
      userId: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      requiresTwoFa: true,
      timestamp: now,
    });
    expect(console.log).toHaveBeenCalledWith('2FA session saved:', stored);
  });

  it('should return null if no session data is found', () => {
    expect(getTwoFASession()).toBeNull();
  });

  it('should return session data if valid', () => {
    saveTwoFASession(mockLoginData);
    const session = getTwoFASession();
    
    expect(session).not.toBeNull();
    expect(session?.userId).toBe('123');
  });

  it('should return null and clear if session is expired', () => {
    saveTwoFASession(mockLoginData);

    // Advance time by 10 minutes and 1 second
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);

    const session = getTwoFASession();
    
    expect(session).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('2FA session expired');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull(); // Should be cleared
  });

  it('should return null if JSON parsing fails', () => {
    sessionStorage.setItem(STORAGE_KEY, 'invalid-json');

    const session = getTwoFASession();
    
    expect(session).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Error parsing 2FA session:', expect.any(Error));
  });

  it('should clear 2FA session', () => {
    saveTwoFASession(mockLoginData);
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();

    clearTwoFASession();
    
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(console.log).toHaveBeenCalledWith('2FA session cleared');
  });

  it('should correctly check if session is valid', () => {
    expect(isTwoFASessionValid()).toBe(false);

    saveTwoFASession(mockLoginData);
    expect(isTwoFASessionValid()).toBe(true);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    expect(isTwoFASessionValid()).toBe(false);
  });
});
