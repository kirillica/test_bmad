import { useEffect, useState } from 'react';
import { Header } from '../ui/components/Header';
import { DataScreen } from '../ui/screens/DataScreen';
import { UploadScreen } from '../ui/screens/UploadScreen';
import { useWorkbookStore } from '../ui/store/context';
import { WorkbookStoreProvider } from '../ui/store/workbook-store';
import { applyTheme, getInitialTheme, storeTheme, type Theme } from './theme';

/**
 * Surface routing (UX IA): a loaded workbook moves the app to U2 «Данные»;
 * otherwise U1 «Загрузка» is shown. RESET drops back to U1.
 */
export function CurrentScreen() {
  const { state } = useWorkbookStore();
  return state.workbook ? <DataScreen /> : <UploadScreen />;
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
