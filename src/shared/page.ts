import type { Mode, Profile, PublicProject } from './schemas.ts';

/** Every public route the site has. Anything else is a 404. */
export type RouteName =
  | 'home'
  | 'work'
  | 'project'
  | 'about'
  | 'writing'
  | 'contact'
  | 'thanks'
  | 'privacy'
  | 'skill'
  | 'article'
  | 'notfound'
  | 'error';

/** A skill page or an article, written in the small Markdown subset of web/lib/markdown.tsx. */
export interface Doc {
  kind: 'skill' | 'article';
  slug: string;
  path: string;
  /** <title> before the site name is added. */
  title: string;
  /** Meta description, under 160 characters. */
  description: string;
  eyebrow: string;
  h1: string;
  /** Short name for links, breadcrumbs and the Service schema. */
  name: string;
  published: string;
  updated: string;
  body: string;
  faq?: [string, string][];
  cta: { title: string; body: string; href: string; label: string };
  related: { href: string; label: string }[];
}

/** An article as the Writing page lists it. */
export type ArticleCard = Pick<Doc, 'path' | 'title' | 'description' | 'eyebrow' | 'published' | 'h1'>;

/**
 * What the server hands to React for one page. It is rendered to HTML on the server and the same
 * object is embedded in the page, so the browser hydrates with exactly the data the server used.
 * Public pages never fetch data from the browser.
 */
export interface PageData {
  route: RouteName;
  path: string;
  mode: Mode;
  /** First visit to the home page by a person (not a bot): play the intro before the homepage. */
  intro: boolean;
  profile: Profile;
  projects: PublicProject[];
  project?: PublicProject;
  /** Skill pages and articles. */
  doc?: Doc;
  /** The Writing page lists the on-site articles first. */
  articles?: ArticleCard[];
  nextProject?: { slug: string; title: string };
  turnstileSiteKey?: string;
  /** Google Analytics 4 ID; only set in production. */
  analyticsId?: string;
  /** Contact form re-render after a no-JavaScript post with errors. */
  form?: { values: Record<string, string>; errors: Record<string, string> };
}

export const COOKIES = { mode: 'mo_mode', seen: 'mo_seen' } as const;
export const ONE_YEAR = 365 * 24 * 60 * 60;
