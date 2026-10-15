import { useEffect, useMemo, useRef, useState } from 'react';
import type { AggregationResult, ViewConfig } from '../../domain/model';
import { createChart, type ChartHandle, type ChartInput } from '../../adapters/charts';
import { exportPng, snapshotChart } from '../../adapters/exporter/png';
import { exportPdf } from '../../adapters/exporter/pdf';
import { ExportMenu } from './ExportMenu';
import { formatNumber, ru } from '../i18n/ru';
import { useChartPalette, type ChartPalette } from '../theme/palette';

/** The chart kinds (everything but the «Таблица» representation). */
type GraphType = Exclude<ViewConfig['chartType'], 'table'>;

/** The two image exports the chart card offers (CAP-7). */
export type ExportFormat = 'png' | 'pdf';

/**
 * The outcome of a chart export, reported to the owner (U3). The card produces
 * the artifact; the screen owns the file name, the download and the toast
 * (AD-10).
 */
export interface ChartExportResult {
  kind: ExportFormat;
  ok: boolean;
  /** Present only on success. */
  blob?: Blob;
}

/** PDF report lines the screen fills in (the card adds the chart title itself). */
export interface PdfReportTexts {
  filters: string;
  rowsCount: string;
  date: string;
}

interface ChartCardProps {
  chartType: GraphType;
  aggregation: AggregationResult;
  dimensionHeader: string;
  measureHeader: string;
  pdfTexts: PdfReportTexts;
  onExportResult: (result: ChartExportResult) => void;
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
 * The chart representation (CAP-6, CAP-7). One canvas and one Chart.js instance
 * per chart view, owned by this component (AD-19): the instance is created once,
 * updated in place on data/theme changes, and destroyed on unmount. Chart.js
 * lives only behind `src/adapters/charts.ts` and loads lazily (AD-2, AD-20).
 *
 * Export reads the live canvas (PNG/PDF) and never creates a second instance
 * (AD-19); the result travels to the screen through `onExportResult`.
 */
export function ChartCard({
  chartType,
  aggregation,
  dimensionHeader,
  measureHeader,
  pdfTexts,
  onExportResult,
}: ChartCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<ChartHandle | null>(null);
  const palette = useChartPalette();
  // Set when the lazy Chart.js chunk cannot be loaded: the card reports it
  // instead of leaving a blank canvas with a console-only error.
  const [failed, setFailed] = useState(false);
  // True once the instance exists and has painted; PNG/PDF stay disabled before.
  const [ready, setReady] = useState(false);

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
        setReady(true);
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

  /** Snapshots the live canvas and produces the requested artifact (AD-19). */
  const handleExport = (kind: ExportFormat) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      onExportResult({ kind, ok: false });
      return;
    }

    if (kind === 'png') {
      try {
        onExportResult({ kind: 'png', ok: true, blob: exportPng(canvas, palette.surface) });
      } catch {
        onExportResult({ kind: 'png', ok: false });
      }
      return;
    }

    // Explicit PDF branch (Design Notes): an unknown format never falls through
    // to a PDF silently.
    if (kind === 'pdf') {
      // The PDF branch needs the snapshot's data URL as well as its bytes.
      let dataUrl: string;
      try {
        dataUrl = snapshotChart(canvas, palette.surface).dataUrl;
      } catch {
        onExportResult({ kind: 'pdf', ok: false });
        return;
      }
      void exportPdf({
        imageDataUrl: dataUrl,
        title,
        filters: pdfTexts.filters,
        rowsCount: pdfTexts.rowsCount,
        date: pdfTexts.date,
      })
        .then((blob) => onExportResult({ kind: 'pdf', ok: true, blob }))
        .catch(() => onExportResult({ kind: 'pdf', ok: false }));
    }
  };

  // No canvas survives a load failure: the card names the problem, and with no
  // canvas there is no export menu either.
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
      <figcaption className="chart-title">
        <span>{title}</span>
        <span className="chart-actions">
          <ExportMenu
            disabled={!ready}
            disabledReason={ru.exportChartNotReady}
            onSelect={handleExport}
          />
        </span>
      </figcaption>
      <div className="chart-canvas-wrap">
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
      </div>
    </figure>
  );
}
