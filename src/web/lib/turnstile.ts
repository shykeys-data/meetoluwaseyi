/* Cloudflare Turnstile, loaded only when a form is actually sent, so visitors who never write pay nothing. */
interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Resolves with a token, or undefined when Turnstile isn't configured or can't run (the server then decides). */
export async function turnstileToken(siteKey: string | undefined): Promise<string | undefined> {
  if (!siteKey) return undefined;
  try {
    await load();
  } catch {
    return undefined;
  }
  const api = window.turnstile;
  if (!api) return undefined;
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:200';
    document.body.appendChild(el);
    let id = '';
    const done = (token?: string) => {
      resolve(token);
      setTimeout(() => {
        try {
          api.remove(id);
        } catch {
          /* already gone */
        }
        el.remove();
      }, 0);
    };
    id = api.render(el, {
      sitekey: siteKey,
      appearance: 'interaction-only',
      callback: (t: string) => done(t),
      'error-callback': () => done(undefined),
      'timeout-callback': () => done(undefined),
    });
  });
}
