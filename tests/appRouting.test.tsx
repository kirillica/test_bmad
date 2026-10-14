// @vitest-environment jsdom
import { act, useEffect, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { App, CurrentScreen } from '../src/app/App';
import type { FilterState, Row, Workbook } from '../src/domain/model';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { ru } from '../src/ui/i18n/ru';
import { StoreContext, useWorkbookStore, type StoreApi } from '../src/ui/store/context';
import { WorkbookStoreProvider } from '../src/ui/store/workbook-store';
import { HEADERS, makeSheet, makeWorkbook, rowFor, sampleRows } from './fixtures';

let container: HTMLDivElement;
let root: Root;
let storeApi: StoreApi | null = null;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  storeApi = null;
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

interface StubOverrides {
  rowSet?: { rows: Row[]; total: number };
  filterState?: FilterState;
}

/** A store stub good enough for CurrentScreen: workbook, filter and row-set state. */
function stubApi(workbook: Workbook | null, overrides: StubOverrides = {}): StoreApi {
  return {
    state: {
      status: workbook ? 'loaded' : 'empty',
      fileName: workbook?.fileName ?? null,
      pendingFileName: null,
      workbook,
      validation: workbook ? { status: 'ok', issues: [] } : null,
      errorIssues: [],
      filterState: overrides.filterState ?? { categories: {} },
    },
    rowSet: overrides.rowSet ?? { rows: [], total: workbook ? 1 : 0 },
    filterOptions: { categories: [], date: null },
    loadFile: async () => {},
    reset: () => {},
    setActiveSheet: () => {},
    setFilter: () => {},
    clearFilters: () => {},
  };
}

/** A real single-sheet xlsx with three data rows (two «Готово», one «В работе»). */
function xlsxBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const rows = [
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
      'Затрачено времени (ч)': 2,
    }),
    rowFor(HEADERS, {
      'Тип задачи': 'Задача',
      Задача: 'C',
      Статус: 'Готово',
      Исполнитель: 'Сидоров',
      'Тип работы': 'Дизайн',
      'Затрачено времени (ч)': 3,
    }),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Лист');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/** Only `name` and `arrayBuffer()` are used by the loader. */
function fakeFile(name: string, bytes: ArrayBuffer): File {
  return { name, arrayBuffer: async () => bytes } as unknown as File;
}

/** Captures the real store so the test can drive `loadFile` directly. */
function StoreProbe(): null {
  const store = useWorkbookStore();
  useEffect(() => {
    storeApi = store;
  }, [store]);
  return null;
}

function currentApi(): StoreApi {
  if (!storeApi) throw new Error('store not mounted');
  return storeApi;
}

describe('App surface routing', () => {
  // RESET target: with no loaded workbook the app must fall back to U1 (AD-17/UX IA).
  it('shows U1 «Загрузка» and no U2 «Данные» when no workbook is loaded', () => {
    act(() => {
      root.render(<App />);
    });

    expect(container.querySelector('.upload-screen')).not.toBeNull();
    expect(container.querySelector('.data-screen')).toBeNull();
  });
});

describe('CurrentScreen routing', () => {
  function renderScreen(workbook: Workbook | null, overrides: StubOverrides = {}): void {
    const ui: ReactElement = (
      <StoreContext.Provider value={stubApi(workbook, overrides)}>
        <CurrentScreen />
      </StoreContext.Provider>
    );
    act(() => {
      root.render(ui);
    });
  }

  function surfaceTab(label: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('.surface-tab')).find(
      (tab) => tab.textContent === label,
    );
  }

  function clickTab(label: string): void {
    const tab = surfaceTab(label);
    if (!tab) throw new Error(`surface tab not found: ${label}`);
    act(() => {
      tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  function click(element: Element): void {
    act(() => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  function chip(header: string): Element | undefined {
    return Array.from(container.querySelectorAll('.filter-chip')).find((element) =>
      element.textContent?.includes(header),
    );
  }

  function option(value: string): Element | undefined {
    return Array.from(container.querySelectorAll('.filter-option')).find(
      (element) => element.textContent === value,
    );
  }

  it('renders U1 «Загрузка» with no workbook', () => {
    renderScreen(null);
    expect(container.querySelector('.upload-screen')).not.toBeNull();
    expect(container.querySelector('.data-screen')).toBeNull();
  });

  it('renders U2 «Данные» once a workbook is loaded', () => {
    const workbook = analyzeWorkbook(makeWorkbook([makeSheet(sampleRows())])).workbook;
    renderScreen(workbook);
    expect(container.querySelector('.data-screen')).not.toBeNull();
    expect(container.querySelector('.upload-screen')).toBeNull();
  });

  it('EMPTY_SHEET: disables the «Анализ» tab when the active sheet has no data rows', () => {
    const workbook = analyzeWorkbook(makeWorkbook([makeSheet(sampleRows())])).workbook;
    renderScreen(workbook, { rowSet: { rows: [], total: 0 } });

    expect(surfaceTab(ru.analysisTab)?.disabled).toBe(true);
    expect(surfaceTab(ru.dataTab)?.disabled).toBe(false);
  });

  it('keeps filters when switching U2↔U3 (UX IA)', () => {
    const workbook = analyzeWorkbook(makeWorkbook([makeSheet(sampleRows())])).workbook;
    const filterState: FilterState = { categories: { статус: ['Готово'] } };
    const rows: Row[] = [{ index: 0, cells: [], isSectionMarker: false }];
    renderScreen(workbook, { rowSet: { rows, total: 3 }, filterState });

    clickTab(ru.analysisTab);
    expect(container.querySelector('.analysis-screen')).not.toBeNull();
    expect(container.textContent).toContain(ru.filteredRowsCount(1, 3));

    clickTab(ru.dataTab);
    expect(container.querySelector('.data-screen')).not.toBeNull();

    clickTab(ru.analysisTab);
    expect(container.textContent).toContain(ru.filteredRowsCount(1, 3));
  });

  // PATCH 5: the routing test above cannot observe a regression (frozen stub).
  // This one drives the real store through loading, filtering and a surface swap.
  it('keeps real store filters when switching U2↔U3', async () => {
    act(() => {
      root.render(
        <WorkbookStoreProvider>
          <StoreProbe />
          <CurrentScreen />
        </WorkbookStoreProvider>,
      );
    });

    await act(async () => {
      await currentApi().loadFile(fakeFile('filtered.xlsx', xlsxBytes()));
    });
    expect(currentApi().state.filterState.categories).toEqual({});

    clickTab(ru.analysisTab);
    expect(container.querySelector('.analysis-screen')).not.toBeNull();
    expect(container.textContent).toContain(ru.rowsCount(3));

    const statusChip = chip('Статус');
    if (!statusChip) throw new Error('Статус chip not found');
    click(statusChip);
    const doneOption = option('Готово');
    if (!doneOption) throw new Error('Готово option not found');
    click(doneOption);

    expect(currentApi().state.filterState.categories).toEqual({ статус: ['Готово'] });
    expect(container.textContent).toContain(ru.filteredRowsCount(2, 3));

    clickTab(ru.dataTab);
    expect(container.querySelector('.data-screen')).not.toBeNull();

    clickTab(ru.analysisTab);
    expect(container.textContent).toContain(ru.filteredRowsCount(2, 3));
    expect(currentApi().state.filterState.categories).toEqual({ статус: ['Готово'] });
  });

  // PATCH 6b: the "new file starts on U2" reset branch in CurrentScreen.
  it('resets to the «Данные» surface when a different file is loaded', () => {
    const workbookA = analyzeWorkbook(
      makeWorkbook([makeSheet(sampleRows())], 'a.xlsx'),
    ).workbook;
    const workbookB = analyzeWorkbook(
      makeWorkbook([makeSheet(sampleRows())], 'b.xlsx'),
    ).workbook;

    renderScreen(workbookA);
    clickTab(ru.analysisTab);
    expect(container.querySelector('.analysis-screen')).not.toBeNull();

    renderScreen(workbookB);

    expect(container.querySelector('.data-screen')).not.toBeNull();
    expect(container.querySelector('.analysis-screen')).toBeNull();
  });
});
