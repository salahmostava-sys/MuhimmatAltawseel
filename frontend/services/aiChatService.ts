import { supabase } from '@services/supabase/client';
import { toServiceError } from '@services/serviceError';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type AiChatResponse = {
  message?: string;
  error?: string;
};

async function formatInvokeError(error: unknown): Promise<string> {
  const base = 'عذرًا، حدث خطأ في الاتصال. حاول مرة أخرى.';
  const err = error as { message?: string; context?: Response };

  if (err.context instanceof Response) {
    try {
      const data = (await err.context.clone().json()) as { error?: string };
      const responseError = data.error ?? '';
      if (responseError.includes('OPENAI_API_KEY')) {
        return 'المساعد غير مهيأ على الخادم (مفتاح الذكاء الاصطناعي). راجع إعدادات Supabase أو تواصل مع المسؤول.';
      }
      if (responseError.includes('Unauthorized') || err.context.status === 401) {
        return 'انتهت الجلسة أو غير مصرّح. حدّث الصفحة أو سجّل الدخول من جديد.';
      }
      if (responseError.length > 0 && responseError.length < 200) {
        return `تعذر إكمال الطلب: ${responseError}`;
      }
    } catch {
      // Ignore malformed error bodies and fall back to the generic message.
    }
  }

  if ((error as Error)?.message?.includes('Failed to fetch')) {
    return 'تعذر الاتصال بالخادم. تحقق من الشبكة أو من نشر دالة ai-chat على Supabase.';
  }

  return base;
}

export const aiChatService = {
  sendMessage: async (messages: AiChatMessage[]): Promise<string> => {
    const { data, error } = await supabase.functions.invoke<AiChatResponse>('ai-chat', {
      body: { messages },
    });

    if (error) {
      const message = await formatInvokeError(error);
      throw toServiceError(new Error(message), 'aiChatService.sendMessage');
    }

    return data?.message ?? data?.error ?? 'لا يوجد رد';
  },
};
