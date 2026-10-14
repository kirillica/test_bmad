import type { Issue, IssueSeverity, ValidationStatus } from './model';

export const ISSUE_CODES = {
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  CORRUPT_FILE: 'CORRUPT_FILE',
  ROW_LIMIT_EXCEEDED: 'ROW_LIMIT_EXCEEDED',
  MISSING_REQUIRED_COLUMN: 'MISSING_REQUIRED_COLUMN',
  SECTION_ROWS_EXCLUDED: 'SECTION_ROWS_EXCLUDED',
  MERGED_CELLS: 'MERGED_CELLS',
  HIDDEN_SHEETS: 'HIDDEN_SHEETS',
  EXTRA_HEADER_ROWS: 'EXTRA_HEADER_ROWS',
  UNKNOWN_COLUMN_TYPE: 'UNKNOWN_COLUMN_TYPE',
} as const;

export type IssueCode = (typeof ISSUE_CODES)[keyof typeof ISSUE_CODES];

/** Single source of truth for issue severity (AD-18). */
export const SEVERITY: Record<IssueCode, IssueSeverity> = {
  UNSUPPORTED_FORMAT: 'blocking',
  CORRUPT_FILE: 'blocking',
  ROW_LIMIT_EXCEEDED: 'blocking',
  MISSING_REQUIRED_COLUMN: 'blocking',
  SECTION_ROWS_EXCLUDED: 'warning',
  MERGED_CELLS: 'warning',
  HIDDEN_SHEETS: 'warning',
  EXTRA_HEADER_ROWS: 'warning',
  UNKNOWN_COLUMN_TYPE: 'warning',
};

export function createIssue(code: IssueCode, column?: string, count?: number): Issue {
  const issue: Issue = { severity: SEVERITY[code], code, message: code };
  if (column !== undefined) issue.column = column;
  if (count !== undefined) issue.count = count;
  return issue;
}

export function statusFromIssues(issues: Issue[]): ValidationStatus {
  if (issues.some((issue) => issue.severity === 'blocking')) return 'blocked';
  if (issues.length > 0) return 'warnings';
  return 'ok';
}
