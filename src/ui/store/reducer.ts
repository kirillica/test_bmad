import type { FilterState, Issue, ValidationResult, Workbook } from '../../domain/model';

export type LoadStatus = 'empty' | 'loading' | 'loaded' | 'error';

export interface StoreState {
  status: LoadStatus;
  fileName: string | null;
  pendingFileName: string | null;
  workbook: Workbook | null;
  validation: ValidationResult | null;
  errorIssues: Issue[];
  filterState: FilterState;
}

/** A fresh, empty filter set. A new object each time keeps references immutable. */
function emptyFilter(): FilterState {
  return { categories: {} };
}

export const initialState: StoreState = {
  status: 'empty',
  fileName: null,
  pendingFileName: null,
  workbook: null,
  validation: null,
  errorIssues: [],
  filterState: emptyFilter(),
};

export type StoreAction =
  | { type: 'LOAD_START'; fileName: string }
  | { type: 'LOAD_SUCCESS'; workbook: Workbook; validation: ValidationResult }
  | { type: 'LOAD_ERROR'; issues: Issue[] }
  | { type: 'SET_SHEET'; sheetName: string }
  | { type: 'SET_FILTER'; filterState: FilterState }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'RESET' };

/**
 * Pure reducer. Loads are atomic: on failure the previously loaded workbook is
 * left untouched and only the error is surfaced (AD-17). Filters belong to the
 * (workbook, sheet) context, so a new file or another sheet clears them (AD-3).
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
        filterState: emptyFilter(),
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
      return {
        ...state,
        workbook: { ...workbook, activeSheetName: target.name },
        filterState: emptyFilter(),
      };
    }
    case 'SET_FILTER':
      return { ...state, filterState: action.filterState };
    case 'CLEAR_FILTERS':
      return { ...state, filterState: emptyFilter() };
    case 'RESET':
      return { ...initialState, errorIssues: [], filterState: emptyFilter() };
    default:
      return state;
  }
}
