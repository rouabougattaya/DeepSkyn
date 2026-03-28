import { apiPost } from './apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface PersonalizedChatResponse {
  success: boolean;
  response: string;
}

class ChatService {
  /**
   * Envoie un message au chatbot personnalisé
   */
  async sendPersonalizedMessage(message: string): Promise<string> {
    try {
      const data = await apiPost<PersonalizedChatResponse>('/chat/personalized', { message });
      if (data.success) {
        return data.response;
      }
      throw new Error('Échec de la réponse du chatbot');
    } catch (error) {
      console.error('ChatService error:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
