// frontend/src/lib/apiClient.ts
import { authFetch } from './authSession';

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await authFetch(endpoint, { method: 'GET' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  const res = await authFetch(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPut<T>(endpoint: string, data?: any): Promise<T> {
  const res = await authFetch(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const res = await authFetch(endpoint, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}