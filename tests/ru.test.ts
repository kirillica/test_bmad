import { describe, expect, it } from 'vitest';
import { formatIsoDate, ru } from '../src/ui/i18n/ru';

describe('ru.nonEmptyValues', () => {
  it('agrees the noun with the count (1 / 2 / 5 forms)', () => {
    expect(ru.nonEmptyValues(1)).toBe('1 непустое значение');
    expect(ru.nonEmptyValues(2)).toBe('2 непустых значения');
    expect(ru.nonEmptyValues(11)).toBe('11 непустых значений');
    expect(ru.nonEmptyValues(21)).toBe('21 непустое значение');
  });

  it('handles the teens and larger counts', () => {
    expect(ru.nonEmptyValues(12)).toBe('12 непустых значений');
    expect(ru.nonEmptyValues(22)).toBe('22 непустых значения');
    expect(ru.nonEmptyValues(25)).toBe('25 непустых значений');
    expect(ru.nonEmptyValues(0)).toBe('0 непустых значений');
  });
});

describe('ru rows counters', () => {
  it('agrees the noun «строка» with the count', () => {
    expect(ru.rowsCount(1)).toBe('1 строка');
    expect(ru.rowsCount(2)).toBe('2 строки');
    expect(ru.rowsCount(5)).toBe('5 строк');
    expect(ru.rowsCount(21)).toBe('21 строка');
    expect(ru.rowsCount(626)).toBe('626 строк');
  });

  it('formats the filtered counter as «Показано X из Y …» with groups', () => {
    expect(ru.filteredRowsCount(312, 626)).toBe('Показано 312 из 626 строк');
    const grouped = new Intl.NumberFormat('ru-RU').format(1234);
    expect(ru.filteredRowsCount(1, 1234)).toBe(`Показано 1 из ${grouped} строк`);
  });

  it('uses the genitive form after «из» for every count class', () => {
    expect(ru.filteredRowsCount(1, 3)).toBe('Показано 1 из 3 строк');
    expect(ru.filteredRowsCount(2, 1)).toBe('Показано 2 из 1 строки');
    expect(ru.filteredRowsCount(0, 21)).toBe('Показано 0 из 21 строки');
    expect(ru.filteredRowsCount(1, 11)).toBe('Показано 1 из 11 строк');
    expect(ru.filteredRowsCount(1, 12)).toBe('Показано 1 из 12 строк');
    expect(ru.filteredRowsCount(2, 22)).toBe('Показано 2 из 22 строк');
  });
});

describe('formatIsoDate', () => {
  it('formats the local calendar date as ISO 8601 YYYY-MM-DD (AD-9)', () => {
    // Local components: the report date must match the user's calendar.
    expect(formatIsoDate(new Date(2026, 9, 15))).toBe('2026-10-15');
    expect(formatIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    // Single-digit month and day are zero-padded.
    expect(formatIsoDate(new Date(2026, 2, 5))).toBe('2026-03-05');
  });
});

describe('ru export strings', () => {
  it('composes the file-name suffixes and the ready toast (CAP-7)', () => {
    expect(ru.exportPngSuffix).toBe('график');
    expect(ru.exportPdfSuffix).toBe('отчёт');
    expect(ru.exportXlsxSuffix).toBe('данные');
    expect(ru.exportFallbackName).toBe('отчёт');
    expect(ru.exportReady('sample-данные.xlsx')).toBe('Экспорт готов: sample-данные.xlsx');
  });

  it('names the blocked-export reasons and the PDF report lines', () => {
    expect(ru.exportBlockedNoRows).toContain('нет строк');
    expect(ru.exportBlockedNoView).toContain('представление');
    expect(ru.exportFiltersLabel('Исполнитель: Иванов')).toBe(
      'Фильтры: Исполнитель: Иванов',
    );
    expect(ru.exportDateLabel('2026-10-15')).toBe('Дата формирования: 2026-10-15');
  });
});
