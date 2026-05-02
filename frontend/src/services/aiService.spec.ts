import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from './aiService';

describe('AIService', () => {
  describe('analyzePhoto', () => {
    it('should return default values if no photoUrl is provided', async () => {
      const result = await aiService.analyzePhoto();
      expect(result.hasFace).toBe(false);
      expect(result.quality).toBe(0.1);
    });

    it('should analyze a non-google photo url', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.6);
      const result = await aiService.analyzePhoto('https://other.com/photo.jpg');
      expect(result.quality).toBe(0.6);
      expect(result.hasFace).toBe(true);
      vi.restoreAllMocks();
    });

    it('should handle google photo with small file size (avatar)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => '2000' } // 2KB < 6KB
      });
      const result = await aiService.analyzePhoto('https://lh3.googleusercontent.com/photo');
      expect(result.quality).toBe(0.2);
    });

    it('should handle google photo with missing content-length', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null }
      });
      const result = await aiService.analyzePhoto('https://lh3.googleusercontent.com/photo');
      expect(result.quality).toBe(0.2); // fileSize 0
    });

    it('should handle google photo with large file size', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => '10000' }
      });
      const result = await aiService.analyzePhoto('https://lh3.googleusercontent.com/photo');
      expect(result.quality).toBe(0.9);
    });

    it('should handle google photo fetch not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });
      const result = await aiService.analyzePhoto('https://lh3.googleusercontent.com/photo');
      expect(result.quality).toBe(0.9);
    });

    it('should handle google photo fetch error (CORS/etc)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('CORS'));
      const result = await aiService.analyzePhoto('https://lh3.googleusercontent.com/photo');
      expect(result.quality).toBe(0.9); // Fallback to trust Google
    });
  });

  describe('analyzeEmailTrust', () => {
    it('should handle invalid or missing emails', () => {
      // @ts-ignore
      expect(aiService.analyzeEmailTrust(null)).toBe(0.3);
      expect(aiService.analyzeEmailTrust('nodomain')).toBe(0.2);
    });

    it('should handle domains not in trusted list', () => {
      const score = aiService.analyzeEmailTrust('user@unknown-domain.com');
      expect(score).toBeLessThan(0.5);
    });

    it('should catch errors in email analysis', () => {
      const spy = vi.spyOn(RegExp.prototype, 'test').mockImplementationOnce(() => { throw new Error('Regexp Fail'); });
      const score = aiService.analyzeEmailTrust('test@gmail.com');
      expect(score).toBe(0.3);
      spy.mockRestore();
    });

    it('should return a high score for gmail.com', () => {
      const score = aiService.analyzeEmailTrust('test@gmail.com');
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return a moderate score for trusted domains like outlook.com', () => {
      const score = aiService.analyzeEmailTrust('test@outlook.com');
      expect(score).toBeGreaterThan(0.6);
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

    it('should handle missing name and email gracefully', () => {
      // @ts-ignore
      const { score } = aiService.calculateTrustScore({});
      expect(score).toBeDefined();
    });
  });

  describe('verifyIdentity', () => {
    it('should return a verified result for high trust profiles', async () => {
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

    it('should handle errors during verification', async () => {
      vi.spyOn(aiService, 'analyzePhoto').mockRejectedValueOnce(new Error('Test Error'));
      const result = await aiService.verifyIdentity({ name: 'Test', email: 'test@test.com' });
      expect(result.verified).toBe(false);
      expect(result.message).toBe('Identity verification error');
    });

    it('should return specific messages for low quality photo', async () => {
      vi.spyOn(aiService, 'analyzePhoto').mockResolvedValueOnce({
        quality: 0.2, hasFace: false, brightness: 0.5, clarity: 0.4
      });
      const result = await aiService.verifyIdentity({ name: 'Test', email: 'test@gmail.com' });
      expect(result.message).toBe('Photo de profil de faible qualité');
    });

    it('should return specific messages for suspect email', async () => {
      vi.spyOn(aiService, 'analyzePhoto').mockResolvedValueOnce({
        quality: 0.8, hasFace: true, brightness: 0.8, clarity: 0.8
      });
      const result = await aiService.verifyIdentity({ name: 'Test', email: 'test@fake.com' });
      expect(result.message).toBe('Adresse email suspecte');
    });

    it('should return generic message for other failures', async () => {
      vi.spyOn(aiService, 'analyzePhoto').mockResolvedValueOnce({
        quality: 0.5, hasFace: true, brightness: 0.5, clarity: 0.5
      });
      const result = await aiService.verifyIdentity({ name: 'T', email: 'test@gmail.com' });
      expect(result.message).toBe('Informations insuffisantes pour vérifier l\'identité');
    });

    it('should return moderate confidence message', async () => {
      vi.spyOn(aiService, 'analyzePhoto').mockResolvedValueOnce({
        quality: 0.6, hasFace: true, brightness: 0.6, clarity: 0.6
      });
      vi.spyOn(aiService, 'calculateTrustScore').mockReturnValueOnce({
        score: 0.65,
        bioStatus: 0.5
      });
      const result = await aiService.verifyIdentity({ name: 'John Doe', email: 'john.doe@gmail.com' });
      expect(result.message).toBe('Identité vérifiée avec confiance moyenne');
    });
  });

  describe('Edge Cases and Errors', () => {
    it('should catch errors in calculateTrustScore', () => {
      vi.spyOn(aiService, 'analyzeEmailTrust').mockImplementationOnce(() => { throw new Error('Fail'); });
      const result = aiService.calculateTrustScore({ name: 'Test', email: 'test@test.com' });
      expect(result.score).toBe(0.3);
    });

    it('should handle name consistency without googleName', () => {
      const result = aiService.calculateTrustScore({ name: 'John Doe', email: 'john.doe@gmail.com' });
      expect(result.score).toBeDefined();
    });

    it('should handle name mismatch with email', () => {
      const result = aiService.calculateTrustScore({ name: 'Alice Smith', email: 'john.doe@gmail.com' });
      expect(result.score).toBeLessThan(0.8);
    });

    it('should handle google name mismatch', () => {
      const result = aiService.calculateTrustScore({
        name: 'John Doe',
        googleName: 'Johnny D',
        email: 'john.doe@gmail.com'
      });
      expect(result.score).toBeDefined();
    });

    it('should handle google name with common part', () => {
      const result = aiService.calculateTrustScore({
        name: 'John Doe',
        googleName: 'John Smith',
        email: 'john.smith@gmail.com'
      });
      expect(result.score).toBeDefined();
    });

    it('should catch errors in name-photo consistency', async () => {
      // @ts-ignore
      const score = await aiService.verifyNamePhotoConsistency(null, {});
      expect(score).toBe(0.3);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate overall score with high quality photo', () => {
      const AIServiceClass = aiService.constructor as any;
      const score = AIServiceClass.calculateOverallScore({ quality: 0.9 }, { score: 0.8 });
      expect(score).toBeCloseTo(0.85);
    });

    it('should calculate overall score with low quality photo', () => {
      const AIServiceClass = aiService.constructor as any;
      const score = AIServiceClass.calculateOverallScore({ quality: 0.3 }, { score: 0.8 });
      expect(score).toBeCloseTo(0.7);
    });

    it('should calculate overall score with moderate quality photo', () => {
      const AIServiceClass = aiService.constructor as any;
      const score = AIServiceClass.calculateOverallScore({ quality: 0.6 }, { score: 0.8 });
      expect(score).toBeCloseTo(0.72);
    });
  });
});
