import type { Mode, Profile, PublicProject } from './schemas.ts';

/** Every public route the site has. Anything else is a 404. */
export type RouteName =
  'home' | 'work' | 'project' | 'about' | 'writing' | 'contact' | 'thanks' | 'privacy' | 'notfound' | 'error';

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
  nextProject?: { slug: string; title: string };
  turnstileSiteKey?: string;
  /** Contact form re-render after a no-JavaScript post with errors. */
  form?: { values: Record<string, string>; errors: Record<string, string> };
}

export const COOKIES = { mode: 'mo_mode', seen: 'mo_seen' } as const;
export const ONE_YEAR = 365 * 24 * 60 * 60;
