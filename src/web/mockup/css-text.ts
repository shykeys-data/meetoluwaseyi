import type { CSSProperties } from 'react';

const cache = new Map<string, CSSProperties>();

/**
 * Turns a CSS declaration string ("color:red;--x:1;-webkit-text-stroke:2px") into a React style object.
 * The mockup markup keeps its inline styles verbatim; this keeps them readable and diffable against it.
 */
export function css(text: string): CSSProperties {
  const hit = cache.get(text);
  if (hit) return hit;
  const out: Record<string, string> = {};
  let depth = 0;
  let start = 0;
  const decls: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      decls.push(text.slice(start, i));
      start = i + 1;
    }
  }
  decls.push(text.slice(start));
  for (const d of decls) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const prop = d.slice(0, i).trim();
    const value = d.slice(i + 1).trim();
    if (!prop || value === '') continue;
    if (prop.startsWith('--')) {
      out[prop] = value;
      continue;
    }
    const key = prop
      .replace(/^-(webkit|moz|ms)-/, (_m, v: string) =>
        v === 'ms' ? 'ms-' : v[0]!.toUpperCase() + v.slice(1) + '-',
      )
      .replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    out[key] = value;
  }
  if (cache.size < 5000) cache.set(text, out as CSSProperties);
  return out as CSSProperties;
}
