import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Ctx } from '../services/context.ts';
import { listPublishedProjects } from '../services/content.ts';
import { sitemapEntries } from '../seo.ts';

/** Bing's IndexNow key. The same value is served as a file at /<key>.txt so Bing can check it. */
export const INDEXNOW_KEY = '4229ae469b3f4843b43e1f7418f5f37c';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

type Sent = Record<string, string>;

/** Pages that are new or whose date changed since the last successful ping. */
export function changedSince(entries: [string, string][], sent: Sent): string[] {
  return entries.filter(([path, date]) => sent[path] !== date).map(([path]) => path);
}

/**
 * After a production start, tell Bing (and the other IndexNow engines) which pages are new or changed.
 * What was sent is kept in a small file next to the app, so a restart without new content sends nothing.
 */
export async function pingIndexNow(ctx: Ctx, stateFile: string): Promise<void> {
  const site = ctx.config.SITE_URL;
  const entries = sitemapEntries(await listPublishedProjects(ctx.db));
  const sent: Sent = await readFile(stateFile, 'utf8')
    .then((t) => JSON.parse(t) as Sent)
    .catch(() => ({}));
  const paths = changedSince(entries, sent);
  if (!paths.length) return;

  const res = await ctx.fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(site).host,
      key: INDEXNOW_KEY,
      keyLocation: `${site}/${INDEXNOW_KEY}.txt`,
      urlList: paths.map((p) => site + p),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status !== 200 && res.status !== 202) {
    ctx.log.warn('indexnow ping refused', { status: res.status, count: paths.length });
    return;
  }
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(stateFile, JSON.stringify(Object.fromEntries(entries)));
  ctx.log.info('indexnow ping sent', { count: paths.length });
}
