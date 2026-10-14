import { createContext, useContext } from 'react';
import type { FilterOptions, FilterState, RowSet } from '../../domain/model';
import type { StoreState } from './reducer';

export interface StoreApi {
  state: StoreState;
  /** Derived once by the store from the active sheet and filters (AD-12). */
  rowSet: RowSet;
  /** Filter controls of the active sheet (categories + optional date). */
  filterOptions: FilterOptions;
  loadFile: (file: File) => Promise<void>;
  setActiveSheet: (sheetName: string) => void;
  setFilter: (filterState: FilterState) => void;
  clearFilters: () => void;
  reset: () => void;
}

export const StoreContext = createContext<StoreApi | null>(null);

export function useWorkbookStore(): StoreApi {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useWorkbookStore must be used within WorkbookStoreProvider');
  }
  return context;
}
