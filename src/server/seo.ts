import type { PageData } from '../shared/page.ts';
import type { Profile, PublicProject } from '../shared/schemas.ts';

export interface Head {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  noindex?: boolean;
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

function person(p: Profile, site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: site,
    image: site + p.photo.id,
    jobTitle: 'Community Manager (Africa)',
    worksFor: { '@type': 'Organization', name: 'WEEX' },
    description: p.headline,
    knowsLanguage: p.languages.map((l) => l.name),
    sameAs: [p.links.linkedin, p.links.github, p.links.x, p.links.telegram],
  };
}

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
        title: `${p.name}: community, business development and data`,
        description:
          `${p.tagline} ${first} runs the WEEX Africa community, builds Korrect Cars and analyses data in public.`.slice(
            0,
            160,
          ),
        jsonLd: [
          person(p, site),
          { '@context': 'https://schema.org', '@type': 'WebSite', name: p.name, url: site },
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
          'Notes from the work: the Olist BI series built in public, and Growth Without Reach on five African economies.',
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
    `<meta property="og:type" content="website">`,
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

export function sitemapXml(site: string, projects: PublicProject[]): string {
  const paths = [
    '/',
    '/work',
    '/about',
    '/writing',
    '/contact',
    '/privacy',
    ...projects.filter((p) => p.caseStudy).map((p) => `/work/${p.slug}`),
  ];
  const urls = paths.map((p) => `  <url><loc>${esc(site + p)}</loc></url>`).join('\n');
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
    `> ${p.headline}`,
    '',
    p.bio,
    '',
    '## Roles',
    ...p.experience.slice(0, 4).map((e) => `- ${e.role}, ${e.org} (${e.when})`),
    '',
    '## Projects',
    ...projects.map((pr) => `- [${pr.title}](${site}/work/${pr.slug}): ${pr.summary}`),
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
