import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadDotEnv, ConfigError } from './config.ts';
import { createDb } from './db/pool.ts';
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
    const off = (['TURNSTILE_SECRET', 'RESEND_API_KEY', 'WHATSAPP_TOKEN', 'CLOUDINARY_KEY'] as const).filter(
      (k) => !config[k],
    );
    if (off.length) log.warn('features off until their keys are set', { missing: off });
  }
  const ctx: Ctx = { db, config, log, fetch: globalThis.fetch };

  const assets: express.RequestHandler[] = [];
  let vite: import('vite').ViteDevServer | undefined;
  if (config.isDev) {
    const { createServer } = await import('vite');
    vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
    assets.push(vite.middlewares);
  } else {
    // Hashed bundles never change, so they are cached for a year; other public files for an hour.
    const files = express.static(clientDir, {
      index: false,
      setHeaders(res, path) {
        res.setHeader(
          'Cache-Control',
          /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        );
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
