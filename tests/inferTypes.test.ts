import { describe, expect, it } from 'vitest';
import { classifyCell, inferColumnType, looksLikeDate } from '../src/domain/pipeline/inferTypes';

describe('classifyCell', () => {
  it('classifies numbers, dates and date-like strings', () => {
    expect(classifyCell(5)).toBe('number');
    expect(classifyCell(12.5)).toBe('number');
    expect(classifyCell(new Date('2026-01-01'))).toBe('date');
    expect(classifyCell('12.03.2026')).toBe('date');
    expect(classifyCell('2026-03-12')).toBe('date');
    expect(classifyCell('Готово')).toBe('text');
  });

  it('gives no evidence for empty and whitespace cells', () => {
    expect(classifyCell(null)).toBeNull();
    expect(classifyCell('   ')).toBeNull();
  });
});

describe('looksLikeDate', () => {
  it('accepts dotted and ISO dates, rejects other text', () => {
    expect(looksLikeDate('12.03.2026')).toBe(true);
    expect(looksLikeDate('2026-03-12')).toBe(true);
    expect(looksLikeDate('2026-03-12T08:30:00')).toBe(true);
    expect(looksLikeDate('Задача')).toBe(false);
    expect(looksLikeDate('')).toBe(false);
  });
});

describe('inferColumnType', () => {
  it('TYPE_MAJORITY: a partially filled numeric column is a number', () => {
    expect(inferColumnType([null, 1, null, 2, 3, null])).toEqual({
      type: 'number',
      ambiguous: false,
    });
  });

  it('TYPE_MAJORITY: majority wins over a minority of other types', () => {
    expect(inferColumnType([1, 2, 3, 'не число'])).toEqual({ type: 'number', ambiguous: false });
  });

  it('TYPE_DATE: a column of dates and date-like strings is a date', () => {
    expect(inferColumnType([new Date('2026-01-01'), '12.03.2026'])).toEqual({
      type: 'date',
      ambiguous: false,
    });
  });

  it('TYPE_TEXT: a column of labels is text', () => {
    expect(inferColumnType(['Готово', 'В работе', 'Новое'])).toEqual({
      type: 'text',
      ambiguous: false,
    });
  });

  it('AMBIGUOUS_TYPE: a tie resolves by priority and is flagged', () => {
    expect(inferColumnType([5, new Date('2026-01-01')])).toEqual({
      type: 'number',
      ambiguous: true,
    });
  });

  it('an all-empty column falls back to text without a flag', () => {
    expect(inferColumnType([null, null, '  '])).toEqual({ type: 'text', ambiguous: false });
  });
});
