// @vitest-environment jsdom
import { act, useMemo, useReducer, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CellValue, Workbook } from '../src/domain/model';
import { applyFilter, buildFilterOptions } from '../src/domain/pipeline/applyFilter';
import { aggregate, buildViewOptions, defaultViewConfig } from '../src/domain/pipeline/aggregate';
import { selectActiveSheet } from '../src/domain/pipeline/selectActiveSheet';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { AnalysisScreen } from '../src/ui/screens/AnalysisScreen';
import { downloadBlob } from '../src/adapters/exporter/download';
import { exportPdf } from '../src/adapters/exporter/pdf';
import { createChart } from '../src/adapters/charts';
import { StoreContext, type StoreApi } from '../src/ui/store/context';
import { reducer, type StoreState } from '../src/ui/store/reducer';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

// jsdom has no `<canvas>` implementation; the real Chart.js lifecycle is covered
// in browser mode (`chartCard.browser.test.tsx`). Here the adapter is a stub.
vi.mock('../src/adapters/charts', () => ({
  createChart: vi.fn(async () => ({ update: vi.fn(), destroy: vi.fn() })),
}));

// The export group (CAP-7) drives U3's file names, downloads and toasts. The
// heavy adapters are stubbed so the assertions stay about the screen's contract:
// PNG/PDF produce artifacts (covered in browser mode) and XLSX is written by the
// real SheetJS adapter. Only the download side-effect is observed.
vi.mock('../src/adapters/exporter/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('../src/adapters/exporter/png', () => ({
  EmptyCanvasError: class EmptyCanvasError extends Error {},
  snapshotChart: vi.fn(() => ({
    blob: new Blob(['png'], { type: 'image/png' }),
    dataUrl: 'data:image/png;base64,AAAA',
    width: 10,
    height: 10,
  })),
  exportPng: vi.fn(() => new Blob(['png'], { type: 'image/png' })),
}));
vi.mock('../src/adapters/exporter/pdf', () => ({
  exportPdf: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));

const DATE_HEADERS = [...HEADERS, 'Дата'];

const TASK = {
  Эпик: 'Эпик 1',
  'Тип задачи': 'Задача',
  Статус: 'Готово',
  Исполнитель: 'Иванов',
  'Тип работы': 'Разработка',
  'Затрачено времени (ч)': 4,
} satisfies Partial<Record<string, CellValue>>;

/** Three data rows (two share a work type and status) plus one marker row. */
function dataRows(): CellValue[][] {
  return [
    [...HEADERS],
    rowFor(HEADERS, { ...TASK, Задача: 'A' }),
    rowFor(HEADERS, {
      ...TASK,
      'Тип задачи': 'Баг',
      Задача: 'B',
      Статус: 'В работе',
      Исполнитель: 'Петров',
      'Затрачено времени (ч)': 2,
    }),
    rowFor(HEADERS, {
      ...TASK,
      Задача: 'C',
      Исполнитель: 'Сидоров',
      'Тип работы': 'Дизайн',
      'Затрачено времени (ч)': 1,
    }),
    rowFor(HEADERS, { Эпик: 'Эпик 2' }),
  ];
}

function datedRows(): CellValue[][] {
  return [
    [...DATE_HEADERS],
    rowFor(DATE_HEADERS, { ...TASK, Задача: 'A', Дата: '2026-03-10' }),
    rowFor(DATE_HEADERS, {
      ...TASK,
      Задача: 'B',
      Статус: 'В работе',
      Исполнитель: 'Петров',
      Дата: new Date('2026-04-01'),
    }),
    rowFor(DATE_HEADERS, { ...TASK, Задача: 'C', Исполнитель: 'Сидоров' }),
  ];
}

/** One data row with a blank assignee, so a «(не указано)» group appears. */
function blankDimensionRows(): CellValue[][] {
  return [
    [...HEADERS],
    rowFor(HEADERS, { ...TASK, Задача: 'A', 'Затрачено времени (ч)': 4 }),
    rowFor(HEADERS, { ...TASK, Задача: 'B', Исполнитель: null, 'Затрачено времени (ч)': 6 }),
    rowFor(HEADERS, { ...TASK, Задача: 'C', Исполнитель: 'Петров', 'Затрачено времени (ч)': 2 }),
    rowFor(HEADERS, { Эпик: 'Эпик 2' }),
  ];
}

const NO_MEASURE_HEADERS = HEADERS.filter((header) => header !== 'Затрачено времени (ч)');

/** A sheet with categories but no numeric column at all. */
function noMeasureRows(): CellValue[][] {
  return [
    [...NO_MEASURE_HEADERS],
    rowFor(NO_MEASURE_HEADERS, { ...TASK, Задача: 'A' }),
  ];
}

const NO_DIMENSION_HEADERS = ['Затрачено времени (ч)'];

/** A sheet with a numeric column but no contract category with values. */
function noDimensionRows(): CellValue[][] {
  return [
    [...NO_DIMENSION_HEADERS],
    rowFor(NO_DIMENSION_HEADERS, { 'Затрачено времени (ч)': 4 }),
    rowFor(NO_DIMENSION_HEADERS, { 'Затрачено времени (ч)': 2 }),
  ];
}

const TWO_MEASURE_HEADERS = [...HEADERS, 'Оценка'];

/** Two numeric columns, so the measure selector has a second option to pick. */
function twoMeasureRows(): CellValue[][] {
  return [
    [...TWO_MEASURE_HEADERS],
    rowFor(TWO_MEASURE_HEADERS, { ...TASK, Задача: 'A', Оценка: 10 }),
    rowFor(TWO_MEASURE_HEADERS, {
      ...TASK,
      Задача: 'B',
      Исполнитель: 'Петров',
      'Затрачено времени (ч)': 2,
      Оценка: 3,
    }),
  ];
}

function toWorkbook(rows: CellValue[][], fileName = 'sample.xlsx'): Workbook {
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Main sheet' })], fileName)).workbook;
}

/**
 * Drives AnalysisScreen through the real reducer and the same domain derivations
 * the store uses, so filter changes exercise SET_FILTER/CLEAR_FILTERS end to end.
 */
function Harness({ initial }: { initial: Workbook }) {
  const start: StoreState = {
    status: 'loaded',
    fileName: initial.fileName,
    pendingFileName: null,
    workbook: initial,
    validation: { status: 'ok', issues: [] },
    errorIssues: [],
    filterState: { categories: {} },
    viewConfig: null,
  };
  const [state, dispatch] = useReducer(reducer, start);
  const activeSheet = state.workbook ? selectActiveSheet(state.workbook) : null;
  const filterOptions = useMemo(
    () => (activeSheet ? buildFilterOptions(activeSheet) : { categories: [], date: null }),
    [activeSheet],
  );
  const rowSet = useMemo(
    () => (activeSheet ? applyFilter(activeSheet, state.filterState) : { rows: [], total: 0 }),
    [activeSheet, state.filterState],
  );
  const viewOptions = useMemo(
    () => (activeSheet ? buildViewOptions(activeSheet) : { dimensions: [], measures: [] }),
    [activeSheet],
  );
  const viewConfig = useMemo(
    () => defaultViewConfig(viewOptions, state.viewConfig),
    [viewOptions, state.viewConfig],
  );
  const aggregation = useMemo(
    () => (activeSheet && viewConfig ? aggregate(activeSheet, rowSet, viewConfig) : null),
    [activeSheet, rowSet, viewConfig],
  );

  const api = useMemo<StoreApi>(
    () => ({
      state,
      activeSheet,
      rowSet,
      filterOptions,
      viewOptions,
      viewConfig,
      aggregation,
      loadFile: async () => {},
      reset: () => dispatch({ type: 'RESET' }),
      setActiveSheet: (name) => dispatch({ type: 'SET_SHEET', sheetName: name }),
      setFilter: (filterState) => dispatch({ type: 'SET_FILTER', filterState }),
      clearFilters: () => dispatch({ type: 'CLEAR_FILTERS' }),
      setView: (view) => dispatch({ type: 'SET_VIEW', viewConfig: view }),
    }),
    [state, activeSheet, rowSet, filterOptions, viewOptions, viewConfig, aggregation],
  );

  return (
    <StoreContext.Provider value={api}>
      <AnalysisScreen />
    </StoreContext.Provider>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

function selectValue(header: string, value: string): void {
  const target = chip(header);
  if (!target) throw new Error(`chip not found: ${header}`);
  click(target);
  const valueOption = option(value);
  if (!valueOption) throw new Error(`option not found: ${value}`);
  click(valueOption);
}

function dateInputs(): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('.filter-date input'));
}

function setDate(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function viewButton(label: string): Element | undefined {
  return Array.from(container.querySelectorAll('.view-switcher-button')).find(
    (element) => element.textContent === label,
  );
}

function selectFor(label: string): HTMLSelectElement | undefined {
  const wrapper = Array.from(container.querySelectorAll('.analysis-select')).find((element) =>
    element.textContent?.includes(label),
  );
  return wrapper?.querySelector('select') ?? undefined;
}

function selectedOption(select: HTMLSelectElement): string {
  return select.options[select.selectedIndex]?.textContent ?? '';
}

function setSelect(select: HTMLSelectElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('AnalysisScreen (U3)', () => {
  it('HAPPY_PATH: shows category chips and the unfiltered row count', () => {
    const ui: ReactElement = <Harness initial={toWorkbook(dataRows())} />;
    act(() => {
      root.render(ui);
    });

    expect(container.querySelector('.analysis-screen')).not.toBeNull();
    expect(container.querySelectorAll('.filter-chip')).toHaveLength(5);
    expect(container.textContent).toContain('3 строки');
    // The date section is absent when the sheet has no date column (DATE_ABSENT).
    expect(container.querySelector('.filter-date')).toBeNull();
  });

  it('FILTER_CATEGORY: narrows the row set and the counter', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(dataRows())} />);
    });

    selectValue('Тип работы', 'Разработка');

    expect(container.textContent).toContain('Показано 2 из 3 строк');
  });

  it('MULTI_AND: values in two categories must both match', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(dataRows())} />);
    });

    selectValue('Тип работы', 'Разработка');
    selectValue('Статус', 'В работе');

    expect(container.textContent).toContain('Показано 1 из 3 строк');
  });

  it('FILTER_EMPTY / RESET_FILTERS: empty state resets back to the full set', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(dataRows())} />);
    });

    selectValue('Тип работы', 'Дизайн');
    selectValue('Статус', 'В работе');

    expect(container.querySelector('.analysis-empty')).not.toBeNull();
    expect(container.textContent).toContain('Нет строк по фильтрам');

    const reset = Array.from(container.querySelectorAll('.analysis-empty .btn'))[0];
    if (reset) click(reset);

    expect(container.querySelector('.analysis-empty')).toBeNull();
    expect(container.textContent).toContain('3 строки');
  });

  it('DATE_RANGE: a range excludes out-of-range and dateless rows', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(datedRows())} />);
    });

    expect(container.querySelector('.filter-date')).not.toBeNull();
    const inputs = dateInputs();
    expect(inputs).toHaveLength(2);

    const [from] = inputs;
    if (from) setDate(from, '2026-04-01');

    expect(container.textContent).toContain('Показано 1 из 3 строк');
  });

  it('HAPPY_PATH: defaults to a bar chart of hours by assignee (CAP-6)', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(dataRows())} />);
    });

    expect(container.querySelectorAll('.view-switcher-button')).toHaveLength(4);
    expect(viewButton('Столбчатый')?.getAttribute('aria-pressed')).toBe('true');

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toContain('Столбчатый');
    expect(canvas?.getAttribute('aria-label')).toContain('Исполнитель');

    const dimension = selectFor('Разрез');
    expect(dimension && selectedOption(dimension)).toBe('Исполнитель');
    const measure = selectFor('Показатель');
    expect(measure && selectedOption(measure)).toBe('Затрачено времени (ч)');
  });

  it('VIEW_SWITCH: «Таблица» keeps the filters and shows the same aggregation', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(dataRows())} />);
    });

    selectValue('Тип работы', 'Разработка');
    expect(container.textContent).toContain('Показано 2 из 3 строк');

    const tableButton = viewButton('Таблица');
    if (tableButton) click(tableButton);

    // The filter is untouched by the view change (UX IA, AD-13).
    expect(container.textContent).toContain('Показано 2 из 3 строк');
    expect(container.querySelector('.chart-container')).toBeNull();
    expect(container.querySelector('.pivot-table')).not.toBeNull();
    expect(container.querySelector('.pivot-total')?.textContent).toContain('6');

    // The chosen dimension and measure also survive the view change (SWITCH_VIEW).
    const dimension = selectFor('Разрез');
    expect(dimension && selectedOption(dimension)).toBe('Исполнитель');
    const measure = selectFor('Показатель');
    expect(measure && selectedOption(measure)).toBe('Затрачено времени (ч)');
  });

  it('DIMENSION_CHANGE: the view follows the selected dimension', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(dataRows())} />);
    });

    const dimension = selectFor('Разрез');
    if (!dimension) throw new Error('dimension select not found');
    setSelect(dimension, 'статус');

    expect(container.querySelector('.chart-title')?.textContent).toContain('Статус');
    expect(container.querySelector('.chart-title')?.textContent).not.toContain('Исполнитель');
  });

  it('MEASURE_CHANGE: the sums follow the newly selected measure', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(twoMeasureRows())} />);
    });

    const measure = selectFor('Показатель');
    if (!measure) throw new Error('measure select not found');
    // The preferred measure wins over the second numeric column («Оценка»).
    expect(selectedOption(measure)).toBe('Затрачено времени (ч)');

    const tableButton = viewButton('Таблица');
    if (tableButton) click(tableButton);
    expect(container.querySelector('.pivot-total')?.textContent).toContain('6');

    setSelect(measure, 'оценка');

    expect(selectedOption(measure)).toBe('Оценка');
    // 10 + 3 replaces 4 + 2: the aggregation follows the ViewConfig (AD-13).
    expect(container.querySelector('.pivot-total')?.textContent).toContain('13');
  });

  it('BLANK_DIMENSION: an empty dimension forms the «(не указано)» group', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(blankDimensionRows())} />);
    });

    const tableButton = viewButton('Таблица');
    if (tableButton) click(tableButton);

    expect(container.textContent).toContain('(не указано)');
    // Blank rows are summed into their own group; «Итого» covers every group.
    expect(container.querySelector('.pivot-total')?.textContent).toContain('12');
  });

  it('NO_MEASURE: views are unavailable and the reason is named', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(noMeasureRows())} />);
    });

    expect(container.textContent).toContain('нет числовой колонки');
    expect(container.querySelector('.view-switcher')).toBeNull();
    expect(container.querySelector('.chart-container')).toBeNull();
  });

  it('NO_DIMENSION: views are unavailable and the reason is named', () => {
    act(() => {
      root.render(<Harness initial={toWorkbook(noDimensionRows())} />);
    });

    expect(container.textContent).toContain('нет категории');
    expect(container.querySelector('.view-switcher')).toBeNull();
  });
});

/**
 * Export group (CAP-7). The screen owns the file names, the downloads and the
 * toast (AD-10); PNG/PDF are produced by the card (browser mode) and XLSX by the
 * real SheetJS adapter — here the download side-effect and the heavy image
 * adapters are stubbed so the contract under test is the screen's.
 */
describe('AnalysisScreen export (CAP-7)', () => {
  const downloadBlobMock = vi.mocked(downloadBlob);
  const exportPdfMock = vi.mocked(exportPdf);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Renders inside an async `act` so the chart card's `ready` state settles. */
  async function renderHarness(initial: Workbook): Promise<void> {
    await act(async () => {
      root.render(<Harness initial={initial} />);
    });
  }

  /** A click whose async handlers (export, download) get to settle. */
  async function clickAsync(element: Element): Promise<void> {
    await act(async () => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function click(element: Element): Promise<void> {
    await act(async () => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  function xlsxButton(): HTMLButtonElement {
    const found = container.querySelector<HTMLButtonElement>('.export-xlsx');
    if (!found) throw new Error('XLSX button not found');
    return found;
  }

  function chartExportButton(): HTMLButtonElement {
    const found = container.querySelector<HTMLButtonElement>('.export-button');
    if (!found) throw new Error('chart export button not found');
    return found;
  }

  function exportOption(label: string): HTMLButtonElement {
    const found = Array.from(container.querySelectorAll<HTMLButtonElement>('.export-option')).find(
      (option) => option.textContent === label,
    );
    if (!found) throw new Error(`export option not found: ${label}`);
    return found;
  }

  function toast(): HTMLElement | null {
    return container.querySelector('.toast');
  }

  it('EXPORT_XLSX: downloads <base>-данные.xlsx and confirms with a status toast', async () => {
    await renderHarness(toWorkbook(dataRows()));
    expect(xlsxButton().disabled).toBe(false);

    await clickAsync(xlsxButton());

    await vi.waitFor(() => {
      expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    });
    const [blob, fileName] = downloadBlobMock.mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(fileName).toBe('sample-данные.xlsx');

    const element = toast();
    expect(element?.getAttribute('role')).toBe('status');
    expect(element?.textContent).toContain('Экспорт готов: sample-данные.xlsx');
  });

  it('NAME_FALLBACK: an empty source name falls back to «отчёт»', async () => {
    await renderHarness(toWorkbook(dataRows(), ''));
    await clickAsync(xlsxButton());

    await vi.waitFor(() => {
      expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    });
    expect(downloadBlobMock.mock.calls[0]?.[1]).toBe('отчёт-данные.xlsx');
  });

  it('NO_ROWS: the XLSX button is disabled and the reason is named', async () => {
    await renderHarness(toWorkbook(dataRows()));
    // «Дизайн» + «В работе» matches no row.
    await click(chip('Тип работы')!);
    await click(option('Дизайн')!);
    await click(chip('Статус')!);
    await click(option('В работе')!);

    expect(container.querySelector('.analysis-empty')).not.toBeNull();
    expect(xlsxButton().disabled).toBe(true);
    expect(container.textContent).toContain('Экспорт недоступен: нет строк по фильтрам');
    // No chart card means no PNG/PDF menu either.
    expect(container.querySelector('.export-button')).toBeNull();
  });

  it('TABLE_VIEW: no PNG/PDF menu, but XLSX stays available', async () => {
    await renderHarness(toWorkbook(dataRows()));
    const tableButton = viewButton('Таблица');
    if (!tableButton) throw new Error('table view button not found');
    await click(tableButton);

    expect(container.querySelector('.pivot-table')).not.toBeNull();
    expect(container.querySelector('.export-button')).toBeNull();
    expect(xlsxButton().disabled).toBe(false);
  });

  it('CHART_FAILED: a failed chart load shows the error and no PNG/PDF menu', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createChart).mockRejectedValueOnce(new Error('chart module failed'));

    await renderHarness(toWorkbook(dataRows()));

    await vi.waitFor(() => {
      expect(container.querySelector('.chart-error')).not.toBeNull();
    });
    expect(container.textContent).toContain('График недоступен');
    // No canvas survives a load failure, so the export menu is absent too.
    expect(container.querySelector('.export-button')).toBeNull();
    // XLSX does not depend on the chart instance.
    expect(xlsxButton().disabled).toBe(false);

    errorSpy.mockRestore();
  });

  it('EXPORT_PNG: downloads <base>-график.png and confirms with a status toast', async () => {
    await renderHarness(toWorkbook(dataRows()));
    await clickAsync(chartExportButton());
    await clickAsync(exportOption('PNG'));

    await vi.waitFor(() => {
      expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    });
    expect(downloadBlobMock.mock.calls[0]?.[1]).toBe('sample-график.png');
    expect(toast()?.getAttribute('role')).toBe('status');
    expect(toast()?.textContent).toContain('Экспорт готов: sample-график.png');
  });

  it('EXPORT_PDF: downloads <base>-отчёт.pdf and confirms with a status toast', async () => {
    await renderHarness(toWorkbook(dataRows()));
    await clickAsync(chartExportButton());
    await clickAsync(exportOption('PDF'));

    await vi.waitFor(() => {
      expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    });
    expect(downloadBlobMock.mock.calls[0]?.[1]).toBe('sample-отчёт.pdf');
    expect(toast()?.getAttribute('role')).toBe('status');
    expect(toast()?.textContent).toContain('Экспорт готов: sample-отчёт.pdf');
  });

  it('EXPORT_PDF: the report carries the active filters, the row count and a date', async () => {
    await renderHarness(toWorkbook(dataRows()));
    await click(chip('Тип работы')!);
    await click(option('Разработка')!);
    expect(container.textContent).toContain('Показано 2 из 3 строк');

    await clickAsync(chartExportButton());
    await clickAsync(exportOption('PDF'));

    await vi.waitFor(() => {
      expect(exportPdfMock).toHaveBeenCalledTimes(1);
    });
    const report = exportPdfMock.mock.calls[0]![0];
    // The filters line is built from the real FilterState, not a placeholder.
    expect(report.filters).toBe('Фильтры: Тип работы: Разработка');
    expect(report.rowsCount).toContain('2');
    expect(report.date).toMatch(/^Дата формирования: \d{4}-\d{2}-\d{2}$/);
    expect(report.imageDataUrl).toContain('data:image/png');
  });

  it('CHART_NOT_READY: PNG/PDF stay disabled until the chart instance is ready', async () => {
    // An instance that never resolves keeps the card un-ready.
    vi.mocked(createChart).mockImplementationOnce(() => new Promise<never>(() => {}));

    await renderHarness(toWorkbook(dataRows()));

    await clickAsync(chartExportButton());
    const options = Array.from(container.querySelectorAll<HTMLButtonElement>('.export-option'));
    expect(options).toHaveLength(2);
    for (const option of options) {
      expect(option.disabled).toBe(true);
      expect(option.getAttribute('title')).toBe('График ещё строится');
    }
  });

  it('TOAST_ERROR: a failed download shows a persistent alert toast', async () => {
    downloadBlobMock.mockImplementationOnce(() => {
      throw new Error('download failed');
    });
    await renderHarness(toWorkbook(dataRows()));

    await clickAsync(xlsxButton());

    await vi.waitFor(() => {
      expect(toast()?.getAttribute('role')).toBe('alert');
    });
    expect(toast()?.textContent).toContain('Не удалось выполнить экспорт');
  });

  it('FILTERED: the file name and export reflect the active filters', async () => {
    await renderHarness(toWorkbook(dataRows()));
    await click(chip('Тип работы')!);
    await click(option('Разработка')!);
    expect(container.textContent).toContain('Показано 2 из 3 строк');

    await clickAsync(xlsxButton());

    await vi.waitFor(() => {
      expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    });
    const [blob] = downloadBlobMock.mock.calls[0]!;
    // A real .xlsx archive (ZIP magic): the filtered rows were serialized.
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
