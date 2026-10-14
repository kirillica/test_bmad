import { useState } from 'react';
import { ru } from '../i18n/ru';

const numberFormat = new Intl.NumberFormat('ru-RU');

interface PaginationProps {
  /** Current page, 1-based and already clamped to `[1, pageCount]`. */
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Controlled pagination control used by the sheet preview (and reusable by the
 * data views of later stories). It is dumb about the data: the owner slices the
 * rows and passes the visible page; here we only render the range, the
 * prev/next steps and a jump-to-page field.
 */
export function Pagination({ page, pageCount, pageSize, total, onPageChange }: PaginationProps) {
  const [draft, setDraft] = useState(String(page));
  const [syncedPage, setSyncedPage] = useState(page);

  // The page can change from outside (prev/next, a sheet switch resetting to 1);
  // mirror it in the editable field without an effect.
  if (page !== syncedPage) {
    setSyncedPage(page);
    setDraft(String(page));
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const target = Number.isNaN(parsed) ? page : Math.min(Math.max(parsed, 1), pageCount);
    setDraft(String(target));
    if (target !== page) onPageChange(target);
  };

  return (
    <nav className="pagination" aria-label={ru.paginationLabel}>
      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        {ru.prevPage}
      </button>

      <p className="pagination-range" role="status">
        {ru.rowsRange(
          numberFormat.format(from),
          numberFormat.format(to),
          numberFormat.format(total),
        )}
      </p>

      <div className="pagination-jump">
        <span>{ru.goToPage}</span>
        <input
          type="number"
          className="pagination-input"
          aria-label={ru.goToPage}
          min={1}
          max={pageCount}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(event.currentTarget.value);
          }}
        />
        <span>{ru.pageOf(pageCount)}</span>
      </div>

      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        {ru.nextPage}
      </button>
    </nav>
  );
}
