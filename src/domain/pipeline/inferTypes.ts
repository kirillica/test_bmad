import type { CellValue, ColumnType } from '../model';
import { isEmptyCell } from './detectSectionMarkers';

/**
 * Column type inference (CAP-4, AD-15). Pure domain logic: no React, SheetJS or
 * DOM — a column's type is the majority non-empty type across its cells.
 */

/** Tie-break order when more than one type has the same weight (AD-15). */
const TYPE_PRIORITY: readonly ColumnType[] = ['number', 'date', 'text'];

const DATE_PATTERNS: readonly RegExp[] = [
  /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/,
  /^\d{4}-\d{2}-\d{2}([ T].*)?$/,
];

/**
 * Parses a date-like string (dotted `дд.мм.гггг` or ISO) into a `Date`; returns
 * `null` when the text carries no usable date. Shared by type inference and by
 * the preview's `ru-RU` formatting so both agree on what a date looks like.
 */
export function parseDateLike(text: string): Date | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!DATE_PATTERNS.some((pattern) => pattern.test(trimmed))) return null;
  const iso = trimmed.replace(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/, '$3-$2-$1');
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : new Date(time);
}

export function looksLikeDate(text: string): boolean {
  return parseDateLike(text) !== null;
}

/** Classifies a single cell; `null` means the cell carries no type evidence. */
export function classifyCell(value: CellValue): ColumnType | null {
  if (isEmptyCell(value)) return null;
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') return looksLikeDate(value) ? 'date' : 'text';
  return 'text';
}

export interface ColumnTypeInference {
  type: ColumnType;
  /** True when two types tie on weight (surfaced as UNKNOWN_COLUMN_TYPE). */
  ambiguous: boolean;
}

/** Majority non-empty type; blanks never vote (AD-15). */
export function inferColumnType(values: CellValue[]): ColumnTypeInference {
  const counts: Record<ColumnType, number> = { number: 0, date: 0, text: 0 };
  for (const value of values) {
    const type = classifyCell(value);
    if (type) counts[type] += 1;
  }

  // No non-empty evidence (including an all-empty column): fall back to text
  // rather than number, and do not flag a tie among zero counts.
  const total = counts.number + counts.date + counts.text;
  if (total === 0) return { type: 'text', ambiguous: false };

  let type: ColumnType = 'text';
  let best = -1;
  for (const candidate of TYPE_PRIORITY) {
    if (counts[candidate] > best) {
      best = counts[candidate];
      type = candidate;
    }
  }
  const topCount = counts[type];
  const ambiguous = TYPE_PRIORITY.some(
    (candidate) => candidate !== type && counts[candidate] === topCount,
  );
  return { type, ambiguous };
}
