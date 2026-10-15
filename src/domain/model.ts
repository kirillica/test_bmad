export type CellValue = number | Date | string | null;

export type ColumnType = 'number' | 'date' | 'text';

export type IssueSeverity = 'blocking' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  code: string;
  message: string;
  column?: string;
  count?: number;
}

export interface Column {
  index: number;
  header: string;
  normalizedHeader: string;
  type: ColumnType;
  required: boolean;
  nonEmptyCount: number;
  emptyCount: number;
}

export interface Row {
  index: number;
  cells: CellValue[];
  isSectionMarker: boolean;
}

export interface Sheet {
  name: string;
  columns: Column[];
  rows: Row[];
  headerRowIndex: number;
  hidden: boolean;
  mergedCellCount: number;
}

export interface Workbook {
  fileName: string;
  sheets: Sheet[];
  activeSheetName: string;
}

export type ValidationStatus = 'ok' | 'warnings' | 'blocked';

export interface ValidationResult {
  status: ValidationStatus;
  issues: Issue[];
}

export interface RawSheet {
  name: string;
  hidden: boolean;
  mergedCellCount: number;
  rows: CellValue[][];
}

export interface RawWorkbook {
  fileName: string;
  sheets: RawSheet[];
}

export interface FilterState {
  categories: Record<string, string[]>;
  dateRange?: { from: string; to: string };
}

/** Distinct non-empty values of one filterable category column (CAP-5). */
export interface FilterOption {
  /** Normalized header — the category key in `FilterState.categories` (AD-6). */
  column: string;
  /** Original header, shown on the chip. */
  header: string;
  /** Distinct values in first-seen order; comparison is normalization-based. */
  values: string[];
}

/** The optional date filter controls; present only when a date column exists (AD-8). */
export interface DateFilterOption {
  /** Normalized header of the date column. */
  column: string;
  /** Original header of the date column. */
  header: string;
}

/** Everything the filter bar needs to render: categories plus the optional date. */
export interface FilterOptions {
  categories: FilterOption[];
  date: DateFilterOption | null;
}

/**
 * The filtered slice every analytics view consumes (AD-8, AD-14). Marker-free by
 * construction; `total` is the sheet's marker-free row count before filtering, so
 * the UI can render «Показано X из Y».
 */
export interface RowSet {
  rows: Row[];
  total: number;
}

export interface ViewConfig {
  chartType: 'line' | 'bar' | 'pie' | 'table';
  dimension: string;
  measure: string;
}

/**
 * A dimension the user may group by: a contract category column present in the
 * sheet with at least one value — the very set the filters offer (AD-6, AD-8).
 * `column` is the normalized header used for identity; `header` is for display.
 */
export interface DimensionOption {
  column: string;
  header: string;
}

/** A measure the user may sum: a numeric column of the sheet (CAP-6). */
export interface MeasureOption {
  column: string;
  header: string;
}

/** The dimensions and measures a sheet offers the analytics controls (AD-13). */
export interface ViewOptions {
  dimensions: DimensionOption[];
  measures: MeasureOption[];
}

/**
 * One group of an aggregation (AD-4): the dimension value (`null` for the blank
 * group «(не указано)»), the sum of its non-empty numbers, and its row count.
 */
export interface AggregationBucket {
  key: string | null;
  sum: number;
  count: number;
}

/**
 * The canonical aggregation of a `RowSet` by a `ViewConfig` (AD-4, AD-8, AD-12).
 * `groupBy`/`measure` are normalized headers; `total` is the sum across groups.
 */
export interface AggregationResult {
  groupBy: string;
  measure: string;
  buckets: AggregationBucket[];
  total: number;
}
