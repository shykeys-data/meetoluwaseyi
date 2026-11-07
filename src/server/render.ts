import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ViteDevServer } from 'vite';
import type { PageData } from '../shared/page.ts';
import { render as renderApp, cssKeyFor } from '../web/entry-server.tsx';
import { PAGE_CSS } from '../web/mockup/page-css.ts';
import { headFor, headHtml, safeJson } from './seo.ts';

interface ManifestChunk {
  file: string;
  css?: string[];
  imports?: string[];
}

export interface DocumentRenderer {
  page(data: PageData, nonce: string, site: string, extraHead?: string): Promise<string>;
  admin(nonce: string): Promise<string>;
}

/** Fonts and the two theme colours. Only two font files are preloaded (performance budget). */
const STATIC_HEAD = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FFF6E5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#07080B" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">`;

/** Only two font files are preloaded (performance budget): the display and body faces of the current mode. */
const PRELOAD = {
  playful: ['outfit-300-900-normal.woff2', 'caveat-400-700-normal.woff2'],
  serious: ['instrument-serif-400-normal.woff2', 'geist-300-600-normal.woff2'],
} as const;
const preloads = (mode: 'playful' | 'serious') =>
  PRELOAD[mode]
    .map((f) => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`)
    .join('\n');

function doc(opts: {
  lang?: string;
  theme: string;
  htmlClass: string;
  head: string;
  body: string;
  scripts: string;
}): string {
  return `<!doctype html>
<html lang="${opts.lang ?? 'en'}" data-theme="${opts.theme}" class="${opts.htmlClass}">
<head>
${STATIC_HEAD}
${opts.head}
</head>
<body>
<div id="root">${opts.body}</div>
${opts.scripts}
</body>
</html>`;
}

/**
 * Stylesheets go in <head> so they block the first paint: painted without them, hidden blocks such as the
 * intro take up a full screen and the page then jumps (Lighthouse measured a layout shift of 1.0).
 * The module script goes at the end of <body>.
 */
export function assetTags(
  manifest: Record<string, ManifestChunk>,
  entry: string,
  nonce: string,
): { css: string; js: string } {
  const chunk = manifest[entry];
  if (!chunk) throw new Error(`Entry ${entry} missing from the client manifest. Run npm run build.`);
  const css = new Set<string>(chunk.css ?? []);
  for (const imp of chunk.imports ?? []) for (const c of manifest[imp]?.css ?? []) css.add(c);
  return {
    css: [...css].map((c) => `<link rel="stylesheet" href="/${c}">`).join('\n'),
    js: `<script type="module" src="/${chunk.file}" nonce="${nonce}"></script>`,
  };
}

/**
 * The intro decision has to happen before first paint, so a tiny inline script (allowed by nonce)
 * adds `intro-on` to <html>. Without JavaScript the class never appears and the homepage simply shows.
 */
function bootScript(data: PageData, nonce: string): string {
  // Failsafe: if the page script never takes over (blocked or failed), the intro clears itself after 6 s.
  // The intro's look follows the visitor's own clock (sun 07:00–17:59, moon otherwise; ?sky=day|night to test),
  // decided here before first paint so the intro never flashes the wrong sky.
  const intro = data.intro
    ? `var d=document.documentElement,h=new Date().getHours(),q=(location.search.match(/[?&]sky=(day|night)/)||[])[1];` +
      `d.classList.add('intro-on','sky-'+(q||(h>=18||h<7?'night':'day')));` +
      `setTimeout(function(){if(!window.__introOwned)d.classList.remove('intro-on')},6000);`
    : '';
  return `<script nonce="${nonce}">document.documentElement.classList.add('js');${intro}</script>`;
}

function dataScript(data: PageData): string {
  return `<script id="__DATA__" type="application/json">${safeJson(data)}</script>`;
}

export function createRenderer(opts: { vite?: ViteDevServer; clientDir: string }): DocumentRenderer {
  const manifestPath = resolve(opts.clientDir, 'manifest.json');
  let manifest: Record<string, ManifestChunk> | null = null;
  const getManifest = () => {
    if (!manifest) {
      if (!existsSync(manifestPath)) throw new Error('Client build missing. Run npm run build first.');
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, ManifestChunk>;
    }
    return manifest;
  };

  const scriptsFor = async (
    entry: string,
    nonce: string,
    url: string,
  ): Promise<{ css: string; js: string }> => {
    if (opts.vite) {
      // Development: let Vite inject its client and the React refresh preamble.
      const html = await opts.vite.transformIndexHtml(
        url,
        `<html><head></head><body><script type="module" src="/${entry}"></script></body></html>`,
      );
      const js = (html.match(/<script[\s\S]*?<\/script>/g) ?? [])
        .map((s) => s.replace('<script', `<script nonce="${nonce}"`))
        .join('\n');
      return { css: '', js };
    }
    return assetTags(getManifest(), entry, nonce);
  };

  return {
    async page(data, nonce, site, extraHead = '') {
      const body = renderApp(data);
      const pageCss = PAGE_CSS[cssKeyFor(data)] ?? '';
      const assets = await scriptsFor('src/web/entry-client.tsx', nonce, data.path);
      const head = [
        headHtml(headFor(data, site), nonce),
        preloads(data.mode),
        `<style>${pageCss.replace(/<\/style/gi, '<\\/style')}</style>`,
        // After the page styles, as before, so the cascade order is unchanged.
        assets.css,
        extraHead,
        bootScript(data, nonce),
      ].join('\n');
      const scripts = [dataScript(data), assets.js].join('\n');
      const htmlClass = `mode-${data.mode}`;
      return doc({ theme: data.mode, htmlClass, head, body, scripts });
    },
    async admin(nonce) {
      const assets = await scriptsFor('src/web/admin/entry-admin.tsx', nonce, '/admin');
      const head = `<title>Admin · meetoluwaseyi.com</title>\n<meta name="robots" content="noindex, nofollow">\n${assets.css}`;
      const scripts = assets.js;
      return doc({
        theme: 'admin',
        htmlClass: 'admin',
        head,
        body: '<p class="admin-loading">Loading…</p>',
        scripts,
      });
    },
  };
}
