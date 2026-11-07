import type { Request, Response } from 'express';

/** Minimal cookie parsing, so we don't need another dependency. */
export function readCookies(req: Request): Record<string, string> {
  // No prototype, so a cookie named __proto__ or constructor is just a key, never an object property.
  const out: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || Object.hasOwn(out, k)) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignore malformed cookie */
    }
  }
  return out;
}

export interface CookieOpts {
  maxAge?: number;
  httpOnly?: boolean;
  secure: boolean;
  sameSite?: 'Lax' | 'Strict';
  path?: string;
}

export function setCookie(res: Response, name: string, value: string, o: CookieOpts): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${o.path ?? '/'}`,
    `SameSite=${o.sameSite ?? 'Lax'}`,
  ];
  if (o.maxAge !== undefined) parts.push(`Max-Age=${o.maxAge}`);
  if (o.httpOnly) parts.push('HttpOnly');
  if (o.secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

const BOTS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedin|embedly|preview|lighthouse|headless/i;
export const isBot = (ua: string | undefined) => !ua || BOTS.test(ua);
