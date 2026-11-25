import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render } from '../src/web/entry-server.tsx';
import { headFor, headHtml, sitemapXml } from '../src/server/seo.ts';
import { analyticsScripts } from '../src/server/render.ts';
import { ARTICLES, DOCS, SKILLS, docForPath } from '../src/server/content/docs.ts';
import { PROFILE } from '../src/server/db/seed-data.ts';
import { markdown } from '../src/web/lib/markdown.tsx';
import type { Doc, PageData } from '../src/shared/page.ts';

const SITE = 'https://www.meetoluwaseyi.com';
const page = (doc: Doc, mode: 'playful' | 'serious' = 'serious') =>
  ({ route: doc.kind, path: doc.path, mode, intro: false, profile: PROFILE, projects: [], doc }) as PageData;

describe('skill pages and articles', () => {
  it('has four of each, with unique paths, short titles and descriptions', () => {
    expect(SKILLS).toHaveLength(4);
    expect(ARTICLES).toHaveLength(4);
    expect(new Set(DOCS.map((d) => d.path)).size).toBe(8);
    for (const d of DOCS) {
      expect(d.title.length, d.title).toBeLessThanOrEqual(62);
      expect(d.description.length, d.path).toBeLessThanOrEqual(160);
      expect(docForPath(d.path)).toBe(d);
      expect(d.body, d.path).not.toMatch(/—|weex/i); // house style: no em dashes; employer stays private
    }
    expect(ARTICLES.every((a) => a.path.startsWith('/writing/'))).toBe(true);
  });

  for (const d of DOCS)
    for (const mode of ['playful', 'serious'] as const)
      it(`renders ${d.path} (${mode}) with one h1, the full text and a way to get in touch`, () => {
        const html = render(page(d, mode));
        expect(html.match(/<h1/g)).toHaveLength(1);
        expect(html).toContain('Oluwaseyi Oshunwusi');
        expect(html).toContain(`href="${d.cta.href}"`);
        for (const r of d.related) expect(html).toContain(`href="${r.href}"`);
        if (d.faq) expect(html).toContain('Common questions');
      });

  it('gives skill pages Person, Service, FAQ and breadcrumb data, and articles BlogPosting', () => {
    const skill = headFor(page(SKILLS[0]!), SITE);
    const types = skill.jsonLd.map((j) => (j as { '@type': string })['@type']);
    expect(types).toEqual(['Person', 'Service', 'FAQPage', 'BreadcrumbList']);
    expect(skill.canonical).toBe(`${SITE}/full-stack-developer`);
    expect(skill.ogImage).toBe(`${SITE}/og/full-stack-developer.png`);
    const person = skill.jsonLd[0] as { jobTitle: string[]; address: { addressLocality: string } };
    expect(person.jobTitle).toContain('Data Analyst');
    expect(person.address.addressLocality).toBe('Lagos');

    const article = headFor(page(ARTICLES[3]!), SITE);
    const post = article.jsonLd[0] as Record<string, unknown>;
    expect(post['@type']).toBe('BlogPosting');
    expect(post.datePublished).toBe(ARTICLES[3]!.published);
    expect(headHtml(article, 'n')).toContain('<meta property="og:type" content="article">');
  });

  it('puts the full name and the developer role in the home title', () => {
    const home = headFor({ ...page(SKILLS[0]!), route: 'home', path: '/' }, SITE);
    expect(home.title).toMatch(/^Oluwaseyi Oshunwusi \| Full-Stack Developer/);
    expect(home.description.length).toBeLessThanOrEqual(160);
  });

  it('dates every sitemap entry', () => {
    const xml = sitemapXml(SITE, []);
    expect(xml.match(/<url>/g)!.length).toBe(6 + DOCS.length);
    expect(xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)!.length).toBe(6 + DOCS.length);
  });
});

describe('markdown', () => {
  it('renders the subset and refuses links that are not site paths or web addresses', () => {
    const html = renderToStaticMarkup(
      <>
        {markdown(
          '## Head\n\nA **bold** [site](/work) and [web](https://x.com) and [bad](javascript:alert(1)).\n\n- one\n- two\n\n| a | b |\n| --- | --- |\n| 1 | 2 |',
        )}
      </>,
    );
    expect(html).toContain('<h2>Head</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a href="/work">site</a>');
    expect(html).toContain('href="https://x.com" target="_blank" rel="noopener noreferrer"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('<th scope="col">a</th>');
  });
});

describe('analytics', () => {
  it('is off without an ID or with a malformed one', () => {
    expect(analyticsScripts(undefined, 'n')).toBe('');
    expect(analyticsScripts("G-1');alert(1)//", 'n')).toBe('');
  });
  it('starts with analytics cookies denied and carries the nonce', () => {
    const s = analyticsScripts('G-G6JWK7XX3G', 'abc');
    expect(s).toContain("analytics_storage:c==='granted'?'granted':'denied'");
    expect(s).toContain('gtag/js?id=G-G6JWK7XX3G" nonce="abc"');
    expect(s.match(/nonce="abc"/g)).toHaveLength(2);
  });
});
