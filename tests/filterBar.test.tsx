// @vitest-environment jsdom
import { act, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterOptions, FilterState } from '../src/domain/model';
import { FilterBar } from '../src/ui/components/FilterBar';

const OPTIONS: FilterOptions = {
  categories: [
    { column: 'статус', header: 'Статус', values: ['Готово', 'В работе'] },
    { column: 'тип работы', header: 'Тип работы', values: ['Разработка', 'Дизайн'] },
  ],
  date: null,
};

const OPTIONS_WITH_DATE: FilterOptions = {
  ...OPTIONS,
  date: { column: 'дата', header: 'Дата' },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Controlled like the store: selections flow back through `onSetFilter`. */
function Harness({ options, onClear }: { options: FilterOptions; onClear?: () => void }) {
  const [filterState, setFilterState] = useState<FilterState>({ categories: {} });
  return (
    <FilterBar
      options={options}
      filterState={filterState}
      onSetFilter={setFilterState}
      onClear={() => {
        onClear?.();
        setFilterState({ categories: {} });
      }}
    />
  );
}

function render(ui: ReactElement): void {
  act(() => {
    root.render(ui);
  });
}

function click(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function press(element: Element, key: string): void {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function chip(header: string): Element | undefined {
  return Array.from(container.querySelectorAll('.filter-chip')).find((element) =>
    element.textContent?.includes(header),
  );
}

function option(value: string): Element | undefined {
  return Array.from(container.querySelectorAll('.filter-option')).find(
    (element) => element.textContent === value,
  );
}

function clearButton(): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>('.filter-clear');
}

describe('FilterBar', () => {
  it('renders one chip per category and no menu until opened', () => {
    render(<Harness options={OPTIONS} />);
    expect(container.querySelectorAll('.filter-chip')).toHaveLength(2);
    expect(container.querySelector('.filter-menu')).toBeNull();
    expect(container.querySelector('.filter-date')).toBeNull();
  });

  it('opens a multiselect menu of the category values', () => {
    render(<Harness options={OPTIONS} />);

    const target = chip('Тип работы');
    if (!target) throw new Error('chip missing');
    click(target);

    const menu = container.querySelector('.filter-menu');
    expect(menu).not.toBeNull();
    // Honest semantics: a group of toggle buttons, not a listbox contract.
    expect(menu?.getAttribute('role')).toBe('group');
    expect(menu?.getAttribute('aria-label')).toBe('Значения: Тип работы');
    expect(menu?.getAttribute('aria-multiselectable')).toBeNull();
    // The chip discloses the menu it controls.
    expect(target.getAttribute('aria-haspopup')).toBe('true');
    expect(target.getAttribute('aria-controls')).toBe(menu?.id);
    expect(Array.from(container.querySelectorAll('.filter-option')).map((o) => o.textContent)).toEqual(
      ['Разработка', 'Дизайн'],
    );
  });

  it('toggles values within a category (OR) and marks the chip active', () => {
    render(<Harness options={OPTIONS} />);
    const target = chip('Тип работы');
    if (!target) throw new Error('chip missing');
    click(target);

    const first = option('Разработка');
    if (!first) throw new Error('option missing');
    click(first);

    expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(first.getAttribute('aria-selected')).toBeNull();
    expect(chip('Тип работы')?.classList.contains('is-active')).toBe(true);
    expect(container.querySelector('.filter-chip-count')?.textContent).toBe('1');

    const second = option('Дизайн');
    if (!second) throw new Error('option missing');
    click(second);
    expect(container.querySelector('.filter-chip-count')?.textContent).toBe('2');
  });

  it('«Сбросить» is disabled without filters, clears them, and notifies the parent', () => {
    const onClear = vi.fn();
    render(<Harness options={OPTIONS} onClear={onClear} />);

    expect(clearButton()?.disabled).toBe(true);

    const target = chip('Статус');
    if (!target) throw new Error('chip missing');
    click(target);
    const value = option('Готово');
    if (!value) throw new Error('option missing');
    click(value);

    expect(clearButton()?.disabled).toBe(false);

    const clear = clearButton();
    if (clear) click(clear);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(chip('Статус')?.classList.contains('is-active')).toBe(false);
    expect(clearButton()?.disabled).toBe(true);
  });

  it('Escape closes the open value menu and returns focus to the chip', () => {
    render(<Harness options={OPTIONS} />);
    const target = chip('Статус');
    if (!target) throw new Error('chip missing');
    click(target);
    expect(container.querySelector('.filter-menu')).not.toBeNull();

    const bar = container.querySelector('.filter-bar');
    if (bar) press(bar, 'Escape');
    expect(container.querySelector('.filter-menu')).toBeNull();
    expect(document.activeElement).toBe(chip('Статус'));
  });

  it('shows the date range only when a date column exists and records it', () => {
    render(<Harness options={OPTIONS_WITH_DATE} />);

    expect(container.querySelector('.filter-date')).not.toBeNull();
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.filter-date input'));
    expect(inputs).toHaveLength(2);

    const [from] = inputs;
    if (!from) throw new Error('date input missing');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      setter?.call(from, '2026-03-01');
      from.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(from.value).toBe('2026-03-01');
    expect(clearButton()?.disabled).toBe(false);
  });
});
