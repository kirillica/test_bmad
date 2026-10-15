// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportMenu } from '../src/ui/components/ExportMenu';

/**
 * The chart card's «Экспорт…» menu (CAP-7). Closed by default; opening reveals
 * PNG/PDF, which can be disabled while the chart instance is not ready
 * (CHART_NOT_READY). Closes on Escape (focus returns to the button) and on a
 * click outside, mirroring `FilterBar` (A11y).
 */

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

function button(): HTMLButtonElement {
  const found = container.querySelector<HTMLButtonElement>('.export-button');
  if (!found) throw new Error('export button not found');
  return found;
}

function click(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function options(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('.export-option'));
}

describe('ExportMenu (CAP-7)', () => {
  it('is closed until toggled, then offers PNG and PDF', () => {
    act(() => {
      root.render(<ExportMenu disabled={false} disabledReason="не готов" onSelect={() => {}} />);
    });

    expect(container.querySelector('.export-menu')).toBeNull();
    expect(button().getAttribute('aria-expanded')).toBe('false');

    click(button());
    expect(container.querySelector('.export-menu')).not.toBeNull();
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((option) => option.textContent)).toEqual(['PNG', 'PDF']);
  });

  it('reports the chosen format and closes the menu', () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(<ExportMenu disabled={false} disabledReason="не готов" onSelect={onSelect} />);
    });

    click(button());
    const pdf = options().find((option) => option.textContent === 'PDF');
    if (!pdf) throw new Error('PDF option not found');
    click(pdf);

    expect(onSelect).toHaveBeenCalledWith('pdf');
    expect(container.querySelector('.export-menu')).toBeNull();
  });

  it('CHART_NOT_READY: the options are disabled and the reason is named', () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(
        <ExportMenu disabled disabledReason="График ещё строится" onSelect={onSelect} />,
      );
    });

    click(button());
    const rendered = options();
    expect(rendered).toHaveLength(2);
    for (const option of rendered) {
      expect(option.disabled).toBe(true);
      expect(option.getAttribute('title')).toBe('График ещё строится');
    }

    // A disabled option cannot report a selection.
    click(rendered[0]!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on Escape and returns focus to the button', () => {
    act(() => {
      root.render(<ExportMenu disabled={false} disabledReason="не готов" onSelect={() => {}} />);
    });

    click(button());
    expect(container.querySelector('.export-menu')).not.toBeNull();

    act(() => {
      container
        .querySelector('.export-menu-wrap')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container.querySelector('.export-menu')).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('closes on a click outside the menu', () => {
    act(() => {
      root.render(<ExportMenu disabled={false} disabledReason="не готов" onSelect={() => {}} />);
    });

    click(button());
    expect(container.querySelector('.export-menu')).not.toBeNull();

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(container.querySelector('.export-menu')).toBeNull();
  });
});
