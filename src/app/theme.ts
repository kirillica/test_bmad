export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'xls-analytics-theme';

function defaultStorage(): Storage | undefined {
  try {
    // Accessing storage can throw (sandboxed iframe, blocked cookies, quota).
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Light is the default theme (UX: dual theme, light first). */
export function getInitialTheme(storage: Storage | undefined = defaultStorage()): Theme {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(
  theme: Theme,
  root: HTMLElement | undefined = typeof document === 'undefined' ? undefined : document.documentElement,
): void {
  root?.setAttribute('data-theme', theme);
}

export function storeTheme(theme: Theme, storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage is unavailable; the theme still applies for this session.
  }
}
