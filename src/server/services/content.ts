import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Db } from '../db/pool.ts';
import { json } from '../db/pool.ts';
import { ProfileSchema, ProjectInputSchema, type Profile, type ProjectInput, type PublicProject } from '../../shared/schemas.ts';
import { conflict, notFound } from '../lib/http.ts';

/*
 * Profile and Projects. Every query uses `?` placeholders; values are never pasted into SQL.
 * Public reads only ever return published, visible rows and public fields.
 */

// ---------- Profile ----------
export async function getProfile(db: Db): Promise<Profile | null> {
  const [rows] = await db.execute<RowDataPacket[]>('SELECT data FROM profile WHERE id = 1');
  const row = rows[0];
  if (!row) return null;
  const parsed = ProfileSchema.safeParse(json(row.data, {}));
  return parsed.success ? parsed.data : null;
}

export async function saveProfile(db: Db, profile: Profile): Promise<void> {
  const data = ProfileSchema.parse(profile);
  await db.execute(
    'INSERT INTO profile (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify(data)],
  );
}

// ---------- Projects ----------
export interface AdminProject extends ProjectInput {
  id: number;
  source: 'manual' | 'github';
  repo: { fullName: string; stars: number; pushedAt: string; syncedAt: string } | null;
  updatedAt: string;
}

const COLS =
  'id, slug, title, pillars, summary, cover, mark, stack, links, featured, sort_order, status, hidden, source, repo, case_study, updated_at';

function toAdmin(r: RowDataPacket): AdminProject {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    title: String(r.title),
    pillars: json(r.pillars, []),
    summary: String(r.summary),
    cover: json(r.cover, null),
    mark: String(r.mark ?? ''),
    stack: json(r.stack, []),
    links: json(r.links, {}),
    featured: Boolean(r.featured),
    sortOrder: Number(r.sort_order),
    status: r.status === 'published' ? 'published' : 'draft',
    hidden: Boolean(r.hidden),
    caseStudy: json(r.case_study, null),
    source: r.source === 'github' ? 'github' : 'manual',
    repo: json(r.repo, null),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

export function toPublic(p: AdminProject): PublicProject {
  return {
    slug: p.slug,
    title: p.title,
    pillars: p.pillars,
    summary: p.summary,
    cover: p.cover,
    mark: p.mark,
    stack: p.stack,
    links: Object.fromEntries(Object.entries(p.links).filter(([, v]) => Boolean(v))) as PublicProject['links'],
    featured: p.featured,
    caseStudy: p.caseStudy,
  };
}

export async function listPublishedProjects(db: Db): Promise<PublicProject[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT ${COLS} FROM projects WHERE status = 'published' AND hidden = 0 ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(toAdmin).map(toPublic);
}

export type SlugLookup = { project: PublicProject } | { redirectTo: string } | null;

/** Finds a published project by slug; an old slug answers with where it moved, for a 301. */
export async function findProjectBySlug(db: Db, slug: string): Promise<SlugLookup> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT ${COLS} FROM projects WHERE slug = ? AND status = 'published' AND hidden = 0 LIMIT 1`,
    [slug],
  );
  if (rows[0]) return { project: toPublic(toAdmin(rows[0])) };
  const [moved] = await db.execute<RowDataPacket[]>(
    `SELECT p.slug FROM project_slug_history h JOIN projects p ON p.id = h.project_id
     WHERE h.old_slug = ? AND p.status = 'published' AND p.hidden = 0 LIMIT 1`,
    [slug],
  );
  return moved[0] ? { redirectTo: String(moved[0].slug) } : null;
}

export async function listAllProjects(db: Db): Promise<AdminProject[]> {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT ${COLS} FROM projects ORDER BY sort_order ASC, id ASC`);
  return rows.map(toAdmin);
}

export async function getProjectById(db: Db, id: number): Promise<AdminProject> {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT ${COLS} FROM projects WHERE id = ?`, [id]);
  if (!rows[0]) throw notFound('That project doesn’t exist.');
  return toAdmin(rows[0]);
}

function values(p: ProjectInput) {
  return [
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
  ];
}

function isDuplicate(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

async function slugTakenByHistory(db: Db, slug: string, exceptId?: number): Promise<boolean> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT project_id FROM project_slug_history WHERE old_slug = ? LIMIT 1',
    [slug],
  );
  return Boolean(rows[0] && Number(rows[0].project_id) !== exceptId);
}

export async function createProject(db: Db, input: unknown, source: 'manual' | 'github' = 'manual'): Promise<number> {
  const p = ProjectInputSchema.parse(input);
  if (await slugTakenByHistory(db, p.slug)) throw conflict('That address was used before by another project.');
  try {
    const [res] = await db.execute<ResultSetHeader>(
      `INSERT INTO projects (slug, title, pillars, summary, cover, mark, stack, links, featured, sort_order, status, hidden, case_study, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values(p), source],
    );
    return res.insertId;
  } catch (err) {
    if (isDuplicate(err)) throw conflict('Another project already uses that address (slug).');
    throw err;
  }
}

/** Updates a project. If the slug changes, the old one is kept so old links 301 to the new page. */
export async function updateProject(db: Db, id: number, input: unknown): Promise<void> {
  const p = ProjectInputSchema.parse(input);
  const current = await getProjectById(db, id);
  if (p.slug !== current.slug && (await slugTakenByHistory(db, p.slug, id))) {
    throw conflict('That address was used before by another project.');
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE projects SET slug = ?, title = ?, pillars = ?, summary = ?, cover = ?, mark = ?, stack = ?, links = ?,
       featured = ?, sort_order = ?, status = ?, hidden = ?, case_study = ? WHERE id = ?`,
      [...values(p), id],
    );
    if (p.slug !== current.slug) {
      await conn.execute('DELETE FROM project_slug_history WHERE old_slug = ?', [p.slug]);
      await conn.execute(
        'INSERT INTO project_slug_history (old_slug, project_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE project_id = VALUES(project_id)',
        [current.slug, id],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (isDuplicate(err)) throw conflict('Another project already uses that address (slug).');
    throw err;
  } finally {
    conn.release();
  }
}

export async function reorderProjects(db: Db, ids: number[]): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const [i, id] of ids.entries()) {
      await conn.execute('UPDATE projects SET sort_order = ? WHERE id = ?', [(i + 1) * 10, id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteProject(db: Db, id: number): Promise<void> {
  const [res] = await db.execute<ResultSetHeader>('DELETE FROM projects WHERE id = ?', [id]);
  if (res.affectedRows === 0) throw notFound('That project doesn’t exist.');
}

// ---------- Settings (small key/value facts, e.g. last GitHub sync) ----------
export async function getSetting<T>(db: Db, key: string, fallback: T): Promise<T> {
  const [rows] = await db.execute<RowDataPacket[]>('SELECT v FROM settings WHERE k = ?', [key]);
  return rows[0] ? json<T>(rows[0].v, fallback) : fallback;
}

export async function setSetting(db: Db, key: string, value: unknown): Promise<void> {
  await db.execute('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [
    key,
    JSON.stringify(value),
  ]);
}
