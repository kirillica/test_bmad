import type { Theme } from '../../app/theme';
import { useWorkbookStore } from '../store/context';
import { ru } from '../i18n/ru';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const { state, reset } = useWorkbookStore();
  // While a load is in flight, surface the file being processed, not the stale one.
  const shownName = state.pendingFileName ?? state.fileName;

  return (
    <header className="app-header">
      <span className="brand">{ru.appTitle}</span>
      <div className="header-actions">
        {shownName ? (
          <span className="file-pill" title={shownName}>
            {shownName}
          </span>
        ) : null}
        {state.fileName ? (
          <button type="button" className="btn" onClick={reset}>
            {ru.newFile}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'light' ? ru.themeToDark : ru.themeToLight}
        >
          {theme === 'light' ? ru.themeToDark : ru.themeToLight}
        </button>
      </div>
    </header>
  );
}
