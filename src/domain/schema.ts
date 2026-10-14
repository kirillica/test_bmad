/**
 * Row limit for a whole file, summed across sheets (AD-7). One source of truth:
 * the adapter guard and the UI copy both read this constant.
 */
export const ROW_LIMIT = 30_000;

/** Mandatory column set (B–G in the reference export). One source of truth (AD-6). */
export const REQUIRED_COLUMNS = [
  'Тип задачи',
  'Задача',
  'Статус',
  'Исполнитель',
  'Тип работы',
  'Затрачено времени (ч)',
] as const;

/** Column whose sole population marks a service (section) row. */
export const SECTION_MARKER_COLUMN = 'Эпик';

/**
 * Canonical header normalization: trim, collapse whitespace, case-fold, ё→е.
 * Applied to both the required set and every incoming header.
 */
export function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е');
}

export const NORMALIZED_REQUIRED: readonly string[] = REQUIRED_COLUMNS.map((column) =>
  normalizeHeader(column),
);

export const NORMALIZED_SECTION_MARKER = normalizeHeader(SECTION_MARKER_COLUMN);
