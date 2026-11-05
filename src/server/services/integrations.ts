import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import type { Ctx } from './context.ts';
import { fetchWithTimeout } from './context.ts';
import { createProject, getSetting, setSetting } from './content.ts';

// ---------- Cloudinary: the server signs, the browser uploads straight to Cloudinary ----------
export const UPLOAD_RULES = { folder: 'meetoluwaseyi', formats: 'jpg,png,webp,avif', maxBytes: 5 * 1024 * 1024 } as const;

export function signCloudinaryUpload(ctx: Ctx, now = Math.floor(Date.now() / 1000)) {
  const { CLOUDINARY_CLOUD: cloud, CLOUDINARY_KEY: apiKey, CLOUDINARY_SECRET: secret } = ctx.config;
  if (!cloud || !apiKey || !secret) return null;
  // Every signed parameter is fixed server-side, so the browser can't change the folder or allowed types.
  const params: Record<string, string> = {
    allowed_formats: UPLOAD_RULES.formats,
    folder: UPLOAD_RULES.folder,
    timestamp: String(now),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = createHash('sha1').update(toSign + secret).digest('hex');
  return { cloud, apiKey, signature, maxBytes: UPLOAD_RULES.maxBytes, ...params };
}

// ---------- Cloudflare: purge changed pages after a publish ----------
export async function purgeUrls(ctx: Ctx, paths: string[]): Promise<void> {
  const { CLOUDFLARE_ZONE_ID: zone, CLOUDFLARE_API_TOKEN: token, SITE_URL: site } = ctx.config;
  if (!zone || !token || paths.length === 0) return;
  try {
    const res = await fetchWithTimeout(ctx, `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [...new Set(paths)].map((p) => site + p) }),
    });
    if (!res.ok) ctx.log.warn('cloudflare purge failed', { status: res.status });
  } catch (err) {
    ctx.log.warn('cloudflare purge failed', { err });
  }
}

// ---------- GitHub sync: public repos become project cards ----------
interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  fork: boolean;
  archived: boolean;
  topics?: string[];
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
}

const PILLAR_BY_TOPIC: Record<string, 'data' | 'community' | 'bd' | 'ventures'> = {
  data: 'data',
  'data-analysis': 'data',
  bi: 'data',
  community: 'community',
  telegram: 'community',
  bd: 'bd',
  venture: 'ventures',
  ventures: 'ventures',
  startup: 'ventures',
};

export function repoToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'project';
}

export function repoToTitle(name: string): string {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shouldSkip(r: GhRepo, user: string): boolean {
  return r.fork || r.archived || r.name.toLowerCase() === user.toLowerCase() || (r.topics ?? []).includes('hide-from-site');
}

export interface SyncResult {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  notModified?: boolean;
  error?: string;
}

/**
 * Reads public repos (ETag-aware, 10 s timeout). New repos become published card-only projects;
 * linked ones only get their repo facts refreshed. Hand-written text and case studies are never overwritten.
 */
export async function syncGithub(ctx: Ctx): Promise<SyncResult> {
  const user = ctx.config.GITHUB_USER;
  const etag = await getSetting<string | null>(ctx.db, 'github_etag', null);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'meetoluwaseyi-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (ctx.config.GITHUB_TOKEN) headers.Authorization = `Bearer ${ctx.config.GITHUB_TOKEN}`;
  if (etag) headers['If-None-Match'] = etag;

  const result: SyncResult = { ok: false, created: 0, updated: 0, skipped: 0 };
  try {
    const res = await fetchWithTimeout(ctx, `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=pushed`, { headers });
    if (res.status === 304) {
      await setSetting(ctx.db, 'github_last_ok', { at: new Date().toISOString() });
      return { ...result, ok: true, notModified: true };
    }
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const repos = (await res.json()) as GhRepo[];
    for (const r of repos) {
      if (shouldSkip(r, user)) {
        result.skipped++;
        continue;
      }
      const facts = {
        id: r.id,
        fullName: r.full_name,
        languages: r.language ? [r.language] : [],
        topics: r.topics ?? [],
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
        syncedAt: new Date().toISOString(),
      };
      const [linked] = await ctx.db.execute<RowDataPacket[]>(
        `SELECT id FROM projects WHERE repo_id = ? OR JSON_UNQUOTE(JSON_EXTRACT(links, '$.repo')) = ? LIMIT 1`,
        [r.id, r.html_url],
      );
      if (linked[0]) {
        await ctx.db.execute(
          `UPDATE projects SET repo_id = ?, repo = ?, summary = IF(summary = '', ?, summary) WHERE id = ?`,
          [r.id, JSON.stringify(facts), (r.description ?? '').slice(0, 280), linked[0].id],
        );
        result.updated++;
        continue;
      }
      const pillar = (r.topics ?? []).map((t) => PILLAR_BY_TOPIC[t]).find(Boolean) ?? 'building';
      const description = (r.description ?? '').trim();
      let slug = repoToSlug(r.name);
      const [taken] = await ctx.db.execute<RowDataPacket[]>('SELECT id FROM projects WHERE slug = ?', [slug]);
      if (taken[0]) slug = `${slug}-${r.id}`.slice(0, 80);
      const id = await createProject(
        ctx.db,
        {
          slug,
          title: repoToTitle(r.name),
          pillars: [pillar],
          summary: description.length >= 10 ? description.slice(0, 280) : `${repoToTitle(r.name)}, a project on GitHub.`,
          stack: [...facts.languages, ...facts.topics].slice(0, 8),
          links: { repo: r.html_url, live: r.homepage?.startsWith('https://') ? r.homepage : undefined },
          status: 'published',
          sortOrder: 500,
        },
        'github',
      );
      await ctx.db.execute('UPDATE projects SET repo_id = ?, repo = ? WHERE id = ?', [r.id, JSON.stringify(facts), id]);
      result.created++;
    }
    const newEtag = res.headers.get('etag');
    if (newEtag) await setSetting(ctx.db, 'github_etag', newEtag);
    await setSetting(ctx.db, 'github_last_ok', { at: new Date().toISOString(), ...result, ok: true });
    return { ...result, ok: true };
  } catch (err) {
    const error = (err as Error).message;
    ctx.log.warn('github sync failed', { error });
    await setSetting(ctx.db, 'github_last_error', { at: new Date().toISOString(), error });
    return { ...result, error };
  }
}
