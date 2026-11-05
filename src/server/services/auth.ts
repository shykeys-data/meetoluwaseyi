import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Ctx } from './context.ts';
import { LoginInputSchema } from '../../shared/schemas.ts';
import {
  decrypt,
  deriveKey,
  DUMMY_HASH,
  encrypt,
  hashPassword,
  newTotpSecret,
  randomToken,
  sign,
  unsign,
  verifyPassword,
  verifyTotp,
} from '../lib/crypto.ts';
import { HttpError, parse } from '../lib/http.ts';
import { sendEmail } from './notify.ts';

export const SESSION_COOKIE = 'mo_sess';
export const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export interface Session {
  adminId: number;
  version: number;
  expires: number;
  csrf: string;
}

const keys = (secret: string) => ({ session: deriveKey(secret, 'session'), totp: deriveKey(secret, 'totp') });

export function encodeSession(s: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(s)).toString('base64url');
  return sign(payload, keys(secret).session);
}

export function decodeSession(cookie: string | undefined, secret: string, now = Date.now()): Session | null {
  if (!cookie) return null;
  const payload = unsign(cookie, keys(secret).session);
  if (!payload) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
    if (typeof s.adminId !== 'number' || typeof s.version !== 'number' || typeof s.csrf !== 'string') return null;
    return s.expires > now ? s : null;
  } catch {
    return null;
  }
}

/** Checks the session against the database, so logout and password changes end old sessions at once. */
export async function loadAdmin(ctx: Ctx, s: Session | null): Promise<{ id: number; email: string } | null> {
  if (!s) return null;
  const [rows] = await ctx.db.execute<RowDataPacket[]>('SELECT id, email, session_version FROM admins WHERE id = ?', [s.adminId]);
  const r = rows[0];
  if (!r || Number(r.session_version) !== s.version) return null;
  return { id: Number(r.id), email: String(r.email) };
}

const GENERIC = 'That email, password or code isn’t right.';

/**
 * Password + TOTP. The same message is returned for every failure so it never reveals which
 * part was wrong or whether the email exists. 5 failures lock the account for 15 minutes.
 */
export async function login(ctx: Ctx, raw: unknown): Promise<{ cookie: string; session: Session }> {
  const input = parse(LoginInputSchema, raw);
  const [rows] = await ctx.db.execute<RowDataPacket[]>(
    'SELECT id, email, password_hash, totp_secret_enc, failed_logins, locked_until, session_version FROM admins WHERE email = ?',
    [input.email],
  );
  const a = rows[0];
  if (!a) {
    await verifyPassword(input.password, DUMMY_HASH); // same work as a real check
    ctx.log.warn('login failed', { reason: 'unknown_email' });
    throw new HttpError(401, 'invalid_login', GENERIC);
  }
  if (a.locked_until && new Date(a.locked_until as string).getTime() > Date.now()) {
    ctx.log.warn('login blocked: locked', { adminId: a.id });
    throw new HttpError(423, 'locked', `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`);
  }
  const passOk = await verifyPassword(input.password, String(a.password_hash));
  let codeOk = false;
  try {
    codeOk = verifyTotp(decrypt(String(a.totp_secret_enc), keys(ctx.config.SESSION_SECRET).totp), input.totp);
  } catch {
    codeOk = false;
  }
  if (!passOk || !codeOk) {
    const fails = Number(a.failed_logins) + 1;
    await ctx.db.execute(
      `UPDATE admins SET failed_logins = ?, locked_until = ${fails >= MAX_FAILS ? `(UTC_TIMESTAMP() + INTERVAL ${LOCK_MINUTES} MINUTE)` : 'locked_until'} WHERE id = ?`,
      [fails >= MAX_FAILS ? 0 : fails, a.id],
    );
    ctx.log.warn('login failed', { adminId: a.id, fails, locked: fails >= MAX_FAILS });
    if (fails >= MAX_FAILS) throw new HttpError(423, 'locked', `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`);
    throw new HttpError(401, 'invalid_login', GENERIC);
  }
  await ctx.db.execute('UPDATE admins SET failed_logins = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = ?', [a.id]);
  const session: Session = {
    adminId: Number(a.id),
    version: Number(a.session_version),
    expires: Date.now() + SESSION_DAYS * 86_400_000,
    csrf: randomToken(24),
  };
  ctx.log.info('login ok', { adminId: a.id });
  if (ctx.config.RESEND_API_KEY) {
    void sendEmail(ctx, String(a.email), 'New sign-in to meetoluwaseyi.com admin', `Someone signed in to the admin at ${new Date().toUTCString()}.\nIf this wasn’t you, change the password now: it ends every other session.`).catch(
      (err) => ctx.log.warn('login alert email failed', { err }),
    );
  }
  return { cookie: encodeSession(session, ctx.config.SESSION_SECRET), session };
}

/** Bumping session_version invalidates every cookie issued so far for this admin. */
export async function endAllSessions(ctx: Ctx, adminId: number): Promise<void> {
  await ctx.db.execute('UPDATE admins SET session_version = session_version + 1 WHERE id = ?', [adminId]);
}

/** Used by the CLI to create (or reset) the admin. Prints the 2FA secret once, for the authenticator app. */
export async function upsertAdmin(ctx: Ctx, email: string, password: string): Promise<{ totpSecret: string }> {
  if (password.length < 14) throw new Error('Use a password of at least 14 characters.');
  const totpSecret = newTotpSecret();
  const hash = await hashPassword(password);
  const enc = encrypt(totpSecret, keys(ctx.config.SESSION_SECRET).totp);
  await ctx.db.execute<ResultSetHeader>(
    `INSERT INTO admins (email, password_hash, totp_secret_enc) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), totp_secret_enc = VALUES(totp_secret_enc),
       failed_logins = 0, locked_until = NULL, session_version = session_version + 1`,
    [email.trim().toLowerCase(), hash, enc],
  );
  return { totpSecret };
}
