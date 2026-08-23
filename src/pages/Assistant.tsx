import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Plus, Shield, Sparkles, User, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const suggestedPrompts = [
  'Is Paracetamol 500mg by Cipla safe?',
  'What are indicators of counterfeit insulin?',
  'Check recent FDA recall enforcement notices',
  'Explain CDSCO Schedule H1 prescription rules',
  'How does the 6-agent verification pipeline work?',
  'What is the SHA-256 tamper-evident ledger?',
];

interface PastSession {
  id: string;
  title: string;
  created_at: string;
}

export default function Assistant() {
  const { user } = useAuth();
  const { messages, loading, sendMessage, resetChat, loadSession, sessionId } = useChat(user?.id);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);

  const refreshSessions = async (autoLoadFirst = false) => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setPastSessions(data);
        if (autoLoadFirst && data.length > 0) {
          loadSession(data[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function init() {
      try {
        const { data } = await supabase
          .from('chat_sessions')
          .select('id, title, created_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (data && data.length > 0) {
          setPastSessions(data);
          loadSession(data[0].id);
        }
      } catch {
        // ignore
      }
    }
    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
    refreshSessions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5.5rem)] flex gap-6">
      {/* Left Sidebar: Chat Sessions (Desktop) */}
      <div className="hidden md:flex flex-col w-72 glass-panel rounded-3xl p-4 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="glow-pill-cyan px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3 text-cyan-400" />
            Agent 0 Guarded
          </span>
          <button
            onClick={resetChat}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="New Inquiry"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pt-2">
          {pastSessions.length === 0 ? (
            <p className="text-xs text-slate-500 p-2 text-center">No past safety inquiries yet</p>
          ) : (
            pastSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`w-full text-left p-3 rounded-2xl text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                  sessionId === session.id
                    ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                <span className="truncate flex-1">{session.title || 'Medicine Safety Inquiry'}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="glass-panel-elevated flex-1 flex flex-col rounded-3xl overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AI Health Safety & Regulatory Assistant</h3>
              <p className="text-[11px] text-slate-400">Screened by Agent 0 Content Safety Guardrail</p>
            </div>
          </div>

          <span className="glow-pill-emerald hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold">
            ModelRouter Active
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto my-auto text-center space-y-5 pt-8">
              <div className="w-14 h-14 rounded-3xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/30">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-white text-xl">Pharmaceutical Safety Inquiries</h3>
                <p className="text-xs text-slate-400 mt-1">Ask questions regarding drug authenticity, CDSCO regulations, or packaging inspection.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(prompt)}
                    className="p-3.5 bg-slate-900/60 border border-slate-700/60 hover:border-cyan-500/40 hover:bg-cyan-500/10 rounded-2xl text-xs text-slate-300 hover:text-white transition-all font-medium cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-cyan-400">
                        <Shield className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-br-xs font-medium shadow-md'
                        : 'bg-slate-900/80 text-slate-200 rounded-bl-xs border border-white/10 shadow-md'
                    }`}>
                      <ReactMarkdown
                        rehypePlugins={[rehypeSanitize]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-cyan-300">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: ({ children }) => <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-[11px] text-cyan-300">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-300">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-900/80 rounded-2xl p-3 flex items-center gap-1.5 border border-white/10">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about medicine authenticity, recalls, or CDSCO rules..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-medium"
            />
            <button
              disabled={!input.trim() || loading}
              onClick={handleSend}
              className="glow-btn-cyan px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
