import type { Ctx } from './context.ts';
import { fetchWithTimeout } from './context.ts';
import type { ContactInput } from '../../shared/schemas.ts';

const INTENT_LABEL: Record<string, string> = {
  partner: 'Partnership',
  hire: 'Hiring',
  collab: 'Collaboration',
  hi: 'Just saying hi',
};

export async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 800): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

export async function sendEmail(
  ctx: Ctx,
  to: string,
  subject: string,
  text: string,
  replyTo?: string,
  cc?: string,
): Promise<void> {
  const key = ctx.config.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const res = await fetchWithTimeout(ctx, 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: ctx.config.MAIL_FROM ?? 'meetoluwaseyi.com <site@meetoluwaseyi.com>',
      to: [to],
      subject,
      text,
      html: `<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(cc && cc !== to ? { cc: [cc] } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** WhatsApp Business Cloud API, approved template with 3 text parameters. The number lives only in env. */
export async function sendWhatsApp(ctx: Ctx, params: string[]): Promise<void> {
  const {
    WHATSAPP_TOKEN: token,
    WHATSAPP_PHONE_ID: phoneId,
    WHATSAPP_TO: to,
    WHATSAPP_TEMPLATE: template,
  } = ctx.config;
  if (!token || !phoneId || !to) throw new Error('WhatsApp not configured');
  const res = await fetchWithTimeout(
    ctx,
    `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components: [
            { type: 'body', parameters: params.map((text) => ({ type: 'text', text: text.slice(0, 1000) })) },
          ],
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Telegram alert from a private bot to Oluwaseyi's own chat. Plain text, so nothing a visitor types is rendered. */
export async function sendTelegram(ctx: Ctx, text: string): Promise<void> {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = ctx.config;
  if (!token || !chatId) throw new Error('Telegram not configured');
  const res = await fetchWithTimeout(ctx, `https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  // Never echo the response body: the bot token is part of the URL and errors can quote it.
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
}

/** Sends each configured alert with retries and writes each outcome onto the message for the admin inbox. */
export async function notifyNewMessage(ctx: Ctx, m: ContactInput & { id: number }): Promise<void> {
  const label = INTENT_LABEL[m.intent] ?? m.intent;
  const preview = m.message.length > 200 ? m.message.slice(0, 200) + '…' : m.message;
  const errors: string[] = [];
  const results: { email?: string; whatsapp?: string; telegram?: string } = {};

  if (ctx.config.RESEND_API_KEY) {
    try {
      const to = ctx.config.NOTIFY_EMAIL ?? ctx.config.ADMIN_EMAIL;
      await withRetry(() =>
        sendEmail(
          ctx,
          to,
          `New message: ${label} from ${m.name}`,
          `${m.name} <${m.email}>\nPicked: ${label}\nVia: ${m.source}\n\n${m.message}`,
          m.email,
          ctx.config.NOTIFY_CC,
        ),
      );
      results.email = 'sent';
    } catch (err) {
      results.email = 'failed';
      errors.push(`email: ${(err as Error).message}`);
    }
  }
  if (ctx.config.WHATSAPP_TOKEN) {
    try {
      await withRetry(() => sendWhatsApp(ctx, [m.name, label, preview]));
      results.whatsapp = 'sent';
    } catch (err) {
      results.whatsapp = 'failed';
      errors.push(`whatsapp: ${(err as Error).message}`);
    }
  }
  if (ctx.config.TELEGRAM_BOT_TOKEN) {
    try {
      await withRetry(() =>
        sendTelegram(ctx, `New message on meetoluwaseyi.com\n\nFrom: ${m.name} (${m.email})\nPicked: ${label}\nVia: ${m.source}\n\n${preview}\n\nReply by email, or see it in the admin inbox.`),
      );
      results.telegram = 'sent';
    } catch (err) {
      results.telegram = 'failed';
      errors.push(`telegram: ${(err as Error).message}`);
    }
  }
  if (!results.email && !results.whatsapp && !results.telegram) return;
  await ctx.db.execute(
    `UPDATE messages SET notify_email = COALESCE(?, notify_email), notify_whatsapp = COALESCE(?, notify_whatsapp),
       notify_telegram = COALESCE(?, notify_telegram), notify_error = ? WHERE id = ?`,
    [
      results.email ?? null,
      results.whatsapp ?? null,
      results.telegram ?? null,
      errors.length ? errors.join(' | ').slice(0, 500) : null,
      m.id,
    ],
  );
  if (errors.length) ctx.log.warn('alert failed', { id: m.id, errors });
}
