import { z } from 'zod';

export const SITE_NAME = 'meetoluwaseyi.com';

/** The two moods of the site. Playful is the front door for every visitor. */
export const ModeSchema = z.enum(['playful', 'serious']);
export type Mode = z.infer<typeof ModeSchema>;
export const DEFAULT_MODE: Mode = 'playful';

/** Read a mode from untrusted input (cookie, query string); anything unknown falls back to playful. */
export function parseMode(value: unknown): Mode {
  const result = ModeSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_MODE;
}

/** The deployment a process is running as. Staging runs NODE_ENV=production with APP_ENV=staging. */
export const AppEnvSchema = z.enum(['development', 'test', 'staging', 'production']);
export type AppEnv = z.infer<typeof AppEnvSchema>;
