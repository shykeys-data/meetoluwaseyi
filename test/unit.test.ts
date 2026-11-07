import { describe, expect, it } from 'vitest';
import * as c from '../src/server/lib/crypto.ts';
import { mask, createLogger } from '../src/server/lib/log.ts';
import { ContactInputSchema, ProjectInputSchema, plainText, parseMode } from '../src/shared/schemas.ts';
import { loadConfig, ConfigError } from '../src/server/config.ts';
import { safeJson, sitemapXml, robotsTxt } from '../src/server/seo.ts';
import { toCsv } from '../src/server/services/messages.ts';
import { readCookies } from '../src/server/lib/cookies.ts';
import { localPath } from '../src/server/routes/pages.ts';
import { encodeSession, decodeSession } from '../src/server/services/auth.ts';
import { repoToSlug, shouldSkip, signCloudinaryUpload } from '../src/server/services/integrations.ts';
import { PROFILE, PROJECTS } from '../src/server/db/seed-data.ts';
import { ProfileSchema } from '../src/shared/schemas.ts';

describe('TOTP (RFC 6238 test vectors)', () => {
  const secret = c.base32Encode(Buffer.from('12345678901234567890'));
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ])('t=%i', (t, code) => expect(c.totpAt(secret, Math.floor(t / 30), 8)).toBe(code));
  it('accepts the current code and rejects a wrong one', () => {
    const now = Date.now();
    expect(c.verifyTotp(secret, c.totpAt(secret, Math.floor(now / 30000)), now)).toBe(true);
    expect(c.verifyTotp(secret, '000000', 59_000)).toBe(false);
    expect(c.verifyTotp(secret, 'abcdef', now)).toBe(false);
  });
  it('round-trips base32', () =>
    expect(c.base32Decode(c.base32Encode(Buffer.from('hello world'))).toString()).toBe('hello world'));
});

describe('passwords, encryption, signing', () => {
  it('hashes with scrypt and verifies', async () => {
    const h = await c.hashPassword('a long enough password');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await c.verifyPassword('a long enough password', h)).toBe(true);
    expect(await c.verifyPassword('wrong password', h)).toBe(false);
    expect(await c.verifyPassword('anything', c.DUMMY_HASH)).toBe(false);
  });
  it('encrypts with AES-GCM and detects tampering', () => {
    const k = c.deriveKey('s'.repeat(40), 'totp');
    const box = c.encrypt('JBSWY3DPEHPK3PXP', k);
    expect(c.decrypt(box, k)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => c.decrypt(box.slice(0, -2) + 'AA', k)).toThrow();
  });
  it('rejects tampered or expired sessions', () => {
    const secret = 'x'.repeat(40);
    const s = { adminId: 1, version: 1, expires: Date.now() + 1000, csrf: 'tok' };
    const cookie = encodeSession(s, secret);
    expect(decodeSession(cookie, secret)).toEqual(s);
    expect(decodeSession(cookie + 'x', secret)).toBeNull();
    expect(decodeSession(cookie, 'y'.repeat(40))).toBeNull();
    expect(decodeSession(cookie, secret, Date.now() + 5000)).toBeNull();
  });
  it('hashes IPs with a salt', () => {
    expect(c.hashIp('1.2.3.4', 'salt-a')).not.toBe(c.hashIp('1.2.3.4', 'salt-b'));
    expect(c.hashIp('1.2.3.4', 'salt-a')).toHaveLength(64);
  });
});

describe('logs', () => {
  it('masks emails and IPs and redacts secrets', () => {
    expect(mask('jane@example.com at 10.20.30.40')).toBe('j***@example.com at 10.20.x.x');
    const lines: string[] = [];
    createLogger('info', (l) => lines.push(l)).info('x', {
      password: 'p',
      nested: { token: 't', email: 'bob@x.io' },
    });
    expect(lines[0]).not.toContain('"p"');
    expect(lines[0]).toContain('[redacted]');
    expect(lines[0]).toContain('b***@x.io');
  });
});

describe('shared validation', () => {
  const good = {
    name: 'Ada',
    email: 'ADA@Example.com ',
    intent: 'hire',
    message: 'Hello there, let us talk.',
  };
  it('accepts a good contact message and normalises it', () => {
    const r = ContactInputSchema.parse(good);
    expect(r.email).toBe('ada@example.com');
    expect(r.source).toBe('form');
  });
  it('strips HTML and rejects short or bad input', () => {
    expect(plainText('<b>hi</b><script>x</script> there')).toBe('hix there');
    expect(ContactInputSchema.safeParse({ ...good, email: 'nope' }).success).toBe(false);
    expect(ContactInputSchema.safeParse({ ...good, message: '<i>short</i>' }).success).toBe(false);
    expect(ContactInputSchema.safeParse({ ...good, intent: 'spam' }).success).toBe(false);
    expect(ContactInputSchema.safeParse({ ...good, website: 'http://spam' }).success).toBe(false);
  });
  it('enforces slug and https rules on projects', () => {
    const p = { slug: 'ok-slug', title: 'Title', pillars: ['data'], summary: 'A summary long enough.' };
    expect(ProjectInputSchema.safeParse(p).success).toBe(true);
    expect(ProjectInputSchema.safeParse({ ...p, slug: 'Bad Slug' }).success).toBe(false);
    expect(ProjectInputSchema.safeParse({ ...p, links: { live: 'http://insecure.example' } }).success).toBe(
      false,
    );
    expect(ProjectInputSchema.safeParse({ ...p, links: { live: 'javascript:alert(1)' } }).success).toBe(
      false,
    );
  });
  it('parses modes strictly', () => {
    expect(parseMode('serious')).toBe('serious');
    expect(parseMode('SERIOUS')).toBeNull();
    expect(parseMode(undefined)).toBeNull();
  });
  it('seed content is valid', () => {
    expect(ProfileSchema.safeParse(PROFILE).success).toBe(true);
    for (const p of PROJECTS) expect(ProjectInputSchema.safeParse(p).success, p.slug).toBe(true);
  });
});

describe('config', () => {
  it('runs in development with no variables', () => {
    const c = loadConfig({});
    expect(c.isDev).toBe(true);
    expect(c.DATABASE_URL).toMatch(/^mysql:/);
  });
  it('refuses to start production with missing values, listing all of them', () => {
    try {
      loadConfig({ NODE_ENV: 'production' });
      expect.fail('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const msg = (err as Error).message;
      for (const k of ['SITE_URL', 'DATABASE_URL', 'SESSION_SECRET', 'IP_HASH_SALT', 'ADMIN_EMAIL'])
        expect(msg).toContain(k);
    }
  });
  it('requires a staging password on staging', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        SITE_URL: 'https://staging.meetoluwaseyi.com',
        DATABASE_URL: 'mysql://u:p@localhost/db',
        SESSION_SECRET: 'z'.repeat(40),
        IP_HASH_SALT: 'z'.repeat(20),
        ADMIN_EMAIL: 'a@b.co',
      }),
    ).toThrow(/STAGING_PASSWORD/);
  });
});

describe('SEO and exports', () => {
  it('escapes JSON so it cannot close a script tag', () => {
    expect(safeJson({ x: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
  it('lists only case studies plus core pages in the sitemap', () => {
    const xml = sitemapXml('https://meetoluwaseyi.com', [
      {
        slug: 'a',
        caseStudy: {},
        title: '',
        pillars: [],
        summary: '',
        cover: null,
        mark: '',
        stack: [],
        links: {},
        featured: false,
      } as never,
      {
        slug: 'b',
        caseStudy: null,
        title: '',
        pillars: [],
        summary: '',
        cover: null,
        mark: '',
        stack: [],
        links: {},
        featured: false,
      } as never,
    ]);
    expect(xml).toContain('/work/a');
    expect(xml).not.toContain('/work/b');
  });
  it('blocks everything in robots.txt off production', () => {
    expect(robotsTxt('https://x', false, '/fixoluwaseyi')).toContain('Disallow: /');
    expect(robotsTxt('https://x', true, '/fixoluwaseyi')).toContain('Disallow: /fixoluwaseyi');
  });
  it('neutralises spreadsheet formulas in CSV', () => {
    const csv = toCsv([
      {
        id: 1,
        name: '=HYPERLINK("x")',
        email: 'a@b.c',
        intent: 'hi',
        body: '+1',
        source: 'form',
        status: 'new',
        notifyEmail: 'off',
        notifyWhatsapp: 'off',
        notifyTelegram: 'off',
        notifyError: null,
        createdAt: '2026-01-01',
      },
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"'+1"`);
  });
});

describe('GitHub sync rules', () => {
  const repo = {
    id: 1,
    name: 'My_Cool-Repo',
    full_name: 'u/x',
    description: null,
    homepage: null,
    html_url: '',
    fork: false,
    archived: false,
    topics: [],
    language: null,
    stargazers_count: 0,
    pushed_at: '',
  };
  it('makes clean slugs', () => expect(repoToSlug('My_Cool-Repo!!')).toBe('my-cool-repo'));
  it('skips forks, archived, the profile repo and hidden topics', () => {
    expect(shouldSkip(repo, 'u')).toBe(false);
    expect(shouldSkip({ ...repo, fork: true }, 'u')).toBe(true);
    expect(shouldSkip({ ...repo, archived: true }, 'u')).toBe(true);
    expect(shouldSkip({ ...repo, name: 'shykeys-data' }, 'shykeys-data')).toBe(true);
    expect(shouldSkip({ ...repo, topics: ['hide-from-site'] }, 'u')).toBe(true);
  });
  it('signs Cloudinary uploads with fixed folder and formats', () => {
    const ctx = {
      config: { CLOUDINARY_CLOUD: 'demo', CLOUDINARY_KEY: 'k', CLOUDINARY_SECRET: 'abcd' },
    } as never;
    const s = signCloudinaryUpload(ctx, 1315060510);
    expect(s?.folder).toBe('meetoluwaseyi');
    expect(s?.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(signCloudinaryUpload({ config: {} } as never)).toBeNull();
  });
});

describe('playful homepage content', () => {
  it('has all seven roles on the road, each with a role, company and note', async () => {
    const { ROAD } = await import('../src/web/content/playful.ts');
    expect(ROAD).toHaveLength(7);
    for (const r of ROAD) {
      expect(r.role.length).toBeGreaterThan(3);
      expect(r.org.length).toBeGreaterThan(1);
      expect(r.note.length).toBeGreaterThan(10);
    }
  });
});

describe('alerts', () => {
  it('sends a plain-text Telegram alert and never echoes the token on failure', async () => {
    const { sendTelegram } = await import('../src/server/services/notify.ts');
    const calls: { url: string; body: string }[] = [];
    const ok = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const config = {
      TELEGRAM_BOT_TOKEN: '123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef123',
      TELEGRAM_CHAT_ID: '987654',
    };
    await sendTelegram({ config, fetch: ok } as never, 'hello <b>x</b>');
    expect(calls[0]!.url).toContain('/sendMessage');
    expect(JSON.parse(calls[0]!.body)).toMatchObject({ chat_id: '987654', text: 'hello <b>x</b>' });
    expect(JSON.parse(calls[0]!.body)).not.toHaveProperty('parse_mode');
    const bad = (async () =>
      new Response('token 123456:ABC… invalid', { status: 401 })) as unknown as typeof fetch;
    await expect(sendTelegram({ config, fetch: bad } as never, 'x')).rejects.toThrow(/^Telegram 401$/);
  });
});

describe('input that tries to be clever', () => {
  it('strips nested tags that would rebuild a tag after one pass', () => {
    expect(plainText('<scr<b>ipt>alert(1)</scr</b>ipt>')).not.toMatch(/<[a-z/]/i);
    expect(plainText('<<script>script>x')).not.toContain('<script');
  });
  it('treats a cookie called __proto__ as a plain key, not an object property', () => {
    const c = readCookies({ headers: { cookie: '__proto__=x; constructor=y; mo_sess=abc' } } as never);
    expect(c.mo_sess).toBe('abc');
    expect(Object.getPrototypeOf(c)).toBeNull();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
  it('keeps redirect targets on this site', () => {
    for (const p of ['//evil.com', '/\\evil.com', '///a']) expect(localPath(p)).toMatch(/^\/[^/\\]/);
    expect(localPath('/work')).toBe('/work');
    expect(localPath('/')).toBe('/');
  });
});

describe('page speed', () => {
  it('puts stylesheets in <head> separately from the module script', async () => {
    const { assetTags } = await import('../src/server/render.ts');
    const t = assetTags(
      {
        'src/web/entry-client.tsx': { file: 'assets/main-abc.js', css: ['assets/main-abc.css'], imports: ['_shared'] },
        _shared: { file: 'assets/shared.js', css: ['assets/shared.css'] },
      } as never,
      'src/web/entry-client.tsx',
      'n0nce',
    );
    expect(t.css).toBe('<link rel="stylesheet" href="/assets/main-abc.css">\n<link rel="stylesheet" href="/assets/shared.css">');
    expect(t.js).toBe('<script type="module" src="/assets/main-abc.js" nonce="n0nce"></script>');
  });
  it('caches bundles and fonts for a year, images for 30 days, the rest for an hour', async () => {
    const { cacheControlFor } = await import('../src/server/lib/cache.ts');
    expect(cacheControlFor('/app/dist/client/assets/main-abc.js')).toContain('max-age=31536000');
    expect(cacheControlFor('/app/dist/client/fonts/outfit.woff2')).toContain('immutable');
    expect(cacheControlFor('/app/dist/client/img/headshot.webp')).toContain('max-age=2592000');
    expect(cacheControlFor('/app/dist/client/favicon.svg')).toBe('public, max-age=3600');
  });
});
