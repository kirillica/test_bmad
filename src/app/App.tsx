import { useEffect, useState } from 'react';
import { Header } from '../ui/components/Header';
import { SurfaceTabs, type Surface } from '../ui/components/SurfaceTabs';
import { SURFACE_PANEL_ID, surfaceTabId } from '../ui/components/surfaceTabsIds';
import { AnalysisScreen } from '../ui/screens/AnalysisScreen';
import { DataScreen } from '../ui/screens/DataScreen';
import { UploadScreen } from '../ui/screens/UploadScreen';
import { useWorkbookStore } from '../ui/store/context';
import { WorkbookStoreProvider } from '../ui/store/workbook-store';
import { applyTheme, getInitialTheme, storeTheme, type Theme } from './theme';

/**
 * Surface routing (UX IA): a loaded workbook moves the app to U2/U3 «Данные» /
 * «Анализ» behind surface tabs; otherwise U1 «Загрузка» is shown. RESET drops
 * back to U1. Filters live in the store, so U2↔U3 keeps them (UX IA).
 */
export function CurrentScreen() {
  const { state, rowSet } = useWorkbookStore();
  const fileName = state.workbook?.fileName ?? null;
  const [view, setView] = useState<{ fileName: string | null; surface: Surface }>({
    fileName,
    surface: 'data',
  });

  // A new file starts on U2; switching worksheets never changes the surface.
  if (view.fileName !== fileName) {
    setView({ fileName, surface: 'data' });
  }

  if (!state.workbook) return <UploadScreen />;

  const analysisDisabled = rowSet.total === 0;
  const surface = view.fileName === fileName ? view.surface : 'data';

  return (
    <div className="workbook-screen">
      <SurfaceTabs
        active={surface}
        analysisDisabled={analysisDisabled}
        onSelect={(next) => setView({ fileName, surface: next })}
      />
      <div
        id={SURFACE_PANEL_ID}
        className="surface-panel"
        role="tabpanel"
        aria-labelledby={surfaceTabId(surface)}
        tabIndex={0}
      >
        {surface === 'analysis' ? <AnalysisScreen /> : <DataScreen />}
      </div>
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  // A file dropped outside the zone must not navigate the browser to that file.
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <WorkbookStoreProvider>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      />
      <main className="app-main">
        <CurrentScreen />
      </main>
    </WorkbookStoreProvider>
  );
}
