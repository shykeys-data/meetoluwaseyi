import type { Config } from '../config.ts';
import type { Db } from '../db/pool.ts';
import type { Logger } from '../lib/log.ts';

/** Everything a service needs, passed in explicitly so tests can swap any part (fetch included). */
export interface Ctx {
  db: Db;
  config: Config;
  log: Logger;
  fetch: typeof fetch;
}

/** fetch with a hard timeout, so a slow outside service can never hang a request or a job. */
export async function fetchWithTimeout(
  ctx: Ctx,
  url: string,
  init: RequestInit = {},
  ms = 10_000,
): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await ctx.fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}
