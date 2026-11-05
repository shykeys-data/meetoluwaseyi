import { renderToString } from 'react-dom/server';
import { App, cssKeyFor, pageKeyFor, type PageComponent, type PageKey } from './App.tsx';
import { PlayfulHome } from './pages/PlayfulHome.tsx';
import { SeriousHome } from './pages/SeriousHome.tsx';
import { AboutPage, CaseStudyPage, ContactPage, SimplePage, WorkPage, WritingPage } from './pages/Inner.tsx';
import type { PageData } from '../shared/page.ts';

const PAGES: Record<PageKey, PageComponent> = {
  PlayfulHome,
  SeriousHome,
  Work: WorkPage,
  CaseStudy: CaseStudyPage,
  About: AboutPage,
  Writing: WritingPage,
  Contact: ContactPage,
  Simple: SimplePage,
};

export function render(data: PageData): string {
  return renderToString(<App data={data} Page={PAGES[pageKeyFor(data)]} />);
}

export { cssKeyFor };
