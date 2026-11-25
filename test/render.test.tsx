import { describe, expect, it } from 'vitest';
import { render } from '../src/web/entry-server.tsx';
import { PROFILE, PROJECTS } from '../src/server/db/seed-data.ts';
import { headFor } from '../src/server/seo.ts';
import type { PageData } from '../src/shared/page.ts';
import type { PublicProject } from '../src/shared/schemas.ts';

/** Oluwaseyi keeps his current employer off the public site, in the copy and in the search data. */
describe('the public pages never name the current employer', () => {
  const projects = PROJECTS.map((p) => ({
    ...p,
    cover: null,
    caseStudy: null,
  })) as unknown as PublicProject[];
  for (const route of ['home', 'about', 'work'] as const)
    for (const mode of ['playful', 'serious'] as const)
      it(`${route} (${mode})`, () => {
        const path = route === 'home' ? '/' : `/${route}`;
        const data = { route, path, mode, intro: false, profile: PROFILE, projects } as unknown as PageData;
        expect(render(data)).not.toMatch(/weex/i);
        expect(JSON.stringify(headFor(data, 'https://www.meetoluwaseyi.com'))).not.toMatch(/weex/i);
      });

  it('the launch content', () => {
    expect(JSON.stringify({ PROFILE, PROJECTS })).not.toMatch(/weex/i);
  });
});

/** Anything typed into the admin is shown as text on the public pages, never run as HTML. */
describe('server-rendered pages escape stored content', () => {
  const attack = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const project = {
    ...(PROJECTS[0] as unknown as PublicProject),
    title: `Hacked ${attack}`,
    summary: `Summary ${attack}`,
    links: {},
    cover: null,
    caseStudy: null,
  };

  for (const mode of ['playful', 'serious'] as const) {
    it(`escapes a hostile project title and summary on /work (${mode})`, () => {
      const data = {
        route: 'work',
        path: '/work',
        mode,
        intro: false,
        profile: PROFILE,
        projects: [project],
      } as unknown as PageData;
      const html = render(data);
      expect(html).not.toContain('<script>alert(2)');
      expect(html).not.toContain('<img src=x onerror');
      // The text is still shown, just as harmless characters.
      expect(html).toContain('&lt;script&gt;alert(2)');
    });
  }
});
