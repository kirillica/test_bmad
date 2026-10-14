import { describe, expect, it } from 'vitest';
import { normalizeHeader } from '../src/domain/schema';

describe('normalizeHeader', () => {
  it('trims, collapses whitespace and case-folds', () => {
    expect(normalizeHeader('  Затрачено   времени (ч) ')).toBe('затрачено времени (ч)');
  });

  it('folds ё to е', () => {
    expect(normalizeHeader('Ёмкость')).toBe('емкость');
  });

  it('tolerates empty and non-string values', () => {
    expect(normalizeHeader(null)).toBe('');
    expect(normalizeHeader(undefined)).toBe('');
    expect(normalizeHeader(42)).toBe('42');
  });
});
