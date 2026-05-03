import { describe, it, expect, vi, beforeEach } from 'vitest';
import { historyService } from './historyService';
import * as authSession from '@/lib/authSession';

vi.mock('@/lib/authSession', () => ({
  getUser: vi.fn(),
}));

describe('historyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('recordLoginAttempt', () => {
    it('should record a successful login attempt', async () => {
      (authSession.getUser as any).mockReturnValue({ id: 'user-1' });
      
      await historyService.recordLoginAttempt({
        loginMethod: 'email',
        status: 'success',
        used2FA: true,
        aiScore: 0.9,
      });

      const sessions = JSON.parse(localStorage.getItem('activitySessions') || '[]');
      expect(sessions.length).toBe(1);
      expect(sessions[0].loginMethod).toBe('email');
      expect(sessions[0].loginStatus).toBe('success');
      expect(sessions[0].riskScore).toBe(10); // (1 - 0.9) * 100
    });

    it('should limit sessions to 50', async () => {
        (authSession.getUser as any).mockReturnValue({ id: 'user-1' });
        const existingSessions = Array.from({ length: 50 }, (_, i) => ({ id: `s-${i}` }));
        localStorage.setItem('activitySessions', JSON.stringify(existingSessions));

        await historyService.recordLoginAttempt({
            loginMethod: 'google',
            status: 'success',
            used2FA: false
        });

        const sessions = JSON.parse(localStorage.getItem('activitySessions') || '[]');
        expect(sessions.length).toBe(50);
    });
  });

  describe('getSessionHistory', () => {
    it('should return sessions from localStorage', async () => {
      const mockSessions = [{ id: '1' }, { id: '2' }];
      localStorage.setItem('activitySessions', JSON.stringify(mockSessions));

      const result = await historyService.getSessionHistory();
      expect(result).toEqual(mockSessions);
    });

    it('should return empty array and log error on invalid JSON', async () => {
        localStorage.setItem('activitySessions', 'invalid-json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        const result = await historyService.getSessionHistory();
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('getUserScore', () => {
    it('should return user score from localStorage', async () => {
      const mockScore = { totalScore: 85 };
      localStorage.setItem('userScore', JSON.stringify(mockScore));

      const result = await historyService.getUserScore();
      expect(result).toEqual(mockScore);
    });
  });

  describe('updateUserScoreSimple', () => {
    it('should initialize score if not present', () => {
        (authSession.getUser as any).mockReturnValue({ id: 'user-1' });
        historyService.updateUserScoreSimple('success', true, 0.85);

        const score = JSON.parse(localStorage.getItem('userScore') || '{}');
        expect(score.userId).toBe('user-1');
        expect(score.profileConsistency).toBe(85);
        expect(score.factors.twoFAUsage).toBe(100);
    });

    it('should apply penalties for failed logins and no 2FA', () => {
        (authSession.getUser as any).mockReturnValue({ id: 'user-1' });
        historyService.updateUserScoreSimple('failed', false);

        const score = JSON.parse(localStorage.getItem('userScore') || '{}');
        expect(score.factors.twoFAUsage).toBe(0);
        expect(score.factors.failedLogins).toBe(30 + 15); // Default (30) + increment (15)
    });
  });
});
