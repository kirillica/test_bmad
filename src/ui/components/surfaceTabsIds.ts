/**
 * Ids shared by the surface tabs (U2/U3) and the panel they control, so the ARIA
 * tabs pattern (`aria-controls` / `aria-labelledby`) stays in sync.
 */

/** Id of the panel (tabpanel) controlled by the surface tabs. */
export const SURFACE_PANEL_ID = 'surface-panel';

/** Stable id of a surface tab. */
export function surfaceTabId(surface: string): string {
  return `${SURFACE_PANEL_ID}-tab-${surface}`;
}
