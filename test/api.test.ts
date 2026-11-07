import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/server/app.ts';
import { loadConfig } from '../src/server/config.ts';
import { createDb, type Db } from '../src/server/db/pool.ts';
import { migrate } from '../src/server/db/migrations.ts';
import { seed } from '../src/server/db/seed.ts';
import { createLogger } from '../src/server/lib/log.ts';
import { totpAt } from '../src/server/lib/crypto.ts';
import { bootstrapAdmin, upsertAdmin } from '../src/server/services/auth.ts';
import { createProject } from '../src/server/services/content.ts';
import type { Ctx } from '../src/server/services/context.ts';
import type { DocumentRenderer } from '../src/server/render.ts';

/**
 * Integration tests against a real MySQL (CI starts one). Skipped locally when TEST_DATABASE_URL is unset.
 * The page renderer is stubbed so these tests cover routing, data and security, not markup.
 */
const url = process.env.TEST_DATABASE_URL;

const renderer: DocumentRenderer = {
  page: async (d) =>
    `<html data-route="${d.route}" data-mode="${d.mode}" data-intro="${d.intro}">${d.profile.name}${d.form ? JSON.stringify(d.form.errors) : ''}</html>`,
  admin: async () => '<html>admin</html>',
};

describe.skipIf(!url)('API and pages (MySQL)', () => {
  let db: Db;
  let server: Server;
  let base = '';
  let ctx: Ctx;
  const sent: string[] = [];
  const browserUA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130' };

  beforeAll(async () => {
    db = createDb(url!);
    for (const t of [
      'project_slug_history',
      'projects',
      'messages',
      'admins',
      'profile',
      'settings',
      'schema_migrations',
    ]) {
      await db.query(`DROP TABLE IF EXISTS ${t}`);
    }
    await migrate(db, () => {});
    const config = { ...loadConfig({ NODE_ENV: 'test', DATABASE_URL: url }), RESEND_API_KEY: 'test-key' };
    const fakeFetch = (async (input: string | URL | Request) => {
      sent.push(String(input));
      return new Response('{"error":"down"}', { status: 500 });
    }) as typeof fetch;
    ctx = { db, config, log: createLogger('error'), fetch: fakeFetch };
    const app = createApp({ ctx, renderer });
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    await db?.end();
  });

  it('seeds twice with identical results', async () => {
    const first = await seed(db);
    const second = await seed(db);
    expect(first.projectsCreated).toBe(7);
    expect(second).toEqual({ profile: 'saved', projectsCreated: 0, projectsKept: 7 });
  });

  it('rejects a duplicate slug at the database', async () => {
    await expect(
      createProject(db, {
        slug: 'korrect-cars',
        title: 'Again',
        pillars: ['data'],
        summary: 'Duplicate slug test.',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('answers health checks', async () => {
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    const r = await fetch(`${base}/readyz`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('serves public profile and projects in the agreed shape', async () => {
    const p = await (await fetch(`${base}/api/v1/profile`)).json();
    expect(p.data.name).toBe('Oluwaseyi Oshunwusi');
    const list = await (await fetch(`${base}/api/v1/projects`)).json();
    expect(list.data).toHaveLength(7);
    expect(list.data[0]).not.toHaveProperty('repo');
    const missing = await fetch(`${base}/api/v1/projects/nope`);
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe('not_found');
  });

  it('plays the intro first on a first visit, then lands on playful', async () => {
    const first = await (await fetch(`${base}/`, { headers: browserUA })).text();
    expect(first).toContain('data-route="home"');
    expect(first).toContain('data-mode="playful"');
    expect(first).toContain('data-intro="true"');
    const back = await (await fetch(`${base}/`, { headers: { ...browserUA, cookie: 'mo_seen=1' } })).text();
    expect(back).toContain('data-intro="false"');
    expect(back).toContain('data-mode="playful"');
    const bot = await (await fetch(`${base}/`, { headers: { 'user-agent': 'Googlebot/2.1' } })).text();
    expect(bot).toContain('data-intro="false"');
    const forced = await (
      await fetch(`${base}/?intro=1`, { headers: { ...browserUA, cookie: 'mo_seen=1' } })
    ).text();
    expect(forced).toContain('data-intro="true"');
  });

  it('?mode=serious sets the cookie, skips the intro and redirects to a clean URL', async () => {
    const r = await fetch(`${base}/?mode=serious`, { redirect: 'manual', headers: browserUA });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/');
    const cookies = r.headers.getSetCookie().join(';');
    expect(cookies).toContain('mo_mode=serious');
    expect(cookies).toContain('mo_seen=1');
    const page = await (
      await fetch(`${base}/about`, { headers: { cookie: 'mo_mode=serious; mo_seen=1' } })
    ).text();
    expect(page).toContain('data-mode="serious"');
  });

  it('treats SQL in a URL as an ordinary unknown address', async () => {
    for (const slug of ["x' OR '1'='1", '1; DROP TABLE projects', "korrect-cars'--"]) {
      const api = await fetch(`${base}/api/v1/projects/${encodeURIComponent(slug)}`);
      expect(api.status).toBe(404);
      const page = await fetch(`${base}/work/${encodeURIComponent(slug)}`, { headers: browserUA });
      expect(page.status).toBe(404);
    }
    expect((await fetch(`${base}/api/v1/projects`)).status).toBe(200);
  });

  it('normalises URLs and 404s unknown pages', async () => {
    const slash = await fetch(`${base}/work/`, { redirect: 'manual' });
    expect(slash.status).toBe(301);
    expect(slash.headers.get('location')).toBe('/work');
    expect((await fetch(`${base}/does-not-exist`)).status).toBe(404);
    expect((await fetch(`${base}/work/ratedesk`)).status).toBe(404); // card only, no case study page
    expect((await fetch(`${base}/work/olist-ecommerce-bi`)).status).toBe(200);
  });

  it('on the live site, sends the plain domain to www permanently, keeping the path', async () => {
    const live = createApp({
      ctx: { ...ctx, config: { ...ctx.config, isProd: true, SITE_URL: 'https://www.meetoluwaseyi.com' } },
      renderer,
    });
    const srv = live.listen(0);
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
    try {
      const r = await fetch(`${url}/work?x=1`, {
        redirect: 'manual',
        headers: { 'x-forwarded-host': 'meetoluwaseyi.com' },
      });
      expect(r.status).toBe(301);
      expect(r.headers.get('location')).toBe('https://www.meetoluwaseyi.com/work?x=1');
      const ok = await fetch(`${url}/healthz`, { headers: { 'x-forwarded-host': 'www.meetoluwaseyi.com' } });
      expect(ok.status).toBe(200);
    } finally {
      srv.close();
    }
  });

  it('sends security headers', async () => {
    const r = await fetch(`${base}/`);
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(r.headers.get('permissions-policy')).toContain('camera=()');
    expect(r.headers.get('x-powered-by')).toBeNull();
  });

  describe('contact', () => {
    const good = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      intent: 'hire',
      message: 'I would love to talk about a role.',
    };
    const post = (body: unknown, ip = '203.0.113.1') =>
      fetch(`${base}/api/v1/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify(body),
      });

    it('accepts a good message with 202 and records a failed alert instead of losing it', async () => {
      const r = await post(good);
      expect(r.status).toBe(202);
      await new Promise((res) => setTimeout(res, 7000)); // three retries with backoff
      const [rows] = await db.query(
        'SELECT notify_email, notify_error FROM messages ORDER BY id DESC LIMIT 1',
      );
      const row = (rows as { notify_email: string; notify_error: string }[])[0]!;
      expect(row.notify_email).toBe('failed');
      expect(row.notify_error).toContain('Resend 500');
    }, 15_000);

    it('returns field errors for bad input', async () => {
      const r = await post({ ...good, email: 'nope', message: 'short' }, '203.0.113.2');
      expect(r.status).toBe(400);
      const body = await r.json();
      expect(body.error.code).toBe('validation_failed');
      expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(['email', 'message']));
    });

    it('quietly drops honeypot submissions', async () => {
      const [before] = await db.query('SELECT COUNT(*) AS n FROM messages');
      const r = await post({ ...good, website: 'http://spam.example' }, '203.0.113.3');
      expect(r.status).toBe(202);
      const [after] = await db.query('SELECT COUNT(*) AS n FROM messages');
      expect((after as { n: number }[])[0]!.n).toBe((before as { n: number }[])[0]!.n);
    });

    it('works without JavaScript: form post lands on the thank-you page', async () => {
      const form = new URLSearchParams({ ...good, website: '' });
      const r = await fetch(`${base}/contact`, {
        method: 'POST',
        body: form,
        redirect: 'manual',
        headers: { 'x-forwarded-for': '203.0.113.4' },
      });
      expect(r.status).toBe(303);
      expect(r.headers.get('location')).toBe('/contact/thanks');
      const bad = await fetch(`${base}/contact`, {
        method: 'POST',
        body: new URLSearchParams({ ...good, email: 'x' }),
        headers: { 'x-forwarded-for': '203.0.113.4' },
      });
      expect(bad.status).toBe(400);
      expect(await bad.text()).toContain('email');
    });

    it('stores hostile input as plain text: tags stripped, SQL left as harmless words', async () => {
      const hostile = `<script>alert(1)</script>Robert'); DROP TABLE messages;-- please reply`;
      const r = await post({ ...good, name: `<b>Bobby</b> Tables`, message: hostile }, '203.0.113.5');
      expect(r.status).toBe(202);
      const [rows] = await db.query('SELECT name, body FROM messages ORDER BY id DESC LIMIT 1');
      const row = (rows as { name: string; body: string }[])[0]!;
      expect(row.name).toBe('Bobby Tables');
      expect(row.body).not.toContain('<script>');
      expect(row.body).toContain('DROP TABLE messages;--');
      // The table is still there.
      const [count] = await db.query('SELECT COUNT(*) AS n FROM messages');
      expect(Number((count as { n: number }[])[0]!.n)).toBeGreaterThan(0);
    });

    it('rate-limits after 5 posts in 15 minutes', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 6; i++) codes.push((await post({ ...good, website: 'x' }, '198.51.100.9')).status);
      expect(codes.slice(0, 5).every((c) => c === 202)).toBe(true);
      expect(codes[5]).toBe(429);
    });
  });

  describe('first sign-in (no shell on the host)', () => {
    it('creates the admin from ADMIN_INITIAL_PASSWORD, then requires 2FA enrolment before a session', async () => {
      await db.query('DELETE FROM admins');
      const first = {
        ...ctx,
        config: {
          ...ctx.config,
          ADMIN_EMAIL: 'first@example.com',
          ADMIN_INITIAL_PASSWORD: 'first time password 123',
        },
      };
      expect(await bootstrapAdmin(first)).toBe(true);
      expect(await bootstrapAdmin(first)).toBe(false); // never twice
      const post = (path: string, body: object) =>
        fetch(`${base}/api/v1${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.99' },
          body: JSON.stringify(body),
        });
      const r = await post('/auth/login', {
        email: 'first@example.com',
        password: 'first time password 123',
      });
      expect(r.status).toBe(200);
      expect(r.headers.getSetCookie().join(';')).not.toContain('mo_sess=');
      const { data } = await r.json();
      expect(data.setup.secret).toMatch(/^[A-Z2-7]{32}$/);
      const bad = await post('/auth/totp/confirm', { token: data.setup.token, totp: '000000' });
      expect(bad.status).toBe(401);
      const good = await post('/auth/totp/confirm', {
        token: data.setup.token,
        totp: totpAt(data.setup.secret, Math.floor(Date.now() / 30000)),
      });
      expect(good.status).toBe(200);
      expect(good.headers.getSetCookie().join(';')).toContain('mo_sess=');
      // From now on a code is required.
      const noCode = await post('/auth/login', {
        email: 'first@example.com',
        password: 'first time password 123',
      });
      expect(noCode.status).toBe(401);
    });
  });

  describe('admin auth', () => {
    let secret = '';
    const email = 'owner@example.com';
    const password = 'correct horse battery staple';
    const login = (body: object, ip: string) =>
      fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify(body),
      });
    const code = () => totpAt(secret, Math.floor(Date.now() / 30000));

    beforeAll(async () => {
      secret = (await upsertAdmin(ctx, email, password)).totpSecret;
    });

    it('blocks admin routes without a session', async () => {
      expect((await fetch(`${base}/api/v1/admin/projects`)).status).toBe(401);
      expect((await fetch(`${base}/api/v1/admin/messages`)).status).toBe(401);
    });

    it('logs in with password + 2FA, requires CSRF on writes, and 301s an old slug after a rename', async () => {
      const r = await login({ email, password, totp: code() }, '192.0.2.10');
      expect(r.status).toBe(200);
      const { data } = await r.json();
      const cookie = r.headers
        .getSetCookie()
        .find((c) => c.startsWith('mo_sess='))!
        .split(';')[0]!;
      expect(r.headers.getSetCookie().join(';')).toMatch(/HttpOnly/i);

      const list = await (await fetch(`${base}/api/v1/admin/projects`, { headers: { cookie } })).json();
      const korrect = list.data.find((p: { slug: string }) => p.slug === 'korrect-cars');
      const body = JSON.stringify({ ...korrect, slug: 'korrect-cars-marketplace', caseStudy: { steps: [] } });

      const noCsrf = await fetch(`${base}/api/v1/admin/projects/${korrect.id}`, {
        method: 'PATCH',
        headers: { cookie, 'content-type': 'application/json' },
        body,
      });
      expect(noCsrf.status).toBe(403);

      const ok = await fetch(`${base}/api/v1/admin/projects/${korrect.id}`, {
        method: 'PATCH',
        headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': data.csrf },
        body,
      });
      expect(ok.status).toBe(200);
      const old = await fetch(`${base}/work/korrect-cars`, { redirect: 'manual' });
      expect(old.status).toBe(301);
      expect(old.headers.get('location')).toBe('/work/korrect-cars-marketplace');

      const out = await fetch(`${base}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { cookie, 'x-csrf-token': data.csrf },
      });
      expect(out.status).toBe(200);
      expect((await fetch(`${base}/api/v1/admin/projects`, { headers: { cookie } })).status).toBe(401);
    });

    it('pages the inbox newest-first and never sends IP hashes to the browser', async () => {
      const r = await login({ email, password, totp: code() }, '192.0.2.11');
      expect(r.status).toBe(200);
      const cookie = r.headers
        .getSetCookie()
        .find((c) => c.startsWith('mo_sess='))!
        .split(';')[0]!;
      await db.query('DELETE FROM messages');
      for (const n of ['one', 'two', 'three'])
        await db.execute(
          "INSERT INTO messages (name, email, intent, body, ip_hash) VALUES (?, 'p@example.com', 'hi', 'paging test message', ?)",
          [n, 'a'.repeat(64)],
        );
      const get = (q: string) => fetch(`${base}/api/v1/admin/messages?${q}`, { headers: { cookie } });

      const first = await (await get('limit=2')).json();
      expect(first.data.map((m: { name: string }) => m.name)).toEqual(['three', 'two']);
      expect(first.page.next).toEqual(expect.any(Number));
      expect(JSON.stringify(first)).not.toMatch(/ip_?hash|aaaaaaaa/i);

      const second = await (await get(`limit=2&before=${first.page.next}`)).json();
      expect(second.data.map((m: { name: string }) => m.name)).toEqual(['one']);
      expect(second.page.next).toBeNull();

      expect((await get('limit=5000')).status).toBe(400);
      expect((await get('status=deleted')).status).toBe(400);
      expect((await get('before=1%20OR%201%3D1')).status).toBe(400);
    });

    it('gives the same answer for a wrong password, wrong code or unknown email', async () => {
      const a = await (
        await login({ email, password: 'wrong password here', totp: code() }, '192.0.2.20')
      ).json();
      const b = await (
        await login({ email: 'nobody@example.com', password, totp: code() }, '192.0.2.21')
      ).json();
      expect(a.error.message).toBe(b.error.message);
    });

    it('locks the account after 5 failures', async () => {
      await upsertAdmin(ctx, email, password).then((r) => (secret = r.totpSecret));
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++)
        statuses.push(
          (await login({ email, password: 'wrong password here', totp: code() }, `192.0.2.${30 + i}`)).status,
        );
      expect(statuses.slice(0, 4)).toEqual([401, 401, 401, 401]);
      expect(statuses[4]).toBe(423);
      expect(statuses[5]).toBe(423);
      // Even the right password is refused while locked.
      expect((await login({ email, password, totp: code() }, '192.0.2.40')).status).toBe(423);
    });
  });
});
