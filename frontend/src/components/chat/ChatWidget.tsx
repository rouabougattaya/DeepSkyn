import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { apiPost } from '../../lib/apiClient';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // DEV1 scope: Setup UI and layout, and handle session creation.
  useEffect(() => {
    if (isOpen && !sessionId && !isInitializing) {
      const startSession = async () => {
        setIsInitializing(true);
        try {
          // DEV1: POST /api/chat/start
          const res = await apiPost<{ success: boolean; sessionId: string }>('/api/chat/start');
          if (res.success) {
            setSessionId(res.sessionId);
          }
        } catch (error) {
          console.error('Failed to start chat session', error);
        } finally {
          setIsInitializing(false);
        }
      };
      startSession();
    }
  }, [isOpen, sessionId, isInitializing]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl transition-transform hover:scale-105 flex items-center justify-center"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[600px] max-h-[80vh] flex flex-col border border-gray-100 overflow-hidden transform transition-all duration-300 ease-in-out">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center space-x-2">
              <Sparkles size={20} className="text-indigo-200" />
              <div>
                <h3 className="font-bold text-lg leading-tight">DeepSkyn AI</h3>
                <p className="text-xs text-indigo-100 opacity-90">Skin expert assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area (Empty State for DEV1) */}
          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto flex flex-col space-y-4">
            
            <div className="flex items-start">
              <div className="bg-white border border-gray-100 shadow-sm p-3 rounded-2xl rounded-tl-sm text-sm text-gray-800 max-w-[85%]">
                Hello! I am your AI skin expert. How can I help you understand your skin analysis today?
              </div>
            </div>
            
            {/* Session Initializing state indicator */}
            {isInitializing && (
               <div className="flex justify-center mt-4">
                 <div className="text-xs text-gray-500 bg-gray-200/50 px-3 py-1 rounded-full animate-pulse">
                    Connecting to secure session...
                 </div>
               </div>
            )}
            
            {/* Show Session ID for Dev debugging */}
            {sessionId && (
              <div className="flex justify-center mt-2">
                <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                  Session Active (DEV1): {sessionId.split('-')[0]}...
                </div>
              </div>
            )}
          </div>

          {/* Input Area (DEV1 Layout) */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Type your message..." 
                disabled // Disabled for DEV1, DEV2 will enable and handle it
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <button 
                disabled // Disabled for DEV1
                className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400 font-medium">Powered by DeepSkyn Intelligence</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
