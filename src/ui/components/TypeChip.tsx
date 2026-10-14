import type { Column } from '../../domain/model';
import { ru } from '../i18n/ru';

/**
 * Auto-detected column type chip (CAP-4). The type is never user-editable; the
 * hover title / accessible name explains how many non-empty values backed it.
 */
export function TypeChip({ column }: { column: Column }) {
  const label = ru.columnTypes[column.type];
  const hint = ru.nonEmptyValues(column.nonEmptyCount);

  return (
    <span className="type-chip" title={hint} aria-label={`${label}, ${hint}`}>
      {label}
    </span>
  );
}
