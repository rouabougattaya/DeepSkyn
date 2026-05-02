import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Send, Sparkles, X, History, Brain, Trash2, Pencil, Check, Crown, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SharedChatController } from '../hooks/useSharedChat';

interface AIChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  chat: SharedChatController;
}

export function AIChatOverlay({ isOpen, onClose, chat }: AIChatOverlayProps) {
  const {
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
    loadSession,
    startNewSession,
    deleteSession,
    renameSession,
  } = chat;

  const [showHistory, setShowHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestedQuestions = [
    "Quel est mon âge de peau actuel ?",
    "Conseille-moi une routine matinale",
    "Comment traiter mes imperfections ?",
    "Que faire pour mes pores dilatés ?",
  ];

  useEffect(() => {
    if (!isOpen) return;
    ensureSession();
  }, [isOpen, ensureSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, contextHints]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendMessage();
  };

  const handleSuggestedClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div
      className={`fixed inset-0 z-[90] transition-all duration-300 ${isOpen ? 'pointer-events-auto opacity-100 visible' : 'pointer-events-none opacity-0 invisible'
        }`}
      aria-hidden={!isOpen}
    >
      <div
        className="absolute inset-0 bg-slate-500/20 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Skin Coach"
        className={`absolute inset-0 p-3 sm:p-5 lg:p-8 flex items-stretch justify-center transition-all duration-500 ease-out ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95 opacity-0'
          }`}
      >
        <div
          className={`w-full max-w-5xl h-full bg-white/95 border border-white/40 rounded-[2.5rem] shadow-[0_32px_120px_rgba(15,23,42,0.45)] overflow-hidden flex flex-col lg:flex-row transition-all duration-300 relative`}
        >
          {/* History Sidebar */}
          <div
            className={`flex-none w-72 border-r border-slate-100 bg-[#f9f9f9] transition-all duration-300 absolute lg:relative inset-y-0 left-0 z-20 ${showHistory ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 lg:opacity-100'
              }`}
          >
            <div className="p-4 h-full flex flex-col">
              <button
                onClick={() => {
                  startNewSession();
                  if (window.innerWidth < 1024) setShowHistory(false);
                }}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-semibold mb-6 shadow-sm hover:bg-slate-50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 grid place-items-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Sparkles size={16} />
                </div>
                Nouvelle discussion
              </button>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {history.length > 0 ? (
                  <>
                    {/* Today */}
                    <div>
                      <h4 className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Récents</h4>
                      <div className="space-y-1">
                        {history.map((session) => (
                          <div key={session.id} className="group relative">
                            {editingSessionId === session.id ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-white shadow-sm ring-1 ring-teal-500 rounded-xl">
                                <input
                                  autoFocus
                                  className="flex-1 bg-transparent text-sm outline-none"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      renameSession(session.id, editingTitle);
                                      setEditingSessionId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingSessionId(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    renameSession(session.id, editingTitle);
                                    setEditingSessionId(null);
                                  }}
                                  className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    loadSession(session.id);
                                    if (window.innerWidth < 1024) setShowHistory(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 pr-16 ${sessionId === session.id
                                    ? 'bg-white shadow-sm ring-1 ring-slate-200 text-slate-900 font-medium'
                                    : 'text-slate-600 hover:bg-slate-200/50'
                                    }`}
                                >
                                  <Brain size={14} className="opacity-40" />
                                  <div className="flex-1 truncate">
                                    {session.title || `Session du ${new Date(session.createdAt).toLocaleDateString()}`}
                                  </div>
                                </button>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.id);
                                      setEditingTitle(session.title || '');
                                    }}
                                    className="p-2 text-slate-500 hover:text-teal-500 rounded-lg hover:bg-teal-50"
                                    title="Renommer"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Supprimer cette discussion ?')) {
                                        deleteSession(session.id);
                                      }
                                    }}
                                    className="p-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 px-4 opacity-40 italic text-sm">
                    Aucun historique
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-white relative z-10 rounded-[2.5rem] lg:rounded-none overflow-hidden">
            <header className="sticky top-0 z-10 h-20 px-6 sm:px-8 border-b border-slate-100/50 bg-white/90 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2.5 rounded-xl transition-all ${showHistory ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  aria-label="Toggle history"
                >
                  <History size={20} />
                </button>
                <div className="hidden sm:grid w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl shadow-teal-500/20 place-items-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1.5">AI Skin Coach</h2>
                  <div className="flex items-center gap-2">
                    {(() => {
                      if (!chat.usage) return (
                        <div className="flex items-center gap-1.5 opacity-40">
                          <Loader2 size={10} className="animate-spin" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Quota...</span>
                        </div>
                      );
                      if (chat.usage.plan !== 'FREE') return (
                        <div className="flex items-center gap-1.5">
                          <Crown size={12} className="text-teal-600" />
                          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{chat.usage.plan}</span>
                        </div>
                      );
                      return (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-slate-600">Messages:</span>
                          <span className={chat.usage.chat.used >= 15 ? 'text-red-500' : 'text-teal-600'}>
                             {chat.usage.chat.used}/{chat.usage.chat.limit}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-11 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                aria-label="Fermer"
              >
                <X size={20} className="mx-auto" />
              </button>
            </header>

            <main
              ref={scrollRef}
              className="flex-1 overflow-y-auto scroll-smooth px-6 sm:px-10 py-8 space-y-6 bg-gradient-to-b from-white to-slate-50/50"
            >
              {contextHints.length > 0 && (
                <div className="rounded-3xl border border-teal-100/50 bg-teal-50/50 backdrop-blur-md p-5 text-sm text-teal-900 space-y-3 shadow-xl shadow-teal-500/5 animate-in fade-in slide-in-from-top-2 duration-500">
                  <h4 className="font-bold flex items-center gap-2 text-teal-800 text-xs uppercase tracking-wider">
                    <Sparkles size={12} /> Notes d'analyse
                  </h4>
                  {contextHints.map((hint, index) => (
                    <p key={`${hint}-${index}`} className="leading-relaxed opacity-90 pl-4 border-l-2 border-teal-200">
                      {hint}
                    </p>
                  ))}
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex-none self-end mb-1 mr-3 grid place-items-center text-slate-400">
                      <Brain size={16} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] px-5 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${message.role === 'user'
                      ? 'bg-[#0f172a] text-white rounded-br-none'
                      : 'bg-[#f4f4f4] text-[#0f172a] rounded-bl-none'
                      }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex-none self-end mb-1 mr-3 grid place-items-center text-slate-400">
                    <Brain size={16} />
                  </div>
                  <div className="rounded-3xl rounded-bl-lg border border-slate-100 bg-white px-6 py-4 shadow-xl shadow-slate-200/20 text-sm text-slate-500 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce duration-700" />
                      <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce duration-700 [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce duration-700 [animation-delay:0.4s]" />
                    </div>
                    <span>DeepSkyn réfléchit...</span>
                  </div>
                </div>
              )}

              {error && error === 'LIMIT_REACHED' && (
                <div className="flex justify-center my-6 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
                  <div className="max-w-[85%] bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Crown size={80} />
                    </div>
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                          <Crown size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm tracking-tight text-white/90 uppercase letter-wider">Limite atteinte</h4>
                          <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">Plan Gratuit</p>
                        </div>
                      </div>
                      <p className="text-[13px] leading-relaxed text-slate-300">
                        Vous avez atteint votre quota de <span className="text-white font-bold">20 messages quotidiens</span>. 
                        Passez au plan <span className="text-teal-500 font-bold uppercase">Pro</span> pour continuer à discuter sans limites avec votre coach.
                      </p>
                      <Link 
                        to="/upgrade"
                        className="w-full bg-teal-600 hover:bg-teal-500 text-white text-center py-3 rounded-2xl font-black text-xs transition-all shadow-xl shadow-teal-900/40 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        DÉBLOQUER LES MESSAGES ILLIMITÉS
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {error && error !== 'LIMIT_REACHED' && (
                <div className="flex justify-center mt-4">
                  <div className="bg-red-50 text-red-600 text-[11px] px-4 py-2 rounded-xl border border-red-100 flex items-center gap-2 font-medium">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                </div>
              )}

              {isInitializing && !sessionId && (
                <div className="flex justify-center mt-4">
                  <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full flex items-center gap-3 shadow-sm uppercase tracking-tight">
                    <Loader2 size={14} className="animate-spin text-teal-600" />
                    Sécurisation de la session...
                  </div>
                </div>
              )}
            </main>

            <footer className="sticky bottom-0 border-t border-slate-100/50 bg-white/95 backdrop-blur-xl px-6 sm:px-10 py-6">
              {/* Suggested Questions */}
              <div className="flex gap-2.5 overflow-x-auto pb-5 mb-1 no-scrollbar mask-fade-right">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedClick(q)}
                    disabled={isLoading || !sessionId}
                    className="flex-none px-5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white hover:border-teal-400 hover:text-teal-700 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="relative flex items-center gap-3.5">
                <div className="relative flex-1 group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={sessionId ? 'Dites-moi tout sur votre peau...' : 'Initialisation...'}
                    disabled={!sessionId || isLoading}
                    className="w-full h-14 rounded-3xl border border-slate-200 bg-slate-50/50 px-6 pr-14 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-inner group-focus-within:bg-white group-focus-within:border-teal-500 group-focus-within:ring-4 group-focus-within:ring-teal-500/10 transition-all duration-300 disabled:opacity-50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 items-center opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded border border-slate-200">Enter</kbd>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!sessionId || isLoading || !input.trim()}
                  className="h-14 w-14 rounded-3xl bg-teal-600 text-white grid place-items-center shadow-2xl shadow-teal-500/40 hover:bg-teal-700 hover:scale-110 active:scale-95 disabled:grayscale transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  aria-label="Envoyer"
                >
                  <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </form>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
