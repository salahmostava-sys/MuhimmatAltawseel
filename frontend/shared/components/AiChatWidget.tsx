import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@services/supabase/client';
import { useAuth } from '@app/providers/AuthContext';
import { cn } from '@shared/lib/utils';
import { logError } from '@shared/lib/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

let msgSeq = 0;
const mkId = () => `msg-${++msgSeq}`;

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'مرحباً! أنا مساعدك الذكي 🤖\nيمكنني الإجابة على أسئلة مثل:\n- كم عدد المناديب النشطين؟\n- ما حالة المركبات؟\n- كم طلباً اليوم؟',
};

const SUGGESTIONS = ['كم مندوب نشط؟', 'حالة المركبات', 'طلبات اليوم'];

type AiChatResponse = { message?: string; error?: string };

async function formatInvokeError(error: unknown): Promise<string> {
  const base = 'عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.';
  const err = error as { message?: string; context?: Response };
  if (err.context instanceof Response) {
    try {
      const j = (await err.context.clone().json()) as { error?: string };
      const e = j.error ?? '';
      if (e.includes('OPENAI_API_KEY')) {
        return 'المساعد غير مهيأ على الخادم (مفتاح الذكاء الاصطناعي). راجع إعدادات Supabase أو تواصل مع المسؤول.';
      }
      if (e.includes('Unauthorized') || err.context.status === 401) {
        return 'انتهت الجلسة أو غير مصرّح. حدّث الصفحة أو سجّل الدخول من جديد.';
      }
      if (e.length > 0 && e.length < 200) return `تعذر إكمال الطلب: ${e}`;
    } catch {
      /* ignore */
    }
  }
  if ((error as Error)?.message?.includes('Failed to fetch')) {
    return 'تعذر الاتصال بالخادم. تحقق من الشبكة أو من نشر دالة ai-chat على Supabase.';
  }
  return base;
}

export function AiChatWidget() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      const userMsg: Message = { id: mkId(), role: 'user', content };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);

      try {
        const payloadMessages = newMessages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));

        const { data, error } = await supabase.functions.invoke<AiChatResponse>('ai-chat', {
          body: { messages: payloadMessages },
        });

        if (error) {
          logError('[AiChatWidget] ai-chat invoke failed', error);
          const errText = await formatInvokeError(error);
          setMessages((prev) => [...prev, { id: mkId(), role: 'assistant', content: errText }]);
          return;
        }

        const text = data?.message ?? data?.error ?? 'لا يوجد رد';
        setMessages((prev) => [...prev, { id: mkId(), role: 'assistant', content: text }]);
      } catch (e) {
        logError('[AiChatWidget] sendMessage failed', e);
        setMessages((prev) => [
          ...prev,
          { id: mkId(), role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleOpen = () => {
    setIsOpen((o) => !o);
    if (!hasOpened) setHasOpened(true);
  };

  if (!session) return null;

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* ── Floating Toggle Button ─────────────────── */}
      <button
        onClick={toggleOpen}
        className={cn(
          'fixed bottom-5 left-5 z-[9999] flex items-center justify-center',
          'w-13 h-13 rounded-full shadow-lg transition-all duration-300',
          'bg-primary text-primary-foreground hover:scale-105 active:scale-95',
          !hasOpened && !isOpen && 'animate-pulse',
        )}
        aria-label="مساعد مهمات التوصيل"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* ── Chat Panel ─────────────────────────────── */}
      {isOpen && (
        <div
          dir="rtl"
          className={cn(
            'fixed bottom-20 left-5 z-[9999]',
            'w-[350px] h-[500px] max-h-[80vh] max-w-[calc(100vw-2.5rem)]',
            'flex flex-col rounded-2xl shadow-2xl overflow-hidden',
            'border border-border bg-background',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-base">🤖</span>
              <span>مساعد مهمات التوصيل</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'mr-auto bg-primary text-primary-foreground rounded-tl-sm'
                    : 'ml-auto bg-muted text-foreground rounded-tr-sm',
                )}
              >
                {msg.content}
              </div>
            ))}

            {/* Suggestion Chips */}
            {showSuggestions && !isLoading && (
              <div className="flex flex-wrap gap-2 pr-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border border-primary/30',
                      'text-primary bg-primary/5 hover:bg-primary/10 transition-colors',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="ml-auto flex items-center gap-1.5 bg-muted rounded-xl px-3.5 py-2.5 w-fit rounded-tr-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="shrink-0 border-t border-border p-2.5 flex items-center gap-2 bg-background">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسأل عن النظام..."
              disabled={isLoading}
              className={cn(
                'flex-1 text-sm bg-muted/50 border border-border rounded-lg px-3 py-2',
                'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary',
                'disabled:opacity-60',
              )}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className={cn(
                'shrink-0 w-9 h-9 flex items-center justify-center rounded-lg',
                'bg-primary text-primary-foreground transition-all',
                'hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label="إرسال"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
