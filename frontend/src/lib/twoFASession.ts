/**
 * 2FA Session Management
 * Persists 2FA login data across page refreshes using sessionStorage
 */

interface TwoFASessionData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  requiresTwoFa: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'deepskyn_2fa_session';
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function saveTwoFASession(loginData: any): void {
  const sessionData: TwoFASessionData = {
    userId: loginData.user.id,
    email: loginData.user.email,
    firstName: loginData.user.firstName,
    lastName: loginData.user.lastName,
    requiresTwoFa: loginData.requiresTwoFa,
    timestamp: Date.now(),
  };
  
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  console.log('2FA session saved:', sessionData);
}

export function getTwoFASession(): TwoFASessionData | null {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    return null;
  }
  
  try {
    const sessionData: TwoFASessionData = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
      console.warn('2FA session expired');
      clearTwoFASession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error parsing 2FA session:', error);
    return null;
  }
}

export function clearTwoFASession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  console.log('2FA session cleared');
}

export function isTwoFASessionValid(): boolean {
  return getTwoFASession() !== null;
}
