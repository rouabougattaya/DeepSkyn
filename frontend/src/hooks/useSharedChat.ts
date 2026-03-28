import { useCallback, useState, useEffect, useRef } from 'react';
import { apiPost } from '../lib/apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title?: string;
  createdAt: string;
}

interface ChatMessageApiResponse {
  success: boolean;
  response: string;
  message: string;
  sessionTitle?: string;
  analysis: {
    age: number;
    acne: number;
    hydration: number;
    wrinkles: number;
    pores: number;
    sensitivity: number;
  };
  realAge: number;
  skinAge: number;
  conditions: {
    acne: {
      enabled: boolean;
      severity: 'mild' | 'moderate' | 'severe';
      type: string;
      location: string[];
    };
  };
  chatLimit?: {
    limit: number;
    remaining: number;
    plan: string;
  };
  usage?: {
    plan: string;
    chat: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
}

export interface SharedChatController {
  sessionId: string | null;
  isInitializing: boolean;
  contextHints: string[];
  messages: ChatMessage[];
  history: ChatSession[];
  input: string;
  isLoading: boolean;
  error: string | null;
  setInput: (value: string) => void;
  ensureSession: () => Promise<void>;
  sendMessage: (event?: React.FormEvent | string) => Promise<void>;
  fetchHistory: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  usage: ChatMessageApiResponse['usage'] | null;
}

export function useSharedChat(): SharedChatController {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [contextHints, setContextHints] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Bonjour, je suis votre assistant dermatologique virtuel DeepSkyn. Je vous accompagne avec des recommandations claires et personnalisées.',
    },
  ]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ChatMessageApiResponse['usage'] | null>(null);

  const buildContextHints = (res: ChatMessageApiResponse): string[] => {
    const hints: string[] = ['Selon votre analyse cutanée, je personnalise mes recommandations.'];

    if (typeof res.analysis?.hydration === 'number' && res.analysis.hydration < 40) {
      hints.push('Votre niveau d\'hydratation est inférieur à la zone optimale.');
    }

    if (
      typeof res.skinAge === 'number' &&
      typeof res.realAge === 'number' &&
      res.realAge > 0 &&
      res.skinAge > res.realAge
    ) {
      hints.push('Votre âge de peau est supérieur à votre âge réel.');
    }

    if (res.conditions?.acne?.enabled) {
      const severityMap: Record<'mild' | 'moderate' | 'severe', string> = {
        mild: 'légère',
        moderate: 'modérée',
        severe: 'sévère',
      };
      hints.push(`Acné ${severityMap[res.conditions.acne.severity]} : une prise en charge ciblée est recommandée.`);
    }

    return hints.slice(0, 3);
  };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await apiPost<{ success: boolean; sessions: ChatSession[]; usage?: any }>('/chat/history');
      if (res.success) {
        setHistory(res.sessions);
        if (res.usage) setUsage(res.usage);
      }
    } catch (err) {
      console.error('Failed to fetch chat history', err);
    }
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ success: boolean; messages: ChatMessage[] }>('/chat/session-messages', { sessionId: sid });
      if (res.success) {
        setSessionId(sid);
        if (res.messages.length > 0) {
          setMessages(res.messages.map(m => ({ role: m.role, content: m.content })));
        }
      }
    } catch (err) {
      console.error('Failed to load session messages', err);
      setError('Impossible de charger les messages de cette session.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewSession = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Bonjour, je suis prêt pour une nouvelle consultation. Comment puis-je vous aider aujourd\'hui ?',
      },
    ]);
    try {
      const res = await apiPost<{ success: boolean; sessionId: string; usage?: any }>('/chat/start', { forceNew: true });
      if (res.success) {
        setSessionId(res.sessionId);
        if (res.usage) setUsage(res.usage);
        // Optimistically add to history
        const newSession: ChatSession = {
          id: res.sessionId,
          title: 'Nouvelle discussion',
          createdAt: new Date().toISOString(),
        };
        setHistory(prev => {
          // Avoid duplicates if fetchHistory is also running
          if (prev.some(s => s.id === res.sessionId)) return prev;
          return [newSession, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to start new session', err);
      setError('Impossible de démarrer une nouvelle session.');
    } finally {
      setIsInitializing(false);
    }
  }, [fetchHistory]);

  const ensureSession = useCallback(async () => {
    if (sessionId || isInitializing) return;

    console.log('[DEBUG] ensureSession: starting initialization');
    setIsInitializing(true);
    setError(null);

    try {
      const res = await apiPost<{ success: boolean; sessionId: string; usage?: any }>('/chat/start', { forceNew: false });
      console.log('[DEBUG] ensureSession: response', res);
      if (res.success) {
        setSessionId(res.sessionId);
        if (res.usage) setUsage(res.usage);
        // Optimistically add to history ONLY if not already there
        setHistory(prev => {
          if (prev.some(s => s.id === res.sessionId)) return prev;
          const newSession: ChatSession = {
            id: res.sessionId,
            title: 'Nouvelle discussion',
            createdAt: new Date().toISOString(),
          };
          return [newSession, ...prev];
        });
      }
    } catch (sessionError) {
      console.error('[DEBUG] ensureSession error:', sessionError);
      setError('Impossible de démarrer la session de chat. Veuillez réessayer.');
    } finally {
      setIsInitializing(false);
    }
  }, [sessionId, isInitializing, fetchHistory]);

  const sendMessage = useCallback(
    async (eventOrMessage?: React.FormEvent | string) => {
      let messageContent = '';
      if (typeof eventOrMessage === 'string') {
        messageContent = eventOrMessage;
      } else {
        if (eventOrMessage) eventOrMessage.preventDefault();
        messageContent = input.trim();
      }

      if (!messageContent || isLoading || !sessionId) return;

      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: messageContent }]);
      setIsLoading(true);
      setError(null);

      try {
        const res = await apiPost<ChatMessageApiResponse>('/chat/message', {
          sessionId,
          message: messageContent,
        });

        if (res.success) {
          setMessages(prev => [...prev, { role: 'assistant', content: res.message || res.response }]);
          if (res.sessionTitle) {
            setHistory(prev => prev.map(s =>
              s.id === sessionId ? { ...s, title: res.sessionTitle } : s
            ));
          }
          if (res.usage) setUsage(res.usage);
          setContextHints(buildContextHints(res));
        } else {
          throw new Error('Failed to get response');
        }
      } catch (chatError: any) {
        console.error('Chat error:', chatError);
        const msg = chatError.message?.includes('LIMIT_REACHED')
          ? 'LIMIT_REACHED'
          : 'Une erreur est survenue lors de l\'envoi du message.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, sessionId],
  );

  const deleteSession = useCallback(async (sid: string) => {
    try {
      const res = await apiPost<{ success: boolean }>('/chat/delete-session', { sessionId: sid });
      if (res.success) {
        setHistory(prev => prev.filter(s => s.id !== sid));
        if (sessionId === sid) {
          setSessionId(null);
          setMessages([
            {
              role: 'assistant',
              content: 'Discussion supprimée. Comment puis-je vous aider ?',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session', err);
      setError('Impossible de supprimer cette discussion.');
    }
  }, [sessionId]);

  const renameSession = useCallback(async (sid: string, title: string) => {
    try {
      const res = await apiPost<{ success: boolean }>('/chat/rename-session', { sessionId: sid, title });
      if (res.success) {
        setHistory(prev => prev.map(s => s.id === sid ? { ...s, title } : s));
      }
    } catch (err) {
      console.error('Failed to rename session', err);
      setError('Impossible de renommer cette discussion.');
    }
  }, []);

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchHistory();
      // Eagerly ensure session on mount
      ensureSession();
    }
  }, [fetchHistory, ensureSession]);

  return {
    sessionId,
    isInitializing,
    contextHints,
    messages,
    history,
    input,
    isLoading,
    error,
    setInput,
    ensureSession,
    sendMessage,
    fetchHistory,
    loadSession,
    startNewSession,
    deleteSession,
    renameSession,
    usage,
  };
}
