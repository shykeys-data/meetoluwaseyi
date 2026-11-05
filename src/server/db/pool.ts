import mysql from 'mysql2/promise';

export type Db = mysql.Pool;

/**
 * One connection pool for the app. Every query in the codebase goes through
 * `db.execute(sql, params)` with `?` placeholders, so user input is never pasted into SQL.
 */
export function createDb(url: string): Db {
  return mysql.createPool({
    uri: url,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 50,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: false,
    // Multiple statements stay off, so one query can never smuggle in a second.
    multipleStatements: false,
    connectTimeout: 10_000,
  });
}

/** MySQL returns JSON columns as objects; MariaDB returns them as strings. Accept both. */
export function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function ping(db: Db): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
