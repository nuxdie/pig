import { STORE } from '../lib/storage';

/* ---- which ledger is on the table ----
   Three settings, two sheets: "auto" is not a look, it is a deferral to the
   system, and it gets resolved to light or dark before it ever reaches CSS.
   The <html> element therefore only ever carries a real answer, which is why
   tokens.css needs one override block instead of one per source of truth.

   index.html stamps the same attribute inline, before the stylesheet paints,
   so the page never opens white and then blinks dark. The rule it uses has to
   agree with this file — keep the key and the fallback in step. */

export type Theme = 'auto' | 'light' | 'dark';

export const KEY_THEME = 'pig.theme.v1';

const PAPER = { light: '#e6e9d8', dark: '#181b13' };

function stored(): Theme {
  const v = STORE.get(KEY_THEME);
  return v === 'light' || v === 'dark' ? v : 'auto';
}

const dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export const theme = $state({ pick: stored(), sheet: 'light' as 'light' | 'dark' });

/** Push the current setting at the document. Safe to call as often as you like. */
export function applyTheme(): void {
  theme.sheet = theme.pick === 'auto' ? (dark?.matches ? 'dark' : 'light') : theme.pick;
  document.documentElement.setAttribute('data-theme', theme.sheet);
  // so the phone's own chrome matches the sheet rather than fighting it
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', PAPER[theme.sheet]);
}

export function setTheme(pick: Theme): void {
  theme.pick = pick;
  if (pick === 'auto') STORE.del(KEY_THEME);
  else STORE.set(KEY_THEME, pick);
  applyTheme();
}

/** Light → dark → follow the system → light. */
export function cycleTheme(): void {
  setTheme(theme.pick === 'light' ? 'dark' : theme.pick === 'dark' ? 'auto' : 'light');
}

/** Start the theme, and keep following the system for as long as it is asked to. */
export function startTheme(): void {
  applyTheme();
  dark?.addEventListener('change', () => { if (theme.pick === 'auto') applyTheme(); });
}
