import { z } from 'zod';
import { AppEnvSchema } from '@meetoluwaseyi/shared';

/**
 * Every environment variable is read here, once, and checked at start-up.
 * Staging and production refuse to start if anything required is missing or malformed,
 * instead of half-working. Development gets safe local defaults so a fresh clone runs.
 *
 * Service keys (Cloudinary, Resend, WhatsApp, Turnstile, Sentry, Cloudflare) are optional for now;
 * each becomes required in the phase that ships its feature (see the developer brief).
 */
const optional = z.string().trim().min(1).optional();

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENV: AppEnvSchema.optional(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    SITE_URL: z.url().optional(),
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://').optional(),
    SESSION_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
    IP_HASH_SALT: z.string().min(16, 'must be at least 16 characters').optional(),
    ADMIN_EMAIL: z.email().optional(),
    STAGING_USER: z.string().min(1).default('preview'),
    STAGING_PASSWORD: z.string().min(12, 'must be at least 12 characters').optional(),
    CLOUDINARY_CLOUD: optional,
    CLOUDINARY_KEY: optional,
    CLOUDINARY_SECRET: optional,
    RESEND_API_KEY: optional,
    NOTIFY_EMAIL: z.email().optional(),
    WHATSAPP_TOKEN: optional,
    WHATSAPP_PHONE_ID: optional,
    WHATSAPP_TO: optional,
    TURNSTILE_SITE_KEY: optional,
    TURNSTILE_SECRET: optional,
    GITHUB_TOKEN: optional,
    SENTRY_DSN: z.url().optional(),
    CLOUDFLARE_ZONE_ID: optional,
    CLOUDFLARE_API_TOKEN: optional,
  })
  .transform((env) => ({ ...env, APP_ENV: env.APP_ENV ?? (env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV) }))
  .superRefine((env, ctx) => {
    const deployed = env.APP_ENV === 'staging' || env.APP_ENV === 'production';
    if (deployed) {
      const required = ['SITE_URL', 'MONGODB_URI', 'SESSION_SECRET', 'IP_HASH_SALT', 'ADMIN_EMAIL'] as const;
      for (const key of required) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `is required in ${env.APP_ENV}` });
      }
      if (env.NODE_ENV !== 'production') {
        ctx.addIssue({ code: 'custom', path: ['NODE_ENV'], message: `must be "production" when APP_ENV is ${env.APP_ENV}` });
      }
    }
    if (env.APP_ENV === 'staging' && !env.STAGING_PASSWORD) {
      ctx.addIssue({ code: 'custom', path: ['STAGING_PASSWORD'], message: 'is required on staging (the site is password-protected)' });
    }
  });

const DEV_DEFAULTS = {
  SITE_URL: 'http://localhost:3000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/meetoluwaseyi',
  SESSION_SECRET: 'dev-only-secret-change-me-dev-only-secret',
  IP_HASH_SALT: 'dev-only-salt-1234',
  ADMIN_EMAIL: 'admin@localhost.test',
} as const;

export type Config = Omit<z.infer<typeof schema>, keyof typeof DEV_DEFAULTS> & {
  [K in keyof typeof DEV_DEFAULTS]: string;
} & { isDev: boolean; isStaging: boolean };

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

/** Parse and check the environment. Throws ConfigError listing every problem at once. */
export function loadConfig(source: Record<string, string | undefined> = process.env): Config {
  // Treat empty strings as unset, so `KEY=` in a .env file counts as missing.
  const env = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.') || 'env'} ${i.message}`));
  }
  const c = parsed.data;
  const local = c.APP_ENV === 'development' || c.APP_ENV === 'test';
  return {
    ...c,
    SITE_URL: c.SITE_URL ?? (local ? DEV_DEFAULTS.SITE_URL : ''),
    MONGODB_URI: c.MONGODB_URI ?? (local ? DEV_DEFAULTS.MONGODB_URI : ''),
    SESSION_SECRET: c.SESSION_SECRET ?? (local ? DEV_DEFAULTS.SESSION_SECRET : ''),
    IP_HASH_SALT: c.IP_HASH_SALT ?? (local ? DEV_DEFAULTS.IP_HASH_SALT : ''),
    ADMIN_EMAIL: c.ADMIN_EMAIL ?? (local ? DEV_DEFAULTS.ADMIN_EMAIL : ''),
    isDev: c.APP_ENV === 'development',
    isStaging: c.APP_ENV === 'staging',
  };
}
