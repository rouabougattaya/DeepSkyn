import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import AiResponseFormatter from '../components/chat/AiResponseFormatter';
import { AlertCircle, ArrowUpCircle } from 'lucide-react';


const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { messages, isLoading, error, sendMessage } = useChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas lors de nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const message = inputText;
    setInputText('');
    await sendMessage(message);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{t('chat.title')}</h1>
          <p className="text-sm text-gray-500">{t('chat.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-medium text-gray-600">{t('chat.online')}</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025 4.486 4.486 0 0 0-.153-1.856A8.074 8.074 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">{t('chat.welcome')}</h2>
            <p className="text-sm max-w-xs">{t('chat.welcome_hint')}</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-white p-3 rounded-2xl rounded-tr-none' : ''}`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <AiResponseFormatter response={msg.content} />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3">
            <div className={`text-xs p-4 rounded-xl border flex items-center gap-3 w-full
              ${error.includes('LIMIT_REACHED')
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-red-50 border-red-200 text-red-600'}`}>
              <AlertCircle size={18} className="shrink-0" />
              <div className="flex-1">
                <p className="font-bold">
                  {error.includes('LIMIT_REACHED') ? t('chat.limit_reached') : t('common.error')}
                </p>
                <p className="opacity-80">
                  {error.includes('LIMIT_REACHED')
                    ? t('chat.limit_message')
                    : error}
                </p>
              </div>
              {error.includes('LIMIT_REACHED') && (
                <Link
                  to="/upgrade"
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  <ArrowUpCircle size={14} /> {t('chat.upgrade')}
                </Link>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="bg-white p-3 rounded-xl shadow-md border border-gray-100 flex items-center space-x-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1 border-none focus:ring-0 text-sm py-2 px-1 text-gray-700"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className={`p-2 rounded-lg transition-colors ${!inputText.trim() || isLoading || (error && error.includes('LIMIT_REACHED'))
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-opacity-90'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925L10.29 10l-6.597 1.836-1.414 4.925a.75.75 0 0 0 .826.95 44.82 44.82 0 0 0 16.142-7.854.75.75 0 0 0 0-1.114 44.821 44.821 0 0 0-16.142-7.854Z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatPage;
