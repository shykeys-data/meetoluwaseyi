import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Ctx } from '../services/context.ts';
import {
  getProfile,
  listPublishedProjects,
  findProjectBySlug,
  listAllProjects,
  getProjectById,
  createProject,
  updateProject,
  reorderProjects,
  deleteProject,
  saveProfile,
  getSetting,
} from '../services/content.ts';
import {
  submitContact,
  listMessages,
  setMessageStatus,
  toCsv,
  countNewMessages,
} from '../services/messages.ts';
import {
  login,
  confirmTotp,
  decodeSession,
  loadAdmin,
  endAllSessions,
  SESSION_COOKIE,
  SESSION_DAYS,
} from '../services/auth.ts';
import { signCloudinaryUpload, purgeUrls, syncGithub } from '../services/integrations.ts';
import { ping } from '../db/pool.ts';
import { forbidden, handler, notFound, parse, tooMany, unauthorized } from '../lib/http.ts';
import { readCookies, setCookie } from '../lib/cookies.ts';
import { safeEqual } from '../lib/crypto.ts';
import { ProfileSchema } from '../../shared/schemas.ts';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ data });
const limiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(tooMany()),
  });

const IdParam = z.coerce.number().int().positive();

export function apiRouter(ctx: Ctx): express.Router {
  const r = express.Router();
  const secure = !ctx.config.isDev;

  // ---------- Public ----------
  r.get(
    '/profile',
    handler(async (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      const profile = await getProfile(ctx.db);
      if (!profile) throw notFound();
      ok(res, profile);
    }),
  );

  r.get(
    '/projects',
    handler(async (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      ok(res, await listPublishedProjects(ctx.db));
    }),
  );

  r.get(
    '/projects/:slug',
    handler(async (req, res) => {
      const found = await findProjectBySlug(ctx.db, String(req.params.slug));
      if (!found) throw notFound();
      if ('redirectTo' in found) return res.redirect(301, `/api/v1/projects/${found.redirectTo}`);
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      ok(res, found.project);
    }),
  );

  // 5 per 15 minutes per IP (plus a 20/day cap per IP hash inside the service).
  r.post(
    '/contact',
    limiter(15 * 60_000, 5),
    handler(async (req, res) => {
      const result = await submitContact(ctx, req.body, req.ip ?? '0.0.0.0');
      void result; // bots tripping the honeypot get the same answer as people
      ok(res, { received: true }, 202);
    }),
  );

  // ---------- Auth ----------
  const loginLimit = limiter(15 * 60_000, 5);
  const startSession = (res: Response, cookie: string, csrf: string) => {
    setCookie(res, SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure,
      sameSite: 'Strict',
      maxAge: SESSION_DAYS * 86400,
    });
    ok(res, { csrf });
  };
  r.post(
    '/auth/login',
    loginLimit,
    handler(async (req, res) => {
      const result = await login(ctx, req.body);
      if (result.kind === 'setup')
        return ok(res, { setup: { token: result.token, secret: result.secret, uri: result.uri } });
      startSession(res, result.cookie, result.session.csrf);
    }),
  );
  // First sign-in only: confirm the authenticator app with one code, then the session starts.
  r.post(
    '/auth/totp/confirm',
    loginLimit,
    handler(async (req, res) => {
      const { cookie, session } = await confirmTotp(ctx, req.body);
      startSession(res, cookie, session.csrf);
    }),
  );

  // ---------- Admin (session + CSRF on every write) ----------

  r.use('/auth/me', adminGate(ctx));
  r.get('/auth/me', (_req: Request, res: Response) =>
    ok(res, { email: res.locals.admin.email, csrf: res.locals.session.csrf }),
  );
  r.post(
    '/auth/logout',
    adminGate(ctx),
    handler(async (_req, res) => {
      await endAllSessions(ctx, res.locals.admin.id);
      setCookie(res, SESSION_COOKIE, '', { httpOnly: true, secure, sameSite: 'Strict', maxAge: 0 });
      ok(res, { signedOut: true });
    }),
  );

  const a = express.Router();
  a.use(adminGate(ctx));

  a.get(
    '/dashboard',
    handler(async (_req, res) => {
      ok(res, {
        newMessages: await countNewMessages(ctx),
        githubLastOk: await getSetting(ctx.db, 'github_last_ok', null),
        githubLastError: await getSetting(ctx.db, 'github_last_error', null),
        dbOk: await ping(ctx.db),
      });
    }),
  );

  a.get(
    '/profile',
    handler(async (_req, res) => ok(res, await getProfile(ctx.db))),
  );
  a.patch(
    '/profile',
    handler(async (req, res) => {
      const profile = parse(ProfileSchema, req.body);
      await saveProfile(ctx.db, profile);
      await purgeUrls(ctx, ['/', '/about', '/writing', '/llms.txt']);
      ctx.log.info('profile updated', { adminId: res.locals.admin.id });
      ok(res, profile);
    }),
  );

  a.get(
    '/projects',
    handler(async (_req, res) => ok(res, await listAllProjects(ctx.db))),
  );
  a.post(
    '/projects',
    handler(async (req, res) => {
      const id = await createProject(ctx.db, req.body);
      const p = await getProjectById(ctx.db, id);
      await purgeUrls(ctx, ['/', '/work', `/work/${p.slug}`, '/sitemap.xml']);
      ok(res, p, 201);
    }),
  );
  a.patch(
    '/projects/:id',
    handler(async (req, res) => {
      const id = parse(IdParam, req.params.id);
      const before = await getProjectById(ctx.db, id);
      await updateProject(ctx.db, id, req.body);
      const p = await getProjectById(ctx.db, id);
      await purgeUrls(ctx, ['/', '/work', `/work/${before.slug}`, `/work/${p.slug}`, '/sitemap.xml']);
      ok(res, p);
    }),
  );
  a.post(
    '/projects/reorder',
    handler(async (req, res) => {
      const ids = parse(z.object({ ids: z.array(z.number().int().positive()).max(500) }), req.body).ids;
      await reorderProjects(ctx.db, ids);
      await purgeUrls(ctx, ['/', '/work']);
      ok(res, { reordered: ids.length });
    }),
  );
  a.delete(
    '/projects/:id',
    handler(async (req, res) => {
      const id = parse(IdParam, req.params.id);
      const p = await getProjectById(ctx.db, id);
      await deleteProject(ctx.db, id);
      await purgeUrls(ctx, ['/', '/work', `/work/${p.slug}`, '/sitemap.xml']);
      ok(res, { deleted: id });
    }),
  );

  a.get(
    '/messages',
    handler(async (req, res) => {
      const rows = await listMessages(ctx, {
        status: req.query.status as string | undefined,
        intent: req.query.intent as string | undefined,
      });
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="messages.csv"');
        return res.send(toCsv(rows));
      }
      ok(res, rows);
    }),
  );
  a.patch(
    '/messages/:id',
    handler(async (req, res) => {
      const id = parse(IdParam, req.params.id);
      const { status } = parse(z.object({ status: z.enum(['new', 'replied', 'archived']) }), req.body);
      await setMessageStatus(ctx, id, status);
      ok(res, { id, status });
    }),
  );

  a.post(
    '/upload',
    handler(async (_req, res) => {
      const signed = signCloudinaryUpload(ctx);
      if (!signed) throw notFound('Image uploads aren’t set up yet (Cloudinary keys missing).');
      ok(res, signed);
    }),
  );

  a.post(
    '/github/sync',
    limiter(60_000, 3),
    handler(async (_req, res) => {
      const result = await syncGithub(ctx);
      if (result.created || result.updated) await purgeUrls(ctx, ['/', '/work', '/sitemap.xml']);
      ok(res, result);
    }),
  );

  r.use('/admin', a);

  r.use((_req, _res, next) => next(notFound('No such endpoint.')));
  return r;
}

/** Session + CSRF gate for admin routes. */
export function adminGate(ctx: Ctx): express.RequestHandler {
  return (req, res, next) => {
    void (async () => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      const session = decodeSession(readCookies(req)[SESSION_COOKIE], ctx.config.SESSION_SECRET);
      const who = await loadAdmin(ctx, session);
      if (!session || !who) throw unauthorized();
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const sent = String(req.get('x-csrf-token') ?? '');
        if (!sent || !safeEqual(sent, session.csrf)) {
          ctx.log.warn('csrf rejected', { adminId: who.id, path: req.path });
          throw forbidden('Your session expired. Reload the page and try again.');
        }
      }
      res.locals.admin = who;
      res.locals.session = session;
    })().then(() => next(), next);
  };
}
