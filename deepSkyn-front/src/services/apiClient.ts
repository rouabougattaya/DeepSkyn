/**
 * Client API centralisé : injection automatique du JWT et token CSRF.
 * Le token (accessToken ou token) est lu depuis localStorage et ajouté à chaque requête
 * dans buildHeaders() — toutes les requêtes passant par apiGet/apiPost sont authentifiées.
 */
import { getAccessToken } from '../lib/authSession';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Cache CSRF token for the session
let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string | null> {
    if (csrfToken) return csrfToken;
    try {
        const res = await fetch(`${BASE_URL}/auth/csrf-token`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        csrfToken = data?.csrfToken ?? res.headers.get('X-CSRF-Token') ?? null;
        return csrfToken;
    } catch {
        return null;
    }
}

/**
 * Construit les en-têtes de chaque requête.
 * Injecte automatiquement le JWT (accessToken ou token) pour l'authentification.
 */
function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extra,
    };
    if (token && String(token).trim() !== '' && token !== 'undefined' && !token.startsWith('google_')) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
    const csrf = await fetchCsrfToken();
    const headers = buildHeaders(csrf ? { 'X-CSRF-Token': csrf } : {});

    if (import.meta.env.DEV && path.includes('/analysis/user')) {
        const hasAuth = Boolean(headers['Authorization']);
        console.debug('[apiClient] GET /analysis/user — Authorization header:', hasAuth ? 'present' : 'missing');
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers,
        credentials: 'include',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.message || `GET ${path} failed: ${res.status}`);
    }

    return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const csrf = await fetchCsrfToken();
    const headers = buildHeaders(csrf ? { 'X-CSRF-Token': csrf } : {});

    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.message || `POST ${path} failed: ${res.status}`);
    }

    return res.json();
}
