import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chart } from 'chart.js/auto';
import type { AggregationResult } from '../src/domain/model';
import { ChartCard, type ChartExportResult } from '../src/ui/components/ChartCard';

/**
 * The real Chart.js lifecycle can only run in a browser: jsdom has no `<canvas>`.
 * Covers AD-19 — one canvas / one instance per chart view, updated in place on
 * data and theme changes and destroyed on unmount.
 */

const AGGREGATION: AggregationResult = {
  groupBy: 'исполнитель',
  measure: 'затрачено времени (ч)',
  buckets: [
    { key: 'Иванов', sum: 4, count: 2 },
    { key: 'Петров', sum: 2, count: 1 },
  ],
  total: 6,
};

let container: HTMLDivElement;
let root: Root;
let mounted = true;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mounted = true;
});

afterEach(() => {
  if (mounted) {
    act(() => {
      root.unmount();
    });
  }
  container.remove();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--chart-1');
});

/** The rendered kind; Chart.js's `config.type` sits on a union in the typings. */
function kindOf(canvas: HTMLCanvasElement): string | undefined {
  return (Chart.getChart(canvas)?.config as { type?: string } | undefined)?.type;
}

const PDF_TEXTS = {
  filters: 'Фильтры: не заданы',
  rowsCount: '2 строки',
  date: '2026-10-15',
};

/** A no-op result sink; export tests capture into their own spy instead. */
function noopResult(): void {}

function render(chartType: 'line' | 'bar' | 'pie', aggregation: AggregationResult): void {
  act(() => {
    root.render(
      <ChartCard
        chartType={chartType}
        aggregation={aggregation}
        dimensionHeader="Исполнитель"
        measureHeader="Затрачено времени (ч)"
        pdfTexts={PDF_TEXTS}
        onExportResult={noopResult}
      />,
    );
  });
}

describe('ChartCard (browser, AD-19)', () => {
  it('keeps exactly one live instance under StrictMode (AD-19)', async () => {
    act(() => {
      root.render(
        <StrictMode>
          <ChartCard
            chartType="bar"
            aggregation={AGGREGATION}
            dimensionHeader="Исполнитель"
            measureHeader="Затрачено времени (ч)"
            pdfTexts={PDF_TEXTS}
            onExportResult={noopResult}
          />
        </StrictMode>,
      );
    });

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });
    // The double mount must not leave two instances on one canvas.
    expect(Object.keys(Chart.instances)).toHaveLength(1);
    expect(Chart.getChart(canvas)).toBeDefined();
  });

  it('paints one canvas with the series and an accessible label', async () => {
    act(() => {
      root.render(
        <ChartCard
          chartType="bar"
          aggregation={AGGREGATION}
          dimensionHeader="Исполнитель"
          measureHeader="Затрачено времени (ч)"
          pdfTexts={PDF_TEXTS}
          onExportResult={noopResult}
        />,
      );
    });

    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toContain('Столбчатый');
    expect(canvas.getAttribute('aria-label')).toContain('Исполнитель');

    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });
    const chart = Chart.getChart(canvas);
    expect(chart?.data.labels).toEqual(['Иванов', 'Петров']);
    expect(chart?.data.datasets[0]?.data).toEqual([4, 2]);
  });

  it('recolors on a theme switch without recreating the instance (AD-19)', async () => {
    render('bar', AGGREGATION);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });
    const first = Chart.getChart(canvas);

    await act(async () => {
      document.documentElement.style.setProperty('--chart-1', '#123456');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await vi.waitFor(() => {
      const colors = Chart.getChart(canvas)?.data.datasets[0]?.backgroundColor as
        | string[]
        | undefined;
      expect(colors?.[0]).toBe('#123456');
    });
    // Same live instance — the theme change updated it in place.
    expect(Chart.getChart(canvas)).toBe(first);
  });

  it('updates the live instance when the data changes', async () => {
    render('bar', AGGREGATION);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });
    const first = Chart.getChart(canvas);

    render('bar', {
      ...AGGREGATION,
      buckets: [{ key: 'Сидоров', sum: 9, count: 3 }],
      total: 9,
    });

    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)?.data.labels).toEqual(['Сидоров']);
    });
    expect(Chart.getChart(canvas)).toBe(first);
  });

  it('replaces the instance when the kind changes, keeping one live canvas (AD-19)', async () => {
    render('bar', AGGREGATION);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });
    const bar = Chart.getChart(canvas);

    render('pie', AGGREGATION);
    await vi.waitFor(() => {
      expect(kindOf(canvas)).toBe('pie');
    });
    // Chart.js cannot mutate `type`: the bar instance is destroyed, not leaked.
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(Object.keys(Chart.instances)).toHaveLength(1);
    expect(Chart.getChart(canvas)).not.toBe(bar);
    expect(Chart.getChart(canvas)?.data.labels).toEqual(['Иванов', 'Петров']);
    expect(Chart.getChart(canvas)?.data.datasets[0]?.data).toEqual([4, 2]);

    render('line', AGGREGATION);
    await vi.waitFor(() => {
      expect(kindOf(canvas)).toBe('line');
    });
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(Object.keys(Chart.instances)).toHaveLength(1);
  });

  it('destroys the instance on unmount', async () => {
    render('pie', AGGREGATION);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });

    act(() => {
      root.unmount();
    });
    mounted = false;

    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeUndefined();
    });
  });
});

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Export reads the live canvas and reports the artifact through the prop. */
describe('ChartCard export (browser, CAP-7)', () => {
  function click(element: Element): void {
    act(() => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  function menuButton(): HTMLButtonElement {
    const found = container.querySelector<HTMLButtonElement>('.export-button');
    if (!found) throw new Error('export button not found');
    return found;
  }

  function optionByLabel(label: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('.export-option')).find(
      (option) => option.textContent === label,
    );
  }

  function renderWithResult(onExportResult: (result: ChartExportResult) => void): void {
    act(() => {
      root.render(
        <ChartCard
          chartType="bar"
          aggregation={AGGREGATION}
          dimensionHeader="Исполнитель"
          measureHeader="Затрачено времени (ч)"
          pdfTexts={PDF_TEXTS}
          onExportResult={onExportResult}
        />,
      );
    });
  }

  /** Opens the menu and waits until the chart instance is ready (options enabled). */
  async function waitForReady(canvas: HTMLCanvasElement): Promise<void> {
    await vi.waitFor(() => {
      expect(Chart.getChart(canvas)).toBeTruthy();
    });
    await vi.waitFor(() => {
      if (!container.querySelector('.export-menu')) click(menuButton());
      expect(optionByLabel('PNG')?.disabled).toBe(false);
    });
  }

  it('exports the live canvas as PNG bytes', async () => {
    const onExportResult = vi.fn();
    renderWithResult(onExportResult);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    await waitForReady(canvas);

    const png = optionByLabel('PNG');
    if (!png) throw new Error('PNG option not found');
    click(png);

    expect(onExportResult).toHaveBeenCalledTimes(1);
    const result = onExportResult.mock.calls[0]?.[0] as ChartExportResult;
    expect(result.kind).toBe('png');
    expect(result.ok).toBe(true);
    const blob = result.blob;
    if (!blob) throw new Error('PNG blob not produced');
    const view = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(view.slice(0, PNG_MAGIC.length))).toEqual(PNG_MAGIC);
  });

  it('exports the report as PDF bytes', async () => {
    const onExportResult = vi.fn();
    renderWithResult(onExportResult);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');
    await waitForReady(canvas);

    const pdf = optionByLabel('PDF');
    if (!pdf) throw new Error('PDF option not found');
    click(pdf);

    await vi.waitFor(() => {
      expect(onExportResult).toHaveBeenCalled();
    });
    const result = onExportResult.mock.calls[0]?.[0] as ChartExportResult;
    expect(result.kind).toBe('pdf');
    expect(result.ok).toBe(true);
    const blob = result.blob;
    if (!blob) throw new Error('PDF blob not produced');
    const view = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...view.slice(0, 5))).toBe('%PDF-');
  });
});
