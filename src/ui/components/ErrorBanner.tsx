import type { Issue } from '../../domain/model';
import { messageForIssue, ru } from '../i18n/ru';

/**
 * Blocking error surface (AD-17). Rendered on whichever screen is active so a
 * failed load is never silent — even when a previously loaded workbook is kept.
 */
export function ErrorBanner({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="error-banner" role="alert">
      <p className="error-title">{ru.errorTitle}</p>
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.column ?? ''}`}>{messageForIssue(issue)}</li>
        ))}
      </ul>
      <p className="error-hint">{ru.fixAndRetry}</p>
    </div>
  );
}
