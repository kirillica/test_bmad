// @vitest-environment jsdom
import { act, useMemo, useReducer, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createIssue } from '../src/domain/issues';
import type { CellValue, Issue, Workbook } from '../src/domain/model';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { DataScreen } from '../src/ui/screens/DataScreen';
import { StoreContext, type StoreApi } from '../src/ui/store/context';
import { reducer, type StoreState } from '../src/ui/store/reducer';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

const PREVIEW_HEADERS = [...HEADERS, 'Дата'];

/** A minimal but complete data row; extra columns are added per test. */
const TASK_ROW = {
  'Тип задачи': 'Задача',
  Статус: 'Готово',
  Исполнитель: 'Иванов',
  'Тип работы': 'Разработка',
  'Затрачено времени (ч)': 1,
} satisfies Partial<Record<string, CellValue>>;

/** A visible sheet with two data rows (one number, one date) and a marker row. */
function previewWorkbook(): Workbook {
  const rows: CellValue[][] = [
    [...PREVIEW_HEADERS],
    rowFor(PREVIEW_HEADERS, {
      ...TASK_ROW,
      Задача: 'Настроить отчёт',
      'Затрачено времени (ч)': 12.5,
      Дата: new Date('2026-03-12'),
    }),
    rowFor(PREVIEW_HEADERS, {
      ...TASK_ROW,
      'Тип задачи': 'Баг',
      Задача: 'Падает экспорт',
      Статус: 'Новое',
      Исполнитель: 'Петров',
      'Тип работы': 'Документация',
      'Затрачено времени (ч)': 8,
      Дата: new Date('2026-04-01'),
    }),
    rowFor(PREVIEW_HEADERS, { Эпик: 'Служебный раздел' }),
  ];
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Main sheet' })])).workbook;
}

function sheetRows(taskName: string): CellValue[][] {
  return [[...HEADERS], rowFor(HEADERS, { ...TASK_ROW, Задача: taskName })];
}

/** Two visible sheets plus one hidden — for switching and hidden-sheet rules. */
function multiWorkbook(): Workbook {
  return analyzeWorkbook(
    makeWorkbook([
      makeSheet(sheetRows('Лист A строка'), { name: 'Первый' }),
      makeSheet(sheetRows('Лист B строка'), { name: 'Второй' }),
      makeSheet(sheetRows('Скрытая строка'), { name: 'Скрытый', hidden: true }),
    ]),
  ).workbook;
}

/** A sheet whose only data row is a service marker — must render as empty. */
function markerOnlyWorkbook(): Workbook {
  const rows = [[...HEADERS], rowFor(HEADERS, { Эпик: 'Служебный раздел' })];
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Метки' })])).workbook;
}

/** A sheet with `count` non-marker data rows, for the preview limit. */
function manyRowsWorkbook(count: number): Workbook {
  const rows: CellValue[][] = [[...HEADERS]];
  for (let index = 0; index < count; index += 1) {
    rows.push(rowFor(HEADERS, { ...TASK_ROW, Задача: `Задача ${index}` }));
  }
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Большой' })])).workbook;
}

/** Two visible sheets, each longer than one page, for the page-reset check. */
function longSheetsWorkbook(count = 120): Workbook {
  const build = (prefix: string): CellValue[][] => {
    const rows: CellValue[][] = [[...HEADERS]];
    for (let index = 0; index < count; index += 1) {
      rows.push(rowFor(HEADERS, { ...TASK_ROW, Задача: `${prefix} ${index}` }));
    }
    return rows;
  };
  return analyzeWorkbook(
    makeWorkbook([
      makeSheet(build('A'), { name: 'Первый' }),
      makeSheet(build('B'), { name: 'Второй' }),
    ]),
  ).workbook;
}

/** A date column holding date-like strings, not Date objects. */
function stringDateWorkbook(): Workbook {
  const rows: CellValue[][] = [
    [...PREVIEW_HEADERS],
    rowFor(PREVIEW_HEADERS, { ...TASK_ROW, Задача: 'A', Дата: '2026-07-05' }),
  ];
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Даты' })])).workbook;
}

/** A column whose header is empty because data rows are wider than the header. */
function unnamedHeaderWorkbook(): Workbook {
  const headers = [...HEADERS, ''];
  const rows: CellValue[][] = [
    headers,
    rowFor(headers, { ...TASK_ROW, Задача: 'A', '': 'значение' }),
  ];
  return analyzeWorkbook(makeWorkbook([makeSheet(rows, { name: 'Кривой' })])).workbook;
}

/** A workbook with a type tie, plus the validation that flags it. */
function ambiguousAnalysis(): { workbook: Workbook; issues: Issue[] } {
  const rows: CellValue[][] = [
    [...HEADERS],
    rowFor(HEADERS, { ...TASK_ROW, 'Тип задачи': 5, Задача: 'A' }),
    rowFor(HEADERS, { ...TASK_ROW, 'Тип задачи': new Date('2026-01-02'), Задача: 'B' }),
  ];
  const { workbook, validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
  return { workbook, issues: validation.issues };
}

/**
 * Drives DataScreen through the real reducer, so sheet switching exercises the
 * same SET_SHEET guard as production (hidden/unknown names are ignored).
 */
function Harness({
  initial,
  issues = [],
  errorIssues = [],
}: {
  initial: Workbook;
  issues?: Issue[];
  errorIssues?: Issue[];
}) {
  const start: StoreState = {
    status: 'loaded',
    fileName: initial.fileName,
    pendingFileName: null,
    workbook: initial,
    validation: { status: issues.length > 0 ? 'warnings' : 'ok', issues },
    errorIssues,
  };
  const [state, dispatch] = useReducer(reducer, start);
  const api = useMemo<StoreApi>(
    () => ({
      state,
      loadFile: async () => {},
      reset: () => dispatch({ type: 'RESET' }),
      setActiveSheet: (name) => dispatch({ type: 'SET_SHEET', sheetName: name }),
    }),
    [state],
  );
  return (
    <StoreContext.Provider value={api}>
      <DataScreen />
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

function render(ui: ReactElement): void {
  act(() => {
    root.render(ui);
  });
}

function click(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function press(element: Element, key: string): void {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function cellByHeader(header: string): Element | undefined {
  return Array.from(container.querySelectorAll('th')).find((th) =>
    th.textContent?.includes(header),
  );
}

function tabs(): Element[] {
  return Array.from(container.querySelectorAll('.sheet-tab'));
}

function paginationButton(label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('.pagination-button')).find(
    (element) => element.textContent === label,
  );
}

function pageInput(): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>('.pagination-input');
}

/** Types a page number and commits it with Enter, like a user would. */
function jumpToPage(value: string): void {
  const input = pageInput();
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  press(input, 'Enter');
}

describe('DataScreen (U2)', () => {
  it('HAPPY_PATH: previews the active sheet, chips types and shows warnings', () => {
    render(
      <Harness
        initial={previewWorkbook()}
        issues={[createIssue('SECTION_ROWS_EXCLUDED', undefined, 1)]}
      />,
    );

    expect(container.querySelector('.warning-banner')).not.toBeNull();
    expect(container.querySelector('.data-table')).not.toBeNull();
    // The service-marker row is excluded from the preview (AD-14).
    expect(container.querySelectorAll('.data-table tbody tr')).toHaveLength(2);
    expect(container.textContent).not.toContain('Служебный раздел');
    // Cells use Intl ru-RU: 12.5 -> 12,5 and the date -> dd.mm.yyyy (AD-9).
    expect(container.textContent).toContain('12,5');
    expect(container.textContent).toContain('12.03.2026');
  });

  it('TYPE_MAJORITY: a numeric column shows a neutral "число" chip', () => {
    render(<Harness initial={previewWorkbook()} />);
    const chip = cellByHeader('Затрачено времени (ч)')?.querySelector('.type-chip');
    expect(chip?.textContent).toBe('число');
    expect(chip?.className).toBe('type-chip');
    expect(chip?.getAttribute('title')).toBe('2 непустых значения');
    // The accessible name keeps the type, not only the count.
    expect(chip?.getAttribute('aria-label')).toContain('число');
    expect(chip?.getAttribute('aria-label')).toContain('2 непустых значения');
  });

  it('TYPE_DATE / TYPE_TEXT: date and text columns get their chips', () => {
    render(<Harness initial={previewWorkbook()} />);
    expect(cellByHeader('Дата')?.querySelector('.type-chip')?.textContent).toBe('дата');
    expect(cellByHeader('Статус')?.querySelector('.type-chip')?.textContent).toBe('текст');
  });

  it('SWITCH_SHEET: clicking a tab repaints the preview with that sheet', () => {
    render(<Harness initial={multiWorkbook()} />);
    expect(container.textContent).toContain('Лист A строка');

    expect(tabs().map((tab) => tab.textContent)).toEqual(['Первый', 'Второй']);

    const second = tabs().find((tab) => tab.textContent === 'Второй');
    expect(second).toBeDefined();
    if (second) click(second);

    expect(container.textContent).toContain('Лист B строка');
    expect(container.textContent).not.toContain('Лист A строка');
  });

  it('HIDDEN_SHEET: a hidden sheet is never offered as a tab', () => {
    render(<Harness initial={multiWorkbook()} />);
    expect(tabs().map((tab) => tab.textContent)).not.toContain('Скрытый');
  });

  it('SINGLE_SHEET: no tabs are rendered when only one sheet is visible', () => {
    render(<Harness initial={previewWorkbook()} />);
    expect(container.querySelector('.sheet-tabs')).toBeNull();
  });

  it('EMPTY_SHEET: a sheet without data rows shows "Лист пуст" and no table', () => {
    const empty = analyzeWorkbook(
      makeWorkbook([makeSheet([[...HEADERS]], { name: 'Пусто' })]),
    ).workbook;
    render(<Harness initial={empty} />);
    expect(container.querySelector('.data-table')).toBeNull();
    expect(container.textContent).toContain('Лист пуст');
  });

  it('EMPTY_SHEET: a sheet with only a service marker row is empty', () => {
    render(<Harness initial={markerOnlyWorkbook()} />);
    expect(container.querySelector('.data-table')).toBeNull();
    expect(container.textContent).toContain('Лист пуст');
  });

  it('PAGINATION: a long sheet is split into pages of 50 with a row range', () => {
    render(<Harness initial={manyRowsWorkbook(626)} />);

    expect(container.querySelectorAll('.data-table tbody tr')).toHaveLength(50);
    expect(container.textContent).toContain('Строки 1–50 из 626');
    expect(container.textContent).toContain('из 13');
    expect(pageInput()?.value).toBe('1');
  });

  it('PAGINATION: the next page continues the range', () => {
    render(<Harness initial={manyRowsWorkbook(626)} />);

    const next = paginationButton('Вперёд');
    if (next) click(next);

    expect(container.querySelectorAll('.data-table tbody tr')).toHaveLength(50);
    expect(container.textContent).toContain('Строки 51–100 из 626');
  });

  it('PAGINATION: the last page shows the remainder and disables «Вперёд»', () => {
    render(<Harness initial={manyRowsWorkbook(626)} />);

    jumpToPage('13');

    expect(container.querySelectorAll('.data-table tbody tr')).toHaveLength(26);
    expect(container.textContent).toContain('Строки 601–626 из 626');
    expect(paginationButton('Вперёд')?.disabled).toBe(true);
  });

  it('PAGINATION: switching sheets resets to the first page', () => {
    render(<Harness initial={longSheetsWorkbook()} />);

    const next = paginationButton('Вперёд');
    if (next) click(next);
    expect(container.textContent).toContain('Строки 51–100 из 120');

    const second = tabs().find((tab) => tab.textContent === 'Второй');
    if (second) click(second);

    expect(container.textContent).toContain('Строки 1–50 из 120');
    expect(pageInput()?.value).toBe('1');
  });

  it('PAGINATION: a sheet shorter than one page renders no controls', () => {
    render(<Harness initial={previewWorkbook()} />);
    expect(container.querySelector('.pagination')).toBeNull();
  });

  it('ARIA: the preview is a tabpanel labelled by the active tab', () => {
    render(<Harness initial={multiWorkbook()} />);

    const panel = container.querySelector('[role="tabpanel"]');
    expect(panel).not.toBeNull();
    expect(panel?.id).toBe('sheet-panel');

    const activeTab = container.querySelector('.sheet-tab.is-active');
    expect(activeTab).not.toBeNull();
    expect(panel?.getAttribute('aria-labelledby')).toBe(activeTab?.id);
    expect(activeTab?.getAttribute('aria-controls')).toBe('sheet-panel');
    expect(activeTab?.getAttribute('tabIndex')).toBe('0');

    const second = tabs().find((tab) => tab.textContent === 'Второй');
    if (second) click(second);

    const activeAfter = container.querySelector('.sheet-tab.is-active');
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      activeAfter?.id,
    );
  });

  it('ARIA: ArrowRight moves the roving focus and selects the next tab', () => {
    render(<Harness initial={multiWorkbook()} />);
    const first = tabs()[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.getAttribute('tabIndex')).toBe('0');

    press(first, 'ArrowRight');

    expect(container.textContent).toContain('Лист B строка');
    const active = container.querySelector('.sheet-tab.is-active');
    expect(active?.textContent).toBe('Второй');
    expect(active?.getAttribute('tabIndex')).toBe('0');
  });

  it('FORMAT_DATE: a date-like string cell renders as dd.mm.yyyy', () => {
    render(<Harness initial={stringDateWorkbook()} />);
    expect(container.textContent).toContain('05.07.2026');
    expect(container.textContent).not.toContain('2026-07-05');
  });

  it('FORMAT_DATE: an Invalid Date cell renders empty instead of crashing', () => {
    const headers = [...HEADERS, 'Дата'];
    const workbook = analyzeWorkbook(
      makeWorkbook([
        makeSheet([
          headers,
          rowFor(headers, {
            'Тип задачи': 'Задача',
            Задача: 'Кривая дата',
            Статус: 'Готово',
            Исполнитель: 'Иванов',
            'Тип работы': 'Разработка',
            'Затрачено времени (ч)': 1,
            Дата: new Date('не дата'),
          }),
        ]),
      ]),
    ).workbook;

    render(<Harness initial={workbook} />);

    // Intl.format throws on an Invalid Date, so the screen must survive (AD-9).
    expect(container.querySelector('.data-screen')).not.toBeNull();
    expect(container.querySelector('.data-table tbody tr')).not.toBeNull();
  });

  it('UNNAMED_COLUMN: an empty header falls back to a numbered placeholder', () => {
    render(<Harness initial={unnamedHeaderWorkbook()} />);
    const th = Array.from(container.querySelectorAll('th')).find((cell) =>
      cell.textContent?.includes('Колонка 8'),
    );
    expect(th).toBeDefined();
  });

  it('AMBIGUOUS_TYPE: a flagged type tie is surfaced in the warning banner', () => {
    const { workbook, issues } = ambiguousAnalysis();
    render(<Harness initial={workbook} issues={issues} />);
    expect(container.querySelector('.warning-banner')).not.toBeNull();
    expect(container.textContent).toContain('Тип колонки «Тип задачи» определён неуверенно.');
  });

  it('ERROR_ON_U2: a failed load keeps the workbook but shows the error (AD-17)', () => {
    render(
      <Harness
        initial={previewWorkbook()}
        errorIssues={[createIssue('MISSING_REQUIRED_COLUMN', 'Статус')]}
      />,
    );
    expect(container.querySelector('.data-screen')).not.toBeNull();
    expect(container.querySelector('.error-banner')).not.toBeNull();
    expect(container.textContent).toContain('Не найдена обязательная колонка «Статус».');
  });
});
