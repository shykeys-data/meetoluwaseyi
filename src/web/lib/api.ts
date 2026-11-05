import type { ContactInput } from '../../shared/schemas.ts';

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type ContactResult = { ok: true } | { ok: false; error: ApiError };

export const NETWORK_ERROR: ApiError = {
  code: 'network',
  message: 'That didn’t go through. Try again, or email shykeys@gmail.com.',
};

/** The browser only ever calls the API for the contact form and the playful chat. */
export async function sendContact(input: Partial<ContactInput> & Record<string, unknown>): Promise<ContactResult> {
  try {
    const res = await fetch('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { error?: ApiError } | null;
    return { ok: false, error: body?.error ?? NETWORK_ERROR };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}
