import { useEffect, useState } from 'react';
import { Header } from '../ui/components/Header';
import { UploadScreen } from '../ui/screens/UploadScreen';
import { WorkbookStoreProvider } from '../ui/store/workbook-store';
import { applyTheme, getInitialTheme, storeTheme, type Theme } from './theme';

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
        <UploadScreen />
      </main>
    </WorkbookStoreProvider>
  );
}
