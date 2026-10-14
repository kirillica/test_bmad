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
