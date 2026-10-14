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

export interface ViewConfig {
  chartType: 'line' | 'bar' | 'pie' | 'table';
  dimension: string;
  measure: string;
}
