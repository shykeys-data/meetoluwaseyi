import { Route, Routes } from 'react-router';
import { SITE_NAME } from '@meetoluwaseyi/shared';

/** Per-route title, description and status. Phase 4 moves this next to each page. */
export function routeMeta(url: string): { title: string; description: string; status: number } {
  const path = url.split('?')[0] ?? '/';
  if (path === '/') {
    return {
      title: 'Oluwaseyi Oshunwusi · Web3 community & growth',
      description: 'Oluwaseyi helps exchanges and Web3 projects grow communities and win in Africa.',
      status: 200,
    };
  }
  return { title: `Page not found · ${SITE_NAME}`, description: 'This page does not exist.', status: 404 };
}

function Home() {
  return (
    <main className="page" data-theme="playful">
      <p className="eyebrow">{SITE_NAME}</p>
      <h1>
        Hey, I’m <span className="accent">Oluwaseyi.</span>
      </h1>
      <p className="lead">The new site is being built. Phase 1: the foundations are in.</p>
    </main>
  );
}

function NotFound() {
  return (
    <main className="page" data-theme="playful">
      <h1>That page wandered off.</h1>
      <p className="lead">
        <a href="/">Back home</a>
      </p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
