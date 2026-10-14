- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: `findHeaderRow` silently caps the header search at 5 leading rows and falls back to row 0 when no header is found, so a valid header further down is reported as missing columns instead of an explicit "header not found" issue.
  evidence: `src/domain/pipeline/validateStructure.ts` `findHeaderRow` returns `0` after `HEADER_SEARCH_LIMIT` miss; no issue code exists for "header not found", and adding one would change the issue-code set (spec "Ask First: Изменение набора ... текстов ошибок/предупреждений").

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: No duplicate-header detection — two columns with the same normalized header validate clean, leaving later dimension/measure selection ambiguous.
  evidence: `validateStructure.ts` builds `present` as a `Set`, so a repeated required column passes; distinguishing it would need a new issue code (Ask First).

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: The React UI has no DOM/component tests; `vite.config.ts` pins `environment: 'node'` and `test.include` to `tests/**/*.test.ts`, so the `DRAG_NON_XLS` consumer branch in `DropZone` is not exercised by an automated test (only `isSupportedFileName` is).
  evidence: Story 1 intentionally shipped pure-Node tests; no jsdom/RTL dependency was added. Component tests belong to the DataScreen/AnalysisScreen stories.

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: Rows counted by materialized `!ref` length — blank-but-formatted rows inside the used range inflate the row count and can falsely trip the 30 000 limit.
  evidence: `file-source.ts` `countDataRows` uses `rows.length - 1` per sheet; formatted empty rows are materialized by SheetJS.

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: No React error boundary — a render-time throw blanks the whole app instead of degrading to a recoverable message.
  evidence: `src/app/App.tsx` mounts the tree directly with no boundary component.

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: The `xlsx` dependency is a CDN tarball URL without an integrity/hash pin.
  evidence: `package.json` lists `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`; npm cannot integrity-check a plain URL tarball beyond registry metadata.

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: Row-limit enforcement reads a bounded number of rows (`limit + 2`) rather than computing counts strictly from sheet metadata before any materialization, which is the literal wording of AD-7.
  evidence: `spreadsheet.ts` passes `sheetRows: readRowCap(...)`; the guard counts materialized rows. Bounded, but not purely metadata-based.

- source_spec: `_bmad-output/specs/spec-xls-analytics/stories/1-upload-and-structure-validation.md`
  summary: Accessibility is only partially addressed — focus-visible styles and reduced-motion were added, but a full audit (screen-reader announcement of the loading result, focus management after load) remains.
  evidence: `src/index.css` and `DropZone`/`UploadScreen` cover the basics only.
