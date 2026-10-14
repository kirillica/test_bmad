import type { Issue, ValidationResult, Workbook } from '../../domain/model';

export type LoadStatus = 'empty' | 'loading' | 'loaded' | 'error';

export interface StoreState {
  status: LoadStatus;
  fileName: string | null;
  pendingFileName: string | null;
  workbook: Workbook | null;
  validation: ValidationResult | null;
  errorIssues: Issue[];
}

export const initialState: StoreState = {
  status: 'empty',
  fileName: null,
  pendingFileName: null,
  workbook: null,
  validation: null,
  errorIssues: [],
};

export type StoreAction =
  | { type: 'LOAD_START'; fileName: string }
  | { type: 'LOAD_SUCCESS'; workbook: Workbook; validation: ValidationResult }
  | { type: 'LOAD_ERROR'; issues: Issue[] }
  | { type: 'SET_SHEET'; sheetName: string }
  | { type: 'RESET' };

/**
 * Pure reducer. Loads are atomic: on failure the previously loaded workbook is
 * left untouched and only the error is surfaced (AD-17).
 */
export function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading', pendingFileName: action.fileName, errorIssues: [] };
    case 'LOAD_SUCCESS':
      return {
        status: 'loaded',
        fileName: action.workbook.fileName,
        pendingFileName: null,
        workbook: action.workbook,
        validation: action.validation,
        errorIssues: [],
      };
    case 'LOAD_ERROR':
      return {
        ...state,
        status: state.workbook ? 'loaded' : 'error',
        pendingFileName: null,
        errorIssues: action.issues,
      };
    case 'SET_SHEET': {
      // Sheet switching only selects among the visible sheets already in the
      // workbook; hidden/unknown names and no-ops leave the state untouched (AD-3).
      const workbook = state.workbook;
      if (!workbook) return state;
      const target = workbook.sheets.find((sheet) => sheet.name === action.sheetName);
      if (!target || target.hidden || target.name === workbook.activeSheetName) return state;
      return { ...state, workbook: { ...workbook, activeSheetName: target.name } };
    }
    case 'RESET':
      return { ...initialState, errorIssues: [] };
    default:
      return state;
  }
}
