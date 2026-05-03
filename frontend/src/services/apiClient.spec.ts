import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost, apiClient } from './apiClient';
import * as authSession from '../lib/authSession';

vi.mock('../lib/authSession', () => ({
  authFetch: vi.fn(),
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiGet', () => {
    it('should perform a GET request and return JSON', async () => {
      const mockData = { id: 1, name: 'Test' };
      (authSession.authFetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiGet('/test');
      expect(result).toEqual(mockData);
      expect(authSession.authFetch).toHaveBeenCalledWith('/test', { method: 'GET' });
    });

    it('should throw an error if the response is not ok', async () => {
      (authSession.authFetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      });

      await expect(apiGet('/test')).rejects.toThrow('Resource not found');
    });

    it('should fallback to statusText if json() fails on error response', async () => {
        (authSession.authFetch as any).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => { throw new Error('JSON error'); },
        });
  
        await expect(apiGet('/test')).rejects.toThrow('Internal Server Error');
      });
  });

  describe('apiPost', () => {
    it('should perform a POST request with body and return JSON', async () => {
      const mockBody = { name: 'New Item' };
      const mockData = { id: 1, ...mockBody };
      (authSession.authFetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiPost('/test', mockBody);
      expect(result).toEqual(mockData);
      expect(authSession.authFetch).toHaveBeenCalledWith('/test', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      });
    });

    it('should throw an error if the response is not ok', async () => {
      (authSession.authFetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid data' }),
      });

      await expect(apiPost('/test', {})).rejects.toThrow('Invalid data');
    });
  });

  describe('apiClient object', () => {
    it('should wrap apiGet in a data object', async () => {
      const mockData = { id: 1 };
      (authSession.authFetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiClient.get('/test');
      expect(result).toEqual({ data: mockData });
    });

    it('should wrap apiPost in a data object', async () => {
      const mockData = { id: 1 };
      (authSession.authFetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiClient.post('/test', {});
      expect(result).toEqual({ data: mockData });
    });
  });
});
