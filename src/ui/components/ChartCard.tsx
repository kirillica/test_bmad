import { useEffect, useMemo, useRef, useState } from 'react';
import type { AggregationResult, ViewConfig } from '../../domain/model';
import { createChart, type ChartHandle, type ChartInput } from '../../adapters/charts';
import { formatNumber, ru } from '../i18n/ru';
import { useChartPalette, type ChartPalette } from '../theme/palette';

/** The chart kinds (everything but the «Таблица» representation). */
type GraphType = Exclude<ViewConfig['chartType'], 'table'>;

interface ChartCardProps {
  chartType: GraphType;
  aggregation: AggregationResult;
  dimensionHeader: string;
  measureHeader: string;
}

/**
 * Colors per data point: pie slices cycle the categorical palette so no value is
 * encoded by position alone; bar/line use one color for the single series.
 */
function seriesColors(kind: GraphType, count: number, palette: ChartPalette): string[] {
  if (kind !== 'pie') {
    return Array.from({ length: count }, () => palette.colors[0]);
  }
  return Array.from(
    { length: count },
    (_, index) => palette.colors[index % palette.colors.length],
  );
}

/**
 * The chart representation (CAP-6). One canvas and one Chart.js instance per
 * chart view, owned by this component (AD-19): the instance is created once,
 * updated in place on data/theme changes, and destroyed on unmount. Chart.js
 * lives only behind `src/adapters/charts.ts` and loads lazily (AD-2, AD-20).
 *
 * The UI is also what the adapter displays: axis titles and the `ru-RU`
 * number formatter travel through `ChartInput`, never the other way (AD-2, AD-9).
 */
export function ChartCard({
  chartType,
  aggregation,
  dimensionHeader,
  measureHeader,
}: ChartCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<ChartHandle | null>(null);
  const palette = useChartPalette();
  // Set when the lazy Chart.js chunk cannot be loaded: the card reports it
  // instead of leaving a blank canvas with a console-only error.
  const [failed, setFailed] = useState(false);

  const input = useMemo<ChartInput>(
    () => ({
      kind: chartType,
      dimensionTitle: dimensionHeader,
      measureTitle: measureHeader,
      formatValue: formatNumber,
      series: {
        labels: aggregation.buckets.map((bucket) => bucket.key ?? ru.blankDimension),
        values: aggregation.buckets.map((bucket) => bucket.sum),
        colors: seriesColors(chartType, aggregation.buckets.length, palette),
        text: palette.text,
        grid: palette.grid,
      },
    }),
    [chartType, aggregation, palette, dimensionHeader, measureHeader],
  );

  // Keeps the freshest input for the async create (Chart.js may resolve after a
  // data/theme change). Synced in an effect, never read/written during render.
  const latestRef = useRef(input);
  useEffect(() => {
    latestRef.current = input;
  }, [input]);

  // One owner per chart view (AD-19). The `cancelled` flag makes the async
  // create idempotent under StrictMode's double effect invocation.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    void createChart(canvas, latestRef.current)
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
        // Data or theme may have changed while Chart.js was still loading.
        handle.update(latestRef.current);
      })
      .catch((error: unknown) => {
        console.error('ChartCard: не удалось создать график', error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  // Data or theme changes reuse the live instance — no recreation (AD-19).
  useEffect(() => {
    handleRef.current?.update(input);
  }, [input]);

  const viewLabel = ru.viewTypes[chartType];
  const title = ru.chartTitle(viewLabel, measureHeader, dimensionHeader);
  const ariaLabel = ru.chartAriaLabel(
    viewLabel,
    measureHeader,
    dimensionHeader,
    aggregation.buckets.length,
  );

  // No canvas survives a load failure: the card names the problem instead.
  if (failed) {
    return (
      <figure className="chart-container">
        <figcaption className="chart-title">{title}</figcaption>
        <p className="chart-error" role="status">
          {ru.chartError}
        </p>
      </figure>
    );
  }

  return (
    <figure className="chart-container">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="chart-canvas-wrap">
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
      </div>
    </figure>
  );
}
