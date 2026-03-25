import { authFetch } from '../lib/authSession';

export async function apiGet<T>(path: string): Promise<T> {
    const res = await authFetch(path, {
        method: 'GET',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.message || `GET ${path} failed: ${res.status}`);
    }

    return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await authFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.message || `POST ${path} failed: ${res.status}`);
    }

    return res.json();
}

// Objet apiClient pour compatibilité avec skinAgeInsightsService
export const apiClient = {
    async get(path: string) {
        const data = await apiGet(path);
        return { data };
    },
    async post(path: string, body: unknown) {
        const data = await apiPost(path, body);
        return { data };
    },
};

