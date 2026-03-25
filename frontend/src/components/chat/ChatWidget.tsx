import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { apiPost } from '../../lib/apiClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant expert peau DeepSkyn. Comment puis-je vous aider aujourd\'hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle session creation when chat is opened
  useEffect(() => {
    if (isOpen && !sessionId && !isInitializing) {
      const startSession = async () => {
        setIsInitializing(true);
        setError(null);
        try {
          const res = await apiPost<{ success: boolean; sessionId: string }>('/chat/start');
          if (res.success) {
            setSessionId(res.sessionId);
          }
        } catch (error) {
          console.error('Failed to start chat session', error);
          setError('Impossible de démarrer la session de chat. Veuillez réessayer.');
        } finally {
          setIsInitializing(false);
        }
      };
      startSession();
    }
  }, [isOpen, sessionId, isInitializing]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiPost<{ success: boolean; response: string }>('/chat/message', {
        sessionId,
        message: userMessage
      });

      if (res.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Une erreur est survenue lors de l\'envoi du message.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl transition-transform hover:scale-105 flex items-center justify-center group"
          aria-label="Ouvrir le chat"
        >
          <MessageCircle size={28} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[600px] max-h-[80vh] flex flex-col border border-gray-100 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center space-x-2">
              <Sparkles size={20} className="text-indigo-200" />
              <div>
                <h3 className="font-bold text-lg leading-tight">DeepSkyn AI</h3>
                <p className="text-xs text-indigo-100 opacity-90">Assistant expert peau</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 bg-gray-50/50 p-4 overflow-y-auto flex flex-col space-y-4"
          >
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  <span className="text-xs text-gray-500">DeepSkyn réfléchit...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center mt-2 animate-in fade-in zoom-in duration-200">
                <div className="bg-red-50 text-red-600 text-[11px] px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5 shadow-sm">
                  <AlertCircle size={12} />
                  {error}
                </div>
              </div>
            )}
            
            {isInitializing && !sessionId && (
               <div className="flex justify-center mt-4">
                 <div className="text-xs text-gray-400 bg-white/80 backdrop-blur-sm border border-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                    <Loader2 size={12} className="animate-spin" />
                    Initialisation de la session sécurisée...
                 </div>
               </div>
            )}
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-gray-100"
          >
            <div className="relative flex items-center gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={sessionId ? "Posez votre question..." : "Attente de session..."} 
                disabled={!sessionId || isLoading}
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!sessionId || isLoading || !input.trim()}
                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400 font-medium">Propulsé par l'IA DeepSkyn Intelligence</span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
