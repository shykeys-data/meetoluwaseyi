import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { AppEnvSchema } from '../shared/schemas.ts';

/**
 * Every environment variable is read here, once, and checked at start-up.
 * Staging and production refuse to start if anything required is missing or malformed.
 * Development gets safe local defaults, so a fresh clone runs with no .env file.
 *
 * On the host, variables are set in the Node.js app screen of the control panel, never in files
 * that get uploaded. Service keys are optional: each feature switches itself off when its key
 * is missing (for example, no WHATSAPP_TOKEN means no WhatsApp alert, and the inbox says so).
 */
const optional = z.string().trim().min(1).optional();

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENV: AppEnvSchema.optional(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    SITE_URL: z.url().optional(),
    DATABASE_URL: z
      .string()
      .regex(/^mysql:\/\/.+/, 'must look like mysql://user:password@localhost:3306/database')
      .optional(),
    SESSION_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
    IP_HASH_SALT: z.string().min(16, 'must be at least 16 characters').optional(),
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PATH: z
      .string()
      .regex(/^\/[a-z0-9-]{4,40}$/, 'must look like /myadm')
      .default('/myadm'),
    STAGING_USER: z.string().min(1).default('preview'),
    STAGING_PASSWORD: z.string().min(12, 'must be at least 12 characters').optional(),
    CLOUDINARY_CLOUD: optional,
    CLOUDINARY_KEY: optional,
    CLOUDINARY_SECRET: optional,
    RESEND_API_KEY: optional,
    MAIL_FROM: optional,
    NOTIFY_EMAIL: z.email().optional(),
    WHATSAPP_TOKEN: optional,
    WHATSAPP_PHONE_ID: optional,
    WHATSAPP_TO: optional,
    WHATSAPP_TEMPLATE: z.string().default('new_message'),
    TURNSTILE_SITE_KEY: optional,
    TURNSTILE_SECRET: optional,
    GITHUB_USER: z.string().default('shykeys-data'),
    GITHUB_TOKEN: optional,
    CLOUDFLARE_ZONE_ID: optional,
    CLOUDFLARE_API_TOKEN: optional,
    PLAUSIBLE_DOMAIN: optional,
  })
  .transform((env) => ({
    ...env,
    APP_ENV: env.APP_ENV ?? (env.NODE_ENV === 'production' ? ('production' as const) : env.NODE_ENV),
  }))
  .superRefine((env, ctx) => {
    const deployed = env.APP_ENV === 'staging' || env.APP_ENV === 'production';
    if (deployed) {
      for (const key of [
        'SITE_URL',
        'DATABASE_URL',
        'SESSION_SECRET',
        'IP_HASH_SALT',
        'ADMIN_EMAIL',
      ] as const) {
        if (!env[key])
          ctx.addIssue({ code: 'custom', path: [key], message: `is required in ${env.APP_ENV}` });
      }
      if (env.NODE_ENV !== 'production') {
        ctx.addIssue({
          code: 'custom',
          path: ['NODE_ENV'],
          message: `must be "production" when APP_ENV is ${env.APP_ENV}`,
        });
      }
    }
    if (env.APP_ENV === 'staging' && !env.STAGING_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['STAGING_PASSWORD'],
        message: 'is required on staging (the site is password-protected)',
      });
    }
  });

const DEV_DEFAULTS = {
  SITE_URL: 'http://localhost:3000',
  DATABASE_URL: 'mysql://root:root@127.0.0.1:3306/meetoluwaseyi',
  SESSION_SECRET: 'dev-only-secret-change-me-dev-only-secret',
  IP_HASH_SALT: 'dev-only-salt-1234',
  ADMIN_EMAIL: 'admin@localhost.test',
} as const;

type Parsed = z.infer<typeof schema>;
export type Config = Omit<Parsed, keyof typeof DEV_DEFAULTS> & {
  [K in keyof typeof DEV_DEFAULTS]: string;
} & {
  isDev: boolean;
  isStaging: boolean;
  isProd: boolean;
};

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

/** Parse and check the environment. Throws ConfigError listing every problem at once. */
export function loadConfig(source: Record<string, string | undefined> = process.env): Config {
  // Empty strings count as unset, so `KEY=` in a .env file is treated as missing.
  const env = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v.trim() !== ''),
  );
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.') || 'env'} ${i.message}`));
  }
  const c = parsed.data;
  const local = c.APP_ENV === 'development' || c.APP_ENV === 'test';
  const pick = (k: keyof typeof DEV_DEFAULTS) => c[k] ?? (local ? DEV_DEFAULTS[k] : '');
  return {
    ...c,
    SITE_URL: pick('SITE_URL').replace(/\/$/, ''),
    DATABASE_URL: pick('DATABASE_URL'),
    SESSION_SECRET: pick('SESSION_SECRET'),
    IP_HASH_SALT: pick('IP_HASH_SALT'),
    ADMIN_EMAIL: pick('ADMIN_EMAIL'),
    isDev: c.APP_ENV === 'development',
    isStaging: c.APP_ENV === 'staging',
    isProd: c.APP_ENV === 'production',
  };
}

/**
 * Local development only: read KEY=value lines from .env without adding a dependency
 * (Node 20.10 on the host has no built-in loader). Real environment variables always win.
 */
export function loadDotEnv(path = '.env', target: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith('#')) continue;
    const [, key = '', raw = ''] = m;
    const value = raw.replace(/^(['"])(.*)\1$/, '$2');
    if (target[key] === undefined) target[key] = value;
  }
}
