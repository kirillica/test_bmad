// @vitest-environment jsdom
import { act, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Pagination } from '../src/ui/components/Pagination';

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

/** Owns the page state like the real screen does, so navigation flows through props. */
function Harness({
  initialPage = 1,
  pageCount = 13,
  pageSize = 50,
  total = 626,
}: {
  initialPage?: number;
  pageCount?: number;
  pageSize?: number;
  total?: number;
}) {
  const [page, setPage] = useState(initialPage);
  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      pageSize={pageSize}
      total={total}
      onPageChange={setPage}
    />
  );
}

function render(ui: ReactElement): void {
  act(() => {
    root.render(ui);
  });
}

function button(label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('.pagination-button')).find(
    (element) => element.textContent === label,
  );
}

function click(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function pageInput(): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>('.pagination-input');
}

/** Sets a controlled input's value the way a user would (React value tracker aware). */
function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function press(input: HTMLInputElement, key: string): void {
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

describe('Pagination', () => {
  it('shows the visible row range, the jump field and the page count', () => {
    render(<Harness />);

    expect(container.textContent).toContain('Строки 1–50 из 626');
    expect(container.textContent).toContain('из 13');
    expect(pageInput()?.value).toBe('1');
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Постраничная навигация',
    );
  });

  it('disables «Назад» on the first page and enables «Вперёд»', () => {
    render(<Harness />);

    expect(button('Назад')?.disabled).toBe(true);
    expect(button('Вперёд')?.disabled).toBe(false);
  });

  it('moves to the next page and repaints the range', () => {
    render(<Harness />);

    const next = button('Вперёд');
    if (next) click(next);

    expect(container.textContent).toContain('Строки 51–100 из 626');
    expect(pageInput()?.value).toBe('2');
  });

  it('disables «Вперёд» on the last page and shows the remainder', () => {
    render(<Harness initialPage={13} />);

    expect(container.textContent).toContain('Строки 601–626 из 626');
    expect(button('Вперёд')?.disabled).toBe(true);
    expect(button('Назад')?.disabled).toBe(false);
  });

  it('jumps to an arbitrary page from the number field', () => {
    render(<Harness />);

    const input = pageInput();
    if (!input) return;
    typeInto(input, '5');
    press(input, 'Enter');

    expect(container.textContent).toContain('Строки 201–250 из 626');
    expect(pageInput()?.value).toBe('5');
  });

  it('clamps an out-of-range page and ignores a non-number', () => {
    render(<Harness />);

    const input = pageInput();
    if (!input) return;

    typeInto(input, '999');
    press(input, 'Enter');
    expect(container.textContent).toContain('Строки 601–626 из 626');

    const last = pageInput();
    if (!last) return;
    typeInto(last, 'abc');
    press(last, 'Enter');
    // Unparseable input keeps the current page and restores the field.
    expect(last.value).toBe('13');
    expect(container.textContent).toContain('Строки 601–626 из 626');
  });

  it('groups large totals the ru-RU way', () => {
    render(<Harness total={30000} pageCount={600} />);

    const grouped = new Intl.NumberFormat('ru-RU').format(30000);
    expect(container.textContent).toContain(`Строки 1–50 из ${grouped}`);
  });
});
