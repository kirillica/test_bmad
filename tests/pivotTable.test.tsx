// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AggregationResult } from '../src/domain/model';
import { PivotTable } from '../src/ui/components/PivotTable';

const AGGREGATION: AggregationResult = {
  groupBy: 'исполнитель',
  measure: 'затрачено времени (ч)',
  buckets: [
    { key: null, sum: 6, count: 1 },
    { key: 'Иванов', sum: 4.5, count: 2 },
    { key: 'Петров', sum: 2, count: 1 },
  ],
  total: 12.5,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(): void {
  act(() => {
    root.render(
      <PivotTable
        aggregation={AGGREGATION}
        dimensionHeader="Исполнитель"
        measureHeader="Затрачено времени (ч)"
      />,
    );
  });
}

describe('PivotTable (CAP-6)', () => {
  it('renders one row per group with the blank label and the «Итого» row', () => {
    render();

    const rows = container.querySelectorAll('.pivot-table tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('(не указано)');
    expect(rows[0]?.textContent).toContain('6');
    // Numbers use Intl ru-RU (AD-9): 4.5 -> 4,5.
    expect(rows[1]?.textContent).toContain('4,5');
    expect(rows[1]?.textContent).toContain('2');

    const total = container.querySelector('.pivot-total');
    expect(total?.textContent).toContain('Итого');
    expect(total?.textContent).toContain('12,5');
    // The total count covers every group: 1 + 2 + 1 = 4.
    expect(total?.textContent).toContain('4');
  });

  it('names the dimension and measure in the accessible label and headers', () => {
    render();

    const table = container.querySelector('.pivot-table');
    expect(table?.getAttribute('aria-label')).toContain('Исполнитель');
    expect(table?.getAttribute('aria-label')).toContain('Затрачено времени (ч)');

    const headers = Array.from(container.querySelectorAll('.pivot-table thead th')).map(
      (cell) => cell.textContent,
    );
    expect(headers).toEqual(['Исполнитель', 'Затрачено времени (ч)', 'Строк']);
  });
});
