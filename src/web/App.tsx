import type { ComponentType } from 'react';
import type { PageData } from '../shared/page.ts';

export type PageKey =
  'PlayfulHome' | 'SeriousHome' | 'Work' | 'CaseStudy' | 'About' | 'Writing' | 'Contact' | 'Simple';
export type PageComponent = ComponentType<{ data: PageData }>;

/** Which page component a route needs. Only the home has two layouts; inner pages switch theme tokens. */
export function pageKeyFor(data: PageData): PageKey {
  switch (data.route) {
    case 'home':
      return data.mode === 'serious' ? 'SeriousHome' : 'PlayfulHome';
    case 'work':
      return 'Work';
    case 'project':
      return 'CaseStudy';
    case 'about':
      return 'About';
    case 'writing':
      return 'Writing';
    case 'contact':
      return 'Contact';
    default:
      return 'Simple';
  }
}

/** Which mockup stylesheet a page needs. The server inlines only that one. */
export function cssKeyFor(data: PageData): string {
  const k = pageKeyFor(data);
  return k === 'Simple' ? 'Writing' : k;
}

export function App({ data, Page }: { data: PageData; Page: PageComponent }) {
  const skipTo = data.route === 'home' ? '#top' : '#main-content';
  return (
    <>
      <a className="skip-link" href={skipTo}>
        Skip to content
      </a>
      <Page data={data} />
    </>
  );
}
