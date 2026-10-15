import { useEffect, useState } from 'react';

/**
 * Chart palette from the theme's CSS tokens (DESIGN.md `chart-1..6` + text and
 * border tokens). Reading the computed style keeps a single source of truth with
 * `index.css`; the fallbacks match the light theme so the chart still paints if
 * the tokens are unavailable (e.g. a non-DOM test environment).
 */
export interface ChartPalette {
  colors: string[];
  text: string;
  grid: string;
  /** Opaque surface behind the chart — the background of PNG/PDF snapshots (AD-19). */
  surface: string;
}

export const FALLBACK_PALETTE: ChartPalette = {
  colors: ['#2f6fed', '#e08a1e', '#2e9e6b', '#8b5cf6', '#d64545', '#0f8fa8'],
  text: '#1c2024',
  grid: '#d8dde3',
  surface: '#ffffff',
};

/** Reads the chart palette from the document (or the given element) right now. */
export function readChartPalette(root?: HTMLElement): ChartPalette {
  const element =
    root ?? (typeof document === 'undefined' ? null : document.documentElement);
  if (!element || typeof getComputedStyle !== 'function') return FALLBACK_PALETTE;

  const styles = getComputedStyle(element);
  const read = (token: string, fallback: string): string =>
    styles.getPropertyValue(token).trim() || fallback;

  return {
    colors: FALLBACK_PALETTE.colors.map((fallback, index) =>
      read(`--chart-${index + 1}`, fallback),
    ),
    text: read('--text', FALLBACK_PALETTE.text),
    grid: read('--border', FALLBACK_PALETTE.grid),
    surface: read('--surface', FALLBACK_PALETTE.surface),
  };
}

/**
 * Subscribes to `data-theme` changes on the root (the app writes the theme there,
 * `src/app/theme.ts`). Returns an unsubscribe function.
 */
export function observeThemeChange(callback: () => void, root?: HTMLElement): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};
  const element =
    root ?? (typeof document === 'undefined' ? null : document.documentElement);
  if (!element) return () => {};

  const observer = new MutationObserver(callback);
  observer.observe(element, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** The current chart palette, re-read whenever the theme changes. */
export function useChartPalette(): ChartPalette {
  const [palette, setPalette] = useState<ChartPalette>(() => readChartPalette());

  useEffect(() => observeThemeChange(() => setPalette(readChartPalette())), []);

  return palette;
}
