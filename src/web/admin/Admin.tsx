import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { PILLARS, ProjectInputSchema, ProfileSchema, type ProjectInput } from '../../shared/schemas.ts';

/**
 * Admin: functional, keyboard-friendly, no animation. Every write sends the CSRF token from the session.
 * Validation uses the same shared schemas as the API, so errors show before saving.
 */
type Tab = 'dashboard' | 'projects' | 'profile' | 'messages';
interface AdminProject extends ProjectInput {
  id: number;
  source: string;
  updatedAt: string;
}
interface Message {
  id: number;
  name: string;
  email: string;
  intent: string;
  body: string;
  source: string;
  status: string;
  notifyEmail: string;
  notifyWhatsapp: string;
  notifyError: string | null;
  createdAt: string;
}

let csrf = '';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T; error?: { message: string; fields?: Record<string, string> } };
  if (!res.ok) throw Object.assign(new Error(body.error?.message ?? `Request failed (${res.status})`), { status: res.status, fields: body.error?.fields });
  return body.data as T;
}

export function Admin() {
  const [me, setMe] = useState<{ email: string } | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('dashboard');

  useEffect(() => {
    api<{ email: string; csrf: string }>('/auth/me')
      .then((d) => {
        csrf = d.csrf;
        setMe({ email: d.email });
      })
      .catch(() => setMe(null));
  }, []);

  if (me === undefined) return <p className="muted">Loading…</p>;
  if (me === null) return <Login onDone={(email) => setMe({ email })} />;

  return (
    <div className="admin-wrap">
      <header className="admin-head">
        <strong>meetoluwaseyi admin</strong>
        <nav aria-label="Admin sections">
          {(['dashboard', 'projects', 'profile', 'messages'] as Tab[]).map((t) => (
            <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
              {t[0]!.toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <span className="muted">{me.email}</span>
        <button
          type="button"
          onClick={async () => {
            await api('/auth/logout', { method: 'POST' }).catch(() => {});
            csrf = '';
            setMe(null);
          }}
        >
          Sign out
        </button>
      </header>
      <main id="main-content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'projects' && <Projects />}
        {tab === 'profile' && <ProfileEditor />}
        {tab === 'messages' && <Messages />}
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: (email: string) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const d = await api<{ csrf: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password'), totp: String(fd.get('totp') ?? '').replace(/\s/g, '') }),
      });
      csrf = d.csrf;
      onDone(String(fd.get('email')));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>Sign in</h1>
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required minLength={12} />
      </Field>
      <Field label="6-digit code from your authenticator app">
        <input name="totp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
      </Field>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | undefined }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <span className="error">{error}</span>}
    </label>
  );
}

function Dashboard() {
  const [d, setD] = useState<{ newMessages: number; dbOk: boolean; githubLastOk: { at: string } | null; githubLastError: { at: string; error: string } | null } | null>(null);
  const [sync, setSync] = useState('');
  const load = useCallback(() => void api<typeof d>('/admin/dashboard').then(setD), []);
  useEffect(load, [load]);
  if (!d) return <p className="muted">Loading…</p>;
  return (
    <section>
      <h1>Dashboard</h1>
      <div className="grid3">
        <div className="card">
          <p className="big">{d.newMessages}</p>
          <p>new messages</p>
        </div>
        <div className="card">
          <p className="big">{d.dbOk ? 'OK' : 'Down'}</p>
          <p>database</p>
        </div>
        <div className="card">
          <p>GitHub sync: {d.githubLastOk ? `last good ${new Date(d.githubLastOk.at).toLocaleString()}` : 'not run yet'}</p>
          {d.githubLastError && <p className="error">Last error: {d.githubLastError.error}</p>}
          <button
            type="button"
            onClick={async () => {
              setSync('Syncing…');
              try {
                const r = await api<{ created: number; updated: number; notModified?: boolean; error?: string }>('/admin/github/sync', { method: 'POST' });
                setSync(r.error ? `Failed: ${r.error}` : r.notModified ? 'Nothing new on GitHub.' : `Done: ${r.created} new, ${r.updated} updated.`);
                load();
              } catch (err) {
                setSync((err as Error).message);
              }
            }}
          >
            Sync GitHub now
          </button>
          <p role="status">{sync}</p>
        </div>
      </div>
    </section>
  );
}

const EMPTY: ProjectInput = {
  slug: '',
  title: '',
  pillars: ['building'],
  summary: '',
  cover: null,
  mark: '',
  stack: [],
  links: { live: undefined, repo: undefined, book: undefined },
  featured: false,
  sortOrder: 100,
  status: 'draft',
  hidden: false,
  caseStudy: null,
};

function Projects() {
  const [list, setList] = useState<AdminProject[]>([]);
  const [editing, setEditing] = useState<AdminProject | ProjectInput | null>(null);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => void api<AdminProject[]>('/admin/projects').then(setList), []);
  useEffect(load, [load]);

  async function move(i: number, dir: -1 | 1) {
    const ids = list.map((p) => p.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await api('/admin/projects/reorder', { method: 'POST', body: JSON.stringify({ ids }) });
    load();
  }

  if (editing) return <ProjectForm project={editing} onClose={(m) => { setEditing(null); setMsg(m ?? ''); load(); }} />;
  return (
    <section>
      <h1>Projects</h1>
      <p role="status">{msg}</p>
      <button type="button" onClick={() => setEditing({ ...EMPTY })}>
        New project
      </button>
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Title</th>
            <th>Status</th>
            <th>Source</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.id}>
              <td>
                <button type="button" aria-label={`Move ${p.title} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button type="button" aria-label={`Move ${p.title} down`} onClick={() => move(i, 1)} disabled={i === list.length - 1}>
                  ↓
                </button>
              </td>
              <td>
                {p.title} <span className="muted">/{p.slug}</span>
              </td>
              <td>
                {p.status}
                {p.hidden ? ', hidden' : ''}
                {p.featured ? ', featured' : ''}
              </td>
              <td>{p.source}</td>
              <td>
                <button type="button" onClick={() => setEditing(p)}>
                  Edit
                </button>
                {p.caseStudy && p.status === 'published' && (
                  <a href={`/work/${p.slug}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

async function uploadImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error('Use a JPG, PNG, WebP or AVIF image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
  const s = await api<{ cloud: string; apiKey: string; signature: string; timestamp: string; folder: string; allowed_formats: string }>('/admin/upload', { method: 'POST' });
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', s.apiKey);
  fd.append('timestamp', s.timestamp);
  fd.append('signature', s.signature);
  fd.append('folder', s.folder);
  fd.append('allowed_formats', s.allowed_formats);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloud}/image/upload`, { method: 'POST', body: fd });
  const body = (await res.json()) as { public_id?: string; error?: { message: string } };
  if (!res.ok || !body.public_id) throw new Error(body.error?.message ?? 'Upload failed.');
  return body.public_id;
}

function ProjectForm({ project, onClose }: { project: AdminProject | ProjectInput; onClose: (msg?: string) => void }) {
  const [p, setP] = useState<ProjectInput>({ ...EMPTY, ...project });
  const [cs, setCs] = useState(project.caseStudy ? JSON.stringify(project.caseStudy, null, 2) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const id = 'id' in project ? project.id : null;
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setP((x) => ({ ...x, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    let caseStudy: unknown = null;
    if (cs.trim()) {
      try {
        caseStudy = JSON.parse(cs);
      } catch {
        setErrors({ caseStudy: 'Case study must be valid JSON (or empty for a card-only project).' });
        return;
      }
    }
    const parsed = ProjectInputSchema.safeParse({ ...p, caseStudy });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path.join('.')] ??= i.message;
      setErrors(errs);
      return;
    }
    setBusy(true);
    try {
      await api(id ? `/admin/projects/${id}` : '/admin/projects', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(parsed.data) });
      onClose(`Saved “${parsed.data.title}”.`);
    } catch (err) {
      setErrors((err as { fields?: Record<string, string> }).fields ?? { _: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !window.confirm(`Delete “${p.title}”? This can’t be undone.`)) return;
    await api(`/admin/projects/${id}`, { method: 'DELETE' });
    onClose(`Deleted “${p.title}”.`);
  }

  return (
    <form className="card" onSubmit={save}>
      <h1>{id ? `Edit ${p.title}` : 'New project'}</h1>
      <Field label="Title" error={errors.title}>
        <input value={p.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      <Field label="Address (slug): lowercase-with-hyphens. Changing it keeps old links working." error={errors.slug}>
        <input value={p.slug} onChange={(e) => set('slug', e.target.value)} required />
      </Field>
      <Field label="Summary (max 280 characters)" error={errors.summary}>
        <textarea value={p.summary} onChange={(e) => set('summary', e.target.value)} rows={3} maxLength={280} />
      </Field>
      <fieldset>
        <legend>Pillars</legend>
        {PILLARS.map((pl) => (
          <label key={pl} className="inline">
            <input type="checkbox" checked={p.pillars.includes(pl)} onChange={(e) => set('pillars', e.target.checked ? [...p.pillars, pl] : p.pillars.filter((x) => x !== pl))} /> {pl}
          </label>
        ))}
        {errors.pillars && <span className="error">{errors.pillars}</span>}
      </fieldset>
      <Field label="Stack (comma separated)">
        <input value={p.stack.join(', ')} onChange={(e) => set('stack', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
      </Field>
      <Field label="Card mark (short text on the cover)">
        <input value={p.mark} onChange={(e) => set('mark', e.target.value)} maxLength={40} />
      </Field>
      {(['live', 'repo', 'book'] as const).map((k) => (
        <Field key={k} label={`Link: ${k} (https only)`} error={errors[`links.${k}`]}>
          <input type="url" value={p.links[k] ?? ''} onChange={(e) => set('links', { ...p.links, [k]: e.target.value || undefined })} />
        </Field>
      ))}
      <fieldset>
        <legend>Cover image</legend>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setNote('Uploading…');
            try {
              const imgId = await uploadImage(f);
              set('cover', { id: imgId, alt: p.cover?.alt ?? '' });
              setNote('Uploaded. Add alt text, then save.');
            } catch (err) {
              setNote((err as Error).message);
            }
          }}
        />
        {p.cover && (
          <Field label="Alt text (required: describe the image)" error={errors['cover.alt']}>
            <input value={p.cover.alt} onChange={(e) => set('cover', { id: p.cover!.id, alt: e.target.value })} required />
          </Field>
        )}
        <p role="status" className="muted">
          {note}
        </p>
      </fieldset>
      <div className="row">
        <label className="inline">
          <input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured on the homepage
        </label>
        <label className="inline">
          <input type="checkbox" checked={p.hidden} onChange={(e) => set('hidden', e.target.checked)} /> Hidden
        </label>
        <label className="inline">
          Status{' '}
          <select value={p.status} onChange={(e) => set('status', e.target.value as 'draft' | 'published')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>
      <Field label="Case study (JSON). Leave empty for a card-only project." error={errors.caseStudy}>
        <textarea value={cs} onChange={(e) => setCs(e.target.value)} rows={14} spellCheck={false} className="mono" />
      </Field>
      {errors._ && (
        <p role="alert" className="error">
          {errors._}
        </p>
      )}
      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => onClose()}>
          Cancel
        </button>
        {id && (
          <button type="button" className="danger" onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function ProfileEditor() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => void api<unknown>('/admin/profile').then((p) => setText(JSON.stringify(p, null, 2))), []);

  async function save(e: FormEvent) {
    e.preventDefault();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      setErrors(['That isn’t valid JSON. Check for a missing comma or quote.']);
      return;
    }
    const r = ProfileSchema.safeParse(data);
    if (!r.success) {
      setErrors(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      return;
    }
    setErrors([]);
    setStatus('Saving…');
    try {
      await api('/admin/profile', { method: 'PATCH', body: JSON.stringify(r.data) });
      setStatus('Saved. The site updates within a minute.');
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h1>Profile</h1>
      <p className="muted">Everything that isn’t a project: bio, links, roles, stats, certificates and writing. Edit the text between the quotes and save.</p>
      <label className="field">
        <span>Profile data</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={30} spellCheck={false} className="mono" />
      </label>
      {errors.length > 0 && (
        <ul role="alert" className="error">
          {errors.slice(0, 8).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <button type="submit">Save profile</button>
      <p role="status">{status}</p>
    </form>
  );
}

function Messages() {
  const [rows, setRows] = useState<Message[]>([]);
  const [status, setStatus] = useState('new');
  const [intent, setIntent] = useState('');
  const load = useCallback(() => {
    const q = new URLSearchParams({ ...(status ? { status } : {}), ...(intent ? { intent } : {}) });
    void api<Message[]>(`/admin/messages?${q}`).then(setRows);
  }, [status, intent]);
  useEffect(load, [load]);

  async function mark(id: number, s: string) {
    await api(`/admin/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ status: s }) });
    load();
  }

  return (
    <section>
      <h1>Messages</h1>
      <div className="row">
        <label className="inline">
          Status{' '}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="inline">
          Reason{' '}
          <select value={intent} onChange={(e) => setIntent(e.target.value)}>
            <option value="">All</option>
            <option value="partner">Partner</option>
            <option value="hire">Hire</option>
            <option value="collab">Collaborate</option>
            <option value="hi">Hi</option>
          </select>
        </label>
        <a href={`/api/v1/admin/messages?format=csv${status ? `&status=${status}` : ''}`}>Export CSV</a>
      </div>
      {rows.length === 0 && <p className="muted">No messages here.</p>}
      {rows.map((m) => (
        <article key={m.id} className="card">
          <p>
            <strong>{m.name}</strong> · <a href={`mailto:${m.email}`}>{m.email}</a> · {m.intent} · via {m.source} ·{' '}
            <span className="muted">{new Date(m.createdAt).toLocaleString()}</span>
          </p>
          <p className="pre">{m.body}</p>
          <p className="muted">
            Alerts: email {m.notifyEmail}, WhatsApp {m.notifyWhatsapp}
            {m.notifyError && <span className="error"> ({m.notifyError})</span>}
          </p>
          <div className="row">
            {m.status !== 'replied' && (
              <button type="button" onClick={() => mark(m.id, 'replied')}>
                Mark replied
              </button>
            )}
            {m.status !== 'archived' && (
              <button type="button" onClick={() => mark(m.id, 'archived')}>
                Archive
              </button>
            )}
            {m.status !== 'new' && (
              <button type="button" onClick={() => mark(m.id, 'new')}>
                Mark new
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
