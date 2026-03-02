// frontend/src/services/session.service.ts
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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

// Helper pour récupérer le token (compatible avec ta méthode de stockage)
const getToken = (): string | null => {
  // Essaie d'abord avec la méthode standard
  let token = localStorage.getItem('token');

  // Si pas trouvé, essaie de récupérer depuis ta structure
  if (!token) {
    try {
      const sessionData = localStorage.getItem('auth-session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        token = session?.accessToken || null;
      }
    } catch (e) {
      console.error('Error parsing session:', e);
    }
  }

  return token;
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