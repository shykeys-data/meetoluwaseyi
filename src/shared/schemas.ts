import { z } from 'zod';

/**
 * One set of rules for the whole app. The browser uses these to show errors early,
 * the API uses the same schemas to reject bad input, and the database columns are
 * sized to match (see src/server/db/migrations). Nothing is trusted from the browser.
 */

import { MODES, INTENTS, PILLARS } from './constants.ts';
export { MODES, INTENTS, PILLARS, parseMode, type Mode, type Intent } from './constants.ts';

export const ModeSchema = z.enum(MODES);

export const AppEnvSchema = z.enum(['development', 'test', 'staging', 'production']);
export type AppEnv = z.infer<typeof AppEnvSchema>;

/** Strips tags and control characters, collapses runs of blank lines. Text fields are stored as plain text. */
export function plainText(input: string): string {
  return (
    input
      .replace(/<[^>]*>/g, '')
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

const text = (min: number, max: number) =>
  z
    .string()
    .transform(plainText)
    .pipe(
      z
        .string()
        .min(min, `Please write at least ${min} characters.`)
        .max(max, `Please keep it under ${max} characters.`),
    );

export const IntentSchema = z.enum(INTENTS);

export const ContactInputSchema = z.object({
  name: text(2, 80),
  email: z.string().trim().toLowerCase().pipe(z.email('That email address doesn’t look right.').max(254)),
  intent: IntentSchema,
  message: text(10, 2000),
  source: z.enum(['form', 'chat']).default('form'),
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot. Humans never see this field, so it must arrive empty. */
  website: z.string().max(0).optional().or(z.literal('')),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(200),
  /** Required once 2FA is set up; absent only on the very first sign-in, which then enrols 2FA. */
  totp: z
    .string()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const TotpConfirmSchema = z.object({
  token: z.string().min(10).max(500),
  totp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});

export const PillarSchema = z.enum(PILLARS);

export const SlugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.');

const httpsUrl = z.url({ protocol: /^https$/, error: 'Must be an https:// link.' }).max(500);
const optionalUrl = httpsUrl.optional().or(z.literal('').transform(() => undefined));

export const ImageSchema = z.object({
  id: z.string().min(1).max(300),
  alt: z.string().trim().min(3, 'Alt text is required.').max(200),
});

export const CaseStudySchema = z.object({
  meta: z
    .array(z.object({ label: z.string().max(40), value: z.string().max(160) }))
    .max(8)
    .default([]),
  kpis: z
    .array(
      z.object({
        value: z.string().max(16),
        label: z.string().max(80),
        tone: z.enum(['plain', 'warn', 'bad']).default('plain'),
      }),
    )
    .max(6)
    .default([]),
  ratings: z
    .array(
      z.object({
        label: z.string().max(60),
        value: z.number().min(0).max(5),
        tone: z.enum(['good', 'warn', 'bad']),
      }),
    )
    .max(6)
    .default([]),
  steps: z
    .array(
      z.object({
        week: z.string().max(20),
        title: z.string().max(80),
        items: z.array(z.string().max(300)).max(6),
      }),
    )
    .max(8)
    .default([]),
  revised: z
    .array(z.object({ was: z.string().max(300), now: z.string().max(500) }))
    .max(6)
    .default([]),
  recommendations: z
    .array(z.object({ value: z.string().max(20), title: z.string().max(100), body: z.string().max(300) }))
    .max(8)
    .default([]),
});
export type CaseStudy = z.infer<typeof CaseStudySchema>;

export const ProjectInputSchema = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(2).max(120),
  pillars: z.array(PillarSchema).min(1).max(3),
  summary: text(10, 280),
  cover: ImageSchema.nullable().default(null),
  mark: z.string().max(40).default(''),
  stack: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  links: z
    .object({ live: optionalUrl, repo: optionalUrl, book: optionalUrl })
    .default({ live: undefined, repo: undefined, book: undefined }),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10_000).default(100),
  status: z.enum(['draft', 'published']).default('draft'),
  hidden: z.boolean().default(false),
  caseStudy: CaseStudySchema.nullable().default(null),
});
export type ProjectInput = z.infer<typeof ProjectInputSchema>;

export const ExperienceSchema = z.object({
  when: z.string().max(40),
  /** Year the role started, used to place it on the "Twelve years, one road" timeline. */
  year: z.number().int().min(1990).max(2100),
  role: z.string().max(80),
  org: z.string().max(80),
  note: z.string().max(500).default(''),
  current: z.boolean().default(false),
  projectSlug: SlugSchema.optional(),
});

export const ProfileSchema = z.object({
  name: z.string().max(80),
  headline: z.string().max(160),
  bio: z.string().max(2000),
  photo: ImageSchema,
  links: z.object({
    email: z.email(),
    linkedin: httpsUrl,
    github: httpsUrl,
    x: httpsUrl,
    telegram: httpsUrl,
    cv: optionalUrl,
    booking: optionalUrl,
  }),
  experience: z.array(ExperienceSchema).max(30),
  tagline: z.string().max(200).default(''),
  education: z
    .array(z.object({ title: z.string().max(120), org: z.string().max(120), year: z.string().max(20) }))
    .max(10),
  certificates: z
    .array(z.object({ title: z.string().max(160), org: z.string().max(80), year: z.string().max(20) }))
    .max(30),
  languages: z.array(z.object({ name: z.string().max(40), level: z.string().max(40) })).max(10),
  stats: z.array(z.object({ value: z.string().max(16), label: z.string().max(80) })).max(8),
  programs: z
    .array(z.object({ name: z.string().max(80), cadence: z.string().max(40), note: z.string().max(200) }))
    .max(12),
  now: z.array(z.string().max(200)).max(8),
  writing: z
    .array(
      z.object({
        kicker: z.string().max(60),
        title: z.string().max(120),
        /** An https link, or a page on this site such as /work/olist-ecommerce-bi. */
        link: z.union([
          httpsUrl,
          z.string().regex(/^\/[a-z0-9/-]*$/, 'Use https:// or a path on this site.'),
        ]),
        linkLabel: z.string().max(60).default(''),
        posts: z
          .array(
            z.object({
              kicker: z.string().max(30),
              date: z.string().max(30),
              title: z.string().max(160),
              desc: z.string().max(300),
              url: httpsUrl,
            }),
          )
          .max(20),
      }),
    )
    .max(10),
  book: z.object({ title: z.string().max(160), url: optionalUrl }).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** What the public pages receive for a project. Server-only fields (repo sync data) are left out. */
export interface PublicProject {
  slug: string;
  title: string;
  pillars: string[];
  summary: string;
  cover: { id: string; alt: string } | null;
  mark: string;
  stack: string[];
  links: { live?: string; repo?: string; book?: string };
  featured: boolean;
  caseStudy: CaseStudy | null;
}

export const SITE = {
  name: 'Oluwaseyi Oshunwusi',
  domain: 'meetoluwaseyi.com',
  url: 'https://meetoluwaseyi.com',
  publicEmail: 'shykeys@gmail.com',
} as const;
