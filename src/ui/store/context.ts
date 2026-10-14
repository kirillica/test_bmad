import { createContext, useContext } from 'react';
import type { StoreState } from './reducer';

export interface StoreApi {
  state: StoreState;
  loadFile: (file: File) => Promise<void>;
  setActiveSheet: (sheetName: string) => void;
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
