import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCsrfToken } from './csrf';

// Mock fetch
global.fetch = vi.fn();

describe('csrf library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch csrf token from server', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 'fake-csrf-token' })
    });

    const token = await getCsrfToken();
    
    expect(global.fetch).toHaveBeenCalled();
    expect(token).toBe('fake-csrf-token');
  });

  it('should return empty string on fetch error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const token = await getCsrfToken();
    
    expect(token).toBe('');
  });

  it('should return empty string if response is not ok', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false
    });

    const token = await getCsrfToken();
    
    expect(token).toBe('');
  });
});
