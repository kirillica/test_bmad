import type { AggregationResult, CellValue, RowSet, Sheet } from '../../domain/model';
import { displayValue } from '../../domain/pipeline/applyFilter';
import { writeWorkbook, type XlsxSheetSpec, type XlsxWriteCell } from '../spreadsheet';

/**
 * XLSX export (CAP-7, AD-9, AD-10). It serializes the same `RowSet` /
 * `AggregationResult` the screen shows — never a second pipeline pass. Numbers
 * stay numeric so Excel can compute; dates are ISO 8601 strings; blanks stay
 * empty (AD-9). The adapter does not import the UI (AD-2): sheet names and
 * pivot headers arrive as `XlsxLabels` from the caller.
 */

/** Display strings the UI owns and passes into this adapter (AD-2). */
export interface XlsxLabels {
  /** Name of the raw-data sheet, e.g. «Данные». */
  dataSheet: string;
  /** Name of the summary sheet, e.g. «Сводная». */
  pivotSheet: string;
  /** Pivot header for the row-count column, e.g. «Строк». */
  countHeader: string;
  /** The total row label, e.g. «Итого». */
  totalLabel: string;
  /** Label for the blank dimension group, e.g. «(не указано)». */
  blankDimension: string;
}

/** A cell as it lands in the sheet: numbers stay numbers, the rest as text. */
function cellFor(value: CellValue | undefined): XlsxWriteCell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  // Dates become ISO 8601 via the shared domain helper (AD-9).
  return displayValue(value);
}

/** The original header of a column identified by its normalized name. */
function headerOf(sheet: Sheet, normalized: string): string {
  return sheet.columns.find((column) => column.normalizedHeader === normalized)?.header ?? normalized;
}

/**
 * Builds the two-sheet workbook: «Данные» (all active-sheet columns with their
 * original headers plus the filtered rows) and «Сводная» (dimension, measure,
 * row count per group, then «Итого»).
 */
export async function exportXlsx(
  sheet: Sheet,
  rowSet: RowSet,
  aggregation: AggregationResult | null,
  labels: XlsxLabels,
): Promise<Blob> {
  const dataHeader = sheet.columns.map((column) => column.header);
  const dataRows = rowSet.rows.map((row) =>
    sheet.columns.map((column) => cellFor(row.cells[column.index])),
  );

  const sheets: XlsxSheetSpec[] = [
    { name: labels.dataSheet, rows: [dataHeader, ...dataRows] },
  ];

  if (aggregation) {
    const pivotRows: XlsxWriteCell[][] = [
      [
        headerOf(sheet, aggregation.groupBy),
        headerOf(sheet, aggregation.measure),
        labels.countHeader,
      ],
      ...aggregation.buckets.map(
        (bucket): XlsxWriteCell[] => [
          bucket.key ?? labels.blankDimension,
          bucket.sum,
          bucket.count,
        ],
      ),
    ];
    const totalCount = aggregation.buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    pivotRows.push([labels.totalLabel, aggregation.total, totalCount]);

    sheets.push({ name: labels.pivotSheet, rows: pivotRows });
  }

  return writeWorkbook(sheets);
}
