import type { CellValue, RawSheet, RawWorkbook } from '../src/domain/model';

export const HEADERS = [
  'Эпик',
  'Тип задачи',
  'Задача',
  'Статус',
  'Исполнитель',
  'Тип работы',
  'Затрачено времени (ч)',
];

/**
 * Builds a data row aligned to `headers` by column name. Name-keyed rows keep the
 * fixtures correct even when a test removes a header, unlike fixed-index helpers.
 */
export function rowFor(
  headers: readonly string[],
  values: Partial<Record<string, CellValue>> = {},
): CellValue[] {
  return headers.map((header) => values[header] ?? null);
}

export function sampleRows(): CellValue[][] {
  return [
    [...HEADERS],
    rowFor(HEADERS, {
      'Тип задачи': 'Задача',
      Задача: 'Настроить отчёт',
      Статус: 'Готово',
      Исполнитель: 'Иванов',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 4,
    }),
    rowFor(HEADERS, {
      'Тип задачи': 'Задача',
      Задача: 'Согласовать макет',
      Статус: 'В работе',
      Исполнитель: 'Петров',
      'Тип работы': 'Дизайн',
      'Затрачено времени (ч)': 2,
    }),
    rowFor(HEADERS, { Эпик: 'Эпик 2' }),
    rowFor(HEADERS, {
      'Тип задачи': 'Баг',
      Задача: 'Падает экспорт',
      Статус: 'Новое',
      Исполнитель: 'Сидоров',
      'Тип работы': 'Разработка',
      'Затрачено времени (ч)': 1,
    }),
  ];
}

export function makeSheet(rows: CellValue[][], overrides: Partial<RawSheet> = {}): RawSheet {
  return {
    name: overrides.name ?? 'Основной лист',
    hidden: overrides.hidden ?? false,
    mergedCellCount: overrides.mergedCellCount ?? 0,
    rows,
  };
}

export function makeWorkbook(sheets: RawSheet[], fileName = 'sample.xlsx'): RawWorkbook {
  return { fileName, sheets };
}
