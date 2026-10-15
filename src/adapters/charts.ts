import type { Chart, ChartConfiguration } from 'chart.js';

/**
 * Chart.js adapter (AD-2, AD-20). The only module allowed to import Chart.js;
 * the domain never sees it. Chart.js is loaded lazily so the static build keeps
 * it in its own chunk (AD-20). The interface is narrow on purpose: create,
 * update, destroy — nothing else crosses the boundary (AD-19).
 *
 * The adapter never reaches into `src/ui` (AD-2): the UI passes everything
 * display-specific in `ChartInput` — axis titles and the `ru-RU` formatter.
 */

/** The chart kinds this adapter renders (the «Таблица» view is not a chart). */
export type ChartKind = 'line' | 'bar' | 'pie';

/**
 * A fully resolved series: labels and values per group, plus the theme colors.
 * The UI owns labels/colors; the adapter only paints them.
 */
export interface ChartSeries {
  labels: string[];
  values: number[];
  /** One color per point (cycled for pie slices, single color for bar/line). */
  colors: string[];
  /** Text color for ticks and legend (theme token). */
  text: string;
  /** Grid-line color (theme token). */
  grid: string;
}

export interface ChartInput {
  kind: ChartKind;
  series: ChartSeries;
  /** The x-axis title: the dimension header (EXPERIENCE.md «оси подписаны»). */
  dimensionTitle: string;
  /** The y-axis title and the tooltip unit: the measure header (AD-9). */
  measureTitle: string;
  /** `ru-RU` number formatting for ticks and tooltips (AD-9). */
  formatValue: (value: number) => string;
}

/** The handle the UI keeps: exactly one live instance behind it (AD-19). */
export interface ChartHandle {
  update(input: ChartInput): void;
  destroy(): void;
}

function buildData(input: ChartInput): ChartConfiguration['data'] {
  const { series } = input;
  return {
    labels: series.labels,
    datasets: [
      {
        data: series.values,
        backgroundColor: series.colors,
        borderColor: series.colors,
        borderWidth: input.kind === 'line' ? 2 : 1,
        pointBackgroundColor: series.colors,
        pointBorderColor: series.colors,
        fill: false,
        tension: 0,
      },
    ],
  };
}

/** The value a tooltip row is about: `parsed` is a number for pie, `{x,y}` for axes. */
function tooltipValue(parsed: unknown): number | null {
  if (typeof parsed === 'number') return parsed;
  if (parsed && typeof parsed === 'object') {
    const point = parsed as { y?: unknown };
    if (typeof point.y === 'number') return point.y;
  }
  return null;
}

function buildOptions(input: ChartInput): ChartConfiguration['options'] {
  const { text, grid } = input.series;
  const { dimensionTitle, measureTitle, formatValue } = input;
  // A pie has no axes; bar/line get titled, themed ticks and grid lines.
  const scales =
    input.kind === 'pie'
      ? undefined
      : {
          x: {
            title: { display: true, text: dimensionTitle, color: text },
            ticks: { color: text },
            grid: { color: grid },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: measureTitle, color: text },
            ticks: { color: text, callback: (value: string | number) => formatValue(Number(value)) },
            grid: { color: grid },
          },
        };

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    color: text,
    plugins: {
      legend: { display: input.kind === 'pie', labels: { color: text } },
      tooltip: {
        callbacks: {
          // Every displayed number goes through the UI's ru-RU formatter (AD-9).
          label: (context: { parsed: unknown }) => {
            const value = tooltipValue(context.parsed);
            if (value === null) return measureTitle;
            return input.kind === 'pie'
              ? `${measureTitle}: ${formatValue(value)}`
              : formatValue(value);
          },
        },
      },
    },
    scales,
  } as ChartConfiguration['options'];
}

function buildConfig(input: ChartInput): ChartConfiguration {
  return {
    type: input.kind,
    data: buildData(input),
    options: buildOptions(input),
  } as ChartConfiguration;
}

/**
 * Creates the one Chart.js instance for a canvas. The returned handle updates
 * in place for data/theme changes; only a change of `kind` (which Chart.js
 * cannot mutate) replaces the instance on the same canvas (AD-19).
 */
export async function createChart(
  canvas: HTMLCanvasElement,
  input: ChartInput,
): Promise<ChartHandle> {
  const { default: ChartCtor } = await import('chart.js/auto');
  let chart: Chart = new ChartCtor(canvas, buildConfig(input));
  let kind = input.kind;

  return {
    update(next: ChartInput) {
      if (next.kind !== kind) {
        chart.destroy();
        kind = next.kind;
        chart = new ChartCtor(canvas, buildConfig(next));
        return;
      }
      chart.data = buildData(next);
      chart.options = buildOptions(next) as Chart['options'];
      chart.update();
    },
    destroy() {
      chart.destroy();
    },
  };
}
