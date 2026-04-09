import { logError } from '@shared/lib/logger';

interface WhatsAppConfig {
  token: string;
  phone_number_id: string;
  enabled: boolean;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  try {
    const raw = localStorage.getItem('whatsapp_config');
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg.enabled || !cfg.token || !cfg.phone_number_id) return null;
    return cfg;
  } catch (e) {
    logError('[WhatsApp] getWhatsAppConfig parse failed', e, { level: 'warn' });
    return null;
  }
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  const cfg = getWhatsAppConfig();
  if (!cfg) return false;

  // Validate phone number format
  if (!to || typeof to !== 'string') {
    logError('[WhatsApp] Invalid phone number', { to });
    return false;
  }

  const cleanPhone = to.replace(/[\s\-()]/g, '').replace(/^0+/, '');
  
  // Accept local mobile numbers after trimming leading zeros as well as international formats.
  if (!/^\d{9,15}$/.test(cleanPhone)) {
    logError('[WhatsApp] Invalid phone format after cleaning', { cleanPhone });
    return false;
  }

  // Validate message
  if (!message || typeof message !== 'string' || message.length > 4096) {
    logError('[WhatsApp] Invalid message', { messageLength: message?.length });
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(cfg.phone_number_id)}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    return res.ok;
  } catch (e) {
    logError('[WhatsApp] sendWhatsAppMessage failed', e);
    return false;
  }
}
