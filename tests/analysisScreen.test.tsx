// @vitest-environment jsdom
import { act, useMemo, useReducer, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CellValue, Workbook } from '../src/domain/model';
import { applyFilter, buildFilterOptions } from '../src/domain/pipeline/applyFilter';
import { selectActiveSheet } from '../src/domain/pipeline/selectActiveSheet';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { AnalysisScreen } from '../src/ui/screens/AnalysisScreen';
import { StoreContext, type StoreApi } from '../src/ui/store/context';
import { reducer, type StoreState } from '../src/ui/store/reducer';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

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

function toWorkbook(rows: CellValue[][]): Workbook {
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Main sheet' })])).workbook;
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

  const api = useMemo<StoreApi>(
    () => ({
      state,
      rowSet,
      filterOptions,
      loadFile: async () => {},
      reset: () => dispatch({ type: 'RESET' }),
      setActiveSheet: (name) => dispatch({ type: 'SET_SHEET', sheetName: name }),
      setFilter: (filterState) => dispatch({ type: 'SET_FILTER', filterState }),
      clearFilters: () => dispatch({ type: 'CLEAR_FILTERS' }),
    }),
    [state, rowSet, filterOptions],
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
});
