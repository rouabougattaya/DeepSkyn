import axios from 'axios';
import { getAccessToken } from '../lib/authSession';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface Session {
  id: string;
  fingerprint: {
    browser: string;
    os: string;
    ip: string;
    isMobile: boolean;
  };
  riskLevel: 'low' | 'medium' | 'high';
  riskAnalysis?: {
    score: number;
    warning: string | null;
    anomalies: string[];
    recommendation: 'keep' | 'review' | 'revoke';
  };
  lastActivity: string;
  isCurrent: boolean;
}

// Helper pour récupérer le token
const getToken = (): string | null => {
  return getAccessToken();
};

export const sessionService = {
  async getSessions(): Promise<Session[]> {
    const token = getToken();
    console.log('🔍 Token récupéré:', token ? 'Oui' : 'Non');

    if (!token) {
      console.error('❌ Aucun token trouvé dans localStorage');
      throw new Error('Non authentifié');
    }

    console.log('📡 Envoi requête à:', `${API_URL}/auth/sessions`);

    try {
      const response = await axios.get(`${API_URL}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Réponse reçue:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Detailed error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  async revokeSession(sessionId: string): Promise<void> {
    const token = getToken();
    await axios.delete(`${API_URL}/auth/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  async revokeAllSessions(): Promise<void> {
    const token = getToken();
    await axios.delete(`${API_URL}/auth/sessions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
};