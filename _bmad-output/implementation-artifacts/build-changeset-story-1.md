=== FILE: package.json ===
--- NEW FILE ---
{
  "name": "xls-analytics",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "Локальный анализ XLS/XLSX: графики и сводные без ручной работы в Excel",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "eslint": "10.12.0",
    "eslint-config-prettier": "10.1.8",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-react-refresh": "0.5.7",
    "prettier": "3.9.10",
    "typescript": "~6.0.3",
    "typescript-eslint": "8.71.2",
    "vite": "8.3.4",
    "vitest": "5.0.4"
  }
}


=== FILE: tsconfig.json ===
--- NEW FILE ---
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}


=== FILE: vite.config.ts ===
--- NEW FILE ---
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});


=== FILE: index.html ===
--- NEW FILE ---
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>XLS-Аналитика</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>


=== FILE: eslint.config.js ===
--- NEW FILE ---
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

const hooksConfig = reactHooks.configs['recommended-latest'] ?? reactHooks.configs.recommended;

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '_bmad', '_bmad-output', '.agents', '.opencode'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...(hooksConfig?.rules ?? {}),
      'react-refresh/only-export-components': 'warn',
      'no-undef': 'off',
    },
  },
  eslintConfigPrettier,
);


=== FILE: .prettierrc.json ===
--- NEW FILE ---
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}


=== FILE: .gitignore ===
--- NEW FILE ---
node_modules/
dist/
*.local
.vite/


=== FILE: src\index.css ===
--- NEW FILE ---
:root,
:root[data-theme='light'] {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --surface-alt: #f0f2f5;
  --text: #1c2024;
  --text-muted: #5b6470;
  --border: #d8dde3;
  --accent: #2f6fed;
  --accent-contrast: #ffffff;
  --warning-bg: #fff6e0;
  --warning-border: #e0a72b;
  --warning-text: #6b4d09;
  --error-bg: #fdecec;
  --error-border: #d64545;
  --error-text: #7a1f1f;
  --chart-1: #2f6fed;
  --chart-2: #e08a1e;
  --chart-3: #2e9e6b;
  --chart-4: #8b5cf6;
  --chart-5: #d64545;
  --chart-6: #0f8fa8;
}

:root[data-theme='dark'] {
  --bg: #14171a;
  --surface: #1d2126;
  --surface-alt: #242931;
  --text: #e8eaed;
  --text-muted: #a2acb8;
  --border: #333a43;
  --accent: #6ea0ff;
  --accent-contrast: #0d1220;
  --warning-bg: #3a3117;
  --warning-border: #d6a53a;
  --warning-text: #f2dda1;
  --error-bg: #3a1f1f;
  --error-border: #d66060;
  --error-text: #f4c9c9;
  --chart-1: #6ea0ff;
  --chart-2: #f0b34a;
  --chart-3: #5cc38f;
  --chart-4: #b39bf7;
  --chart-5: #e8827f;
  --chart-6: #4fc3d9;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.5;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.brand {
  font-weight: 600;
  font-size: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-pill {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
}

.btn {
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 14px;
}

.btn:hover {
  border-color: var(--accent);
}

.btn-primary {
  background: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}

.btn-ghost {
  background: transparent;
}

.app-main {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.screen-title {
  font-size: 22px;
  margin: 0 0 20px;
}

.dropzone-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 24px;
  background: var(--surface);
  border: 2px dashed var(--border);
  border-radius: 14px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.dropzone:hover,
.dropzone.is-dragging {
  border-color: var(--accent);
  background: var(--surface-alt);
}

.dropzone.is-disabled {
  opacity: 0.6;
  cursor: progress;
}

.dropzone-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.dropzone-hint,
.dropzone-meta {
  margin: 0;
  color: var(--text-muted);
}

.dropzone-meta {
  font-size: 13px;
}

.dropzone .btn-primary {
  margin-top: 12px;
}

.dropzone-reject {
  margin: 0;
  color: var(--error-text);
}

.privacy {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.status-line {
  margin: 16px 0 0;
  color: var(--text-muted);
}

.warning-banner,
.error-banner {
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid;
}

.warning-banner {
  background: var(--warning-bg);
  border-color: var(--warning-border);
  color: var(--warning-text);
}

.error-banner {
  background: var(--error-bg);
  border-color: var(--error-border);
  color: var(--error-text);
}

.warning-banner ul,
.error-banner ul {
  margin: 0;
  padding-left: 20px;
}

.error-title {
  margin: 0 0 6px;
  font-weight: 600;
}

.error-hint {
  margin: 8px 0 0;
}

.result-card {
  margin-top: 20px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.result-title {
  margin: 0 0 6px;
  font-weight: 600;
}

.result-line {
  margin: 0;
  color: var(--text-muted);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}


=== FILE: src\main.tsx ===
--- NEW FILE ---
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}


=== FILE: src\vite-env.d.ts ===
--- NEW FILE ---
/// <reference types="vite/client" />


=== FILE: src\adapters\file-source.ts ===
--- NEW FILE ---
import type { Issue, RawWorkbook } from '../domain/model';
import { createIssue } from '../domain/issues';

export const DEFAULT_ROW_LIMIT = 30_000;

/** Guards the entry point: only XLS/XLSX are accepted (CAP-1). */
export function isSupportedFileName(fileName: string): boolean {
  return /\.xlsx?$/i.test(fileName.trim());
}

export interface LoadOptions {
  /** Row limit for the whole file (summed across sheets). Overridable for tests. */
  rowLimit?: number;
  /** Parser adapter; injected so the guard can be tested without real files. */
  parse: (bytes: ArrayBuffer, fileName: string) => Promise<RawWorkbook> | RawWorkbook;
}

export type LoadResult = { ok: true; workbook: RawWorkbook } | { ok: false; issues: Issue[] };

export function countDataRows(workbook: RawWorkbook): number {
  return workbook.sheets.reduce((total, sheet) => total + Math.max(0, sheet.rows.length - 1), 0);
}

/**
 * Read + parse + guard. Any failure returns blocking issues and never yields a
 * partially built workbook, so the caller can keep its previous state (AD-17).
 */
export async function loadWorkbookFile(
  fileName: string,
  readBytes: () => Promise<ArrayBuffer>,
  options: LoadOptions,
): Promise<LoadResult> {
  if (!isSupportedFileName(fileName)) {
    return { ok: false, issues: [createIssue('UNSUPPORTED_FORMAT')] };
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readBytes();
  } catch {
    return { ok: false, issues: [createIssue('CORRUPT_FILE')] };
  }

  let workbook: RawWorkbook;
  try {
    workbook = await options.parse(bytes, fileName);
  } catch {
    return { ok: false, issues: [createIssue('CORRUPT_FILE')] };
  }

  if (!workbook.sheets || workbook.sheets.length === 0) {
    return { ok: false, issues: [createIssue('CORRUPT_FILE')] };
  }

  const limit = options.rowLimit ?? DEFAULT_ROW_LIMIT;
  const total = countDataRows(workbook);
  if (total > limit) {
    return { ok: false, issues: [createIssue('ROW_LIMIT_EXCEEDED', undefined, total)] };
  }

  return { ok: true, workbook };
}

/** Browser File API adapter. */
export function readFileBytes(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}


=== FILE: src\adapters\spreadsheet.ts ===
--- NEW FILE ---
import type { CellValue, RawSheet, RawWorkbook } from '../domain/model';

export const ROW_LIMIT = 30_000;

/**
 * Read cap for SheetJS, applied per sheet. One extra row beyond the limit lets
 * the guard detect an over-limit file without materialising every row (AD-7).
 */
const READ_ROW_CAP = ROW_LIMIT + 1;

interface XlsxRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface XlsxCell {
  v?: unknown;
}

interface XlsxWorksheet {
  [address: string]: unknown;
  '!ref'?: string;
  '!merges'?: unknown[];
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorksheet | undefined>;
  Workbook?: { Sheets?: { Hidden?: number }[] };
}

interface XlsxModule {
  read: (data: ArrayBuffer, options: Record<string, unknown>) => XlsxWorkbook;
  utils: {
    decode_range: (ref: string) => XlsxRange;
    encode_cell: (address: { r: number; c: number }) => string;
  };
}

function toCellValue(cell: unknown): CellValue {
  if (!cell || typeof cell !== 'object') return null;
  const value = (cell as XlsxCell).v;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'ИСТИНА' : 'ЛОЖЬ';
  return String(value);
}

function readSheetRows(worksheet: XlsxWorksheet, utils: XlsxModule['utils']): CellValue[][] {
  const ref = typeof worksheet['!ref'] === 'string' ? worksheet['!ref'] : 'A1:A1';
  const range = utils.decode_range(ref);
  const rows: CellValue[][] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells: CellValue[] = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = utils.encode_cell({ r: row, c: column });
      cells.push(toCellValue(worksheet[address]));
    }
    rows.push(cells);
  }
  return rows;
}

/** SheetJS adapter. Imported lazily so the full build loads only when a file arrives. */
export async function parseWorkbook(bytes: ArrayBuffer, fileName: string): Promise<RawWorkbook> {
  const XLSX = (await import('xlsx')) as unknown as XlsxModule;
  const workbook = XLSX.read(bytes, {
    type: 'array',
    cellDates: true,
    cellText: false,
    sheetRows: READ_ROW_CAP,
  });

  const sheets: RawSheet[] = workbook.SheetNames.map((name, index) => {
    const worksheet = workbook.Sheets[name];
    const hidden = (workbook.Workbook?.Sheets?.[index]?.Hidden ?? 0) !== 0;
    return {
      name,
      hidden,
      mergedCellCount: worksheet?.['!merges']?.length ?? 0,
      rows: worksheet ? readSheetRows(worksheet, XLSX.utils) : [],
    };
  });

  return { fileName, sheets };
}


=== FILE: src\app\App.tsx ===
--- NEW FILE ---
import { useEffect, useState } from 'react';
import { Header } from '../ui/components/Header';
import { UploadScreen } from '../ui/screens/UploadScreen';
import { WorkbookStoreProvider } from '../ui/store/workbook-store';
import { applyTheme, getInitialTheme, storeTheme, type Theme } from './theme';

export function App() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  return (
    <WorkbookStoreProvider>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      />
      <main className="app-main">
        <UploadScreen />
      </main>
    </WorkbookStoreProvider>
  );
}


=== FILE: src\app\theme.ts ===
--- NEW FILE ---
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'xls-analytics-theme';

function defaultStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

/** Light is the default theme (UX: dual theme, light first). */
export function getInitialTheme(storage: Storage | undefined = defaultStorage()): Theme {
  const stored = storage?.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'light';
}

export function applyTheme(
  theme: Theme,
  root: HTMLElement | undefined = typeof document === 'undefined' ? undefined : document.documentElement,
): void {
  root?.setAttribute('data-theme', theme);
}

export function storeTheme(theme: Theme, storage: Storage | undefined = defaultStorage()): void {
  storage?.setItem(STORAGE_KEY, theme);
}


=== FILE: src\domain\issues.ts ===
--- NEW FILE ---
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


=== FILE: src\domain\model.ts ===
--- NEW FILE ---
export type CellValue = number | Date | string | null;

export type ColumnType = 'number' | 'date' | 'text';

export type IssueSeverity = 'blocking' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  code: string;
  message: string;
  column?: string;
  count?: number;
}

export interface Column {
  index: number;
  header: string;
  normalizedHeader: string;
  type: ColumnType;
  required: boolean;
  nonEmptyCount: number;
  emptyCount: number;
}

export interface Row {
  index: number;
  cells: CellValue[];
  isSectionMarker: boolean;
}

export interface Sheet {
  name: string;
  columns: Column[];
  rows: Row[];
  headerRowIndex: number;
  hidden: boolean;
  mergedCellCount: number;
}

export interface Workbook {
  fileName: string;
  sheets: Sheet[];
  activeSheetName: string;
}

export type ValidationStatus = 'ok' | 'warnings' | 'blocked';

export interface ValidationResult {
  status: ValidationStatus;
  issues: Issue[];
}

export interface RawSheet {
  name: string;
  hidden: boolean;
  mergedCellCount: number;
  rows: CellValue[][];
}

export interface RawWorkbook {
  fileName: string;
  sheets: RawSheet[];
}

export interface FilterState {
  categories: Record<string, string[]>;
  dateRange?: { from: string; to: string };
}

export interface ViewConfig {
  chartType: 'line' | 'bar' | 'pie' | 'table';
  dimension: string;
  measure: string;
}


=== FILE: src\domain\schema.ts ===
--- NEW FILE ---
/** Mandatory column set (B–G in the reference export). One source of truth (AD-6). */
export const REQUIRED_COLUMNS = [
  'Тип задачи',
  'Задача',
  'Статус',
  'Исполнитель',
  'Тип работы',
  'Затрачено времени (ч)',
] as const;

/** Column whose sole population marks a service (section) row. */
export const SECTION_MARKER_COLUMN = 'Эпик';

/**
 * Canonical header normalization: trim, collapse whitespace, case-fold, ё→е.
 * Applied to both the required set and every incoming header.
 */
export function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е');
}

export const NORMALIZED_REQUIRED: readonly string[] = REQUIRED_COLUMNS.map((column) =>
  normalizeHeader(column),
);

export const NORMALIZED_SECTION_MARKER = normalizeHeader(SECTION_MARKER_COLUMN);


=== FILE: src\domain\pipeline\detectSectionMarkers.ts ===
--- NEW FILE ---
import type { CellValue } from '../model';

export function isEmptyCell(value: CellValue | undefined): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === 'string' && value.trim() === '';
}

/**
 * A service (section) row carries data in exactly one column — the section marker.
 * Returns a boolean flag aligned with `rows`; never mutates the rows (AD-16).
 */
export function markSectionRows(rows: CellValue[][], markerColumnIndex: number): boolean[] {
  if (markerColumnIndex < 0) return rows.map(() => false);
  return rows.map((row) => {
    let nonEmpty = 0;
    let onlyMarker = true;
    for (let index = 0; index < row.length; index += 1) {
      if (!isEmptyCell(row[index] ?? null)) {
        nonEmpty += 1;
        if (index !== markerColumnIndex) onlyMarker = false;
      }
    }
    return nonEmpty === 1 && onlyMarker;
  });
}


=== FILE: src\domain\pipeline\validateStructure.ts ===
--- NEW FILE ---
import type {
  CellValue,
  Column,
  ColumnType,
  Issue,
  RawSheet,
  RawWorkbook,
  Row,
  Sheet,
  ValidationResult,
  Workbook,
} from '../model';
import { createIssue, statusFromIssues } from '../issues';
import {
  NORMALIZED_REQUIRED,
  NORMALIZED_SECTION_MARKER,
  REQUIRED_COLUMNS,
  normalizeHeader,
} from '../schema';
import { isEmptyCell, markSectionRows } from './detectSectionMarkers';

/** How many leading rows are scanned for the header row before giving up. */
const HEADER_SEARCH_LIMIT = 5;

/** Tie-break order when more than one type has the same weight (AD-15). */
const TYPE_PRIORITY: readonly ColumnType[] = ['number', 'date', 'text'];

const DATE_PATTERNS: readonly RegExp[] = [
  /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/,
  /^\d{4}-\d{2}-\d{2}([ T].*)?$/,
];

export function looksLikeDate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return false;
  if (!DATE_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  const iso = trimmed.replace(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/, '$3-$2-$1');
  return !Number.isNaN(Date.parse(iso));
}

export function classifyCell(value: CellValue): ColumnType | null {
  if (isEmptyCell(value)) return null;
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') return looksLikeDate(value) ? 'date' : 'text';
  return 'text';
}

function inferColumnType(values: CellValue[]): { type: ColumnType; ambiguous: boolean } {
  const counts: Record<ColumnType, number> = { number: 0, date: 0, text: 0 };
  for (const value of values) {
    const type = classifyCell(value);
    if (type) counts[type] += 1;
  }
  let type: ColumnType = 'text';
  let best = -1;
  for (const candidate of TYPE_PRIORITY) {
    if (counts[candidate] > best) {
      best = counts[candidate];
      type = candidate;
    }
  }
  const topCount = counts[type];
  const ambiguous =
    topCount > 0 && TYPE_PRIORITY.some((candidate) => candidate !== type && counts[candidate] === topCount);
  return { type, ambiguous };
}

function findHeaderRow(rows: CellValue[][]): number {
  const limit = Math.min(HEADER_SEARCH_LIMIT, rows.length);
  for (let index = 0; index < limit; index += 1) {
    const normalized = (rows[index] ?? []).map((cell) => normalizeHeader(cell));
    if (NORMALIZED_REQUIRED.every((required) => normalized.includes(required))) return index;
  }
  return 0;
}

export function analyzeSheet(raw: RawSheet): { sheet: Sheet; issues: Issue[] } {
  const issues: Issue[] = [];
  const headerRowIndex = findHeaderRow(raw.rows);
  const headerRow = raw.rows[headerRowIndex] ?? [];
  const dataRows = raw.rows.slice(headerRowIndex + 1);

  const columnCount = Math.max(
    headerRow.length,
    ...dataRows.map((row) => row.length),
    0,
  );

  const columns: Column[] = [];
  for (let index = 0; index < columnCount; index += 1) {
    const headerValue = headerRow[index] ?? null;
    const header = headerValue === null || headerValue === undefined ? '' : String(headerValue);
    const values = dataRows.map((row) => row[index] ?? null);
    const nonEmpty = values.filter((value) => !isEmptyCell(value));
    const { type, ambiguous } = inferColumnType(nonEmpty);

    columns.push({
      index,
      header,
      normalizedHeader: normalizeHeader(headerValue),
      type,
      required: NORMALIZED_REQUIRED.includes(normalizeHeader(headerValue)),
      nonEmptyCount: nonEmpty.length,
      emptyCount: values.length - nonEmpty.length,
    });

    if (ambiguous) {
      issues.push(createIssue('UNKNOWN_COLUMN_TYPE', header || `Колонка ${index + 1}`));
    }
  }

  const present = new Set(columns.map((column) => column.normalizedHeader));
  for (const required of REQUIRED_COLUMNS) {
    if (!present.has(normalizeHeader(required))) {
      issues.push(createIssue('MISSING_REQUIRED_COLUMN', required));
    }
  }

  if (headerRowIndex > 0) issues.push(createIssue('EXTRA_HEADER_ROWS'));
  if (raw.hidden) issues.push(createIssue('HIDDEN_SHEETS'));
  if (raw.mergedCellCount > 0) issues.push(createIssue('MERGED_CELLS'));

  const markerColumnIndex = columns.findIndex(
    (column) => column.normalizedHeader === NORMALIZED_SECTION_MARKER,
  );
  const markers = markSectionRows(dataRows, markerColumnIndex);
  const markerCount = markers.filter(Boolean).length;
  if (markerCount > 0) issues.push(createIssue('SECTION_ROWS_EXCLUDED', undefined, markerCount));

  const rows: Row[] = dataRows.map((cells, index) => ({
    index: headerRowIndex + 1 + index,
    cells,
    isSectionMarker: markers[index] ?? false,
  }));

  return {
    sheet: {
      name: raw.name,
      columns,
      rows,
      headerRowIndex,
      hidden: raw.hidden,
      mergedCellCount: raw.mergedCellCount,
    },
    issues,
  };
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const byKey = new Map<string, Issue>();
  for (const issue of issues) {
    const key = `${issue.code}|${issue.column ?? ''}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...issue });
      continue;
    }
    if (issue.count !== undefined) existing.count = (existing.count ?? 0) + issue.count;
  }
  return [...byKey.values()];
}

export function analyzeWorkbook(raw: RawWorkbook): { workbook: Workbook; validation: ValidationResult } {
  const issues: Issue[] = [];
  const sheets: Sheet[] = [];

  for (const rawSheet of raw.sheets) {
    const analyzed = analyzeSheet(rawSheet);
    sheets.push(analyzed.sheet);
    issues.push(...analyzed.issues);
  }

  const active = sheets.find((sheet) => !sheet.hidden) ?? sheets[0];
  const workbook: Workbook = {
    fileName: raw.fileName,
    sheets,
    activeSheetName: active ? active.name : '',
  };

  const deduped = dedupeIssues(issues);
  return { workbook, validation: { status: statusFromIssues(deduped), issues: deduped } };
}


=== FILE: src\ui\components\DropZone.tsx ===
--- NEW FILE ---
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { isSupportedFileName } from '../../adapters/file-source';
import { ru } from '../i18n/ru';

interface DropZoneProps {
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function DropZone({ disabled = false, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedFileName(file.name)) {
      setRejected(file.name);
      return;
    }
    setRejected(null);
    onFile(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files[0]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <p className="dropzone-title">{ru.dropTitle}</p>
        <p className="dropzone-hint">{ru.dropHint}</p>
        <p className="dropzone-meta">{ru.formatsHint}</p>
        <span className="btn btn-primary">{ru.chooseFile}</span>
      </div>

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".xls,.xlsx"
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {rejected ? (
        <p className="dropzone-reject" role="alert">
          {`${ru.rejectedFile(rejected)} ${ru.formatsHint}`}
        </p>
      ) : null}

      <p className="privacy">{ru.privacy}</p>
    </div>
  );
}


=== FILE: src\ui\components\Header.tsx ===
--- NEW FILE ---
import type { Theme } from '../../app/theme';
import { useWorkbookStore } from '../store/context';
import { ru } from '../i18n/ru';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const { state, reset } = useWorkbookStore();
  const fileName = state.fileName;

  return (
    <header className="app-header">
      <span className="brand">{ru.appTitle}</span>
      <div className="header-actions">
        {fileName ? (
          <>
            <span className="file-pill" title={fileName}>
              {fileName}
            </span>
            <button type="button" className="btn" onClick={reset}>
              {ru.newFile}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? ru.themeToDark : ru.themeToLight}
        >
          {theme === 'light' ? ru.themeToDark : ru.themeToLight}
        </button>
      </div>
    </header>
  );
}


=== FILE: src\ui\components\WarningBanner.tsx ===
--- NEW FILE ---
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


=== FILE: src\ui\i18n\ru.ts ===
--- NEW FILE ---
import type { Issue } from '../../domain/model';

/** Every user-facing string lives here — components never hardcode copy. */
export const ru = {
  appTitle: 'XLS-Аналитика',
  newFile: 'Новый файл',
  themeToLight: 'Светлая тема',
  themeToDark: 'Тёмная тема',
  screenTitle: 'Загрузка данных',
  chooseFile: 'Выбрать файл',
  dropTitle: 'Перетащите файл сюда',
  dropHint: 'или нажмите, чтобы выбрать на устройстве',
  formatsHint: 'Поддерживаются файлы XLS и XLSX, до 30 000 строк на файл.',
  privacy: 'Файл обрабатывается локально и не покидает устройство.',
  reading: 'Чтение файла и проверка структуры…',
  ready: 'Файл готов к анализу',
  errorTitle: 'Файл не загружен',
  fixAndRetry: 'Проверьте структуру файла и загрузите снова.',
  sheetsCount: (count: number) => `Листов: ${count}`,
  rejectedFile: (name: string) => `Файл «${name}» не поддерживается.`,
};

export function messageForIssue(issue: Issue): string {
  switch (issue.code) {
    case 'UNSUPPORTED_FORMAT':
      return 'Поддерживаются только файлы XLS и XLSX.';
    case 'CORRUPT_FILE':
      return 'Не удалось прочитать файл — он повреждён или пуст.';
    case 'ROW_LIMIT_EXCEEDED':
      return `Файл превышает лимит 30 000 строк (${issue.count ?? 0}). Сократите выгрузку и загрузите снова.`;
    case 'MISSING_REQUIRED_COLUMN':
      return `Не найдена обязательная колонка «${issue.column ?? ''}».`;
    case 'SECTION_ROWS_EXCLUDED':
      return `Обнаружено ${issue.count ?? 0} служебных строк — исключены из анализа. Проверьте, что это ожидаемо.`;
    case 'MERGED_CELLS':
      return 'В файле есть объединённые ячейки — данные не изменялись.';
    case 'HIDDEN_SHEETS':
      return 'В файле есть скрытые листы — они не изменялись.';
    case 'EXTRA_HEADER_ROWS':
      return 'Перед заголовком есть лишние строки — использована строка с названиями колонок.';
    case 'UNKNOWN_COLUMN_TYPE':
      return `Тип колонки «${issue.column ?? ''}» определён неуверенно.`;
    default:
      return issue.message;
  }
}


=== FILE: src\ui\screens\UploadScreen.tsx ===
--- NEW FILE ---
import { DropZone } from '../components/DropZone';
import { WarningBanner } from '../components/WarningBanner';
import { messageForIssue, ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

export function UploadScreen() {
  const { state, loadFile } = useWorkbookStore();
  const isLoading = state.status === 'loading';
  const hasErrors = state.errorIssues.length > 0;
  const hasWarnings = !hasErrors && state.validation?.status === 'warnings';

  return (
    <section className="upload-screen">
      <h1 className="screen-title">{ru.screenTitle}</h1>

      <DropZone disabled={isLoading} onFile={loadFile} />

      {isLoading ? (
        <p className="status-line" role="status">
          {ru.reading}
        </p>
      ) : null}

      {hasErrors ? (
        <div className="error-banner" role="alert">
          <p className="error-title">{ru.errorTitle}</p>
          <ul>
            {state.errorIssues.map((issue) => (
              <li key={`${issue.code}-${issue.column ?? ''}`}>{messageForIssue(issue)}</li>
            ))}
          </ul>
          <p className="error-hint">{ru.fixAndRetry}</p>
        </div>
      ) : null}

      {hasWarnings && state.validation ? <WarningBanner issues={state.validation.issues} /> : null}

      {state.workbook ? (
        <div className="result-card">
          <p className="result-title">{ru.ready}</p>
          <p className="result-line">{`Файл: ${state.workbook.fileName}`}</p>
          <p className="result-line">{ru.sheetsCount(state.workbook.sheets.length)}</p>
        </div>
      ) : null}
    </section>
  );
}


=== FILE: src\ui\store\context.ts ===
--- NEW FILE ---
import { createContext, useContext } from 'react';
import type { StoreState } from './reducer';

export interface StoreApi {
  state: StoreState;
  loadFile: (file: File) => Promise<void>;
  reset: () => void;
}

export const StoreContext = createContext<StoreApi | null>(null);

export function useWorkbookStore(): StoreApi {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useWorkbookStore must be used within WorkbookStoreProvider');
  }
  return context;
}


=== FILE: src\ui\store\reducer.ts ===
--- NEW FILE ---
import type { Issue, ValidationResult, Workbook } from '../../domain/model';

export type LoadStatus = 'empty' | 'loading' | 'loaded' | 'error';

export interface StoreState {
  status: LoadStatus;
  fileName: string | null;
  pendingFileName: string | null;
  workbook: Workbook | null;
  validation: ValidationResult | null;
  errorIssues: Issue[];
}

export const initialState: StoreState = {
  status: 'empty',
  fileName: null,
  pendingFileName: null,
  workbook: null,
  validation: null,
  errorIssues: [],
};

export type StoreAction =
  | { type: 'LOAD_START'; fileName: string }
  | { type: 'LOAD_SUCCESS'; workbook: Workbook; validation: ValidationResult }
  | { type: 'LOAD_ERROR'; issues: Issue[] }
  | { type: 'RESET' };

/**
 * Pure reducer. Loads are atomic: on failure the previously loaded workbook is
 * left untouched and only the error is surfaced (AD-17).
 */
export function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading', pendingFileName: action.fileName, errorIssues: [] };
    case 'LOAD_SUCCESS':
      return {
        status: 'loaded',
        fileName: action.workbook.fileName,
        pendingFileName: null,
        workbook: action.workbook,
        validation: action.validation,
        errorIssues: [],
      };
    case 'LOAD_ERROR':
      return {
        ...state,
        status: state.workbook ? 'loaded' : 'error',
        pendingFileName: null,
        errorIssues: action.issues,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}


=== FILE: src\ui\store\workbook-store.tsx ===
--- NEW FILE ---
import { useCallback, useMemo, useReducer, type ReactNode } from 'react';
import { analyzeWorkbook } from '../../domain/pipeline/validateStructure';
import { loadWorkbookFile, readFileBytes } from '../../adapters/file-source';
import { parseWorkbook } from '../../adapters/spreadsheet';
import { StoreContext, type StoreApi } from './context';
import { initialState, reducer } from './reducer';

export function WorkbookStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadFile = useCallback(async (file: File) => {
    dispatch({ type: 'LOAD_START', fileName: file.name });

    const loaded = await loadWorkbookFile(file.name, () => readFileBytes(file), {
      parse: parseWorkbook,
    });
    if (!loaded.ok) {
      dispatch({ type: 'LOAD_ERROR', issues: loaded.issues });
      return;
    }

    const { workbook, validation } = analyzeWorkbook(loaded.workbook);
    if (validation.status === 'blocked') {
      dispatch({ type: 'LOAD_ERROR', issues: validation.issues });
      return;
    }

    dispatch({ type: 'LOAD_SUCCESS', workbook, validation });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = useMemo<StoreApi>(() => ({ state, loadFile, reset }), [state, loadFile, reset]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}


=== FILE: tests\detectSectionMarkers.test.ts ===
--- NEW FILE ---
import { describe, expect, it } from 'vitest';
import { markSectionRows } from '../src/domain/pipeline/detectSectionMarkers';

describe('markSectionRows', () => {
  it('flags a row where only the marker column is filled', () => {
    const rows = [
      ['Эпик 1', null, null],
      [null, 'значение', 'значение'],
    ];
    expect(markSectionRows(rows, 0)).toEqual([true, false]);
  });

  it('does not flag when only the marker column is empty', () => {
    expect(markSectionRows([[null, 'a', 'b']], 0)).toEqual([false]);
  });

  it('flags nothing when the marker column is absent', () => {
    expect(markSectionRows([['a']], -1)).toEqual([false]);
  });

  it('treats whitespace-only cells as empty', () => {
    expect(markSectionRows([['Эпик 1', '   ', null]], 0)).toEqual([true]);
  });
});


=== FILE: tests\file-source.test.ts ===
--- NEW FILE ---
import { describe, expect, it } from 'vitest';
import { isSupportedFileName, loadWorkbookFile } from '../src/adapters/file-source';
import type { CellValue, RawWorkbook } from '../src/domain/model';
import { HEADERS, dataRow, makeSheet, makeWorkbook } from './fixtures';

const okBytes = () => Promise.resolve(new ArrayBuffer(16));

function workbookWithDataRows(count: number): RawWorkbook {
  const rows: CellValue[][] = [[...HEADERS]];
  for (let index = 0; index < count; index += 1) {
    rows.push(
      dataRow({ 1: 'Задача', 2: `A${index}`, 3: 'Готово', 4: 'Иванов', 5: 'Разработка', 6: index }),
    );
  }
  return makeWorkbook([makeSheet(rows)]);
}

describe('isSupportedFileName', () => {
  it('accepts xls/xlsx only, case-insensitively', () => {
    expect(isSupportedFileName('a.xlsx')).toBe(true);
    expect(isSupportedFileName('a.XLS')).toBe(true);
    expect(isSupportedFileName('a.csv')).toBe(false);
    expect(isSupportedFileName('a.pdf')).toBe(false);
  });
});

describe('loadWorkbookFile', () => {
  it('BAD_FORMAT: rejects unsupported extensions', async () => {
    const result = await loadWorkbookFile('data.csv', okBytes, {
      parse: () => workbookWithDataRows(1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({ code: 'UNSUPPORTED_FORMAT', severity: 'blocking' });
    }
  });

  it('CORRUPT: a parser failure becomes a blocking issue', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => {
        throw new Error('bad archive');
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('CORRUPT_FILE');
  });

  it('CORRUPT: a workbook with no sheets is rejected', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, { parse: () => makeWorkbook([]) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('CORRUPT_FILE');
  });

  it('OVER_LIMIT: total data rows above the limit block the load', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => workbookWithDataRows(4),
      rowLimit: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({ code: 'ROW_LIMIT_EXCEEDED', count: 4 });
    }
  });

  it('counts rows across every sheet', async () => {
    const sheet = workbookWithDataRows(2).sheets[0];
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => makeWorkbook([sheet, sheet]),
      rowLimit: 3,
    });
    expect(result.ok).toBe(false);
  });

  it('HAPPY_PATH: a within-limit file yields the workbook', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => workbookWithDataRows(2),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.workbook.sheets).toHaveLength(1);
  });
});


=== FILE: tests\fixtures.ts ===
--- NEW FILE ---
import type { CellValue, RawSheet, RawWorkbook } from '../src/domain/model';

export const HEADERS = [
  'Эпик',
  'Тип задачи',
  'Задача',
  'Статус',
  'Исполнитель',
  'Тип работы',
  'Затрачено времени (ч)',
];

export function dataRow(
  values: Record<number, CellValue> = {},
  width: number = HEADERS.length,
): CellValue[] {
  const cells: CellValue[] = [];
  for (let index = 0; index < width; index += 1) cells.push(values[index] ?? null);
  return cells;
}

export function sampleRows(): CellValue[][] {
  return [
    [...HEADERS],
    dataRow({ 1: 'Задача', 2: 'Настроить отчёт', 3: 'Готово', 4: 'Иванов', 5: 'Разработка', 6: 4 }),
    dataRow({ 1: 'Задача', 2: 'Согласовать макет', 3: 'В работе', 4: 'Петров', 5: 'Дизайн', 6: 2 }),
    dataRow({ 0: 'Эпик 2' }),
    dataRow({ 1: 'Баг', 2: 'Падает экспорт', 3: 'Новое', 4: 'Сидоров', 5: 'Разработка', 6: 1 }),
  ];
}

export function makeSheet(rows: CellValue[][], overrides: Partial<RawSheet> = {}): RawSheet {
  return {
    name: overrides.name ?? 'Основной лист',
    hidden: overrides.hidden ?? false,
    mergedCellCount: overrides.mergedCellCount ?? 0,
    rows,
  };
}

export function makeWorkbook(sheets: RawSheet[], fileName = 'sample.xlsx'): RawWorkbook {
  return { fileName, sheets };
}


=== FILE: tests\reducer.test.ts ===
--- NEW FILE ---
import { describe, expect, it } from 'vitest';
import { createIssue } from '../src/domain/issues';
import type { ValidationResult, Workbook } from '../src/domain/model';
import { initialState, reducer } from '../src/ui/store/reducer';

const workbook: Workbook = { fileName: 'sample.xlsx', sheets: [], activeSheetName: '' };
const validation: ValidationResult = { status: 'ok', issues: [] };

describe('reducer', () => {
  it('loads a workbook', () => {
    let state = reducer(initialState, { type: 'LOAD_START', fileName: 'sample.xlsx' });
    expect(state.status).toBe('loading');
    state = reducer(state, { type: 'LOAD_SUCCESS', workbook, validation });
    expect(state.status).toBe('loaded');
    expect(state.workbook).toBe(workbook);
    expect(state.fileName).toBe('sample.xlsx');
  });

  it('RETRY_AFTER_BLOCK: a failed retry keeps the previous workbook untouched (atomic)', () => {
    let state = reducer(initialState, { type: 'LOAD_START', fileName: 'good.xlsx' });
    state = reducer(state, { type: 'LOAD_SUCCESS', workbook, validation });
    state = reducer(state, { type: 'LOAD_START', fileName: 'bad.xlsx' });
    state = reducer(state, {
      type: 'LOAD_ERROR',
      issues: [createIssue('MISSING_REQUIRED_COLUMN', 'Статус')],
    });

    expect(state.status).toBe('loaded');
    expect(state.workbook).toBe(workbook);
    expect(state.errorIssues[0]?.code).toBe('MISSING_REQUIRED_COLUMN');
  });

  it('a failure with nothing loaded ends in the error state', () => {
    let state = reducer(initialState, { type: 'LOAD_START', fileName: 'bad.xlsx' });
    state = reducer(state, { type: 'LOAD_ERROR', issues: [createIssue('CORRUPT_FILE')] });
    expect(state.status).toBe('error');
    expect(state.workbook).toBeNull();
  });

  it('RESET clears everything', () => {
    let state = reducer(initialState, { type: 'LOAD_SUCCESS', workbook, validation });
    state = reducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});


=== FILE: tests\schema.test.ts ===
--- NEW FILE ---
import { describe, expect, it } from 'vitest';
import { normalizeHeader } from '../src/domain/schema';

describe('normalizeHeader', () => {
  it('trims, collapses whitespace and case-folds', () => {
    expect(normalizeHeader('  Затрачено   времени (ч) ')).toBe('затрачено времени (ч)');
  });

  it('folds ё to е', () => {
    expect(normalizeHeader('Ёмкость')).toBe('емкость');
  });

  it('tolerates empty and non-string values', () => {
    expect(normalizeHeader(null)).toBe('');
    expect(normalizeHeader(undefined)).toBe('');
    expect(normalizeHeader(42)).toBe('42');
  });
});


=== FILE: tests\upload-flow.test.ts ===
--- NEW FILE ---
import { describe, expect, it } from 'vitest';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { loadWorkbookFile } from '../src/adapters/file-source';
import { HEADERS, dataRow, makeSheet, makeWorkbook, sampleRows } from './fixtures';

const okBytes = () => Promise.resolve(new ArrayBuffer(8));

describe('upload flow (adapter + domain)', () => {
  it('a sample-like file loads and reports section-row warnings', async () => {
    const loaded = await loadWorkbookFile('sample.xlsx', okBytes, {
      parse: () => makeWorkbook([makeSheet(sampleRows())]),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const { validation } = analyzeWorkbook(loaded.workbook);
    expect(validation.status).toBe('warnings');
  });

  it('a missing required column blocks before any analytics is built', async () => {
    const headers = HEADERS.filter((header) => header !== 'Исполнитель');
    const rows = [headers, dataRow({ 1: 'Задача', 2: 'A', 3: 'Готово', 5: 'Разработка', 6: 3 })];
    const loaded = await loadWorkbookFile('sample.xlsx', okBytes, {
      parse: () => makeWorkbook([makeSheet(rows)]),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const { validation } = analyzeWorkbook(loaded.workbook);
    expect(validation.status).toBe('blocked');
  });
});


=== FILE: tests\validateStructure.test.ts ===
--- NEW FILE ---
import { describe, expect, it } from 'vitest';
import { analyzeWorkbook, classifyCell } from '../src/domain/pipeline/validateStructure';
import type { Issue } from '../src/domain/model';
import { HEADERS, dataRow, makeSheet, makeWorkbook, sampleRows } from './fixtures';

function codes(issues: Issue[]): string[] {
  return issues.map((issue) => issue.code);
}

describe('analyzeWorkbook', () => {
  it('HAPPY_PATH: a clean file validates with no issues', () => {
    const rows = [
      [...HEADERS],
      dataRow({ 1: 'Задача', 2: 'A', 3: 'Готово', 4: 'Иванов', 5: 'Разработка', 6: 3 }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(validation.status).toBe('ok');
    expect(validation.issues).toEqual([]);
  });

  it('WARN_MARKERS: service rows are flagged and counted, never dropped', () => {
    const { workbook, validation } = analyzeWorkbook(makeWorkbook([makeSheet(sampleRows())]));
    expect(validation.status).toBe('warnings');
    const marker = validation.issues.find((issue) => issue.code === 'SECTION_ROWS_EXCLUDED');
    expect(marker?.count).toBe(1);

    const sheet = workbook.sheets[0];
    expect(sheet.rows).toHaveLength(4);
    expect(sheet.rows.filter((row) => row.isSectionMarker)).toHaveLength(1);
  });

  it('MISSING_COLUMN: blocks and names the missing column', () => {
    const headers = HEADERS.filter((header) => header !== 'Статус');
    const rows = [headers, dataRow({ 1: 'Задача', 2: 'A', 4: 'Иванов', 5: 'Разработка', 6: 3 })];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(validation.status).toBe('blocked');
    const issue = validation.issues.find((item) => item.code === 'MISSING_REQUIRED_COLUMN');
    expect(issue?.column).toBe('Статус');
    expect(issue?.severity).toBe('blocking');
  });

  it('WARN_DIRTY: merged cells and hidden sheets warn without touching data', () => {
    const { validation } = analyzeWorkbook(
      makeWorkbook([makeSheet(sampleRows(), { hidden: true, mergedCellCount: 2 })]),
    );
    expect(validation.status).toBe('warnings');
    expect(codes(validation.issues)).toContain('MERGED_CELLS');
    expect(codes(validation.issues)).toContain('HIDDEN_SHEETS');
  });

  it('WARN_DIRTY: extra header rows are detected', () => {
    const rows = [
      dataRow({}, HEADERS.length),
      [...HEADERS],
      dataRow({ 1: 'Задача', 2: 'A', 3: 'Готово', 4: 'Иванов', 5: 'Разработка', 6: 3 }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(codes(validation.issues)).toContain('EXTRA_HEADER_ROWS');
  });

  it('flags a column whose type is a tie', () => {
    const rows = [
      [...HEADERS],
      dataRow({ 1: 5, 2: 'A', 3: 'Готово', 4: 'Иванов', 5: 'Разработка', 6: 1 }),
      dataRow({
        1: new Date('2026-01-02'),
        2: 'B',
        3: 'Готово',
        4: 'Петров',
        5: 'Дизайн',
        6: 2,
      }),
    ];
    const { validation } = analyzeWorkbook(makeWorkbook([makeSheet(rows)]));
    expect(codes(validation.issues)).toContain('UNKNOWN_COLUMN_TYPE');
  });
});

describe('classifyCell', () => {
  it('classifies numbers, dates and date-like strings', () => {
    expect(classifyCell(5)).toBe('number');
    expect(classifyCell(new Date('2026-01-01'))).toBe('date');
    expect(classifyCell('12.03.2026')).toBe('date');
    expect(classifyCell('Готово')).toBe('text');
    expect(classifyCell(null)).toBeNull();
  });
});


