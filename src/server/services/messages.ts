import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Ctx } from './context.ts';
import { fetchWithTimeout } from './context.ts';
import { ContactInputSchema, INTENTS, type ContactInput } from '../../shared/schemas.ts';
import { badRequest, HttpError, notFound, parse, tooMany } from '../lib/http.ts';
import { hashIp } from '../lib/crypto.ts';
import { notifyNewMessage } from './notify.ts';

export interface MessageRow {
  id: number;
  name: string;
  email: string;
  intent: (typeof INTENTS)[number];
  body: string;
  source: 'form' | 'chat';
  status: 'new' | 'replied' | 'archived';
  notifyEmail: string;
  notifyWhatsapp: string;
  notifyTelegram: string;
  notifyError: string | null;
  createdAt: string;
}

const LIMITS = { perDay: 20 } as const;

/**
 * Cloudflare Turnstile check. Until TURNSTILE_SECRET is set it is skipped (the honeypot and rate limits
 * still apply) and the server logs a warning at start-up, so the form never silently breaks.
 */
export async function verifyTurnstile(ctx: Ctx, token: string | undefined, ip: string): Promise<boolean> {
  const secret = ctx.config.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetchWithTimeout(
      ctx,
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: new URLSearchParams({ secret, response: token, remoteip: ip }) },
      8000,
    );
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch (err) {
    ctx.log.warn('turnstile check failed', { err });
    return false;
  }
}

export type ContactResult = { id: number } | { ignored: true };

/**
 * validate → honeypot → Turnstile → daily limit → save → reply.
 * Alerts (email + WhatsApp) run after the reply, so the visitor never waits on them,
 * and every alert result is written back to the message so nothing fails silently.
 */
export async function submitContact(ctx: Ctx, raw: unknown, ip: string): Promise<ContactResult> {
  // Honeypot first: bots get a normal-looking success and nothing is stored or sent.
  if (
    raw &&
    typeof raw === 'object' &&
    'website' in raw &&
    String((raw as { website: unknown }).website ?? '') !== ''
  ) {
    ctx.log.info('contact honeypot tripped');
    return { ignored: true };
  }
  const input: ContactInput = parse(ContactInputSchema, raw);
  if (!(await verifyTurnstile(ctx, input.turnstileToken, ip))) {
    throw new HttpError(400, 'captcha_failed', 'We couldn’t confirm you’re human. Please try again.');
  }
  const ipHash = hashIp(ip, ctx.config.IP_HASH_SALT);
  const [count] = await ctx.db.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 DAY)',
    [ipHash],
  );
  if (Number(count[0]?.n ?? 0) >= LIMITS.perDay) throw tooMany();

  const [res] = await ctx.db.execute<ResultSetHeader>(
    `INSERT INTO messages (name, email, intent, body, source, ip_hash, notify_email, notify_whatsapp, notify_telegram)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.email,
      input.intent,
      input.message,
      input.source,
      ipHash,
      ctx.config.RESEND_API_KEY ? 'pending' : 'off',
      ctx.config.WHATSAPP_TOKEN ? 'pending' : 'off',
      ctx.config.TELEGRAM_BOT_TOKEN && ctx.config.TELEGRAM_CHAT_ID ? 'pending' : 'off',
    ],
  );
  const id = res.insertId;
  ctx.log.info('contact message saved', { id, intent: input.intent, source: input.source });

  // Fire and forget; failures are recorded on the message by notifyNewMessage itself.
  void notifyNewMessage(ctx, { id, ...input }).catch((err) => ctx.log.error('notify crashed', { id, err }));
  return { id };
}

function toRow(r: RowDataPacket): MessageRow {
  return {
    id: Number(r.id),
    name: String(r.name),
    email: String(r.email),
    intent: r.intent,
    body: String(r.body),
    source: r.source,
    status: r.status,
    notifyEmail: String(r.notify_email),
    notifyWhatsapp: String(r.notify_whatsapp),
    notifyTelegram: String(r.notify_telegram ?? 'off'),
    notifyError: r.notify_error ? String(r.notify_error) : null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function listMessages(
  ctx: Ctx,
  opts: { status?: string; intent?: string; limit?: number } = {},
): Promise<MessageRow[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.status && ['new', 'replied', 'archived'].includes(opts.status)) {
    where.push('status = ?');
    params.push(opts.status);
  }
  if (opts.intent && (INTENTS as readonly string[]).includes(opts.intent)) {
    where.push('intent = ?');
    params.push(opts.intent);
  }
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 200), 1), 1000);
  const [rows] = await ctx.db.execute<RowDataPacket[]>(
    `SELECT * FROM messages ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id DESC LIMIT ${limit}`,
    params,
  );
  return rows.map(toRow);
}

export async function setMessageStatus(ctx: Ctx, id: number, status: string): Promise<void> {
  if (!['new', 'replied', 'archived'].includes(status))
    throw badRequest('Unknown status.', { status: 'Unknown status.' });
  const [res] = await ctx.db.execute<ResultSetHeader>('UPDATE messages SET status = ? WHERE id = ?', [
    status,
    id,
  ]);
  if (res.affectedRows === 0) throw notFound('That message doesn’t exist.');
}

export async function countNewMessages(ctx: Ctx): Promise<number> {
  const [rows] = await ctx.db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM messages WHERE status = 'new'",
  );
  return Number(rows[0]?.n ?? 0);
}

/** CSV export; cells that start with = + - @ are prefixed so spreadsheets don't run them as formulas. */
export function toCsv(rows: MessageRow[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const head = ['id', 'date', 'name', 'email', 'intent', 'status', 'message'];
  const lines = rows.map((r) =>
    [String(r.id), r.createdAt, r.name, r.email, r.intent, r.status, r.body].map(cell).join(','),
  );
  return [head.join(','), ...lines].join('\r\n') + '\r\n';
}

/** Retention: messages are deleted automatically after 24 months (privacy page promise). */
export async function purgeOldMessages(ctx: Ctx): Promise<number> {
  const [res] = await ctx.db.execute<ResultSetHeader>(
    'DELETE FROM messages WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 24 MONTH)',
  );
  return res.affectedRows;
}
