// @vitest-environment jsdom
import { act, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SurfaceTabs, type Surface } from '../src/ui/components/SurfaceTabs';
import { ru } from '../src/ui/i18n/ru';

/** Controlled like CurrentScreen: selections flow back through `onSelect`. */
function Harness({ analysisDisabled = false }: { analysisDisabled?: boolean }) {
  const [active, setActive] = useState<Surface>('data');
  return (
    <SurfaceTabs active={active} analysisDisabled={analysisDisabled} onSelect={setActive} />
  );
}

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

function render(ui: ReactElement): void {
  act(() => {
    root.render(ui);
  });
}

function press(element: Element, key: string): void {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function tabs(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('.surface-tab'));
}

function activeTab(): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>('.surface-tab.is-active');
}

describe('SurfaceTabs ARIA tabs pattern', () => {
  it('ArrowRight selects the next enabled tab, moves focus and the roving tabindex', () => {
    render(<Harness />);
    const [data, analysis] = tabs();
    if (!data || !analysis) throw new Error('tabs not rendered');
    expect(data.getAttribute('tabIndex')).toBe('0');
    expect(analysis.getAttribute('tabIndex')).toBe('-1');

    press(data, 'ArrowRight');

    expect(activeTab()?.textContent).toBe(ru.analysisTab);
    expect(activeTab()?.getAttribute('tabIndex')).toBe('0');
    expect(data.getAttribute('tabIndex')).toBe('-1');
    expect(document.activeElement).toBe(analysis);
  });

  it('ArrowLeft selects the previous tab and wraps around', () => {
    render(<Harness />);
    const [data, analysis] = tabs();
    if (!data || !analysis) throw new Error('tabs not rendered');

    press(data, 'ArrowLeft');
    expect(activeTab()?.textContent).toBe(ru.analysisTab);

    press(analysis, 'ArrowLeft');
    expect(activeTab()?.textContent).toBe(ru.dataTab);
  });

  it('Home and End jump to the first and last enabled tabs', () => {
    render(<Harness />);
    const [data, analysis] = tabs();
    if (!data || !analysis) throw new Error('tabs not rendered');

    press(data, 'End');
    expect(activeTab()?.textContent).toBe(ru.analysisTab);

    press(analysis, 'Home');
    expect(activeTab()?.textContent).toBe(ru.dataTab);
  });

  it('never lands on the disabled analysis tab', () => {
    render(<Harness analysisDisabled />);
    const [data, analysis] = tabs();
    if (!data || !analysis) throw new Error('tabs not rendered');
    expect(analysis.disabled).toBe(true);
    expect(analysis.getAttribute('aria-selected')).toBe('false');
    expect(analysis.getAttribute('tabIndex')).toBe('-1');

    // With a single enabled tab, every arrow/home/end stays on «Данные».
    press(data, 'ArrowRight');
    expect(activeTab()?.textContent).toBe(ru.dataTab);
    press(data, 'ArrowLeft');
    expect(activeTab()?.textContent).toBe(ru.dataTab);
    press(data, 'Home');
    expect(activeTab()?.textContent).toBe(ru.dataTab);
    press(data, 'End');
    expect(activeTab()?.textContent).toBe(ru.dataTab);

    expect(data.getAttribute('tabIndex')).toBe('0');
    expect(document.activeElement).toBe(data);
  });
});
