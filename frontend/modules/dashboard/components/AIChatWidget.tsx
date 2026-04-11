/**
 * AIChatWidget — ويدجت المحادثة الذكية مع بيانات أداء حقيقية.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { groqService, type GroqMessage } from '@services/groqService';

interface AIChatWidgetProps {
  context?: {
    month: string;
    totalRiders: number;
    topRiderName?: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const QUICK_QUESTIONS = [
  'من أفضل مندوب هذا الشهر؟',
  'من انخفض أداؤه؟',
  'كم عدد المناديب الضعفاء؟',
  'ما هو متوسط الأداء؟',
  'من يستحق مكافأة؟',
];

export function AIChatWidget(_props: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    setInput('');
  };
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const isConfigured = groqService.isConfigured();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !isConfigured) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
      };

      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');
      setIsLoading(true);

      try {
        const groqMessages: GroqMessage[] = [
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: text.trim() },
        ];

        let accumulated = '';
        for await (const chunk of groqService.streamChat(groqMessages, {
          temperature: 0.7,
          max_completion_tokens: 1024,
        })) {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated }
                : m,
            ),
          );
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false }
              : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'عذراً، حدث خطأ. حاول مرة أخرى.',
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isConfigured, messages],
  );

  if (!isConfigured) return null;

  return (
    <>
      {/* Float Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-2xl
                     bg-gradient-to-br from-violet-600 to-purple-700
                     text-white shadow-2xl shadow-violet-300
                     hover:shadow-violet-400 hover:scale-105
                     transition-all duration-300 flex items-center justify-center
                     animate-in fade-in slide-in-from-bottom-4"
          title="محادثة ذكية"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 left-6 z-50 w-[380px] h-[520px]
                     bg-card rounded-2xl shadow-2xl border border-border/50
                     flex flex-col overflow-hidden
                     animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-bold">المساعد الذكي</p>
                <p className="text-[10px] text-white/70">مبني على بيانات حقيقية</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                  <Bot size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">كيف أساعدك؟</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    اسألني عن أداء المناديب
                  </p>
                </div>
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => void sendMessage(q)}
                      className="block w-full text-start text-xs px-3 py-2 rounded-xl
                                 bg-muted/40 hover:bg-muted/70 text-foreground/80
                                 transition-colors duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-md'
                      : 'bg-muted/50 text-foreground rounded-tl-md'
                  }`}
                >
                  {msg.content || (msg.isStreaming && (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border/50 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border/50
                           text-sm text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-violet-500/30
                           disabled:opacity-50"
                dir="rtl"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700
                           text-white flex items-center justify-center shrink-0
                           disabled:opacity-50 disabled:hover:bg-violet-600
                           transition-colors duration-200"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
