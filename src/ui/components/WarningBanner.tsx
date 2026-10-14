import type { Issue } from '../../domain/model';
import { messageForIssue } from '../i18n/ru';

/** Persistent amber banner. Warnings are surfaced, never applied silently (AD-16). */
export function WarningBanner({ issues }: { issues: Issue[] }) {
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  if (warnings.length === 0) return null;

  return (
    <div className="warning-banner" role="status">
      <ul>
        {warnings.map((issue) => (
          <li key={`${issue.code}-${issue.column ?? ''}`}>{messageForIssue(issue)}</li>
        ))}
      </ul>
    </div>
  );
}
