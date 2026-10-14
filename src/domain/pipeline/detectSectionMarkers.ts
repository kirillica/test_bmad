import type { CellValue } from '../model';

export function isEmptyCell(value: CellValue | undefined): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === 'string' && value.trim() === '';
}

/**
 * A service (section) row carries data in exactly one column — the section marker.
 * Returns a boolean flag aligned with `rows`; never mutates the rows (AD-16).
 */
export function markSectionRows(rows: CellValue[][], markerColumnIndex: number): boolean[] {
  if (markerColumnIndex < 0) return rows.map(() => false);
  return rows.map((row) => {
    let nonEmpty = 0;
    let onlyMarker = true;
    for (let index = 0; index < row.length; index += 1) {
      if (!isEmptyCell(row[index] ?? null)) {
        nonEmpty += 1;
        if (index !== markerColumnIndex) onlyMarker = false;
      }
    }
    return nonEmpty === 1 && onlyMarker;
  });
}
