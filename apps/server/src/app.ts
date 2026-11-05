import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { timingSafeEqual } from 'node:crypto';
import type { Config } from './config.ts';

/** Renders a page for a URL. Dev uses Vite's middleware; production uses the built bundle. */
export type Renderer = (url: string) => Promise<{ status: number; html: string }>;

export interface AppDeps {
  config: Config;
  render: Renderer;
  /** Extra middleware mounted before the page renderer (Vite in dev, static files in production). */
  assets?: express.RequestHandler;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Staging is private: HTTP basic auth on every route except the health check, and never indexed. */
function stagingGate(config: Config): express.RequestHandler {
  const user = config.STAGING_USER;
  const pass = config.STAGING_PASSWORD ?? '';
  return (req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.path === '/healthz') return next();
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const [u = '', ...rest] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      if (safeEqual(u, user) && safeEqual(rest.join(':'), pass)) return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="meetoluwaseyi staging", charset="UTF-8"');
    res.status(401).send('Staging is password-protected.');
  };
}

export function createApp({ config, render, assets }: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Cloudflare / the host's proxy

  // Phase 6 replaces this with the full Content Security Policy from the brief.
  // In development Vite injects inline scripts for hot reload, so CSP is off there.
  app.use(helmet({ contentSecurityPolicy: config.isDev ? false : undefined }));

  if (config.isStaging) app.use(stagingGate(config));

  // Health: the process is up. Never cached. (GET /readyz, which also checks MongoDB, arrives in Phase 3.)
  app.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { status: 'ok' } });
  });

  // API lives under /api/v1 from Phase 3. Unknown API paths answer in the agreed error shape.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } });
  });

  if (assets) app.use(assets);

  app.get('/{*path}', async (req, res, next) => {
    try {
      const { status, html } = await render(req.originalUrl);
      res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (err) {
      next(err);
    }
  });

  // Last resort: log the details, never send a stack trace to the browser.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).send('Something went wrong on our side.');
  });

  return app;
}
