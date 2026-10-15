import type { CellValue, RawSheet, RawWorkbook } from '../domain/model';
import { ROW_LIMIT } from '../domain/schema';

/**
 * Spreadsheet hard limits. Excel allows at most 16 384 columns per sheet; a wider
 * `!ref` is malformed and would otherwise allocate an enormous row array.
 */
const EXCEL_MAX_COLUMNS = 16_384;

/**
 * Rows to materialise per sheet, one more data row than the limit. Reading
 * `limit + 2` rows (header + `limit + 1` data rows) is enough for the guard in
 * `file-source.ts` to see that a sheet exceeds the limit without materialising
 * the entire file (AD-7): an over-limit sheet is cut off before the last row.
 */
export function readRowCap(rowLimit: number): number {
  return rowLimit + 2;
}

interface XlsxRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface XlsxCell {
  v?: unknown;
}

interface XlsxWorksheet {
  [address: string]: unknown;
  '!ref'?: string;
  '!merges'?: unknown[];
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorksheet | undefined>;
  Workbook?: { Sheets?: { Hidden?: number }[] };
}

interface XlsxModule {
  read: (data: ArrayBuffer, options: Record<string, unknown>) => XlsxWorkbook;
  write: (
    workbook: XlsxWorkbook,
    options: { type: 'array'; bookType: 'xlsx' },
  ) => ArrayBuffer;
  utils: {
    decode_range: (ref: string) => XlsxRange;
    encode_cell: (address: { r: number; c: number }) => string;
    aoa_to_sheet: (rows: XlsxWriteCell[][]) => XlsxWorksheet;
    book_new: () => XlsxWorkbook;
    book_append_sheet: (workbook: XlsxWorkbook, worksheet: XlsxWorksheet, name: string) => void;
  };
}

/** A cell a writer may emit: a number Excel computes, an ISO string, or an empty cell. */
export type XlsxWriteCell = string | number | null;

/** One sheet to write: its name and its row-major cells. */
export interface XlsxSheetSpec {
  name: string;
  rows: XlsxWriteCell[][];
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface ParseOptions {
  /** Row limit the read cap is derived from. Overridable for tests. */
  rowLimit?: number;
}

function toCellValue(cell: unknown): CellValue {
  if (!cell || typeof cell !== 'object') return null;
  const value = (cell as XlsxCell).v;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'ИСТИНА' : 'ЛОЖЬ';
  return String(value);
}

function readSheetRows(worksheet: XlsxWorksheet, utils: XlsxModule['utils']): CellValue[][] {
  const ref = typeof worksheet['!ref'] === 'string' ? worksheet['!ref'] : 'A1:A1';
  const range = utils.decode_range(ref);
  if (range.e.c - range.s.c + 1 > EXCEL_MAX_COLUMNS) {
    throw new Error('Лист шире допустимого диапазона Excel');
  }
  const rows: CellValue[][] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells: CellValue[] = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = utils.encode_cell({ r: row, c: column });
      cells.push(toCellValue(worksheet[address]));
    }
    rows.push(cells);
  }
  return rows;
}

/** SheetJS adapter. Imported lazily so the full build loads only when a file arrives. */
export async function parseWorkbook(
  bytes: ArrayBuffer,
  fileName: string,
  options: ParseOptions = {},
): Promise<RawWorkbook> {
  const XLSX = (await import('xlsx')) as unknown as XlsxModule;
  const workbook = XLSX.read(bytes, {
    type: 'array',
    cellDates: true,
    cellText: false,
    sheetRows: readRowCap(options.rowLimit ?? ROW_LIMIT),
  });

  const sheets: RawSheet[] = workbook.SheetNames.map((name, index) => {
    const worksheet = workbook.Sheets[name];
    const hidden = (workbook.Workbook?.Sheets?.[index]?.Hidden ?? 0) !== 0;
    return {
      name,
      hidden,
      mergedCellCount: worksheet?.['!merges']?.length ?? 0,
      rows: worksheet ? readSheetRows(worksheet, XLSX.utils) : [],
    };
  });

  return { fileName, sheets };
}

/**
 * Builds an `.xlsx` `Blob` from sheet specs (AD-10). Lazy `import('xlsx')` keeps
 * the full build out of the initial bundle (AD-20); this is the single SheetJS
 * write point, mirroring `parseWorkbook` on the read side.
 */
export async function writeWorkbook(sheets: XlsxSheetSpec[]): Promise<Blob> {
  const XLSX = (await import('xlsx')) as unknown as XlsxModule;
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  }
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([bytes], { type: XLSX_MIME });
}
