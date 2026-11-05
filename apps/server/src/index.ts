import { existsSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.ts';
import { ConfigError, loadConfig, type Config } from './config.ts';
import { devRenderer, prodRenderer } from './render.ts';

// Local convenience: read the repo-root .env if there is one. Hosts set real environment variables.
const envFile = path.resolve(import.meta.dirname, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`\n${err.message}\n\nThe app refuses to start until these are fixed. See .env.example.\n`);
    process.exit(1);
  }
  throw err;
}

const { render, assets } = config.isDev ? await devRenderer() : await prodRenderer();
const app = createApp({ config, render, assets });

const server = app.listen(config.PORT, () => {
  console.log(`meetoluwaseyi (${config.APP_ENV}) listening on http://localhost:${config.PORT}`);
});

// Graceful shutdown: stop taking new requests, let in-flight ones finish, then exit.
function shutdown(signal: string): void {
  console.log(`${signal} received, closing…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
