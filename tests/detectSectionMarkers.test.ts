import { describe, expect, it } from 'vitest';
import { markSectionRows } from '../src/domain/pipeline/detectSectionMarkers';

describe('markSectionRows', () => {
  it('flags a row where only the marker column is filled', () => {
    const rows = [
      ['Эпик 1', null, null],
      [null, 'значение', 'значение'],
    ];
    expect(markSectionRows(rows, 0)).toEqual([true, false]);
  });

  it('does not flag when only the marker column is empty', () => {
    expect(markSectionRows([[null, 'a', 'b']], 0)).toEqual([false]);
  });

  it('flags nothing when the marker column is absent', () => {
    expect(markSectionRows([['a']], -1)).toEqual([false]);
  });

  it('treats whitespace-only cells as empty', () => {
    expect(markSectionRows([['Эпик 1', '   ', null]], 0)).toEqual([true]);
  });
});
