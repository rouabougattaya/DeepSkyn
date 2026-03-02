// Activity Timeline Service — Frontend
// Calls the NestJS backend activity endpoints

export interface ActivityEvent {
    id: string;
    userId: string;
    type: ActivityType;
    metadata: Record<string, any>;
    ipAddress?: string;
    deviceInfo?: string;
    location?: { country?: string; city?: string; region?: string };
    riskLevel: RiskLevel;
    riskExplanation?: string;
    recommendedAction?: string;
    previousHash?: string;
    currentHash?: string;
    createdAt: string;
}

export type ActivityType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET_REQUEST'
    | 'EMAIL_CHANGED'
    | 'SESSION_CREATED'
    | 'SESSION_TERMINATED'
    | 'ROLE_UPDATED'
    | 'ACCOUNT_LOCKED'
    | 'SENSITIVE_ACTION';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ActivityPage {
    items: ActivityEvent[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface SecuritySummary {
    summary: string;
    stats: {
        total: number;
        high: number;
        medium: number;
        low: number;
        loginFailures: number;
        uniqueIps: number;
    };
}

export interface ActivityQuery {
    page?: number;
    limit?: number;
    type?: ActivityType;
    riskLevel?: RiskLevel;
    dateFrom?: string;
    dateTo?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

class ActivityService {
    async getActivities(query: ActivityQuery = {}): Promise<ActivityPage> {
        const params = new URLSearchParams();
        if (query.page) params.set('page', String(query.page));
        if (query.limit) params.set('limit', String(query.limit));
        if (query.type) params.set('type', query.type);
        if (query.riskLevel) params.set('riskLevel', query.riskLevel);
        if (query.dateFrom) params.set('dateFrom', query.dateFrom);
        if (query.dateTo) params.set('dateTo', query.dateTo);

        const res = await fetch(`${API_BASE}/auth/activity?${params.toString()}`, {
            headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error('Failed to fetch activities');
        return res.json();
    }

    async getActivity(id: string): Promise<ActivityEvent> {
        const res = await fetch(`${API_BASE}/auth/activity/${id}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch activity');
        return res.json();
    }

    async getSecuritySummary(): Promise<SecuritySummary> {
        const res = await fetch(`${API_BASE}/auth/activity/summary`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch summary');
        return res.json();
    }

    async verifyIntegrity(): Promise<{ valid: boolean; brokenAt?: string }> {
        const res = await fetch(`${API_BASE}/auth/activity/integrity`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to verify integrity');
        return res.json();
    }

    async exportCsv(dateFrom?: string, dateTo?: string): Promise<void> {
        const params = new URLSearchParams({ format: 'csv' });
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const res = await fetch(`${API_BASE}/auth/activity/export?${params.toString()}`, {
            headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error('Failed to export');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-log-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export const activityService = new ActivityService();
