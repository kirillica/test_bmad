import type {
  CellValue,
  Column,
  Issue,
  RawSheet,
  RawWorkbook,
  Row,
  Sheet,
  ValidationResult,
  Workbook,
} from '../model';
import { createIssue, statusFromIssues } from '../issues';
import {
  NORMALIZED_REQUIRED,
  NORMALIZED_SECTION_MARKER,
  REQUIRED_COLUMNS,
  normalizeHeader,
} from '../schema';
import { isEmptyCell, markSectionRows } from './detectSectionMarkers';
import { inferColumnType } from './inferTypes';

/** How many leading rows are scanned for the header row before giving up. */
const HEADER_SEARCH_LIMIT = 5;

function findHeaderRow(rows: CellValue[][]): number {
  const limit = Math.min(HEADER_SEARCH_LIMIT, rows.length);
  for (let index = 0; index < limit; index += 1) {
    const normalized = (rows[index] ?? []).map((cell) => normalizeHeader(cell));
    if (NORMALIZED_REQUIRED.every((required) => normalized.includes(required))) return index;
  }
  return 0;
}

export function analyzeSheet(raw: RawSheet): { sheet: Sheet; issues: Issue[] } {
  const issues: Issue[] = [];
  const headerRowIndex = findHeaderRow(raw.rows);
  const headerRow = raw.rows[headerRowIndex] ?? [];
  const dataRows = raw.rows.slice(headerRowIndex + 1);

  const columnCount = dataRows.reduce(
    (widest, row) => (row.length > widest ? row.length : widest),
    headerRow.length,
  );

  const columns: Column[] = [];
  for (let index = 0; index < columnCount; index += 1) {
    const headerValue = headerRow[index] ?? null;
    const header = headerValue === null || headerValue === undefined ? '' : String(headerValue);
    const values = dataRows.map((row) => row[index] ?? null);
    const nonEmpty = values.filter((value) => !isEmptyCell(value));
    const { type, ambiguous } = inferColumnType(nonEmpty);

    columns.push({
      index,
      header,
      normalizedHeader: normalizeHeader(headerValue),
      type,
      required: NORMALIZED_REQUIRED.includes(normalizeHeader(headerValue)),
      nonEmptyCount: nonEmpty.length,
      emptyCount: values.length - nonEmpty.length,
    });

    if (ambiguous) {
      // The domain never carries user-facing text: the header is passed through
      // only when present, otherwise the UI catalog names the column generically.
      issues.push(createIssue('UNKNOWN_COLUMN_TYPE', header || undefined));
    }
  }

  // Required columns are validated on the data (visible) sheet(s). Hidden helper
  // sheets are reported as a warning and must not block the whole workbook.
  if (!raw.hidden) {
    const present = new Set(columns.map((column) => column.normalizedHeader));
    for (const required of REQUIRED_COLUMNS) {
      if (!present.has(normalizeHeader(required))) {
        issues.push(createIssue('MISSING_REQUIRED_COLUMN', required));
      }
    }
  }

  if (headerRowIndex > 0) issues.push(createIssue('EXTRA_HEADER_ROWS'));
  if (raw.hidden) issues.push(createIssue('HIDDEN_SHEETS'));
  if (raw.mergedCellCount > 0) issues.push(createIssue('MERGED_CELLS'));

  const markerColumnIndex = columns.findIndex(
    (column) => column.normalizedHeader === NORMALIZED_SECTION_MARKER,
  );
  const markers = markSectionRows(dataRows, markerColumnIndex);
  const markerCount = markers.filter(Boolean).length;
  if (markerCount > 0) issues.push(createIssue('SECTION_ROWS_EXCLUDED', undefined, markerCount));

  const rows: Row[] = dataRows.map((cells, index) => ({
    // 1-based row number as it appears in the sheet (the header counts as row 1).
    index: headerRowIndex + 2 + index,
    cells,
    isSectionMarker: markers[index] ?? false,
  }));

  return {
    sheet: {
      name: raw.name,
      columns,
      rows,
      headerRowIndex,
      hidden: raw.hidden,
      mergedCellCount: raw.mergedCellCount,
    },
    issues,
  };
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const byKey = new Map<string, Issue>();
  for (const issue of issues) {
    const key = `${issue.code}|${issue.column ?? ''}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...issue });
      continue;
    }
    if (issue.count !== undefined) existing.count = (existing.count ?? 0) + issue.count;
  }
  return [...byKey.values()];
}

export function analyzeWorkbook(raw: RawWorkbook): {
  workbook: Workbook;
  validation: ValidationResult;
} {
  const issues: Issue[] = [];
  const sheets: Sheet[] = [];

  for (const rawSheet of raw.sheets) {
    const analyzed = analyzeSheet(rawSheet);
    sheets.push(analyzed.sheet);
    issues.push(...analyzed.issues);
  }

  const active = sheets.find((sheet) => !sheet.hidden) ?? sheets[0];
  const workbook: Workbook = {
    fileName: raw.fileName,
    sheets,
    activeSheetName: active ? active.name : '',
  };

  const deduped = dedupeIssues(issues);
  return { workbook, validation: { status: statusFromIssues(deduped), issues: deduped } };
}
