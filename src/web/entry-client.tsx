import { hydrateRoot } from 'react-dom/client';
import { App, pageKeyFor, type PageComponent, type PageKey } from './App.tsx';
import type { PageData } from '../shared/page.ts';
import './styles/fonts.css';
import './styles/base.css';

/** Each page is its own chunk, so a visitor downloads only the page they're on. */
const LOADERS: Record<PageKey, () => Promise<PageComponent>> = {
  PlayfulHome: () => import('./pages/PlayfulHome.tsx').then((m) => m.PlayfulHome),
  SeriousHome: () => import('./pages/SeriousHome.tsx').then((m) => m.SeriousHome),
  Work: () => import('./pages/Inner.tsx').then((m) => m.WorkPage),
  CaseStudy: () => import('./pages/Inner.tsx').then((m) => m.CaseStudyPage),
  About: () => import('./pages/Inner.tsx').then((m) => m.AboutPage),
  Writing: () => import('./pages/Inner.tsx').then((m) => m.WritingPage),
  Contact: () => import('./pages/Inner.tsx').then((m) => m.ContactPage),
  Simple: () => import('./pages/Inner.tsx').then((m) => m.SimplePage),
};

async function start() {
  const el = document.getElementById('__DATA__');
  const root = document.getElementById('root');
  if (!el || !root) return;
  const data = JSON.parse(el.textContent || '{}') as PageData;
  const Page = await LOADERS[pageKeyFor(data)]();
  hydrateRoot(root, <App data={data} Page={Page} />, {
    onRecoverableError: (err) => console.warn('hydration', err),
  });
}

void start();
