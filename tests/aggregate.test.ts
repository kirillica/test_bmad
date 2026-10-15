import { describe, expect, it } from 'vitest';
import type { CellValue, Sheet, ViewConfig } from '../src/domain/model';
import { aggregate, buildViewOptions, defaultViewConfig } from '../src/domain/pipeline/aggregate';
import { applyFilter } from '../src/domain/pipeline/applyFilter';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

/** Analyzes one sheet through the real pipeline, so columns/types are real. */
function analyze(rows: CellValue[][]): Sheet {
  const sheet = analyzeWorkbook(makeWorkbook([makeSheet(rows)])).workbook.sheets[0];
  if (!sheet) throw new Error('sheet not built');
  return sheet;
}

function rowSetOf(sheet: Sheet) {
  return applyFilter(sheet, { categories: {} });
}

const HOURS = 'затрачено времени (ч)';

describe('buildViewOptions (CAP-6)', () => {
  it('offers the contract categories present with values and the numeric measures', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { 'Тип задачи': 'Задача', Статус: 'Готово', Исполнитель: 'Иванов', 'Тип работы': 'Разработка', 'Затрачено времени (ч)': 1 }),
      rowFor(HEADERS, { Эпик: 'Эпик 1' }),
    ]);

    const options = buildViewOptions(sheet);
    // Column order, marker-only «Эпик» excluded (no data value), «Задача» is not a category.
    expect(options.dimensions.map((option) => option.header)).toEqual([
      'Тип задачи',
      'Статус',
      'Исполнитель',
      'Тип работы',
    ]);
    expect(options.measures).toEqual([
      { column: HOURS, header: 'Затрачено времени (ч)' },
    ]);
  });
});

describe('defaultViewConfig (AD-13)', () => {
  const options = buildViewOptions(
    analyze([
      [...HEADERS],
      rowFor(HEADERS, { 'Тип задачи': 'Задача', Статус: 'Готово', Исполнитель: 'Иванов', 'Тип работы': 'Разработка', 'Затрачено времени (ч)': 1 }),
    ]),
  );

  it('defaults to a bar chart of hours by assignee', () => {
    expect(defaultViewConfig(options)).toEqual({
      chartType: 'bar',
      dimension: 'исполнитель',
      measure: HOURS,
    });
  });

  it('honours a preferred selection that is still available', () => {
    const preferred: ViewConfig = { chartType: 'pie', dimension: 'статус', measure: HOURS };
    expect(defaultViewConfig(options, preferred)).toEqual(preferred);
  });

  it('falls back to the default dimension/measure when the preference is stale', () => {
    const stale: ViewConfig = { chartType: 'line', dimension: 'нет такой', measure: 'нет такой' };
    expect(defaultViewConfig(options, stale)).toEqual({
      chartType: 'line',
      dimension: 'исполнитель',
      measure: HOURS,
    });
  });

  it('returns null when a dimension or a measure is missing', () => {
    expect(defaultViewConfig({ dimensions: [], measures: options.measures })).toBeNull();
    expect(defaultViewConfig({ dimensions: options.dimensions, measures: [] })).toBeNull();
  });
});

describe('aggregate (CAP-6, AD-8, AD-15)', () => {
  const view: ViewConfig = { chartType: 'bar', dimension: 'исполнитель', measure: HOURS };

  it('groups, sums non-empty numbers, counts every row and totals', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { Исполнитель: 'Иванов', 'Затрачено времени (ч)': 4 }),
      rowFor(HEADERS, { Исполнитель: 'Иванов', 'Затрачено времени (ч)': null }),
      rowFor(HEADERS, { Исполнитель: 'Петров', 'Затрачено времени (ч)': 2 }),
      rowFor(HEADERS, { Исполнитель: null, 'Затрачено времени (ч)': 6 }),
    ]);

    const result = aggregate(sheet, rowSetOf(sheet), view);

    // Sorted by descending sum; the blank dimension is its own «(не указано)» group.
    expect(result).toEqual({
      groupBy: 'исполнитель',
      measure: HOURS,
      buckets: [
        { key: null, sum: 6, count: 1 },
        { key: 'Иванов', sum: 4, count: 2 },
        { key: 'Петров', sum: 2, count: 1 },
      ],
      total: 12,
    });
  });

  it('breaks sum ties by first appearance', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { Исполнитель: 'Иванов', 'Затрачено времени (ч)': 5 }),
      rowFor(HEADERS, { Исполнитель: 'Петров', 'Затрачено времени (ч)': 5 }),
      rowFor(HEADERS, { Исполнитель: 'Сидоров', 'Затрачено времени (ч)': 3 }),
    ]);

    const result = aggregate(sheet, rowSetOf(sheet), view);
    expect(result?.buckets.map((bucket) => bucket.key)).toEqual(['Иванов', 'Петров', 'Сидоров']);
  });

  it('merges values that differ only by case/normalization (AD-6)', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { Исполнитель: 'Иванов', 'Затрачено времени (ч)': 1 }),
      rowFor(HEADERS, { Исполнитель: 'иванов', 'Затрачено времени (ч)': 2 }),
    ]);

    const result = aggregate(sheet, rowSetOf(sheet), view);
    expect(result?.buckets).toEqual([{ key: 'Иванов', sum: 3, count: 2 }]);
  });

  it('returns an empty aggregation for an empty row set', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { Исполнитель: 'Иванов', 'Затрачено времени (ч)': 1 }),
    ]);

    expect(aggregate(sheet, { rows: [], total: 0 }, view)).toEqual({
      groupBy: 'исполнитель',
      measure: HOURS,
      buckets: [],
      total: 0,
    });
  });

  it('returns null when the sheet lacks the dimension or measure column', () => {
    const sheet = analyze([[...HEADERS], rowFor(HEADERS, { Исполнитель: 'Иванов' })]);
    const rows = rowSetOf(sheet);

    expect(aggregate(sheet, rows, { ...view, dimension: 'нет такой' })).toBeNull();
    expect(aggregate(sheet, rows, { ...view, measure: 'нет такой' })).toBeNull();
  });

  it('never mutates the source rows or the row set (AD-16)', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { Исполнитель: 'Иванов', 'Затрачено времени (ч)': 4 }),
      rowFor(HEADERS, { Исполнитель: null, 'Затрачено времени (ч)': 6 }),
    ]);
    const rowSet = rowSetOf(sheet);
    const beforeSheet = JSON.stringify(sheet.rows);
    const beforeRowSet = JSON.stringify(rowSet.rows);

    expect(JSON.stringify(sheet.rows)).toBe(beforeSheet);
    expect(JSON.stringify(rowSet.rows)).toBe(beforeRowSet);
    expect(rowSet.rows).toHaveLength(2);
  });

  it('aggregates only the rows of the given RowSet (filtered subset, AD-8/AD-12)', () => {
    const sheet = analyze([
      [...HEADERS],
      rowFor(HEADERS, { Исполнитель: 'Иванов', Статус: 'Готово', 'Затрачено времени (ч)': 4 }),
      rowFor(HEADERS, { Исполнитель: 'Петров', Статус: 'В работе', 'Затрачено времени (ч)': 6 }),
    ]);

    const filtered = applyFilter(sheet, { categories: { статус: ['Готово'] } });
    expect(filtered.rows).toHaveLength(1);

    const result = aggregate(sheet, filtered, view);

    expect(result).toEqual({
      groupBy: 'исполнитель',
      measure: HOURS,
      buckets: [{ key: 'Иванов', sum: 4, count: 1 }],
      total: 4,
    });
  });
});
