import type {
  AggregationBucket,
  AggregationResult,
  DimensionOption,
  MeasureOption,
  RowSet,
  Sheet,
  ViewConfig,
  ViewOptions,
} from '../model';
import { normalizeHeader } from '../schema';
import { buildFilterOptions, displayValue } from './applyFilter';
import { isEmptyCell } from './detectSectionMarkers';

/**
 * Domain aggregation for U3 (CAP-6, AD-8, AD-12). Pure: no React, Chart.js or
 * DOM, and it reads data only from the `RowSet` (AD-14), resolving column
 * identity from the sheet (AD-8). Sums only non-empty numbers and never mutates
 * the source rows (AD-15, AD-16).
 */

/** Default dimension/measure when the sheet offers them (Design Notes). */
const PREFERRED_DIMENSION = normalizeHeader('Исполнитель');
const PREFERRED_MEASURE = normalizeHeader('Затрачено времени (ч)');

function hasDimension(options: ViewOptions, column: string): boolean {
  return options.dimensions.some((option) => option.column === column);
}

function hasMeasure(options: ViewOptions, column: string): boolean {
  return options.measures.some((option) => option.column === column);
}

/**
 * The analytics controls a sheet offers: the contract categories present with
 * values (the same set as the filters, AD-6) and every numeric column (AD-13).
 */
export function buildViewOptions(sheet: Sheet): ViewOptions {
  const dimensions: DimensionOption[] = buildFilterOptions(sheet).categories.map((option) => ({
    column: option.column,
    header: option.header,
  }));
  const measures: MeasureOption[] = sheet.columns
    .filter((column) => column.type === 'number')
    .map((column) => ({ column: column.normalizedHeader, header: column.header }));
  return { dimensions, measures };
}

/**
 * The view a sheet defaults to (AD-13): a `preferred` selection is honoured while
 * it stays available, otherwise the defaults are «Столбчатый» / «Исполнитель» /
 * «Затрачено времени (ч)» with the first available option as fallback. Returns
 * `null` when the sheet offers no dimension or no measure — views are then
 * unavailable and the UI names the reason.
 */
export function defaultViewConfig(
  options: ViewOptions,
  preferred: ViewConfig | null = null,
): ViewConfig | null {
  if (options.dimensions.length === 0 || options.measures.length === 0) return null;

  const dimension =
    (preferred && hasDimension(options, preferred.dimension) ? preferred.dimension : undefined) ??
    (hasDimension(options, PREFERRED_DIMENSION) ? PREFERRED_DIMENSION : options.dimensions[0].column);

  const measure =
    (preferred && hasMeasure(options, preferred.measure) ? preferred.measure : undefined) ??
    (hasMeasure(options, PREFERRED_MEASURE) ? PREFERRED_MEASURE : options.measures[0].column);

  return { chartType: preferred?.chartType ?? 'bar', dimension, measure };
}

interface MutableBucket {
  key: string | null;
  sum: number;
  count: number;
  /** First-appearance rank, the tie-breaker for equal sums. */
  order: number;
}

/**
 * Aggregates a `RowSet` by a `ViewConfig` (CAP-6, AD-8, AD-12). Groups by the
 * dimension value (identity is `normalizeHeader`, AD-6); a blank dimension forms
 * the separate «(не указано)» group; only non-empty finite numbers are summed and
 * every row counts. Sorted by descending sum, ties by first appearance; `total`
 * is the sum across groups. Returns `null` when the sheet lacks the columns.
 */
export function aggregate(
  sheet: Sheet,
  rowSet: RowSet,
  viewConfig: ViewConfig,
): AggregationResult | null {
  const dimensionColumn = sheet.columns.find(
    (column) => column.normalizedHeader === viewConfig.dimension,
  );
  const measureColumn = sheet.columns.find(
    (column) => column.normalizedHeader === viewConfig.measure,
  );
  if (!dimensionColumn || !measureColumn) return null;

  // `null` is the blank-dimension key; a non-blank value keys on its normalized
  // form so «Готово» and «готово» are one group (AD-6).
  const groups = new Map<string | null, MutableBucket>();

  for (const row of rowSet.rows) {
    const dimensionValue = row.cells[dimensionColumn.index] ?? null;
    const blank = isEmptyCell(dimensionValue);
    const key = blank ? null : normalizeHeader(dimensionValue);

    let bucket = groups.get(key);
    if (!bucket) {
      bucket = {
        key: blank ? null : displayValue(dimensionValue),
        sum: 0,
        count: 0,
        order: groups.size,
      };
      groups.set(key, bucket);
    }

    const measureValue = row.cells[measureColumn.index] ?? null;
    if (typeof measureValue === 'number' && Number.isFinite(measureValue)) {
      bucket.sum += measureValue;
    }
    bucket.count += 1;
  }

  const buckets: AggregationBucket[] = [...groups.values()]
    .sort((left, right) => right.sum - left.sum || left.order - right.order)
    .map((bucket) => ({ key: bucket.key, sum: bucket.sum, count: bucket.count }));

  const total = buckets.reduce((sum, bucket) => sum + bucket.sum, 0);

  return { groupBy: viewConfig.dimension, measure: viewConfig.measure, buckets, total };
}
