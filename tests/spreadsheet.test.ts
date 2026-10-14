import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseWorkbook } from '../src/adapters/spreadsheet';
import { loadWorkbookFile } from '../src/adapters/file-source';
import { HEADERS, rowFor } from './fixtures';

function buildBytes(rows: unknown[][], options: { name?: string; hidden?: boolean } = {}): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.name ?? 'Лист1');
  if (options.hidden) workbook.Workbook = { Sheets: [{ Hidden: 1 }] };
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function dataRows(count: number): unknown[][] {
  return Array.from({ length: count }, (_unused, index) =>
    rowFor(HEADERS, { 'Тип задачи': 'Задача', 'Затрачено времени (ч)': index }),
  );
}

describe('parseWorkbook (SheetJS adapter)', () => {
  it('reads rows, headers and cell values from real bytes', async () => {
    const bytes = buildBytes([
      [...HEADERS],
      rowFor(HEADERS, { 'Тип задачи': 'Задача', Задача: 'A', 'Затрачено времени (ч)': 3 }),
    ]);
    const raw = await parseWorkbook(bytes, 'test.xlsx');
    expect(raw.sheets).toHaveLength(1);
    expect(raw.sheets[0].rows).toHaveLength(2);
    expect(raw.sheets[0].rows[0][1]).toBe('Тип задачи');
    expect(raw.sheets[0].rows[1][6]).toBe(3);
  });

  it('maps the hidden-sheet flag', async () => {
    const raw = await parseWorkbook(buildBytes([[...HEADERS]], { hidden: true }), 'test.xlsx');
    expect(raw.sheets[0].hidden).toBe(true);
  });

  it('counts merged cells', async () => {
    const worksheet = XLSX.utils.aoa_to_sheet([[...HEADERS]]);
    worksheet['!merges'] = [XLSX.utils.decode_range('A1:B1')];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Лист1');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const raw = await parseWorkbook(bytes, 'test.xlsx');
    expect(raw.sheets[0].mergedCellCount).toBe(1);
  });

  it('converts booleans to Russian literals', async () => {
    const raw = await parseWorkbook(buildBytes([['Флаг'], [true]]), 'test.xlsx');
    expect(raw.sheets[0].rows[1][0]).toBe('ИСТИНА');
  });

  it('READ_CAP: an over-limit file is blocked even though the read is capped', async () => {
    const over = await loadWorkbookFile('test.xlsx', () => Promise.resolve(buildBytes([[...HEADERS], ...dataRows(4)])), {
      rowLimit: 3,
      parse: (bytes, name) => parseWorkbook(bytes, name, { rowLimit: 3 }),
    });
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.issues[0]).toMatchObject({ code: 'ROW_LIMIT_EXCEEDED', count: 4 });
    }
  });

  it('READ_CAP: exactly the limit passes', async () => {
    const atLimit = await loadWorkbookFile(
      'test.xlsx',
      () => Promise.resolve(buildBytes([[...HEADERS], ...dataRows(3)])),
      { rowLimit: 3, parse: (bytes, name) => parseWorkbook(bytes, name, { rowLimit: 3 }) },
    );
    expect(atLimit.ok).toBe(true);
  });
});
