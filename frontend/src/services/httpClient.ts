/**
 * ✅ HTTP Client centralisé avec gestion JWT + refresh token
 * À utiliser dans tous les services
 */

import { getAccessToken, getRefreshToken, setSession, clearSession } from '@/lib/authSession';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean; // Skip Authorization header (for public endpoints)
  timeout?: number; // Request timeout in ms
}

interface APIError {
  status: number;
  message: string;
  details?: unknown;
}

class HTTPClient {
  private baseURL: string = API_URL;

  /**
   * ✅ Make authenticated HTTP request with automatic token refresh
   */
  async request<T = unknown>(
    path: string,
    options: FetchOptions = {},
  ): Promise<T> {
    const {
      skipAuth = false,
      timeout = 30000,
      ...fetchOptions
    } = options;

    const url = this.buildURL(path);
    const headers = this.buildHeaders(skipAuth);

    try {
      // First attempt
      let response = await this.fetchWithTimeout(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      }, timeout);

      // ✅ Handle 401 - Try token refresh
      if (response.status === 401 && !skipAuth && this.canRefresh()) {
        console.log('🔄 Token expired, attempting refresh...');
        
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // ✅ Retry request with new token
          const newHeaders = this.buildHeaders(false);
          response = await this.fetchWithTimeout(url, {
            ...fetchOptions,
            headers: newHeaders,
            credentials: 'include',
          }, timeout);
        } else {
          // Refresh failed - user needs to login again
          clearSession();
          window.location.href = '/auth/login';
        }
      }

      // ✅ Parse and return response
      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`❌ Request failed [${options.method || 'GET'} ${path}]:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(path: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(path: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ============ PRIVATE METHODS ============

  /**
   * ✅ Build complete URL
   */
  private buildURL(path: string): string {
    if (path.startsWith('http')) return path;
    const basePath = this.baseURL.endsWith('/') 
      ? this.baseURL.slice(0, -1) 
      : this.baseURL;
    const apiPath = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${apiPath}`;
  }

  /**
   * ✅ Build headers with Authorization token
   */
  private buildHeaders(skipAuth: boolean = false): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (!skipAuth) {
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No access token found. Request may be rejected.');
      }
    }

    return headers;
  }

  /**
   * ✅ Check if we can refresh token
   */
  private canRefresh(): boolean {
    const refreshToken = getRefreshToken();
    return !!refreshToken;
  }

  /**
   * ✅ Refresh access token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        user: data.user,
      });

      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  }

  /**
   * ✅ Fetch with timeout
   */
  private fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * ✅ Handle response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // ✅ Check content-type
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    try {
      if (!response.ok) {
        const errorData = isJSON ? await response.json() : { message: response.statusText };
        const error: APIError = {
          status: response.status,
          message: errorData.message || errorData.error || response.statusText,
          details: errorData,
        };

        switch (response.status) {
          case 400:
            console.error('❌ Bad Request:', error.message);
            break;
          case 401:
            console.error('❌ Unauthorized - Invalid or expired token');
            break;
          case 403:
            console.error('❌ Forbidden - No permission');
            break;
          case 404:
            console.error('❌ Not Found:', error.message);
            break;
          case 409:
            console.error('❌ Conflict:', error.message);
            break;
          case 422:
            console.error('❌ Validation Error:', error.details);
            break;
          case 429:
            console.error('❌ Too Many Requests - Rate limited');
            break;
          case 500:
            console.error('❌ Server Error:', error.message);
            break;
          default:
            console.error(`❌ HTTP ${response.status}:`, error.message);
        }

        throw error;
      }

      // ✅ Handle successful response
      if (response.status === 204 || response.status === 205) {
        return undefined as T;
      }

      if (isJSON) {
        const data = await response.json();
        console.log(`✅ ${response.status} Response received`);
        return data as T;
      }

      // Fallback for non-JSON responses
      const text = await response.text();
      return text as unknown as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('❌ Failed to parse response:', error.message);
        throw new Error('Invalid response format from server');
      }
      throw error;
    }
  }
}

// ✅ Export singleton instance
export const httpClient = new HTTPClient();

/**
 * Examples of usage:
 *
 * // GET request
 * const user = await httpClient.get<User>('/users/123');
 *
 * // POST request
 * const result = await httpClient.post<AnalysisResult>('/ai/analyze', {
 *   imageId: '123',
 *   weights: { acne: 0.5 }
 * });
 *
 * // With error handling
 * try {
 *   const data = await httpClient.get('/protected-endpoint');
 * } catch (error) {
 *   if (error.status === 401) {
 *     // User unauthorized - redirect to login
 *   } else if (error.status === 404) {
 *     // Resource not found
 *   } else {
 *     // Other error
 *   }
 * }
 *
 * // Public endpoint (no auth)
 * const products = await httpClient.get('/products', { skipAuth: true });
 *
 * // With custom timeout
 * await httpClient.post('/long-operation', data, { timeout: 60000 });
 */
