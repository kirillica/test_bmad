import type { HTMLAttributes } from 'react';
import type { CellValue, Column, Row, Sheet } from '../../domain/model';
import { parseDateLike } from '../../domain/pipeline/inferTypes';
import { ErrorBanner } from '../components/ErrorBanner';
import { SheetTabs } from '../components/SheetTabs';
import { SHEET_PANEL_ID, sheetTabId } from '../components/sheetTabsIds';
import { TypeChip } from '../components/TypeChip';
import { WarningBanner } from '../components/WarningBanner';
import { ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

/** Preview shows the first rows of the active sheet (Design Notes: 50). */
const PREVIEW_ROW_LIMIT = 50;

const numberFormat = new Intl.NumberFormat('ru-RU');
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Display a cell with `Intl` `ru-RU`; blanks render as an empty cell (AD-9). */
function formatCell(value: CellValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return numberFormat.format(value);
  // An Invalid Date would make Intl.format throw and take down the whole screen.
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : dateFormat.format(value);
  // Date-like strings (`12.03.2026`, `2026-03-12`) are shown as дд.мм.гггг too.
  const parsed = parseDateLike(value);
  return parsed ? dateFormat.format(parsed) : value;
}

/** Data rows of a sheet, excluding service-marker rows (AD-14). */
function dataRows(sheet: Sheet): Row[] {
  return sheet.rows.filter((row) => !row.isSectionMarker);
}

/**
 * U2 «Данные» (CAP-3): preview of the active sheet, visible-sheet tabs, and the
 * auto-detected type chip of every column. Section-marker rows are excluded from
 * the preview (AD-14); the source workbook is never mutated (AD-16).
 */
export function DataScreen() {
  const { state, setActiveSheet } = useWorkbookStore();
  const workbook = state.workbook;
  if (!workbook) return null;

  const visibleSheets = workbook.sheets.filter((sheet) => !sheet.hidden);
  const activeSheet =
    workbook.sheets.find((sheet) => sheet.name === workbook.activeSheetName) ??
    visibleSheets[0] ??
    workbook.sheets[0];
  if (!activeSheet) return null;

  const rows = dataRows(activeSheet);
  const previewRows = rows.slice(0, PREVIEW_ROW_LIMIT);
  const isEmpty = rows.length === 0;

  // The tabs and their controlled panel are only a tablist when >1 sheet shows.
  const hasTabs = visibleSheets.length > 1;
  const activeIndex = Math.max(
    0,
    visibleSheets.findIndex((sheet) => sheet.name === activeSheet.name),
  );
  const panelProps: HTMLAttributes<HTMLDivElement> = hasTabs
    ? { role: 'tabpanel', 'aria-labelledby': sheetTabId(activeIndex), tabIndex: 0 }
    : {};

  return (
    <section className="data-screen">
      <div className="data-header">
        <h1 className="screen-title">{ru.dataTitle}</h1>
        <p className="data-meta">{ru.sheetsCount(workbook.sheets.length)}</p>
      </div>

      {state.validation ? <WarningBanner issues={state.validation.issues} /> : null}
      <ErrorBanner issues={state.errorIssues} />

      <SheetTabs
        sheets={workbook.sheets}
        activeSheetName={activeSheet.name}
        onSelect={setActiveSheet}
      />

      <div id={SHEET_PANEL_ID} className="data-panel" {...panelProps}>
        {isEmpty ? (
          <p className="empty-sheet">{ru.emptySheet}</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table" aria-label={activeSheet.name}>
                <thead>
                  <tr>
                    {activeSheet.columns.map((column: Column) => (
                      <th key={column.index} scope="col">
                        {column.header || ru.unnamedColumn(column.index + 1)}
                        <TypeChip column={column} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.index}>
                      {activeSheet.columns.map((column: Column) => (
                        <td
                          key={column.index}
                          className={column.type === 'number' ? 'is-numeric' : undefined}
                        >
                          {formatCell(row.cells[column.index])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > PREVIEW_ROW_LIMIT ? (
              <p className="preview-note">{ru.previewTruncated(PREVIEW_ROW_LIMIT, rows.length)}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
