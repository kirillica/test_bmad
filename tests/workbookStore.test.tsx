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
});
