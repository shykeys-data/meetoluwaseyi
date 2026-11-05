import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Ctx } from './services/context.ts';
import type { DocumentRenderer } from './render.ts';
import { apiRouter } from './routes/api.ts';
import { pagesRouter } from './routes/pages.ts';
import { ping } from './db/pool.ts';
import { HttpError, tooMany } from './lib/http.ts';
import { safeEqual } from './lib/crypto.ts';
import { getProfile } from './services/content.ts';
import { PROFILE } from './db/seed-data.ts';

export interface AppDeps {
  ctx: Ctx;
  renderer: DocumentRenderer;
  /** Static files and, in development, Vite's middleware. Mounted before the page routes. */
  assets?: express.RequestHandler[];
}

/** Staging is private: HTTP basic auth on every route except the health checks, and never indexed. */
function stagingGate(ctx: Ctx): express.RequestHandler {
  const user = ctx.config.STAGING_USER;
  const pass = ctx.config.STAGING_PASSWORD ?? '';
  return (req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.path === '/healthz' || req.path === '/readyz') return next();
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const [u = '', ...rest] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      if (safeEqual(u, user) && safeEqual(rest.join(':'), pass)) return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="meetoluwaseyi staging", charset="UTF-8"');
    res.status(401).type('text/plain').send('Staging is password-protected.');
  };
}

export function createApp({ ctx, renderer, assets = [] }: AppDeps): express.Express {
  const { config, log } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // one proxy hop: the host's web server (and Cloudflare in front of it)

  // Request id + one access log line per request (no IPs, no bodies).
  app.use((req, res, next) => {
    const id = (req.get('x-request-id') ?? '').slice(0, 64) || randomUUID();
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    res.locals.nonce = randomBytes(16).toString('base64');
    const started = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/assets/')) return;
      log.info('request', {
        id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });
    next();
  });

  // Security headers. Scripts run only from this site, Turnstile, or with this response's nonce.
  app.use((req, res, next) =>
    helmet({
      contentSecurityPolicy: config.isDev
        ? false // Vite's hot reload injects inline scripts in development
        : {
            useDefaults: false,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                `'nonce-${res.locals.nonce as string}'`,
                'https://challenges.cloudflare.com',
              ],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
              fontSrc: ["'self'"],
              connectSrc: ["'self'", 'https://api.cloudinary.com'],
              frameSrc: ['https://challenges.cloudflare.com'],
              frameAncestors: ["'none'"],
              formAction: ["'self'"],
              baseUri: ["'self'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          },
      strictTransportSecurity: config.isDev ? false : { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: { action: 'deny' },
    })(req, res, next),
  );
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    );
    next();
  });

  // Health: /healthz = the process is up; /readyz = the database answers. Never cached.
  app.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { status: 'ok' } });
  });
  app.get('/readyz', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const dbOk = await ping(ctx.db);
    res.status(dbOk ? 200 : 503).json({ data: { status: dbOk ? 'ready' : 'database unavailable' } });
  });

  if (config.isStaging) app.use(stagingGate(ctx));

  // Every route: 300 requests per minute per IP.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_q, _s, next) => next(tooMany()),
    }),
  );

  // Bodies are small: 50 KB cap, JSON for the API, urlencoded for the no-JavaScript contact form.
  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb', parameterLimit: 20 }));

  for (const a of assets) app.use(a);

  app.use('/api/v1', apiRouter(ctx));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'not_found', 'No such endpoint.')));

  // Admin: an unlisted path that loads a separate, lazy bundle. Never indexed or cached.
  app.get([config.ADMIN_PATH, `${config.ADMIN_PATH}/{*rest}`], async (_req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.type('html').send(await renderer.admin(res.locals.nonce as string));
    } catch (err) {
      next(err);
    }
  });

  app.use(pagesRouter(ctx, renderer));

  // Last resort: log the details, never send a stack trace to the browser.
  app.use(async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const known = err instanceof HttpError;
    const status = known
      ? err.status
      : typeof err === 'object' && err && 'status' in err && Number((err as { status: number }).status) < 500
        ? Number((err as { status: number }).status)
        : 500;
    if (status >= 500) log.error('request failed', { id: res.locals.requestId, path: req.path, err });
    if (res.headersSent) return;
    if (req.path.startsWith('/api/')) {
      const body = known
        ? { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) }
        : status === 413
          ? { code: 'too_large', message: 'That request is too large.' }
          : status < 500
            ? { code: 'bad_request', message: 'That request couldn’t be read.' }
            : { code: 'server_error', message: 'Something went wrong on our side. Please try again.' };
      return res.status(status).json({ error: body });
    }
    try {
      const profile = (await getProfile(ctx.db).catch(() => null)) ?? PROFILE;
      const html = await renderer.page(
        {
          route: status === 404 ? 'notfound' : 'error',
          path: req.path,
          mode: 'playful',
          intro: false,
          profile,
          projects: [],
        },
        res.locals.nonce as string,
        config.SITE_URL,
      );
      res.status(status).setHeader('Cache-Control', 'no-store');
      res.type('html').send(html);
    } catch {
      res
        .status(status)
        .type('text/plain')
        .send('Something went wrong on our side. Please try again in a minute.');
    }
  });

  return app;
}
