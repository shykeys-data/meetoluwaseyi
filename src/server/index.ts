import { cacheControlFor } from './lib/cache.ts';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadDotEnv, ConfigError } from './config.ts';
import { createDb } from './db/pool.ts';
import { migrate } from './db/migrations.ts';
import { seed } from './db/seed.ts';
import { bootstrapAdmin } from './services/auth.ts';
import { getProfile } from './services/content.ts';
import { createLogger } from './lib/log.ts';
import { createApp } from './app.ts';
import { createRenderer } from './render.ts';
import type { Ctx } from './services/context.ts';

const here = dirname(fileURLToPath(import.meta.url));
// Built: dist/server/index.js -> dist/client. Development (tsx): src/server -> dist/client is unused.
const root = resolve(here, '../..');
const clientDir = resolve(root, 'dist/client');

async function main() {
  if (process.env.NODE_ENV !== 'production') loadDotEnv(resolve(root, '.env'));
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      // Refuse to start half-configured. The message lists every problem at once.
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const log = createLogger(config.isDev ? 'debug' : 'info');
  const db = createDb(config.DATABASE_URL);
  if (!config.isDev) {
    const off = (
      ['TURNSTILE_SECRET', 'RESEND_API_KEY', 'TELEGRAM_BOT_TOKEN', 'CLOUDINARY_KEY'] as const
    ).filter((k) => !config[k]);
    if (off.length) log.warn('features off until their keys are set', { missing: off });
  }
  const ctx: Ctx = { db, config, log, fetch: globalThis.fetch };

  // The host has no shell, so the app prepares its own database on start: apply new migrations, load the
  // launch content if the database is empty, and create the first admin from ADMIN_INITIAL_PASSWORD.
  // All three are safe to repeat. If the database is down, the app still starts and /readyz reports it.
  try {
    await migrate(db, (m) => log.info('migration', { m }));
    if (!(await getProfile(db))) log.info('loaded launch content', await seed(db));
    if (await bootstrapAdmin(ctx))
      log.warn('first admin created: sign in and set up 2FA, then remove ADMIN_INITIAL_PASSWORD');
  } catch (err) {
    log.error('database setup failed', { err });
  }

  const assets: express.RequestHandler[] = [];
  let vite: import('vite').ViteDevServer | undefined;
  if (config.isDev) {
    const { createServer } = await import('vite');
    vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
    assets.push(vite.middlewares);
  } else {
    const files = express.static(clientDir, {
      index: false,
      setHeaders(res, path) {
        res.setHeader('Cache-Control', cacheControlFor(path));
      },
    });
    assets.push((req, res, next) => (req.path === '/manifest.json' ? next() : files(req, res, next)));
  }

  const renderer = createRenderer({ clientDir, ...(vite ? { vite } : {}) });
  const app = createApp({ ctx, renderer, assets });

  const server = app.listen(config.PORT, () =>
    log.info('listening', { port: config.PORT, env: config.APP_ENV }),
  );

  // Graceful shutdown: stop taking requests, finish the ones in flight, close the database.
  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    log.info('shutting down', { signal });
    server.close(() => {
      void db.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => log.error('unhandled rejection', { err }));
}

void main();
