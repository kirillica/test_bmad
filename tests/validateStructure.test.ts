import { describe, expect, it } from 'vitest';
import { classifyCell } from '../src/domain/pipeline/inferTypes';
import { analyzeSheet, analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import type { Issue } from '../src/domain/model';
import { HEADERS, makeSheet, makeWorkbook, rowFor, sampleRows } from './fixtures';

function codes(issues: Issue[]): string[] {
  return issues.map((issue) => issue.code);
}

describe('analyzeWorkbook', () => {
  it('HAPPY_PATH: a clean file validates with no issues', () => {
    const rows = [
      [...HEADERS],
      rowFor(HEADERS, {
        'Тип задачи': 'Задача',
        Задача: 'A',
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 3,
      }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(validation.status).toBe('ok');
    expect(validation.issues).toEqual([]);
  });

  it('WARN_MARKERS: service rows are flagged and counted, never dropped', () => {
    const { workbook, validation } = analyzeWorkbook(makeWorkbook([makeSheet(sampleRows())]));
    expect(validation.status).toBe('warnings');
    const marker = validation.issues.find((issue) => issue.code === 'SECTION_ROWS_EXCLUDED');
    expect(marker?.count).toBe(1);

    const sheet = workbook.sheets[0];
    expect(sheet.rows).toHaveLength(4);
    expect(sheet.rows.filter((row) => row.isSectionMarker)).toHaveLength(1);
  });

  it('MISSING_COLUMN: blocks and names the missing column', () => {
    const headers = HEADERS.filter((header) => header !== 'Статус');
    const rows = [
      headers,
      rowFor(headers, {
        'Тип задачи': 'Задача',
        Задача: 'A',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 3,
      }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(validation.status).toBe('blocked');
    const issue = validation.issues.find((item) => item.code === 'MISSING_REQUIRED_COLUMN');
    expect(issue?.column).toBe('Статус');
    expect(issue?.severity).toBe('blocking');
  });

  it('WARN_DIRTY: merged cells and hidden sheets warn without touching data', () => {
    const { validation } = analyzeWorkbook(
      makeWorkbook([makeSheet(sampleRows(), { hidden: true, mergedCellCount: 2 })]),
    );
    expect(validation.status).toBe('warnings');
    expect(codes(validation.issues)).toContain('MERGED_CELLS');
    expect(codes(validation.issues)).toContain('HIDDEN_SHEETS');
  });

  it('WARN_DIRTY: extra header rows are detected', () => {
    const rows = [
      rowFor(HEADERS, {}),
      [...HEADERS],
      rowFor(HEADERS, {
        'Тип задачи': 'Задача',
        Задача: 'A',
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 3,
      }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(codes(validation.issues)).toContain('EXTRA_HEADER_ROWS');
  });

  it('does not block on a hidden sheet without the required columns', () => {
    const visible = makeSheet(sampleRows(), { name: 'Данные' });
    const hidden = makeSheet([['Итоги'], ['всего']], { name: 'Скрытый', hidden: true });
    const { validation } = analyzeWorkbook(makeWorkbook([visible, hidden]));
    expect(validation.status).not.toBe('blocked');
    expect(codes(validation.issues)).toContain('HIDDEN_SHEETS');
  });

  it('flags a column whose type is a tie', () => {
    const rows = [
      [...HEADERS],
      rowFor(HEADERS, {
        'Тип задачи': 5,
        Задача: 'A',
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 1,
      }),
      rowFor(HEADERS, {
        'Тип задачи': new Date('2026-01-02'),
        Задача: 'B',
        Статус: 'Готово',
        Исполнитель: 'Петров',
        'Тип работы': 'Дизайн',
        'Затрачено времени (ч)': 2,
      }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(codes(validation.issues)).toContain('UNKNOWN_COLUMN_TYPE');
  });

  it('marks a row with the marker column plus another value as data, not a marker', () => {
    const rows = [
      [...HEADERS],
      rowFor(HEADERS, {
        Эпик: 'Эпик 1',
        'Тип задачи': 'Задача',
        Задача: 'X',
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 1,
      }),
    ];
    const { workbook, validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(workbook.sheets[0].rows[0].isSectionMarker).toBe(false);
    expect(codes(validation.issues)).not.toContain('SECTION_ROWS_EXCLUDED');
  });
});

describe('analyzeSheet', () => {
  it('types an all-empty column as text, not number', () => {
    const sheet = analyzeSheet(makeSheet([[...HEADERS]])).sheet;
    expect(sheet.columns.every((column) => column.type === 'text')).toBe(true);
  });

  it('numbers data rows from the header row (1-based sheet rows)', () => {
    const rows = [[...HEADERS], rowFor(HEADERS, {})];
    const sheet = analyzeSheet(makeSheet(rows)).sheet;
    expect(sheet.rows[0].index).toBe(2);
  });
});

describe('classifyCell', () => {
  it('classifies numbers, dates and date-like strings', () => {
    expect(classifyCell(5)).toBe('number');
    expect(classifyCell(new Date('2026-01-01'))).toBe('date');
    expect(classifyCell('12.03.2026')).toBe('date');
    expect(classifyCell('Готово')).toBe('text');
    expect(classifyCell(null)).toBeNull();
  });
});
