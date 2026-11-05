import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import type { Renderer } from './app.ts';

/** What apps/web/src/entry-server.tsx exports. */
interface EntryServer {
  render: (url: string) => { status: number; head: string; html: string };
}

const require = createRequire(import.meta.url);
/** Root of the web package, found through the workspace link so it works from src/ and from dist/. */
const webRoot = path.dirname(require.resolve('@meetoluwaseyi/web/package.json'));

function fill(template: string, out: { head: string; html: string }): string {
  return template.replace('<!--app-head-->', out.head).replace('<!--app-html-->', out.html);
}

/** Development: Vite compiles the React app on request, with hot reload. */
export async function devRenderer(): Promise<{ render: Renderer; assets: express.RequestHandler }> {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: webRoot,
    configFile: path.join(webRoot, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  const render: Renderer = async (url) => {
    try {
      const raw = await readFile(path.join(webRoot, 'index.html'), 'utf8');
      const template = await vite.transformIndexHtml(url, raw);
      const entry = (await vite.ssrLoadModule('/src/entry-server.tsx')) as EntryServer;
      const out = entry.render(url);
      return { status: out.status, html: fill(template, out) };
    } catch (err) {
      if (err instanceof Error) vite.ssrFixStacktrace(err);
      throw err;
    }
  };
  return { render, assets: vite.middlewares };
}

/** Production: serve the built client files and render with the built server bundle. */
export async function prodRenderer(): Promise<{ render: Renderer; assets: express.RequestHandler }> {
  const clientDir = path.join(webRoot, 'dist/client');
  const template = await readFile(path.join(clientDir, 'index.html'), 'utf8');
  const entry = (await import(pathToFileURL(path.join(webRoot, 'dist/server/entry-server.js')).href)) as EntryServer;
  const render: Renderer = async (url) => {
    const out = entry.render(url);
    return { status: out.status, html: fill(template, out) };
  };
  // Hashed assets can be cached for a year; index.html is never served from here (index: false).
  const assets = express.static(clientDir, { index: false, maxAge: '1y', immutable: true });
  return { render, assets };
}
