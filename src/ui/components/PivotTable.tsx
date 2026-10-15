import type { AggregationResult } from '../../domain/model';
import { formatNumber, ru } from '../i18n/ru';

interface PivotTableProps {
  aggregation: AggregationResult;
  dimensionHeader: string;
  measureHeader: string;
}

/**
 * The «Таблица» representation (CAP-6): the same aggregation as a chart — the
 * dimension, the sum and the row count per group, plus an «Итого» row. It is the
 * textual alternative to the chart for screen readers (EXPERIENCE.md A11y floor).
 */
export function PivotTable({ aggregation, dimensionHeader, measureHeader }: PivotTableProps) {
  const totalCount = aggregation.buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className="table-wrap">
      <table
        className="data-table pivot-table"
        aria-label={ru.pivotLabel(dimensionHeader, measureHeader)}
      >
        <thead>
          <tr>
            <th scope="col">{dimensionHeader}</th>
            <th scope="col" className="is-numeric">
              {measureHeader}
            </th>
            <th scope="col" className="is-numeric">
              {ru.pivotCountLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {aggregation.buckets.map((bucket, index) => (
            <tr key={bucket.key ?? `__blank-${index}`}>
              <td>{bucket.key ?? ru.blankDimension}</td>
              <td className="is-numeric">{formatNumber(bucket.sum)}</td>
              <td className="is-numeric">{formatNumber(bucket.count)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="pivot-total">
            <td>{ru.pivotTotalLabel}</td>
            <td className="is-numeric">{formatNumber(aggregation.total)}</td>
            <td className="is-numeric">{formatNumber(totalCount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
