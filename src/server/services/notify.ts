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
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

export async function sendEmail(ctx: Ctx, to: string, subject: string, text: string, replyTo?: string): Promise<void> {
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
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** WhatsApp Business Cloud API, approved template with 3 text parameters. The number lives only in env. */
export async function sendWhatsApp(ctx: Ctx, params: string[]): Promise<void> {
  const { WHATSAPP_TOKEN: token, WHATSAPP_PHONE_ID: phoneId, WHATSAPP_TO: to, WHATSAPP_TEMPLATE: template } = ctx.config;
  if (!token || !phoneId || !to) throw new Error('WhatsApp not configured');
  const res = await fetchWithTimeout(ctx, `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: text.slice(0, 1000) })) }],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Sends both alerts with retries and writes each outcome onto the message for the admin inbox. */
export async function notifyNewMessage(ctx: Ctx, m: ContactInput & { id: number }): Promise<void> {
  const label = INTENT_LABEL[m.intent] ?? m.intent;
  const preview = m.message.length > 200 ? m.message.slice(0, 200) + '…' : m.message;
  const errors: string[] = [];
  const results: { email?: string; whatsapp?: string } = {};

  if (ctx.config.RESEND_API_KEY) {
    try {
      const to = ctx.config.NOTIFY_EMAIL ?? ctx.config.ADMIN_EMAIL;
      await withRetry(() =>
        sendEmail(ctx, to, `New message: ${label} from ${m.name}`, `${m.name} <${m.email}>\nPicked: ${label}\nVia: ${m.source}\n\n${m.message}`, m.email),
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
  if (!results.email && !results.whatsapp) return;
  await ctx.db.execute(
    `UPDATE messages SET notify_email = COALESCE(?, notify_email), notify_whatsapp = COALESCE(?, notify_whatsapp), notify_error = ? WHERE id = ?`,
    [results.email ?? null, results.whatsapp ?? null, errors.length ? errors.join(' | ').slice(0, 500) : null, m.id],
  );
  if (errors.length) ctx.log.warn('alert failed', { id: m.id, errors });
}
