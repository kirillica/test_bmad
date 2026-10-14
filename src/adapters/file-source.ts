import type { Issue, RawWorkbook } from '../domain/model';
import { createIssue } from '../domain/issues';
import { ROW_LIMIT } from '../domain/schema';

/** Guards the entry point: only XLS/XLSX are accepted (CAP-1). */
export function isSupportedFileName(fileName: string): boolean {
  return /\.xlsx?$/i.test(fileName.trim());
}

export interface LoadOptions {
  /** Row limit for the whole file (summed across sheets). Overridable for tests. */
  rowLimit?: number;
  /** Parser adapter; injected so the guard can be tested without real files. */
  parse: (bytes: ArrayBuffer, fileName: string) => Promise<RawWorkbook> | RawWorkbook;
}

export type LoadResult = { ok: true; workbook: RawWorkbook } | { ok: false; issues: Issue[] };

export function countDataRows(workbook: RawWorkbook): number {
  // Every sheet contributes one header row that is not data.
  return workbook.sheets.reduce((total, sheet) => total + Math.max(0, sheet.rows.length - 1), 0);
}

/**
 * Read + parse + guard. Any failure returns blocking issues and never yields a
 * partially built workbook, so the caller can keep its previous state (AD-17).
 */
export async function loadWorkbookFile(
  fileName: string,
  readBytes: () => Promise<ArrayBuffer>,
  options: LoadOptions,
): Promise<LoadResult> {
  if (!isSupportedFileName(fileName)) {
    return { ok: false, issues: [createIssue('UNSUPPORTED_FORMAT')] };
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readBytes();
  } catch (error) {
    console.error('loadWorkbookFile: не удалось прочитать файл', error);
    return { ok: false, issues: [createIssue('CORRUPT_FILE')] };
  }

  let workbook: RawWorkbook;
  try {
    workbook = await options.parse(bytes, fileName);
  } catch (error) {
    console.error('loadWorkbookFile: не удалось разобрать файл', error);
    return { ok: false, issues: [createIssue('CORRUPT_FILE')] };
  }

  if (!workbook.sheets || workbook.sheets.length === 0) {
    return { ok: false, issues: [createIssue('CORRUPT_FILE')] };
  }

  const limit = options.rowLimit ?? ROW_LIMIT;
  const total = countDataRows(workbook);
  if (total > limit) {
    return { ok: false, issues: [createIssue('ROW_LIMIT_EXCEEDED', undefined, total)] };
  }

  return { ok: true, workbook };
}

/** Browser File API adapter. */
export function readFileBytes(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
