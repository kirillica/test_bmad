import { useRef, type KeyboardEvent } from 'react';
import { ru } from '../i18n/ru';
import { SURFACE_PANEL_ID, surfaceTabId } from './surfaceTabsIds';

/** The two loaded-workbook surfaces (UX IA): U2 «Данные» and U3 «Анализ». */
export type Surface = 'data' | 'analysis';

interface SurfaceTabsProps {
  active: Surface;
  /** U3 is unavailable for a sheet without data rows (EMPTY_SHEET). */
  analysisDisabled: boolean;
  onSelect: (surface: Surface) => void;
}

/**
 * Surface tabs above U2/U3. Implements the ARIA tabs keyboard pattern (roving
 * tabindex, Arrow/Home/End) over the enabled tabs; the disabled analysis tab is
 * skipped so keyboard users can never land on it.
 */
export function SurfaceTabs({ active, analysisDisabled, onSelect }: SurfaceTabsProps) {
  const tabs = [
    { id: 'data' as const, label: ru.dataTab, disabled: false },
    { id: 'analysis' as const, label: ru.analysisTab, disabled: analysisDisabled },
  ];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabled = tabs.filter((tab) => !tab.disabled);
  const currentIndex = Math.max(
    0,
    enabled.findIndex((tab) => tab.id === active),
  );

  const moveTo = (index: number) => {
    if (enabled.length === 0) return;
    const target = enabled[(index + enabled.length) % enabled.length];
    if (!target) return;
    onSelect(target.id);
    const position = tabs.findIndex((tab) => tab.id === target.id);
    tabRefs.current[position]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTo(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTo(enabled.length - 1);
    }
  };

  return (
    <div className="surface-tabs" role="tablist" aria-label={ru.surfacesLabel}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={surfaceTabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={SURFACE_PANEL_ID}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            className={`surface-tab${isActive ? ' is-active' : ''}`}
            onClick={() => onSelect(tab.id)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
