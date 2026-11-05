/**
 * Plain constants with no dependencies, safe for the browser bundle.
 * The Zod schemas (shared/schemas.ts) build on these; the browser loads the schemas only when a form is sent.
 */
export const MODES = ['playful', 'serious'] as const;
export type Mode = (typeof MODES)[number];

export function parseMode(value: unknown): Mode | null {
  return value === 'playful' || value === 'serious' ? value : null;
}

export const INTENTS = ['partner', 'hire', 'collab', 'hi'] as const;
export type Intent = (typeof INTENTS)[number];

export const PILLARS = ['data', 'community', 'bd', 'ventures', 'building'] as const;
