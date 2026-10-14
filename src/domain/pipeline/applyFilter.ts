import type {
  CellValue,
  FilterOption,
  FilterOptions,
  FilterState,
  Row,
  RowSet,
  Sheet,
} from '../model';
import { NORMALIZED_CATEGORY, normalizeHeader } from '../schema';
import { isEmptyCell } from './detectSectionMarkers';
import { parseDateLike } from './inferTypes';

/**
 * Category filters and date filtering (CAP-5, AD-8, AD-14). Pure domain logic: no
 * React, SheetJS or DOM. Categories are conjunctive across categories and
 * disjunctive within one; a date filter exists only when a date column exists.
 * Source rows are never mutated (AD-16).
 */

interface DateBounds {
  from: number | null;
  to: number | null;
}

/** A comparable `YYYYMMDD` integer for a cell, or `null` when it carries no date. */
function dayNumber(value: CellValue | undefined): number | null {
  const date =
    value instanceof Date ? value : typeof value === 'string' ? parseDateLike(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Parses an ISO `YYYY-MM-DD` boundary into the same `YYYYMMDD` space. */
function isoDayNumber(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
}

/** The active date bounds; `null` when the range is absent or fully empty. */
function dateBounds(range: FilterState['dateRange']): DateBounds | null {
  if (!range) return null;
  const from = isoDayNumber(range.from);
  const to = isoDayNumber(range.to);
  if (from === null && to === null) return null;
  return { from, to };
}

/** The first date-typed column, or `-1`. The UI and the filter agree on it. */
function dateColumnIndex(sheet: Sheet): number {
  return sheet.columns.find((column) => column.type === 'date')?.index ?? -1;
}

function displayValue(value: CellValue): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/**
 * The marker-free rows of a sheet — the single owner of the AD-14 scan. Every
 * pipeline consumer that needs "data rows" reads them through this helper.
 */
export function dataRows(sheet: Sheet): Row[] {
  return sheet.rows.filter((row) => !row.isSectionMarker);
}

function categoryOptions(sheet: Sheet): FilterOption[] {
  const rows = dataRows(sheet);
  const options: FilterOption[] = [];

  for (const column of sheet.columns) {
    if (!NORMALIZED_CATEGORY.includes(column.normalizedHeader)) continue;

    // Distinct values in first-seen order; identity is normalization-based (AD-6).
    const values: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const value = row.cells[column.index] ?? null;
      if (isEmptyCell(value)) continue;
      const key = normalizeHeader(value);
      if (key === '' || seen.has(key)) continue;
      seen.add(key);
      values.push(displayValue(value));
    }

    // Chips are only for the available categories: a category whose values live
    // solely on section-marker rows (or is empty) has nothing to offer (CAP-5).
    if (values.length === 0) continue;

    options.push({ column: column.normalizedHeader, header: column.header, values });
  }

  return options;
}

/**
 * The filter controls for a sheet: the contract's category columns present in the
 * sheet (ordered by column position) plus the optional date column (AD-8).
 */
export function buildFilterOptions(sheet: Sheet): FilterOptions {
  const dateColumn = sheet.columns.find((column) => column.type === 'date');
  return {
    categories: categoryOptions(sheet),
    date: dateColumn ? { column: dateColumn.normalizedHeader, header: dateColumn.header } : null,
  };
}

/** True when at least one category value or a date bound is set. */
export function isFilterActive(filterState: FilterState): boolean {
  const hasCategory = Object.values(filterState.categories).some((values) => values.length > 0);
  const range = filterState.dateRange;
  const hasDate = range !== undefined && (range.from !== '' || range.to !== '');
  return hasCategory || hasDate;
}

/** One predicate per active category: the row must carry a selected value. */
function categoryPredicates(
  sheet: Sheet,
  categories: Record<string, string[]>,
): Array<(row: Row) => boolean> {
  const predicates: Array<(row: Row) => boolean> = [];

  for (const [key, values] of Object.entries(categories)) {
    if (values.length === 0) continue;

    const column = sheet.columns.find((candidate) => candidate.normalizedHeader === key);
    if (!column) {
      // A filter naming a column the sheet lacks can never match.
      predicates.push(() => false);
      continue;
    }

    const wanted = new Set(values.map((value) => normalizeHeader(value)));
    const index = column.index;
    predicates.push((row) => wanted.has(normalizeHeader(row.cells[index] ?? null)));
  }

  return predicates;
}

/**
 * Filters a sheet's marker-free rows into a `RowSet` (AD-8, AD-14). Categories are
 * AND-combined; values within a category are OR-combined; an active date range
 * excludes out-of-range and dateless rows. Never mutates the source rows.
 */
export function applyFilter(sheet: Sheet, filterState: FilterState): RowSet {
  const sourceRows = dataRows(sheet);
  const predicates = categoryPredicates(sheet, filterState.categories);
  const dateIndex = dateColumnIndex(sheet);
  const bounds = dateBounds(filterState.dateRange);

  const rows = sourceRows.filter((row) => {
    for (const matches of predicates) {
      if (!matches(row)) return false;
    }

    if (dateIndex >= 0 && bounds) {
      const day = dayNumber(row.cells[dateIndex]);
      if (day === null) return false;
      if (bounds.from !== null && day < bounds.from) return false;
      if (bounds.to !== null && day > bounds.to) return false;
    }

    return true;
  });

  return { rows, total: sourceRows.length };
}
