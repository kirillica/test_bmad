import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { CellValue } from '../src/domain/model';
import { exportXlsx, type XlsxLabels } from '../src/adapters/exporter/xlsx';
import { applyFilter } from '../src/domain/pipeline/applyFilter';
import { aggregate } from '../src/domain/pipeline/aggregate';
import { selectActiveSheet } from '../src/domain/pipeline/selectActiveSheet';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

/**
 * XLSX export (CAP-7, AD-9, AD-10): the adapter serializes the same `RowSet` /
 * `AggregationResult` the screen shows, so this test drives the real pipeline
 * (`analyzeWorkbook` → `applyFilter` → `aggregate`) and reads the written bytes
 * back with SheetJS — no UI involved (AD-2).
 */

const DATE_HEADERS = [...HEADERS, 'Дата'];

const TASK = {
  Эпик: '',
  'Тип задачи': 'Задача',
  Статус: 'Готово',
  Исполнитель: 'Иванов',
  'Тип работы': 'Разработка',
  'Затрачено времени (ч)': 4,
} satisfies Partial<Record<string, CellValue>>;

/** Two «Готово» rows (one with a blank assignee) plus one «В работе» row. */
function dataRows(): CellValue[][] {
  return [
    [...DATE_HEADERS],
    rowFor(DATE_HEADERS, { ...TASK, Задача: 'A', Дата: new Date('2026-03-10T00:00:00.000Z') }),
    rowFor(DATE_HEADERS, {
      ...TASK,
      Задача: 'B',
      Статус: 'В работе',
      Исполнитель: 'Петров',
      'Затрачено времени (ч)': 2,
      Дата: new Date('2026-04-01T00:00:00.000Z'),
    }),
    rowFor(DATE_HEADERS, {
      ...TASK,
      Задача: 'C',
      Исполнитель: null,
      'Затрачено времени (ч)': 5,
    }),
    rowFor(DATE_HEADERS, { Эпик: 'Эпик 2' }),
  ];
}

const LABELS: XlsxLabels = {
  dataSheet: 'Данные',
  pivotSheet: 'Сводная',
  countHeader: 'Строк',
  totalLabel: 'Итого',
  blankDimension: '(не указано)',
};

function activeSheetOf(rows: CellValue[][]) {
  const workbook = analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Лист' })])).workbook;
  const sheet = selectActiveSheet(workbook);
  if (!sheet) throw new Error('active sheet not found');
  return sheet;
}

/** Reads a written `Blob` back into a plain row-major grid per sheet. */
async function readBack(blob: Blob): Promise<{
  sheetNames: string[];
  grids: Record<string, unknown[][]>;
}> {
  const bytes = await blob.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: 'array' });
  const grids: Record<string, unknown[][]> = {};
  for (const name of workbook.SheetNames) {
    const worksheet = workbook.Sheets[name];
    grids[name] = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: null });
  }
  return { sheetNames: workbook.SheetNames, grids };
}

describe('exportXlsx (CAP-7, AD-9, AD-10)', () => {
  it('writes «Данные» (headers + filtered rows) and «Сводная» (groups + «Итого»)', async () => {
    const sheet = activeSheetOf(dataRows());
    const rowSet = applyFilter(sheet, { categories: {} });
    const aggregation = aggregate(sheet, rowSet, {
      chartType: 'bar',
      dimension: 'исполнитель',
      measure: 'затрачено времени (ч)',
    });

    const blob = await exportXlsx(sheet, rowSet, aggregation, LABELS);
    const { sheetNames, grids } = await readBack(blob);

    expect(sheetNames).toEqual(['Данные', 'Сводная']);

    // «Данные»: every active-sheet column with its original header, then the rows.
    const data = grids['Данные'];
    expect(data[0]).toEqual(DATE_HEADERS);
    expect(data).toHaveLength(4); // header + three marker-free rows

    // Numbers stay numeric (Excel can compute), blanks stay empty.
    expect(data[1]?.[6]).toBe(4);
    expect(data[3]?.[4]).toBeNull();

    // Dates are ISO 8601 strings (AD-9), not Date objects.
    expect(data[1]?.[7]).toBe('2026-03-10T00:00:00.000Z');
    expect(data[2]?.[7]).toBe('2026-04-01T00:00:00.000Z');
    expect(data[3]?.[7]).toBeNull();

    // «Сводная»: dimension, measure, «Строк»; groups by descending sum; «Итого».
    const pivot = grids['Сводная'];
    expect(pivot[0]).toEqual(['Исполнитель', 'Затрачено времени (ч)', 'Строк']);
    expect(pivot[1]).toEqual(['(не указано)', 5, 1]);
    expect(pivot[2]).toEqual(['Иванов', 4, 1]);
    expect(pivot[3]).toEqual(['Петров', 2, 1]);
    expect(pivot[4]).toEqual(['Итого', 11, 3]);
  });

  it('serializes only the filtered rows and reflects them in the pivot (FILTERED)', async () => {
    const sheet = activeSheetOf(dataRows());
    const rowSet = applyFilter(sheet, { categories: { статус: ['Готово'] } });
    const aggregation = aggregate(sheet, rowSet, {
      chartType: 'bar',
      dimension: 'исполнитель',
      measure: 'затрачено времени (ч)',
    });

    const blob = await exportXlsx(sheet, rowSet, aggregation, LABELS);
    const { grids } = await readBack(blob);

    // Two «Готово» rows remain (A with Иванов, C with a blank assignee).
    expect(grids['Данные']).toHaveLength(3);
    const pivot = grids['Сводная'];
    expect(pivot[1]).toEqual(['(не указано)', 5, 1]);
    expect(pivot[2]).toEqual(['Иванов', 4, 1]);
    expect(pivot[3]).toEqual(['Итого', 9, 2]);
    // The excluded «В работе» row (Петров) is absent.
    expect(pivot.some((row) => row[0] === 'Петров')).toBe(false);
  });

  it('omits «Сводная» when there is no aggregation (defensive)', async () => {
    const sheet = activeSheetOf(dataRows());
    const rowSet = applyFilter(sheet, { categories: {} });

    const blob = await exportXlsx(sheet, rowSet, null, LABELS);
    const { sheetNames } = await readBack(blob);

    expect(sheetNames).toEqual(['Данные']);
  });
});
