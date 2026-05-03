import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCsrfToken } from './csrf';

const mockApiUrl = 'http://localhost:3001/api';

describe('csrf utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Spy on console.error to avoid noise in test output and allow assertion
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch and return the CSRF token successfully', async () => {
    const mockToken = 'mock-csrf-token-123';
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    const token = await getCsrfToken();

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/csrf-token'), {
      method: 'GET',
      credentials: 'include',
    });
    expect(token).toBe(mockToken);
  });

  it('should throw an error and return empty string if response is not ok', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
    });

    const token = await getCsrfToken();

    expect(global.fetch).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('CSRF token error:', expect.any(Error));
    expect(token).toBe('');
  });

  it('should return empty string if fetch rejects', async () => {
    const networkError = new Error('Network error');
    (global.fetch as any).mockRejectedValue(networkError);

    const token = await getCsrfToken();

    expect(global.fetch).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('CSRF token error:', networkError);
    expect(token).toBe('');
  });
});
