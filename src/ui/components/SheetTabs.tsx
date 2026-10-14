import { useRef, type KeyboardEvent } from 'react';
import type { Sheet } from '../../domain/model';
import { ru } from '../i18n/ru';
import { SHEET_PANEL_ID, sheetTabId } from './sheetTabsIds';

interface SheetTabsProps {
  sheets: Sheet[];
  activeSheetName: string;
  onSelect: (sheetName: string) => void;
}

/**
 * Visible-sheet tabs (CAP-3). Hidden sheets are never offered; a workbook with a
 * single visible sheet renders no tabs at all (SINGLE_SHEET). Implements the ARIA
 * tabs keyboard pattern: roving tabindex plus Arrow/Home/End navigation.
 */
export function SheetTabs({ sheets, activeSheetName, onSelect }: SheetTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visible = sheets.filter((sheet) => !sheet.hidden);
  if (visible.length <= 1) return null;

  const foundIndex = visible.findIndex((sheet) => sheet.name === activeSheetName);
  const currentIndex = foundIndex >= 0 ? foundIndex : 0;

  const moveTo = (index: number) => {
    const next = (index + visible.length) % visible.length;
    const target = visible[next];
    if (!target) return;
    onSelect(target.name);
    tabRefs.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveTo(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveTo(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(visible.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="sheet-tabs" role="tablist" aria-label={ru.sheetsLabel}>
      {visible.map((sheet, index) => {
        const active = index === currentIndex;
        return (
          <button
            key={sheet.name}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={sheetTabId(index)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={SHEET_PANEL_ID}
            tabIndex={active ? 0 : -1}
            className={`sheet-tab${active ? ' is-active' : ''}`}
            onClick={() => onSelect(sheet.name)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {sheet.name}
          </button>
        );
      })}
    </div>
  );
}
