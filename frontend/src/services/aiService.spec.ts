import { describe, it, expect, vi } from 'vitest';
import { aiService } from './aiService';

describe('AIService', () => {
  describe('analyzeEmailTrust', () => {
    it('should return a high score for gmail.com', () => {
      const score = aiService.analyzeEmailTrust('test@gmail.com');
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return a moderate score for trusted domains like outlook.com', () => {
      const score = aiService.analyzeEmailTrust('test@outlook.com');
      expect(score).toBeGreaterThan(0.6);
      expect(score).toBeLessThan(0.9);
    });

    it('should penalize suspect domains', () => {
      const score = aiService.analyzeEmailTrust('test@10minutemail.com');
      expect(score).toBe(0.1);
    });

    it('should return a low score for invalid emails', () => {
      const score = aiService.analyzeEmailTrust('invalid-email');
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('calculateTrustScore', () => {
    it('should calculate a score based on provided user data', () => {
      const user = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        bio: 'This is a long enough bio for testing purposes.',
        picture: 'https://example.com/photo.jpg',
        photoAnalysis: {
          quality: 0.9,
          hasFace: true,
          brightness: 0.8,
          clarity: 0.9
        }
      };

      const { score, bioStatus } = aiService.calculateTrustScore(user);
      expect(score).toBeGreaterThan(0.7);
      expect(bioStatus).toBe(1.0);
    });

    it('should penalize profiles without a bio', () => {
      const user = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        bio: '',
        picture: 'https://example.com/photo.jpg',
      };

      const { score, bioStatus } = aiService.calculateTrustScore(user);
      expect(bioStatus).toBe(0.0);
    });
  });

  describe('verifyIdentity', () => {
    it('should return a verified result for high trust profiles', async () => {
      // Mocking fetch for analyzePhoto internal call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => '10000' }
      });

      const user = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        bio: 'Professional skin enthusiast and AI developer.'
      };

      const result = await aiService.verifyIdentity(user);
      expect(result.verified).toBe(true);
      expect(result.score).toBeGreaterThan(0.6);
    });
  });
});
