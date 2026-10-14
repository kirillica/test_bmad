import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import type { CellValue, Column } from '../../domain/model';
import { dataRows } from '../../domain/pipeline/applyFilter';
import { parseDateLike } from '../../domain/pipeline/inferTypes';
import { ErrorBanner } from '../components/ErrorBanner';
import { Pagination } from '../components/Pagination';
import { SheetTabs } from '../components/SheetTabs';
import { SHEET_PANEL_ID, sheetTabId } from '../components/sheetTabsIds';
import { TypeChip } from '../components/TypeChip';
import { WarningBanner } from '../components/WarningBanner';
import { ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';
import { selectActiveSheet } from '../../domain/pipeline/selectActiveSheet';

/** Rows shown per preview page (Design Notes: 50). */
const PAGE_SIZE = 50;

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

/**
 * U2 «Данные» (CAP-3): paginated preview of the active sheet, visible-sheet
 * tabs, and the auto-detected type chip of every column. Section-marker rows are
 * excluded from the preview (AD-14); the source workbook is never mutated (AD-16).
 */
export function DataScreen() {
  const { state, setActiveSheet } = useWorkbookStore();
  const [page, setPage] = useState(1);
  const workbook = state.workbook;
  if (!workbook) return null;

  const visibleSheets = workbook.sheets.filter((sheet) => !sheet.hidden);
  const activeSheet = selectActiveSheet(workbook);
  if (!activeSheet) return null;

  const rows = dataRows(activeSheet);
  const total = rows.length;
  const isEmpty = total === 0;

  // Clamp on read so a stale page (e.g. after a shorter sheet) never renders empty.
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Switching sheets is a new context: always start from its first page.
  const handleSelectSheet = (sheetName: string) => {
    if (sheetName === activeSheet.name) return;
    setActiveSheet(sheetName);
    setPage(1);
  };

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
        onSelect={handleSelectSheet}
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
                  {pageRows.map((row) => (
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

            {pageCount > 1 ? (
              <Pagination
                page={safePage}
                pageCount={pageCount}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(next) => setPage(next)}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
