// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewSwitcher } from '../src/ui/components/ViewSwitcher';

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

function buttons(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('.view-switcher-button'));
}

describe('ViewSwitcher (CAP-6)', () => {
  it('renders the four contract views as a toggle-button group', () => {
    act(() => {
      root.render(<ViewSwitcher value="bar" onChange={() => {}} />);
    });

    const group = container.querySelector('.view-switcher');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Представление');
    expect(buttons().map((button) => button.textContent)).toEqual([
      'Линейный',
      'Столбчатый',
      'Круговой',
      'Таблица',
    ]);

    const pressed = buttons().filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.textContent).toBe('Столбчатый');
  });

  it('reports the chosen view', () => {
    const onChange = vi.fn();
    act(() => {
      root.render(<ViewSwitcher value="bar" onChange={onChange} />);
    });

    const pie = buttons().find((button) => button.textContent === 'Круговой');
    if (!pie) throw new Error('pie button not found');
    act(() => {
      pie.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith('pie');
  });
});

