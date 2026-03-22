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
