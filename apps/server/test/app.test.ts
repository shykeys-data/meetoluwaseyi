import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';

const render = async (url: string) => ({ status: url === '/' ? 200 : 404, html: `<p>${url}</p>` });
let close: (() => void) | undefined;
afterEach(() => close?.());

async function start(env: Record<string, string>) {
  const app = createApp({ config: loadConfig(env), render });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  close = () => server.close();
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const STAGING = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  SITE_URL: 'https://staging.meetoluwaseyi.com',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/staging',
  SESSION_SECRET: 'x'.repeat(40),
  IP_HASH_SALT: 'y'.repeat(20),
  ADMIN_EMAIL: 'hi@meetoluwaseyi.com',
  STAGING_PASSWORD: 'correct-horse-battery',
};

describe('app', () => {
  it('answers the health check without caching', async () => {
    const base = await start({});
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ data: { status: 'ok' } });
  });

  it('renders pages with the status the page asks for', async () => {
    const base = await start({});
    expect((await fetch(`${base}/`)).status).toBe(200);
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });

  it('uses the agreed error shape for unknown API paths', async () => {
    const base = await start({});
    const res = await fetch(`${base}/api/v1/nothing-here`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'No such endpoint.' } });
  });

  it('sends security headers and hides the framework', async () => {
    const base = await start({});
    const res = await fetch(`${base}/`);
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('keeps staging behind a password and out of search engines', async () => {
    const base = await start(STAGING);
    const locked = await fetch(`${base}/`);
    expect(locked.status).toBe(401);
    expect(locked.headers.get('x-robots-tag')).toContain('noindex');

    const auth = 'Basic ' + Buffer.from('preview:correct-horse-battery').toString('base64');
    const open = await fetch(`${base}/`, { headers: { authorization: auth } });
    expect(open.status).toBe(200);

    const wrong = 'Basic ' + Buffer.from('preview:wrong').toString('base64');
    expect((await fetch(`${base}/`, { headers: { authorization: wrong } })).status).toBe(401);

    // Uptime checks reach /healthz without the password.
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });
});
