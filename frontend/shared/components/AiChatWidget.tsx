import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import { useAuth } from '@app/providers/AuthContext';
import { cn } from '@shared/lib/utils';
import { aiChatService, type AiChatMessage } from '@services/aiChatService';
import { getErrorMessage } from '@services/serviceError';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

let messageSequence = 0;
const nextMessageId = () => `msg-${++messageSequence}`;

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'مرحباً! أنا مساعدك الذكي.\nيمكنني الإجابة على أسئلة مثل:\n- كم عدد المناديب النشطين؟\n- ما حالة المركبات؟\n- كم طلباً اليوم؟',
};

const SUGGESTIONS = ['كم مندوب نشط؟', 'حالة المركبات', 'طلبات اليوم'];

export function AiChatWidget() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  // Clear chat when closed
  const handleClose = () => {
    setIsOpen(false);
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (chatMessages: AiChatMessage[]) => aiChatService.sendMessage(chatMessages),
    onSuccess: (content) => {
      setMessages((current) => [...current, { id: nextMessageId(), role: 'assistant', content }]);
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: getErrorMessage(error, 'عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.'),
        },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(
    (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || chatMutation.isPending) return;

      const userMessage: Message = { id: nextMessageId(), role: 'user', content };
      const nextMessages = [...messages, userMessage];
      const payloadMessages = nextMessages
        .filter((message) => message.id !== 'welcome')
        .map((message) => ({ role: message.role, content: message.content }));

      setMessages(nextMessages);
      setInput('');
      chatMutation.mutate(payloadMessages);
    },
    [chatMutation, input, messages],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const toggleOpen = () => {
    setIsOpen((current) => !current);
    if (!hasOpened) setHasOpened(true);
  };

  if (!session) return null;

  const showSuggestions = messages.length === 1;

  return (
    <>
      <button
        onClick={toggleOpen}
        className={cn(
          'fixed bottom-5 left-5 z-[9999] flex items-center justify-center',
          'h-13 w-13 rounded-full shadow-lg transition-all duration-300',
          'bg-primary text-primary-foreground hover:scale-105 active:scale-95',
          !hasOpened && !isOpen && 'animate-pulse',
        )}
        aria-label="مساعد مهمات التوصيل"
        type="button"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {isOpen && (
        <div
          dir="rtl"
          className={cn(
            'fixed bottom-20 left-5 z-[9999]',
            'flex h-[500px] max-h-[80vh] w-[350px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl',
            'border border-border bg-background shadow-2xl',
          )}
        >
          <div className="shrink-0 bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-base">AI</span>
                <span>مساعد مهمات التوصيل</span>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 transition-colors hover:bg-white/20"
                aria-label="إغلاق"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'mr-auto rounded-tl-sm bg-primary text-primary-foreground'
                    : 'ml-auto rounded-tr-sm bg-muted text-foreground',
                )}
              >
                {message.content}
              </div>
            ))}

            {showSuggestions && !chatMutation.isPending && (
              <div className="flex flex-wrap gap-2 pr-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className={cn(
                      'rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10',
                    )}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {chatMutation.isPending && (
              <div className="ml-auto flex w-fit items-center gap-1.5 rounded-xl rounded-tr-sm bg-muted px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background p-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسأل عن النظام..."
              disabled={chatMutation.isPending}
              className={cn(
                'flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm',
                'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary',
                'disabled:opacity-60',
              )}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || chatMutation.isPending}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all',
                'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40',
              )}
              aria-label="إرسال"
              type="button"
            >
              {chatMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
