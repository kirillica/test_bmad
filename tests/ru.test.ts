import { describe, expect, it } from 'vitest';
import { ru } from '../src/ui/i18n/ru';

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
