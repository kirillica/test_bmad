/**
 * Ids shared by the sheet tabs and the preview panel they control, so the ARIA
 * tabs pattern (`aria-controls` / `aria-labelledby`) stays in sync.
 */

/** Id of the preview panel (tabpanel) controlled by the sheet tabs. */
export const SHEET_PANEL_ID = 'sheet-panel';

/** Stable id of a tab, derived from its position among the visible sheets. */
export function sheetTabId(index: number): string {
  return `${SHEET_PANEL_ID}-tab-${index}`;
}
