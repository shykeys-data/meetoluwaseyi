import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { Ctx } from '../services/context.ts';
import type { DocumentRenderer } from '../render.ts';
import { getProfile, listPublishedProjects, findProjectBySlug } from '../services/content.ts';
import { submitContact } from '../services/messages.ts';
import { HttpError, handler } from '../lib/http.ts';
import { readCookies, setCookie, isBot } from '../lib/cookies.ts';
import { sitemapXml, robotsTxt, llmsTxt } from '../seo.ts';
import { COOKIES, ONE_YEAR, type PageData, type RouteName } from '../../shared/page.ts';
import { parseMode, type Mode } from '../../shared/schemas.ts';

/** HTML depends on the mode cookie, so shared caches must not store it. Assets are cached for a year instead. */
const HTML_CACHE = 'private, no-cache';

const STATIC: Record<string, RouteName> = {
  '/': 'home',
  '/work': 'work',
  '/about': 'about',
  '/writing': 'writing',
  '/contact': 'contact',
  '/contact/thanks': 'thanks',
  '/privacy': 'privacy',
};

export function pagesRouter(ctx: Ctx, renderer: DocumentRenderer): express.Router {
  const r = express.Router();
  const secure = !ctx.config.isDev;
  const site = ctx.config.SITE_URL;
  const indexable = ctx.config.isProd;

  // ---------- Machine-readable files, built from the database ----------
  r.get('/robots.txt', (_req, res) => {
    res.type('text/plain').setHeader('Cache-Control', 'public, max-age=3600');
    res.send(robotsTxt(site, indexable, ctx.config.ADMIN_PATH));
  });
  r.get(
    '/sitemap.xml',
    handler(async (_req, res) => {
      res.type('application/xml').setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      res.send(sitemapXml(site, await listPublishedProjects(ctx.db)));
    }),
  );
  r.get(
    '/llms.txt',
    handler(async (_req, res) => {
      const profile = await getProfile(ctx.db);
      if (!profile) return res.status(503).type('text/plain').send('Content is not loaded yet.');
      res.type('text/plain').setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      res.send(llmsTxt(site, profile, await listPublishedProjects(ctx.db)));
    }),
  );

  // ---------- URL hygiene: lowercase, no trailing slash, one leading slash ----------
  r.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const path = req.path;
    const clean = localPath(path.length > 1 ? path.replace(/\/+$/, '') : path).toLowerCase();
    if (clean !== path) {
      const q = req.originalUrl.slice(req.path.length);
      return res.redirect(301, clean + (q.startsWith('?') ? q : ''));
    }
    next();
  });

  // ---------- ?mode=serious|playful sets the cookie, skips the intro, and lands on a clean URL ----------
  r.use((req, res, next) => {
    if (req.method !== 'GET' || req.query.mode === undefined) return next();
    const mode = parseMode(req.query.mode);
    if (mode) {
      setCookie(res, COOKIES.mode, mode, { maxAge: ONE_YEAR, secure });
      setCookie(res, COOKIES.seen, '1', { maxAge: ONE_YEAR, secure });
    }
    const params = new URLSearchParams(req.originalUrl.split('?')[1] ?? '');
    params.delete('mode');
    const rest = params.toString();
    res.redirect(302, localPath(req.path) + (rest ? `?${rest}` : ''));
  });

  async function base(req: Request, route: RouteName): Promise<PageData> {
    const [profile, projects] = await Promise.all([getProfile(ctx.db), listPublishedProjects(ctx.db)]);
    if (!profile) throw new HttpError(503, 'not_ready', 'Content is not loaded yet. Run the seed.');
    const cookies = readCookies(req);
    const mode: Mode = parseMode(cookies[COOKIES.mode]) ?? 'playful';
    const forced = req.query.intro === '1';
    // The intro plays once, on the home page, for people. Bots and link previews get the content straight away.
    const intro =
      route === 'home' && !isBot(req.get('user-agent')) && (forced || cookies[COOKIES.seen] !== '1');
    return {
      route,
      path: req.path,
      mode,
      intro,
      profile,
      projects,
      ...(ctx.config.TURNSTILE_SITE_KEY ? { turnstileSiteKey: ctx.config.TURNSTILE_SITE_KEY } : {}),
    };
  }

  async function send(res: Response, data: PageData, status = 200) {
    const html = await renderer.page(data, res.locals.nonce as string, site);
    res.status(status).setHeader('Cache-Control', HTML_CACHE);
    res.type('html').send(html);
  }

  // ---------- CV: a stable URL that redirects to the current file ----------
  r.get(
    '/cv',
    handler(async (req, res) => {
      const profile = await getProfile(ctx.db);
      if (profile?.links.cv) return res.redirect(302, profile.links.cv);
      await send(res, { ...(await base(req, 'notfound')) }, 404);
    }),
  );

  // ---------- Case studies ----------
  r.get(
    '/work/:slug',
    handler(async (req, res) => {
      const found = await findProjectBySlug(ctx.db, String(req.params.slug));
      if (found && 'redirectTo' in found) return res.redirect(301, `/work/${found.redirectTo}`);
      const data = await base(req, 'project');
      if (!found || !found.project.caseStudy) return send(res, { ...data, route: 'notfound' }, 404);
      const withStudies = data.projects.filter((p) => p.caseStudy);
      const i = withStudies.findIndex((p) => p.slug === found.project.slug);
      const next = withStudies[(i + 1) % withStudies.length];
      await send(res, {
        ...data,
        project: found.project,
        ...(next && next.slug !== found.project.slug
          ? { nextProject: { slug: next.slug, title: next.title } }
          : {}),
      });
    }),
  );

  // ---------- Contact without JavaScript: a real form post that lands on a thank-you page ----------
  r.post(
    '/contact',
    rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }),
    handler(async (req, res) => {
      try {
        await submitContact(ctx, req.body, req.ip ?? '0.0.0.0');
        res.redirect(303, '/contact/thanks');
      } catch (err) {
        if (!(err instanceof HttpError) || err.status >= 500) throw err;
        const raw = (req.body ?? {}) as Record<string, unknown>;
        const values = Object.fromEntries(
          ['name', 'email', 'intent', 'message'].map((k) => [
            k,
            typeof raw[k] === 'string' ? (raw[k] as string).slice(0, 2000) : '',
          ]),
        );
        const errors = err.fields ?? { _: err.message };
        await send(res, { ...(await base(req, 'contact')), form: { values, errors } }, err.status);
      }
    }),
  );

  // ---------- Every other page ----------
  r.get(
    '/{*path}',
    handler(async (req, res) => {
      const route = STATIC[req.path] ?? 'notfound';
      await send(res, await base(req, route), route === 'notfound' ? 404 : 200);
    }),
  );

  return r;
}

/**
 * A path that can only point at this site. Browsers read `//evil.com` and `/\\evil.com` as another
 * website, so a redirect built from the request path must start with exactly one slash.
 */
export function localPath(path: string): string {
  return '/' + path.replace(/^[\\/]+/, '');
}
