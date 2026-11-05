import { COOKIES, ONE_YEAR } from '../../shared/page.ts';
import { parseMode, type Mode } from '../../shared/constants.ts';

const KEY = 'oluwaseyi-mode';

/** Saves the mode where the server reads it (cookie) and where other tabs hear it (localStorage). */
export function saveMode(mode: Mode): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIES.mode}=${mode}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
  document.cookie = `${COOKIES.seen}=1; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode: the cookie still works */
  }
  applyMode(mode);
}

/** Reflects the mode on <html>, so global styles and other scripts see it too. */
export function applyMode(mode: Mode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.classList.remove('mode-playful', 'mode-serious');
  document.documentElement.classList.add(`mode-${mode}`);
}

export function markIntroSeen(): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIES.seen}=1; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
}

/** Another tab switched mode: call back so this page can follow straight away. */
export function onModeChange(cb: (mode: Mode) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    const m = parseMode(e.newValue);
    if (!m) return;
    applyMode(m);
    cb(m);
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
