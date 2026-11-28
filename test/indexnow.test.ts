import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../src/server/services/content.ts', () => ({ listPublishedProjects: async () => [] }));
const { INDEXNOW_KEY, changedSince, pingIndexNow } = await import('../src/server/jobs/indexnow.ts');

const ctxWith = (status: number) => {
  const calls: { url: string; body: { host: string; key: string; urlList: string[] } }[] = [];
  const ctx = {
    config: { SITE_URL: 'https://www.meetoluwaseyi.com' },
    db: {},
    log: { info: vi.fn(), warn: vi.fn() },
    fetch: async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response(null, { status });
    },
  };
  return { ctx: ctx as never, calls };
};

describe('IndexNow', () => {
  it('serves the key file with the key and nothing else', () => {
    expect(readFileSync(`public/${INDEXNOW_KEY}.txt`, 'utf8')).toBe(INDEXNOW_KEY);
  });

  it('lists only new pages and pages whose date changed', () => {
    const entries: [string, string][] = [
      ['/', '2026-11-25'],
      ['/data-analyst', '2026-12-01'],
      ['/writing/new', '2026-12-01'],
    ];
    expect(changedSince(entries, { '/': '2026-11-25', '/data-analyst': '2026-11-25' })).toEqual([
      '/data-analyst',
      '/writing/new',
    ]);
  });

  it('sends every page once, then nothing on a restart with no new content', async () => {
    const state = join(mkdtempSync(join(tmpdir(), 'indexnow-')), 'sent.json');
    const first = ctxWith(202);
    await pingIndexNow(first.ctx, state);
    expect(first.calls).toHaveLength(1);
    expect(first.calls[0]!.body.host).toBe('www.meetoluwaseyi.com');
    expect(first.calls[0]!.body.key).toBe(INDEXNOW_KEY);
    expect(first.calls[0]!.body.urlList).toContain('https://www.meetoluwaseyi.com/data-analyst');

    const again = ctxWith(202);
    await pingIndexNow(again.ctx, state);
    expect(again.calls).toHaveLength(0);
  });

  it('keeps the pages unsent when Bing refuses, so the next start retries', async () => {
    const state = join(mkdtempSync(join(tmpdir(), 'indexnow-')), 'sent.json');
    await pingIndexNow(ctxWith(403).ctx, state);
    const retry = ctxWith(202);
    await pingIndexNow(retry.ctx, state);
    expect(retry.calls).toHaveLength(1);
  });
});

describe('the CV shipped with the site', () => {
  it('is a PDF that never carries a phone number or the employer name', async () => {
    const raw = readFileSync('public/Oluwaseyi-Oshunwusi-CV.pdf');
    expect(raw.subarray(0, 5).toString()).toBe('%PDF-');
    const text = raw.toString('latin1');
    expect(text).toContain('Gate.io'); // the text is readable, so the checks below mean something
    expect(text).not.toMatch(/weex/i);
    expect(text).not.toMatch(/\+?234\s?\d{3}|0[789][01]\d{8}/);
  });
});
