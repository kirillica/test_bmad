import { useCallback, useState } from 'react';
import type { FilterOptions, FilterState } from '../../domain/model';
import { isFilterActive } from '../../domain/pipeline/applyFilter';
import { downloadBlob } from '../../adapters/exporter/download';
import { exportXlsx, type XlsxLabels } from '../../adapters/exporter/xlsx';
import { ChartCard, type ChartExportResult } from '../components/ChartCard';
import { FilterBar } from '../components/FilterBar';
import { PivotTable } from '../components/PivotTable';
import { Toast, type ToastMessage } from '../components/Toast';
import { ViewSwitcher } from '../components/ViewSwitcher';
import { formatIsoDate, ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

/** The file base name: `state.fileName` without its extension, or «отчёт». */
function exportBaseName(fileName: string | null): string {
  const name = (fileName ?? '').trim();
  const withoutExtension = name.replace(/\.[^./\\]+$/, '');
  return withoutExtension.length > 0 ? withoutExtension : ru.exportFallbackName;
}

/** `<база>-<суффикс>.<расширение>` (Design Notes: no date in the name). */
function exportFileName(base: string, suffix: string, extension: string): string {
  return `${base}-${suffix}.${extension}`;
}

/** The active filters as one line for the PDF report (ISO dates, AD-9). */
function filtersText(options: FilterOptions, filterState: FilterState): string {
  const parts: string[] = [];
  for (const option of options.categories) {
    const selected = filterState.categories[option.column];
    if (selected && selected.length > 0) parts.push(`${option.header}: ${selected.join(', ')}`);
  }
  const range = filterState.dateRange;
  if (options.date && range && (range.from !== '' || range.to !== '')) {
    parts.push(`${options.date.header}: ${range.from || '—'}…${range.to || '—'}`);
  }
  return parts.length > 0 ? parts.join('; ') : ru.exportNoFilters;
}

/**
 * U3 «Анализ» (CAP-5, CAP-6, CAP-7): filters, the view switcher, the
 * dimension/measure selectors and either the chart card or the pivot table, all
 * over the store's single `AggregationResult` (AD-12). This screen owns the
 * export file names, the downloads and the confirmation toast; the chart card
 * only produces the PNG/PDF artifact (AD-10).
 */
export function AnalysisScreen() {
  const {
    state,
    activeSheet,
    rowSet,
    filterOptions,
    viewOptions,
    viewConfig,
    aggregation,
    setFilter,
    clearFilters,
    setView,
  } = useWorkbookStore();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const filtersActive = isFilterActive(state.filterState);
  const empty = filtersActive && rowSet.rows.length === 0;
  const noDimension = viewOptions.dimensions.length === 0;
  const noMeasure = viewOptions.measures.length === 0;
  const unavailable = noDimension || noMeasure;

  const dimensionHeader = viewConfig
    ? (viewOptions.dimensions.find((option) => option.column === viewConfig.dimension)?.header ??
      viewConfig.dimension)
    : '';
  const measureHeader = viewConfig
    ? (viewOptions.measures.find((option) => option.column === viewConfig.measure)?.header ??
      viewConfig.measure)
    : '';

  const base = exportBaseName(state.fileName);

  // XLSX needs rows to write and an aggregation for the «Сводная» sheet; when
  // either is missing the button is disabled and the reason is named (matrix
  // NO_ROWS; the no-view reason is defensive).
  const noRows = rowSet.rows.length === 0;
  const canExportXlsx = Boolean(activeSheet) && !noRows && aggregation !== null;
  const xlsxBlockedReason = noRows ? ru.exportBlockedNoRows : ru.exportBlockedNoView;

  const handleXlsx = useCallback(async () => {
    if (!activeSheet || rowSet.rows.length === 0 || !aggregation) return;
    const labels: XlsxLabels = {
      dataSheet: ru.exportSheetData,
      pivotSheet: ru.exportSheetPivot,
      countHeader: ru.pivotCountLabel,
      totalLabel: ru.pivotTotalLabel,
      blankDimension: ru.blankDimension,
    };
    const fileName = exportFileName(base, ru.exportXlsxSuffix, 'xlsx');
    try {
      const blob = await exportXlsx(activeSheet, rowSet, aggregation, labels);
      downloadBlob(blob, fileName);
      setToast({ kind: 'success', message: ru.exportReady(fileName) });
    } catch (error) {
      console.error('AnalysisScreen: не удалось экспортировать XLSX', error);
      setToast({ kind: 'error', message: ru.exportError });
    }
  }, [activeSheet, rowSet, aggregation, base]);

  const handleChartExport = useCallback(
    (result: ChartExportResult) => {
      if (!result.ok || !result.blob) {
        setToast({ kind: 'error', message: ru.exportError });
        return;
      }
      const extension = result.kind === 'png' ? 'png' : 'pdf';
      const suffix = result.kind === 'png' ? ru.exportPngSuffix : ru.exportPdfSuffix;
      const fileName = exportFileName(base, suffix, extension);
      try {
        downloadBlob(result.blob, fileName);
        setToast({ kind: 'success', message: ru.exportReady(fileName) });
      } catch (error) {
        console.error('AnalysisScreen: не удалось скачать файл экспорта', error);
        setToast({ kind: 'error', message: ru.exportError });
      }
    },
    [base],
  );

  const pdfTexts = {
    filters: ru.exportFiltersLabel(filtersText(filterOptions, state.filterState)),
    rowsCount: ru.rowsCount(rowSet.rows.length),
    date: ru.exportDateLabel(formatIsoDate(new Date())),
  };

  return (
    <section className="analysis-screen">
      <h1 className="screen-title">{ru.analysisTitle}</h1>

      <FilterBar
        options={filterOptions}
        filterState={state.filterState}
        onSetFilter={setFilter}
        onClear={clearFilters}
      />

      <div className="analysis-header">
        <p className="analysis-count" role="status">
          {filtersActive
            ? ru.filteredRowsCount(rowSet.rows.length, rowSet.total)
            : ru.rowsCount(rowSet.total)}
        </p>
        <div className="export-xlsx-wrap">
          <button
            type="button"
            className="btn export-xlsx"
            disabled={!canExportXlsx}
            title={canExportXlsx ? undefined : xlsxBlockedReason}
            onClick={handleXlsx}
          >
            {ru.exportXlsx}
          </button>
          {canExportXlsx ? null : (
            <span className="export-blocked-reason">{xlsxBlockedReason}</span>
          )}
        </div>
      </div>

      {empty ? (
        <div className="analysis-empty">
          <p className="analysis-empty-text">{ru.noRowsForFilters}</p>
          <button type="button" className="btn" onClick={clearFilters}>
            {ru.resetFilters}
          </button>
        </div>
      ) : unavailable ? (
        <div className="analysis-unavailable">
          {noDimension ? <p>{ru.noDimensionReason}</p> : null}
          {noMeasure ? <p>{ru.noMeasureReason}</p> : null}
        </div>
      ) : viewConfig && aggregation ? (
        <>
          <div className="analysis-controls">
            <ViewSwitcher
              value={viewConfig.chartType}
              onChange={(chartType) => setView({ ...viewConfig, chartType })}
            />
            <label className="analysis-select">
              <span className="analysis-select-label">{ru.dimensionLabel}</span>
              <select
                value={viewConfig.dimension}
                onChange={(event) =>
                  setView({ ...viewConfig, dimension: event.currentTarget.value })
                }
              >
                {viewOptions.dimensions.map((option) => (
                  <option key={option.column} value={option.column}>
                    {option.header}
                  </option>
                ))}
              </select>
            </label>
            <label className="analysis-select">
              <span className="analysis-select-label">{ru.measureLabel}</span>
              <select
                value={viewConfig.measure}
                onChange={(event) => setView({ ...viewConfig, measure: event.currentTarget.value })}
              >
                {viewOptions.measures.map((option) => (
                  <option key={option.column} value={option.column}>
                    {option.header}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {viewConfig.chartType === 'table' ? (
            <PivotTable
              aggregation={aggregation}
              dimensionHeader={dimensionHeader}
              measureHeader={measureHeader}
            />
          ) : (
            <ChartCard
              chartType={viewConfig.chartType}
              aggregation={aggregation}
              dimensionHeader={dimensionHeader}
              measureHeader={measureHeader}
              pdfTexts={pdfTexts}
              onExportResult={handleChartExport}
            />
          )}
        </>
      ) : null}

      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={closeToast} /> : null}
    </section>
  );
}
