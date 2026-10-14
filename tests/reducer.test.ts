import { describe, expect, it } from 'vitest';
import { createIssue } from '../src/domain/issues';
import type { ValidationResult, Workbook } from '../src/domain/model';
import { initialState, reducer } from '../src/ui/store/reducer';

const workbook: Workbook = { fileName: 'sample.xlsx', sheets: [], activeSheetName: '' };
const validation: ValidationResult = { status: 'ok', issues: [] };

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

  it('RESET clears everything', () => {
    let state = reducer(initialState, { type: 'LOAD_SUCCESS', workbook, validation });
    state = reducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});
