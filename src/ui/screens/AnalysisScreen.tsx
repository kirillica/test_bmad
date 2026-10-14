import { isFilterActive } from '../../domain/pipeline/applyFilter';
import { FilterBar } from '../components/FilterBar';
import { ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

/**
 * U3 «Анализ» (CAP-5): the surface where filters live. Story 3 ships the filter
 * chips, the row counter and the empty state; Story 4 fills the rest of U3 with
 * charts and the pivot table. The counter reads the filtered `RowSet` the store
 * derives once from the active sheet and `filterState` (AD-8, AD-12).
 */
export function AnalysisScreen() {
  const { state, rowSet, filterOptions, setFilter, clearFilters } = useWorkbookStore();
  const filtersActive = isFilterActive(state.filterState);
  const empty = filtersActive && rowSet.rows.length === 0;

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
      ) : null}
    </section>
  );
}
