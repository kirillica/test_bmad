import type { ViewConfig } from '../../domain/model';
import { ru } from '../i18n/ru';

/** The four views in the contract's order (CAP-6, DESIGN.md view-switcher). */
const VIEW_TYPES: ViewConfig['chartType'][] = ['line', 'bar', 'pie', 'table'];

interface ViewSwitcherProps {
  value: ViewConfig['chartType'];
  onChange: (chartType: ViewConfig['chartType']) => void;
}

/**
 * The view switcher (CAP-6): a toggle-button group (`role="group"` +
 * `aria-pressed`, the same honest semantics as the filter chips). Switching a
 * view changes only `ViewConfig` in the store, never the filters (AD-13, UX IA).
 */
export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="view-switcher" role="group" aria-label={ru.viewLabel}>
      {VIEW_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`view-switcher-button${type === value ? ' is-active' : ''}`}
          aria-pressed={type === value}
          onClick={() => onChange(type)}
        >
          {ru.viewTypes[type]}
        </button>
      ))}
    </div>
  );
}
