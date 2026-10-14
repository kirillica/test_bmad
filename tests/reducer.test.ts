import { describe, expect, it } from 'vitest';
import { createIssue } from '../src/domain/issues';
import type { FilterState, Sheet, ValidationResult, Workbook } from '../src/domain/model';
import { initialState, reducer } from '../src/ui/store/reducer';

const workbook: Workbook = { fileName: 'sample.xlsx', sheets: [], activeSheetName: '' };
const validation: ValidationResult = { status: 'ok', issues: [] };

function sheet(name: string, hidden = false): Sheet {
  return { name, columns: [], rows: [], headerRowIndex: 0, hidden, mergedCellCount: 0 };
}

const multi: Workbook = {
  fileName: 'multi.xlsx',
  sheets: [sheet('Данные'), sheet('Итоги'), sheet('Скрытый', true)],
  activeSheetName: 'Данные',
};

const loaded = reducer(initialState, { type: 'LOAD_SUCCESS', workbook: multi, validation });

describe('reducer', () => {
  it('loads a workbook', () => {
    let state = reducer(initialState, { type: 'LOAD_START', fileName: 'sample.xlsx' });
    expect(state.status).toBe('loading');
    state = reducer(state, { type: 'LOAD_SUCCESS', workbook, validation });
    expect(state.status).toBe('loaded');
    expect(state.workbook).toBe(workbook);
    expect(state.fileName).toBe('sample.xlsx');
  });

  it('RETRY_AFTER_BLOCK: a failed retry keeps the previous workbook untouched (atomic)', () => {
    let state = reducer(initialState, { type: 'LOAD_START', fileName: 'good.xlsx' });
    state = reducer(state, { type: 'LOAD_SUCCESS', workbook, validation });
    state = reducer(state, { type: 'LOAD_START', fileName: 'bad.xlsx' });
    state = reducer(state, {
      type: 'LOAD_ERROR',
      issues: [createIssue('MISSING_REQUIRED_COLUMN', 'Статус')],
    });

    expect(state.status).toBe('loaded');
    expect(state.workbook).toBe(workbook);
    expect(state.errorIssues[0]?.code).toBe('MISSING_REQUIRED_COLUMN');
  });

  it('a failure with nothing loaded ends in the error state', () => {
    let state = reducer(initialState, { type: 'LOAD_START', fileName: 'bad.xlsx' });
    state = reducer(state, { type: 'LOAD_ERROR', issues: [createIssue('CORRUPT_FILE')] });
    expect(state.status).toBe('error');
    expect(state.workbook).toBeNull();
  });

  it('SET_SHEET switches the active sheet immutably', () => {
    const state = reducer(loaded, { type: 'SET_SHEET', sheetName: 'Итоги' });
    expect(state.workbook?.activeSheetName).toBe('Итоги');
    // A new workbook reference is produced; the source is untouched (AD-3).
    expect(state.workbook).not.toBe(multi);
    expect(multi.activeSheetName).toBe('Данные');
  });

  it('SET_SHEET ignores hidden and unknown sheets', () => {
    expect(reducer(loaded, { type: 'SET_SHEET', sheetName: 'Скрытый' })).toBe(loaded);
    expect(reducer(loaded, { type: 'SET_SHEET', sheetName: 'Нет такого' })).toBe(loaded);
  });

  it('SET_SHEET is a no-op without a loaded workbook', () => {
    expect(reducer(initialState, { type: 'SET_SHEET', sheetName: 'Данные' })).toBe(initialState);
  });

  it('RESET clears everything', () => {
    let state = reducer(initialState, { type: 'LOAD_SUCCESS', workbook, validation });
    state = reducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});

describe('reducer filter state (AD-3)', () => {
  const activeFilter: FilterState = { categories: { 'тип работы': ['Разработка'] } };

  it('SET_FILTER stores the filter state', () => {
    const state = reducer(loaded, { type: 'SET_FILTER', filterState: activeFilter });
    expect(state.filterState).toBe(activeFilter);
  });

  it('CLEAR_FILTERS empties the filters', () => {
    const filtered = reducer(loaded, { type: 'SET_FILTER', filterState: activeFilter });
    const cleared = reducer(filtered, { type: 'CLEAR_FILTERS' });
    expect(cleared.filterState.categories).toEqual({});
  });

  it('SET_SHEET clears filters when the sheet actually changes', () => {
    const filtered = reducer(loaded, { type: 'SET_FILTER', filterState: activeFilter });
    const switched = reducer(filtered, { type: 'SET_SHEET', sheetName: 'Итоги' });
    expect(switched.filterState.categories).toEqual({});
  });

  it('SET_SHEET keeps filters on a no-op (same sheet)', () => {
    const filtered = reducer(loaded, { type: 'SET_FILTER', filterState: activeFilter });
    expect(reducer(filtered, { type: 'SET_SHEET', sheetName: 'Данные' })).toBe(filtered);
  });

  it('LOAD_SUCCESS clears filters left over from a previous file', () => {
    const filtered = reducer(loaded, { type: 'SET_FILTER', filterState: activeFilter });
    const next = reducer(filtered, { type: 'LOAD_SUCCESS', workbook, validation });
    expect(next.filterState.categories).toEqual({});
  });
});
