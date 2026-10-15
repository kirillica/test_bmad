import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chart } from 'chart.js/auto';
import type { AggregationResult } from '../src/domain/model';
import { ChartCard } from '../src/ui/components/ChartCard';

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

function render(chartType: 'line' | 'bar' | 'pie', aggregation: AggregationResult): void {
  act(() => {
    root.render(
      <ChartCard
        chartType={chartType}
        aggregation={aggregation}
        dimensionHeader="Исполнитель"
        measureHeader="Затрачено времени (ч)"
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
