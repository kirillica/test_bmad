import { useCallback, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { createIssue } from '../../domain/issues';
import { analyzeWorkbook } from '../../domain/pipeline/validateStructure';
import { loadWorkbookFile, readFileBytes } from '../../adapters/file-source';
import { parseWorkbook } from '../../adapters/spreadsheet';
import { StoreContext, type StoreApi } from './context';
import { initialState, reducer } from './reducer';

export function WorkbookStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Monotonic id so a slower earlier load can never overwrite a newer one (AD-17).
  const requestId = useRef(0);

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

  const value = useMemo<StoreApi>(
    () => ({ state, loadFile, setActiveSheet, reset }),
    [state, loadFile, setActiveSheet, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
