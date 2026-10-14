import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { FilterOptions, FilterState } from '../../domain/model';
import { isFilterActive } from '../../domain/pipeline/applyFilter';
import { normalizeHeader } from '../../domain/schema';
import { ru } from '../i18n/ru';

interface FilterBarProps {
  options: FilterOptions;
  filterState: FilterState;
  onSetFilter: (filterState: FilterState) => void;
  onClear: () => void;
}

function selectedValues(filterState: FilterState, column: string): string[] {
  return filterState.categories[column] ?? [];
}

/**
 * Filter controls for U3 (CAP-5): multi-select category chips with value menus,
 * an optional «Дата» range (present only when a date column was detected), and a
 * one-click «Сбросить». Value identity is normalization-based (AD-6).
 */
export function FilterBar({ options, filterState, onSetFilter, onClear }: FilterBarProps) {
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Close an open value menu when the user clicks outside the bar (Esc also works).
  useEffect(() => {
    if (openColumn === null) return;
    const close = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpenColumn(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openColumn]);

  const toggleValue = (column: string, value: string) => {
    const current = selectedValues(filterState, column);
    const key = normalizeHeader(value);
    const next = has(current, key)
      ? current.filter((selected) => normalizeHeader(selected) !== key)
      : [...current, value];

    const categories = { ...filterState.categories };
    if (next.length > 0) categories[column] = next;
    else delete categories[column];
    onSetFilter({ ...filterState, categories });
  };

  const updateDate = (patch: Partial<{ from: string; to: string }>) => {
    const next = { ...(filterState.dateRange ?? { from: '', to: '' }), ...patch };
    if (next.from === '' && next.to === '') {
      onSetFilter({ categories: filterState.categories });
      return;
    }
    onSetFilter({ categories: filterState.categories, dateRange: next });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || openColumn === null) return;
    // Escape closes the menu and hands focus back to the chip that opened it.
    setOpenColumn(null);
    chipRefs.current[openColumn]?.focus();
  };

  return (
    <div
      className="filter-bar"
      ref={barRef}
      role="group"
      aria-label={ru.filtersLabel}
      onKeyDown={handleKeyDown}
    >
      <div className="filter-chips">
        {options.categories.map((option, index) => {
          const selected = selectedValues(filterState, option.column);
          const isOpen = openColumn === option.column;
          const menuId = `filter-menu-${index}`;
          const label =
            selected.length > 0
              ? `${option.header}, ${ru.selectedCount(selected.length)}`
              : option.header;

          return (
            <div className="filter-chip-wrap" key={option.column}>
              <button
                type="button"
                ref={(element) => {
                  chipRefs.current[option.column] = element;
                }}
                className={`filter-chip${selected.length > 0 ? ' is-active' : ''}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-label={label}
                onClick={() => setOpenColumn(isOpen ? null : option.column)}
              >
                {option.header}
                {selected.length > 0 ? (
                  <span className="filter-chip-count" aria-hidden="true">
                    {selected.length}
                  </span>
                ) : null}
              </button>

              {isOpen ? (
                <ul
                  id={menuId}
                  className="filter-menu"
                  role="group"
                  aria-label={ru.filterValuesLabel(option.header)}
                >
                  {option.values.map((value) => {
                    const isSelected = has(selected, normalizeHeader(value));
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          className={`filter-option${isSelected ? ' is-selected' : ''}`}
                          onClick={() => toggleValue(option.column, value)}
                        >
                          {value}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      {options.date ? (
        <div className="filter-date">
          <span className="filter-date-label">{ru.dateSectionLabel}</span>
          <label className="filter-date-field">
            <span>{ru.dateFrom}</span>
            <input
              type="date"
              value={filterState.dateRange?.from ?? ''}
              onChange={(event) => updateDate({ from: event.currentTarget.value })}
            />
          </label>
          <label className="filter-date-field">
            <span>{ru.dateTo}</span>
            <input
              type="date"
              value={filterState.dateRange?.to ?? ''}
              onChange={(event) => updateDate({ to: event.currentTarget.value })}
            />
          </label>
        </div>
      ) : null}

      <button
        type="button"
        className="btn filter-clear"
        onClick={onClear}
        disabled={!isFilterActive(filterState)}
      >
        {ru.clearFilters}
      </button>
    </div>
  );
}

/** Membership by normalized identity, so «Готово» and «готово» are one value. */
function has(values: string[], normalized: string): boolean {
  return values.some((value) => normalizeHeader(value) === normalized);
}
