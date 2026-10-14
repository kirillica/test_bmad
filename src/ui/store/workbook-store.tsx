import { useCallback, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { FilterOptions, FilterState, RowSet } from '../../domain/model';
import { createIssue } from '../../domain/issues';
import { analyzeWorkbook } from '../../domain/pipeline/validateStructure';
import { applyFilter, buildFilterOptions } from '../../domain/pipeline/applyFilter';
import { selectActiveSheet } from '../../domain/pipeline/selectActiveSheet';
import { loadWorkbookFile, readFileBytes } from '../../adapters/file-source';
import { parseWorkbook } from '../../adapters/spreadsheet';
import { StoreContext, type StoreApi } from './context';
import { initialState, reducer } from './reducer';

const EMPTY_ROW_SET: RowSet = { rows: [], total: 0 };
const EMPTY_FILTER_OPTIONS: FilterOptions = { categories: [], date: null };

export function WorkbookStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Monotonic id so a slower earlier load can never overwrite a newer one (AD-17).
  const requestId = useRef(0);

  // The store is the single owner of derived analytics state (AD-12): both are
  // computed from (active sheet, filterState) and only read by components.
  const activeSheet = state.workbook ? selectActiveSheet(state.workbook) : null;
  const filterOptions = useMemo(
    () => (activeSheet ? buildFilterOptions(activeSheet) : EMPTY_FILTER_OPTIONS),
    [activeSheet],
  );
  const rowSet = useMemo<RowSet>(
    () => (activeSheet ? applyFilter(activeSheet, state.filterState) : EMPTY_ROW_SET),
    [activeSheet, state.filterState],
  );

  const loadFile = useCallback(async (file: File) => {
    const id = (requestId.current += 1);
    dispatch({ type: 'LOAD_START', fileName: file.name });

    try {
      const loaded = await loadWorkbookFile(file.name, () => readFileBytes(file), {
        parse: parseWorkbook,
      });
      if (id !== requestId.current) return;

      if (!loaded.ok) {
        dispatch({ type: 'LOAD_ERROR', issues: loaded.issues });
        return;
      }

      const { workbook, validation } = analyzeWorkbook(loaded.workbook);
      if (id !== requestId.current) return;

      if (validation.status === 'blocked') {
        // Only blocking issues belong in the error banner; warnings are not errors.
        dispatch({
          type: 'LOAD_ERROR',
          issues: validation.issues.filter((issue) => issue.severity === 'blocking'),
        });
        return;
      }

      dispatch({ type: 'LOAD_SUCCESS', workbook, validation });
    } catch (error) {
      if (id !== requestId.current) return;
      console.error('loadFile: непредвиденная ошибка', error);
      dispatch({ type: 'LOAD_ERROR', issues: [createIssue('CORRUPT_FILE')] });
    }
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const setActiveSheet = useCallback(
    (sheetName: string) => dispatch({ type: 'SET_SHEET', sheetName }),
    [],
  );

  const setFilter = useCallback(
    (filterState: FilterState) => dispatch({ type: 'SET_FILTER', filterState }),
    [],
  );

  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);

  const value = useMemo<StoreApi>(
    () => ({
      state,
      rowSet,
      filterOptions,
      loadFile,
      setActiveSheet,
      setFilter,
      clearFilters,
      reset,
    }),
    [state, rowSet, filterOptions, loadFile, setActiveSheet, setFilter, clearFilters, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
