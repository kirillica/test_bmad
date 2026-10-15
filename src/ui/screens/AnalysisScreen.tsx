import { isFilterActive } from '../../domain/pipeline/applyFilter';
import { ChartCard } from '../components/ChartCard';
import { FilterBar } from '../components/FilterBar';
import { PivotTable } from '../components/PivotTable';
import { ViewSwitcher } from '../components/ViewSwitcher';
import { ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

/**
 * U3 «Анализ» (CAP-5, CAP-6): the surface where filters and views live. Below
 * the counter it renders the view switcher, the dimension/measure selectors and
 * either the chart card or the pivot table, all over the store's single
 * `AggregationResult` (AD-12). Section-marker rows are already gone (AD-14); the
 * source rows are never mutated (AD-16).
 */
export function AnalysisScreen() {
  const {
    state,
    rowSet,
    filterOptions,
    viewOptions,
    viewConfig,
    aggregation,
    setFilter,
    clearFilters,
    setView,
  } = useWorkbookStore();

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

  return (
    <section className="analysis-screen">
      <h1 className="screen-title">{ru.analysisTitle}</h1>

      <FilterBar
        options={filterOptions}
        filterState={state.filterState}
        onSetFilter={setFilter}
        onClear={clearFilters}
      />

      <p className="analysis-count" role="status">
        {filtersActive
          ? ru.filteredRowsCount(rowSet.rows.length, rowSet.total)
          : ru.rowsCount(rowSet.total)}
      </p>

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
            />
          )}
        </>
      ) : null}
    </section>
  );
}
