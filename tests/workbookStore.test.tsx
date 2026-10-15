// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { WorkbookStoreProvider } from '../src/ui/store/workbook-store';
import { useWorkbookStore, type StoreApi } from '../src/ui/store/context';
import { HEADERS, rowFor } from './fixtures';

/** A real two-sheet xlsx buffer, so the store exercises the SheetJS adapter. */
function xlsxBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const rows = (task: string) => [
    [...HEADERS],
    rowFor(HEADERS, {
      'Тип задачи': 'Задача',
      Задача: task,
      Статус: 'Готово',
      Исполнитель: 'Иванов',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 1,
    }),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows('A')), 'Первый');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows('B')), 'Второй');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/**
 * One sheet with two data rows in different categories, so a filter really
 * changes the RowSet and therefore the derived aggregation.
 */
function xlsxTwoRows(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...HEADERS],
    rowFor(HEADERS, {
      'Тип задачи': 'Задача',
      Задача: 'A',
      Статус: 'Готово',
      Исполнитель: 'Иванов',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 1,
    }),
    rowFor(HEADERS, {
      'Тип задачи': 'Баг',
      Задача: 'B',
      Статус: 'В работе',
      Исполнитель: 'Петров',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 5,
    }),
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Данные');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/** Only `name` and `arrayBuffer()` are used by the loader. */
function fakeFile(name: string, bytes: ArrayBuffer): File {
  return { name, arrayBuffer: async () => bytes } as unknown as File;
}

let container: HTMLDivElement;
let root: Root;
let api: StoreApi | null = null;

function Probe(): null {
  const store = useWorkbookStore();
  useEffect(() => {
    api = store;
  }, [store]);
  return null;
}

function currentApi(): StoreApi {
  if (!api) throw new Error('store is not mounted');
  return api;
}

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  api = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe('WorkbookStoreProvider', () => {
  it('loads a real file and switches sheets through the real dispatch path', async () => {
    act(() => {
      root.render(
        <WorkbookStoreProvider>
          <Probe />
        </WorkbookStoreProvider>,
      );
    });
    expect(currentApi().state.workbook).toBeNull();

    await act(async () => {
      await currentApi().loadFile(fakeFile('multi.xlsx', xlsxBytes()));
    });

    const loaded = currentApi().state.workbook;
    expect(loaded?.sheets.map((sheet) => sheet.name)).toEqual(['Первый', 'Второй']);
    expect(loaded?.activeSheetName).toBe('Первый');

    act(() => {
      currentApi().setActiveSheet('Второй');
    });
    expect(currentApi().state.workbook?.activeSheetName).toBe('Второй');

    // The real reducer guard: an unknown sheet name is ignored.
    act(() => {
      currentApi().setActiveSheet('Нет такого');
    });
    expect(currentApi().state.workbook?.activeSheetName).toBe('Второй');
  });

  it('derives filterOptions and rowSet, and clears filters on sheet switch (AD-3/AD-12)', async () => {
    act(() => {
      root.render(
        <WorkbookStoreProvider>
          <Probe />
        </WorkbookStoreProvider>,
      );
    });

    await act(async () => {
      await currentApi().loadFile(fakeFile('multi.xlsx', xlsxBytes()));
    });

    const loaded = currentApi();
    expect(loaded.rowSet.total).toBe(1);
    // The fixture carries no data-row «Эпик» value, so that category has no
    // available values and must not be offered (CAP-5, AD-14).
    expect(loaded.filterOptions.categories.map((option) => option.header)).toEqual([
      'Тип задачи',
      'Статус',
      'Исполнитель',
      'Тип работы',
    ]);
    expect(loaded.filterOptions.date).toBeNull();

    act(() => {
      api?.setFilter({ categories: { статус: ['Готово'] } });
    });
    expect(currentApi().state.filterState.categories).toEqual({ статус: ['Готово'] });
    expect(currentApi().rowSet.rows).toHaveLength(1);

    act(() => {
      currentApi().setActiveSheet('Второй');
    });
    expect(currentApi().state.filterState.categories).toEqual({});
  });

  it('derives the aggregation from the filtered RowSet and follows setView (AD-12/AD-13)', async () => {
    act(() => {
      root.render(
        <WorkbookStoreProvider>
          <Probe />
        </WorkbookStoreProvider>,
      );
    });

    await act(async () => {
      await currentApi().loadFile(fakeFile('two.xlsx', xlsxTwoRows()));
    });

    // The default view: hours by assignee over the whole sheet.
    expect(currentApi().viewConfig).toEqual({
      chartType: 'bar',
      dimension: 'исполнитель',
      measure: 'затрачено времени (ч)',
    });
    expect(currentApi().aggregation?.total).toBe(6);
    expect(currentApi().aggregation?.buckets.map((bucket) => bucket.key)).toEqual([
      'Петров',
      'Иванов',
    ]);

    act(() => {
      currentApi().setFilter({ categories: { статус: ['Готово'] } });
    });

    // The aggregation follows the filtered RowSet, not the whole sheet.
    expect(currentApi().rowSet.rows).toHaveLength(1);
    expect(currentApi().aggregation?.total).toBe(1);

    act(() => {
      currentApi().setView({
        chartType: 'pie',
        dimension: 'статус',
        measure: 'затрачено времени (ч)',
      });
    });

    // The view follows the ViewConfig; the filters are left untouched.
    expect(currentApi().aggregation).toEqual({
      groupBy: 'статус',
      measure: 'затрачено времени (ч)',
      buckets: [{ key: 'Готово', sum: 1, count: 1 }],
      total: 1,
    });
    expect(currentApi().state.filterState.categories).toEqual({ статус: ['Готово'] });
  });
});
