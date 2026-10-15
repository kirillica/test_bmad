import { useCallback, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type {
  AggregationResult,
  FilterOptions,
  FilterState,
  RowSet,
  ViewConfig,
  ViewOptions,
} from '../../domain/model';
import { createIssue } from '../../domain/issues';
import { analyzeWorkbook } from '../../domain/pipeline/validateStructure';
import { applyFilter, buildFilterOptions } from '../../domain/pipeline/applyFilter';
import { aggregate, buildViewOptions, defaultViewConfig } from '../../domain/pipeline/aggregate';
import { selectActiveSheet } from '../../domain/pipeline/selectActiveSheet';
import { loadWorkbookFile, readFileBytes } from '../../adapters/file-source';
import { parseWorkbook } from '../../adapters/spreadsheet';
import { StoreContext, type StoreApi } from './context';
import { initialState, reducer } from './reducer';

const EMPTY_ROW_SET: RowSet = { rows: [], total: 0 };
const EMPTY_FILTER_OPTIONS: FilterOptions = { categories: [], date: null };
const EMPTY_VIEW_OPTIONS: ViewOptions = { dimensions: [], measures: [] };

export function WorkbookStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Monotonic id so a slower earlier load can never overwrite a newer one (AD-17).
  const requestId = useRef(0);

  // The store is the single owner of derived analytics state (AD-12): the
  // filter/view options come from the active sheet, `rowSet` and `viewConfig`
  // resolve it further (filters, sheet default) and `aggregation` is derived
  // once from `(active sheet, rowSet, viewConfig)`. Components only read them.
  const activeSheet = state.workbook ? selectActiveSheet(state.workbook) : null;
  const filterOptions = useMemo(
    () => (activeSheet ? buildFilterOptions(activeSheet) : EMPTY_FILTER_OPTIONS),
    [activeSheet],
  );
  const rowSet = useMemo<RowSet>(
    () => (activeSheet ? applyFilter(activeSheet, state.filterState) : EMPTY_ROW_SET),
    [activeSheet, state.filterState],
  );
  const viewOptions = useMemo<ViewOptions>(
    () => (activeSheet ? buildViewOptions(activeSheet) : EMPTY_VIEW_OPTIONS),
    [activeSheet],
  );
  // The resolved view: the stored user choice if still valid, else the default
  // for the active sheet (AD-13). `null` means the sheet offers no view.
  const viewConfig = useMemo<ViewConfig | null>(
    () => defaultViewConfig(viewOptions, state.viewConfig),
    [viewOptions, state.viewConfig],
  );
  const aggregation = useMemo<AggregationResult | null>(
    () => (activeSheet && viewConfig ? aggregate(activeSheet, rowSet, viewConfig) : null),
    [activeSheet, rowSet, viewConfig],
  );

  const setView = useCallback((viewConfig: ViewConfig) => {
    dispatch({ type: 'SET_VIEW', viewConfig });
  }, []);

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
      activeSheet,
      rowSet,
      filterOptions,
      viewOptions,
      viewConfig,
      aggregation,
      loadFile,
      setActiveSheet,
      setFilter,
      clearFilters,
      setView,
      reset,
    }),
    [
      state,
      activeSheet,
      rowSet,
      filterOptions,
      viewOptions,
      viewConfig,
      aggregation,
      loadFile,
      setActiveSheet,
      setFilter,
      clearFilters,
      setView,
      reset,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
