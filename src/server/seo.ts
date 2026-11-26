import type { Doc, PageData } from '../shared/page.ts';
import { DOCS, SKILLS } from './content/docs.ts';
import type { Profile, PublicProject } from '../shared/schemas.ts';

export interface Head {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  noindex?: boolean;
  ogType?: 'website' | 'article';
  jsonLd: object[];
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** JSON inside <script> must not be able to close the tag or start a comment. */
export const safeJson = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/** Last content change, for the sitemap. Bump it when the pages' copy changes. */
export const CONTENT_UPDATED = '2026-11-25';

const ROLES = ['Full-Stack Developer', 'Web3 Community Manager', 'Web3 Business Developer', 'Data Analyst'];

/** One Person node, referenced by @id from every other node, so search engines tie the pages to one name. */
function person(p: Profile, site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site}/#person`,
    name: p.name,
    givenName: 'Oluwaseyi',
    familyName: 'Oshunwusi',
    url: site,
    image: site + p.photo.id,
    jobTitle: ROLES,
    description: p.headline,
    address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
    knowsAbout: [
      'Full-stack web development',
      'React',
      'Node.js',
      'Express',
      'MySQL',
      'Web3 community management',
      'Crypto business development',
      'Data analysis',
      'Python',
      'SQL',
      'Power BI',
    ],
    knowsLanguage: p.languages.map((l) => l.name),
    sameAs: [p.links.linkedin, p.links.github, p.links.x, p.links.telegram],
  };
}

const ref = (site: string) => ({ '@id': `${site}/#person` });

function service(d: Doc, site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: d.name,
    serviceType: d.name,
    description: d.description,
    url: site + d.path,
    provider: ref(site),
    areaServed: [
      { '@type': 'Country', name: 'Nigeria' },
      { '@type': 'Place', name: 'Africa' },
      { '@type': 'Place', name: 'Worldwide (remote)' },
    ],
  };
}

function faqPage(d: Doc) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (d.faq ?? []).map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

function blogPosting(d: Doc, site: string, image: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: d.h1,
    description: d.description,
    url: site + d.path,
    mainEntityOfPage: site + d.path,
    image,
    datePublished: d.published,
    dateModified: d.updated,
    inLanguage: 'en',
    author: { ...ref(site), '@type': 'Person', name: 'Oluwaseyi Oshunwusi', url: `${site}/about` },
    publisher: ref(site),
  };
}

/** "Title | Oluwaseyi" when it fits in a search result, else the title alone. */
const withName = (t: string) => (t.length <= 50 ? `${t} | Oluwaseyi` : t);

function crumbs(site: string, items: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: site + path,
    })),
  };
}

function creativeWork(pr: PublicProject, p: Profile, site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: pr.title,
    description: pr.summary,
    url: `${site}/work/${pr.slug}`,
    author: { '@type': 'Person', name: p.name, url: site },
    keywords: pr.stack.join(', '),
    ...(pr.links.repo ? { codeRepository: pr.links.repo } : {}),
  };
}

export function headFor(page: PageData, site: string): Head {
  const p = page.profile;
  const first = p.name.split(' ')[0] ?? p.name;
  const base = {
    canonical: site + (page.path === '/' ? '/' : page.path),
    ogImage: `${site}/og/default.png`,
    jsonLd: [] as object[],
  };
  switch (page.route) {
    case 'home':
      return {
        ...base,
        canonical: site + '/',
        title: `${p.name} | Full-Stack Developer & Web3 Lead, Lagos`,
        description:
          'Full-stack developer, Web3 community manager, crypto BD lead and data analyst in Lagos, Nigeria. I build for the web, grow communities and close partnerships.',
        jsonLd: [
          person(p, site),
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${site}/#website`,
            name: p.name,
            url: site,
            publisher: ref(site),
          },
        ],
      };
    case 'work':
      return {
        ...base,
        title: `Work · ${p.name}`,
        description:
          'Communities grown, a car marketplace built, and data analysed in public. Every project, with links to the code and the live work.',
        jsonLd: [],
      };
    case 'project': {
      const pr = page.project;
      if (!pr) break;
      return {
        ...base,
        title: `${pr.title} · ${p.name}`,
        description: pr.summary.slice(0, 160),
        jsonLd: [
          creativeWork(pr, p, site),
          crumbs(site, [
            ['Home', '/'],
            ['Work', '/work'],
            [pr.title, `/work/${pr.slug}`],
          ]),
        ],
      };
    }
    case 'about':
      return {
        ...base,
        title: `About · ${p.name}`,
        description: `Twelve years on the web: ${p.headline}`.slice(0, 160),
        jsonLd: [person(p, site)],
      };
    case 'writing':
      return {
        ...base,
        title: `Writing · ${p.name}`,
        description:
          'Articles on full-stack development, crypto communities, business development in Nigeria and data analysis, plus the Olist BI series built in public.',
        jsonLd: [],
      };
    case 'contact':
      return {
        ...base,
        title: `Contact · ${p.name}`,
        description: `Partnerships, hiring, collaborations or just hello. ${first} reads every message.`,
        jsonLd: [],
      };
    case 'thanks':
      return {
        ...base,
        title: `Message sent · ${p.name}`,
        description: 'Thanks for your message.',
        noindex: true,
        jsonLd: [],
      };
    case 'privacy':
      return {
        ...base,
        title: `Privacy · ${p.name}`,
        description: 'What this site collects, why, and how long it keeps it.',
        jsonLd: [],
      };
    case 'skill':
    case 'article': {
      const d = page.doc;
      if (!d) break;
      const image = `${site}/og/${d.slug}.png`;
      const trail: [string, string][] =
        d.kind === 'article'
          ? [
              ['Home', '/'],
              ['Writing', '/writing'],
              [d.name, d.path],
            ]
          : [
              ['Home', '/'],
              [d.name, d.path],
            ];
      return {
        ...base,
        title: withName(d.title),
        description: d.description,
        ogImage: image,
        ogType: d.kind === 'article' ? 'article' : 'website',
        jsonLd:
          d.kind === 'article'
            ? [blogPosting(d, site, image), crumbs(site, trail)]
            : [person(p, site), service(d, site), faqPage(d), crumbs(site, trail)],
      };
    }
    default:
      break;
  }
  return {
    ...base,
    title: `Page not found · ${p.name}`,
    description: 'That page doesn’t exist.',
    noindex: true,
    jsonLd: [],
  };
}

export function headHtml(h: Head, nonce: string): string {
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}">`,
    `<link rel="canonical" href="${esc(h.canonical)}">`,
    h.noindex ? '<meta name="robots" content="noindex">' : '',
    `<meta property="og:type" content="${h.ogType ?? 'website'}">`,
    `<meta property="og:site_name" content="Oluwaseyi Oshunwusi">`,
    `<meta property="og:title" content="${esc(h.title)}">`,
    `<meta property="og:description" content="${esc(h.description)}">`,
    `<meta property="og:url" content="${esc(h.canonical)}">`,
    `<meta property="og:image" content="${esc(h.ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:site" content="@shykeys101">`,
    ...h.jsonLd.map((j) => `<script type="application/ld+json" nonce="${nonce}">${safeJson(j)}</script>`),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Every public page with its last-changed date: the sitemap and IndexNow both use this list. */
export function sitemapEntries(projects: PublicProject[]): [string, string][] {
  return [
    ...['/', '/work', '/about', '/writing', '/contact', '/privacy'].map((p): [string, string] => [
      p,
      CONTENT_UPDATED,
    ]),
    ...DOCS.map((d): [string, string] => [d.path, d.updated]),
    ...projects.filter((p) => p.caseStudy).map((p): [string, string] => [`/work/${p.slug}`, CONTENT_UPDATED]),
  ];
}

export function sitemapXml(site: string, projects: PublicProject[]): string {
  const urls = sitemapEntries(projects)
    .map(([p, d]) => `  <url><loc>${esc(site + p)}</loc><lastmod>${d}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(site: string, allow: boolean, adminPath: string): string {
  if (!allow) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: ${adminPath}\n\nSitemap: ${site}/sitemap.xml\n`;
}

/** Plain-language summary so AI assistants describe Oluwaseyi accurately (llmstxt.org format). */
export function llmsTxt(site: string, p: Profile, projects: PublicProject[]): string {
  const lines = [
    `# ${p.name}`,
    '',
    `> ${p.name} is a full-stack developer, Web3 community manager, Web3 business developer and data analyst based in Lagos, Nigeria. ${p.headline}`,
    '',
    p.bio,
    '',
    '## Roles',
    ...p.experience.slice(0, 4).map((e) => `- ${e.role}, ${e.org} (${e.when})`),
    '',
    '## Projects',
    ...projects.map((pr) => `- [${pr.title}](${site}/work/${pr.slug}): ${pr.summary}`),
    '',
    '## What I do',
    ...SKILLS.map((d) => `- [${d.name}](${site}${d.path}): ${d.description}`),
    '',
    '## Articles',
    ...DOCS.filter((d) => d.kind === 'article').map((d) => `- [${d.h1}](${site}${d.path}): ${d.description}`),
    '',
    '## Pages',
    `- [Work](${site}/work)`,
    `- [About](${site}/about)`,
    `- [Writing](${site}/writing)`,
    `- [Contact](${site}/contact)`,
    '',
    '## Elsewhere',
    `- LinkedIn: ${p.links.linkedin}`,
    `- GitHub: ${p.links.github}`,
    `- X: ${p.links.x}`,
    `- Telegram: ${p.links.telegram}`,
    '',
  ];
  return lines.join('\n');
}
