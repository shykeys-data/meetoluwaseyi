import { Fragment, type ReactNode } from 'react';

/**
 * A tiny Markdown subset for the site's own copy (content/docs.ts): ## and ### headings, paragraphs,
 * "- " and "1. " lists, pipe tables, **bold** and [text](href). It builds React elements, never HTML
 * strings, so nothing in the copy can inject markup.
 */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={m.index}>{inline(m[1])}</strong>);
    else out.push(link(m[2]!, m[3]!, m.index));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function link(label: string, href: string, key: number): ReactNode {
  const external = /^https?:\/\//.test(href);
  if (!external && !href.startsWith('/')) return label; // only site paths and web links
  return external ? (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    <a key={key} href={href}>
      {label}
    </a>
  );
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export function markdown(src: string): ReactNode {
  const blocks = src.trim().split(/\n{2,}/);
  return blocks.map((b, i) => {
    const lines = b.split('\n');
    const first = lines[0] ?? '';
    if (first.startsWith('### ')) return <h3 key={i}>{inline(first.slice(4))}</h3>;
    if (first.startsWith('## ')) return <h2 key={i}>{inline(first.slice(3))}</h2>;
    if (lines.every((l) => l.startsWith('- ')))
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{inline(l.slice(2))}</li>
          ))}
        </ul>
      );
    if (lines.every((l) => /^\d+\. /.test(l)))
      return (
        <ol key={i}>
          {lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>
          ))}
        </ol>
      );
    if (first.startsWith('|') && lines.length >= 2) {
      const head = cells(first);
      const rows = lines.slice(2).map(cells);
      return (
        <div key={i} className="doc-table" role="region" aria-label={head.join(', ')} tabIndex={0}>
          <table>
            <thead>
              <tr>
                {head.map((h, j) => (
                  <th key={j} scope="col">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <p key={i}>
        {lines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && ' '}
            {inline(l)}
          </Fragment>
        ))}
      </p>
    );
  });
}

/** Plain text of a Markdown string, for schema and meta: links keep their words, bold markers go. */
export function plain(src: string): string {
  return src.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
