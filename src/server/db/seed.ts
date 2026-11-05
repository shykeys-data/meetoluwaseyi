import type { RowDataPacket } from 'mysql2';
import type { Db } from './pool.ts';
import { PROFILE, PROJECTS } from './seed-data.ts';
import { ProfileSchema, ProjectInputSchema } from '../../shared/schemas.ts';
import { saveProfile } from '../services/content.ts';

/**
 * Loads the launch content. Safe to run twice: the profile is upserted and projects are
 * matched by slug, so a second run changes nothing it already wrote.
 */
export async function seed(db: Db): Promise<{ profile: 'saved'; projectsCreated: number; projectsKept: number }> {
  await saveProfile(db, ProfileSchema.parse(PROFILE));
  let created = 0;
  let kept = 0;
  for (const raw of PROJECTS) {
    const p = ProjectInputSchema.parse(raw);
    const [rows] = await db.execute<RowDataPacket[]>('SELECT id FROM projects WHERE slug = ?', [p.slug]);
    if (rows[0]) {
      kept++;
      continue;
    }
    await db.execute(
      `INSERT INTO projects (slug, title, pillars, summary, cover, mark, stack, links, featured, sort_order, status, hidden, case_study)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.slug,
        p.title,
        JSON.stringify(p.pillars),
        p.summary,
        p.cover ? JSON.stringify(p.cover) : null,
        p.mark,
        JSON.stringify(p.stack),
        JSON.stringify(p.links),
        p.featured ? 1 : 0,
        p.sortOrder,
        p.status,
        p.hidden ? 1 : 0,
        p.caseStudy ? JSON.stringify(p.caseStudy) : null,
      ],
    );
    created++;
  }
  return { profile: 'saved', projectsCreated: created, projectsKept: kept };
}
