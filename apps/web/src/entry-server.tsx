import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App, routeMeta } from './App.tsx';

/** Called by apps/server for every page request. Phase 5 adds the mode cookie and page data. */
export function render(url: string): { status: number; head: string; html: string } {
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
  const meta = routeMeta(url);
  const head = `<title>${meta.title}</title>\n    <meta name="description" content="${meta.description}" />`;
  return { status: meta.status, head, html };
}
