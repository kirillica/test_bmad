import { describe, expect, it } from 'vitest';
import type { CellValue, FilterState, Sheet } from '../src/domain/model';
import { applyFilter, buildFilterOptions, isFilterActive } from '../src/domain/pipeline/applyFilter';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

const DATE_HEADERS = [...HEADERS, 'Дата'];

function buildSheet(rows: CellValue[][]): Sheet {
  const sheet = analyzeWorkbook(makeWorkbook([makeSheet(rows)])).workbook.sheets[0];
  if (!sheet) throw new Error('sheet was not analyzed');
  return sheet;
}

/** Three data rows (two sharing a work type and status) plus one marker row. */
function dataRows(): CellValue[][] {
  return [
    [...HEADERS],
    rowFor(HEADERS, {
      Эпик: 'Эпик 1',
      'Тип задачи': 'Задача',
      Задача: 'A',
      Статус: 'Готово',
      Исполнитель: 'Иванов',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 4,
    }),
    rowFor(HEADERS, {
      Эпик: 'Эпик 1',
      'Тип задачи': 'Баг',
      Задача: 'B',
      Статус: 'В работе',
      Исполнитель: 'Петров',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 2,
    }),
    rowFor(HEADERS, {
      Эпик: 'Эпик 1',
      'Тип задачи': 'Задача',
      Задача: 'C',
      Статус: 'Готово',
      Исполнитель: 'Сидоров',
      'Тип работы': 'Дизайн',
      'Затрачено времени (ч)': 1,
    }),
    // A service row: its only value is the section marker (AD-14).
    rowFor(HEADERS, { Эпик: 'Эпик 2' }),
  ];
}

describe('buildFilterOptions', () => {
  it('offers only the contract categories present, ordered by column position', () => {
    const options = buildFilterOptions(buildSheet(dataRows()));

    // A, B, D, E, F columns — «Задача» (C) is an identifier, never a category.
    expect(options.categories.map((option) => option.header)).toEqual([
      'Эпик',
      'Тип задачи',
      'Статус',
      'Исполнитель',
      'Тип работы',
    ]);
    expect(options.categories.map((option) => option.header)).not.toContain('Задача');
  });

  it('collects distinct non-empty values in first-seen order, excluding marker rows', () => {
    const options = buildFilterOptions(buildSheet(dataRows()));
    const byHeader = new Map(options.categories.map((option) => [option.header, option.values]));

    expect(options.categories.find((option) => option.header === 'Тип работы')?.values).toEqual([
      'Разработка',
      'Дизайн',
    ]);
    expect(byHeader.get('Статус')).toEqual(['Готово', 'В работе']);
    // The marker row's 'Эпик 2' is excluded from analytics (AD-14); only the
    // data rows' 'Эпик 1' survives.
    expect(options.categories.find((option) => option.header === 'Эпик')?.values).toEqual([
      'Эпик 1',
    ]);
  });

  it('does not offer a category whose values appear only on marker rows', () => {
    const rows: CellValue[][] = [
      [...HEADERS],
      rowFor(HEADERS, {
        'Тип задачи': 'Задача',
        Задача: 'A',
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 1,
      }),
      rowFor(HEADERS, { Эпик: 'Служебный раздел' }),
    ];

    const options = buildFilterOptions(buildSheet(rows));

    expect(options.categories.map((option) => option.header)).toEqual([
      'Тип задачи',
      'Статус',
      'Исполнитель',
      'Тип работы',
    ]);
    expect(options.categories.map((option) => option.header)).not.toContain('Эпик');
  });

  it('DATE_ABSENT: reports no date control when the sheet has no date column', () => {
    expect(buildFilterOptions(buildSheet(dataRows())).date).toBeNull();
  });

  it('exposes the date column when one is auto-detected', () => {
    const rows: CellValue[][] = [
      [...DATE_HEADERS],
      rowFor(DATE_HEADERS, { Задача: 'A', 'Тип работы': 'Разработка', Дата: new Date('2026-03-10') }),
    ];
    const options = buildFilterOptions(buildSheet(rows));
    expect(options.date).toEqual({ column: 'дата', header: 'Дата' });
  });
});

describe('applyFilter', () => {
  const sheet = buildSheet(dataRows());

  it('HAPPY_PATH: without filters returns every marker-free row', () => {
    const result = applyFilter(sheet, { categories: {} });
    expect(result.total).toBe(3);
    expect(result.rows).toHaveLength(3);
    // The service-marker row is excluded by construction (AD-14).
    expect(result.rows.every((row) => !row.isSectionMarker)).toBe(true);
  });

  it('FILTER_CATEGORY: keeps only the rows matching the category value', () => {
    const filter: FilterState = { categories: { 'тип работы': ['Разработка'] } };
    const result = applyFilter(sheet, filter);
    expect(result.total).toBe(3);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.cells[2])).toEqual(['A', 'B']);
  });

  it('MULTI_OR: several values of one category match on any of them', () => {
    const filter: FilterState = { categories: { статус: ['Готово', 'В работе'] } };
    expect(applyFilter(sheet, filter).rows).toHaveLength(3);
  });

  it('MULTI_AND: values in two categories must both match', () => {
    const filter: FilterState = {
      categories: { 'тип работы': ['Разработка'], статус: ['Готово'] },
    };
    const result = applyFilter(sheet, filter);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.cells[2]).toBe('A');
  });

  it('FILTER_EMPTY: a combination without matches yields an empty row set', () => {
    const filter: FilterState = {
      categories: { 'тип работы': ['Дизайн'], статус: ['В работе'] },
    };
    expect(applyFilter(sheet, filter).rows).toHaveLength(0);
  });

  it('an empty value list is not a filter (AND is skipped)', () => {
    const filter: FilterState = { categories: { 'тип работы': [], статус: ['Готово'] } };
    expect(applyFilter(sheet, filter).rows).toHaveLength(2);
  });

  it('normalizes values case- and ё-insensitively (AD-6)', () => {
    const filter: FilterState = { categories: { 'тип работы': ['разработка'] } };
    expect(applyFilter(sheet, filter).rows).toHaveLength(2);
  });

  it('MUTATION_SAFETY: filtering never changes the source rows (AD-16)', () => {
    const before = sheet.rows.map((row) => [...row.cells]);
    const result = applyFilter(sheet, { categories: { статус: ['Готово'] } });
    expect(sheet.rows.map((row) => [...row.cells])).toEqual(before);
    expect(result.rows.every((row) => sheet.rows.includes(row))).toBe(true);
  });
});

describe('applyFilter date range', () => {
  function datedSheet(): Sheet {
    return buildSheet([
      [...DATE_HEADERS],
      rowFor(DATE_HEADERS, {
        'Тип задачи': 'Задача',
        Задача: 'A',
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 1,
        Дата: '2026-03-10',
      }),
      rowFor(DATE_HEADERS, {
        'Тип задачи': 'Баг',
        Задача: 'B',
        Статус: 'В работе',
        Исполнитель: 'Петров',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 2,
        Дата: new Date('2026-04-01'),
      }),
      rowFor(DATE_HEADERS, {
        'Тип задачи': 'Задача',
        Задача: 'C',
        Статус: 'Готово',
        Исполнитель: 'Сидоров',
        'Тип работы': 'Дизайн',
        'Затрачено времени (ч)': 3,
      }),
    ]);
  }

  it('DATE_ABSENT: a date range is ignored when the sheet has no date column', () => {
    const filter: FilterState = { categories: {}, dateRange: { from: '2026-03-01', to: '2026-03-31' } };
    expect(applyFilter(buildSheet(dataRows()), filter).rows).toHaveLength(3);
  });

  it('DATE_RANGE: excludes out-of-range and dateless rows, inclusive by day', () => {
    const filter: FilterState = { categories: {}, dateRange: { from: '2026-03-01', to: '2026-03-31' } };
    const result = applyFilter(datedSheet(), filter);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.cells[2]).toBe('A');
  });

  it('DATE_RANGE: a single open bound still filters and drops dateless rows', () => {
    const result = applyFilter(datedSheet(), {
      categories: {},
      dateRange: { from: '2026-03-15', to: '' },
    });
    expect(result.rows.map((row) => row.cells[2])).toEqual(['B']);
  });
});

describe('isFilterActive', () => {
  it('is false for the empty state and empty date bounds', () => {
    expect(isFilterActive({ categories: {} })).toBe(false);
    expect(isFilterActive({ categories: { статус: [] } })).toBe(false);
    expect(isFilterActive({ categories: {}, dateRange: { from: '', to: '' } })).toBe(false);
  });

  it('is true once a category value or a date bound is set', () => {
    expect(isFilterActive({ categories: { статус: ['Готово'] } })).toBe(true);
    expect(isFilterActive({ categories: {}, dateRange: { from: '2026-03-01', to: '' } })).toBe(true);
  });
});
