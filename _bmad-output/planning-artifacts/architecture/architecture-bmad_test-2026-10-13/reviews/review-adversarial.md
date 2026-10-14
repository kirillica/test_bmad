# Adversarial Review — ARCHITECTURE-SPINE.md (XLS-Analytics)

- **Reviewer role:** adversarial reviewer in the architecture-spine review gate.
- **Artifact under review:** `_bmad-output/planning-artifacts/architecture/architecture-bmad_test-2026-10-13/ARCHITECTURE-SPINE.md` (status: draft).
- **Sources read:** spine; `SPEC.md`; `data-input-rules.md`; `success-metrics.md`; `stories.yaml`; `prd.md`; `EXPERIENCE.md`; `.memlog.md`.
- **Method:** For each seam, I construct **two units one level down** (two legitimate implementations of a component/store slice/pipeline stage). Each unit obeys **every** AD to the letter, yet the pair builds incompatibly. A finding is **genuine** only if a competent builder team could genuinely split this way without knowingly violating any AD. Cosmetic/underspecified-but-benign items are quarantined as **nitpicks**.
- **Severity scale:** Critical (breaks a CAP or makes the app wrong without any AD violation) · High (two builders ship incompatible artifacts that both pass review) · Medium (divergence is real but local/recoverable) · Low (cosmetic).

**Verdict up front:** The spine is strong on layer direction, privacy, and the single-store idea, but it is **under-constrained exactly where the mandate predicted**: it names canonical types without seeding their fields, names a single store without naming the owner of *derived* state, and leaves the seam between adapter side-effects, reducer mutation, and component memoization unspecified. Multiple AD pairs can be satisfied by two builders who still produce incompatible apps. The most load-bearing gap is **derived-state ownership (RowSet/AggregationResult)**: AD-3 lists `AggregationResult` as store state, AD-8 says `applyFilter` is "applied once," and nothing says *who* applies it or *where the result lives* — so a memo-in-component design and a reducer-in-store design both pass.

---

## Findings (genuine holes)

### F1 — Two owners of the derived `RowSet` / `AggregationResult` (HIGH)

**The pair.**

- **Unit A (memo-in-component).** Store holds only *input* state: `Workbook`, `activeSheet`, `FilterState` (exactly what AD-3 enumerates). Each analysis component computes `const rowSet = useMemo(() => applyFilter(activeSheet, filterState), [activeSheet, filterState])` and `const agg = useMemo(() => aggregate(rowSet, dim), [rowSet, dim])`. Chart, pivot, and export each hold their own `RowSet` instance.
- **Unit B (reducer-in-store).** The reducer's `SET_FILTER` / `SET_SHEET` actions invoke `applyFilter` and `aggregate` and store the results in state. Components read `state.rowSet` / `state.aggregationResult`; adapters receive them as arguments.

**ADs obeyed.** A obeys AD-3 (store holds the enumerated inputs) and AD-8 ("applied once," every view consumes "that same RowSet" — within a component it is applied once and shared). B obeys AD-3 (store holds the session) and AD-8 (applied once, in the reducer).

**Incompatibility.** AD-3 enumerates the store's fields and **does not include `RowSet`**, while `AggregationResult` *is* listed — a builder reading AD-3 literally concludes `RowSet` is derived-outside-store and `AggregationResult` is inside-store, producing the worst hybrid (RowSet in the component, AggregationResult in the reducer, computed from two different RowSet instances). Units A and B also disagree on *when* derivation happens (render vs dispatch), on referential stability (A produces a new `RowSet` array every render, invalidating any downstream memo; B produces a stable object), and on whether a chart and the XLSX exporter serialize the *same* object. Two builders pass review; the app computes and exports from different RowSets.

**Proposed AD-12 — Single derivation owner.**
- **Binds:** CAP-3…CAP-7.
- **Prevents:** components and adapters re-deriving pipeline outputs; divergent RowSet/AggregationResult per view.
- **Rule:** Derived values (`RowSet`, `AggregationResult`, chart series) are produced in exactly one place — the store's reducer/selectors — and flow down as read-only state. Components and adapters MUST NOT call `applyFilter`/`aggregate` directly. `RowSet` is recomputed only when `Workbook`, `activeSheet`, or `FilterState` changes, and only on the input state's identity changing. Add `RowSet` to the AD-3 field list and mark `RowSet`/`AggregationResult` as store-owned derived fields.

---

### F2 — `AggregationResult` is singular in the store, but CAP-6 needs many (HIGH)

**The pair.**

- **Unit A (latest-wins).** Store holds one `AggregationResult`; every view switch dispatches and overwrites it. Switching chart→pivot silently replaces the previous aggregation.
- **Unit B (per-view).** Each representation (`ChartCard`, `PivotTable`) keeps its own `AggregationResult`; the store's single field holds whichever view mounted last (or is unused).

**ADs obeyed.** AD-3 (store holds one `AggregationResult` — A uses it, B arguably still complies because it also *has* the field). AD-10 says exports consume "the current `RowSet`/`AggregationResult` + view config the screen uses." AD-8 says `AggregationResult` derives from `RowSet` only.

**Incompatibility.** "Current `AggregationResult`" is undefined when the screen shows a chart grouped by *Исполнитель* and a pivot grouped by *Статус* simultaneously. Unit A's XLSX/PDF export captures the last-touched aggregation, which may not be what is visible; Unit B's export must pick one of several, arbitrarily. Neither violates an AD — **AD-10 cannot guarantee "export matches screen" because the spine never defines the screen's single canonical aggregation.** This is precisely the "export vs screen divergence" the mandate names.

**Proposed AD-13 — Canonical view config & aggregation identity.**
- **Binds:** CAP-6, CAP-7.
- **Prevents:** exports serializing an aggregation different from the displayed one; multiple group-bys coexisting without an owner.
- **Rule:** Define a single `ViewConfig { chartType: 'line'|'bar'|'pie'|'pivot', dimension: ColumnRef, measure: ColumnRef }` in the canonical model. `AggregationResult` is a pure function of `(RowSet, dimension, measure)`. The store holds exactly one `ViewConfig`; every representation renders from that same `(RowSet, ViewConfig)` pair; every exporter consumes the same pair. Switching representation changes `ViewConfig`, not a hidden parallel aggregation.

---

### F3 — AD-4 names canonical types but never seeds their fields (HIGH)

**The pair.**

- **Unit A.** `FilterState = { categories: Record<string, string[]>, dateRange?: { from: Date; to: Date } }`; `AggregationResult = { groups: { key: string; sum: number }[] }`; `ValidationResult = { issues: Issue[]; hasBlocking: boolean }`.
- **Unit B.** `FilterState = { statusIds: number[]; workTypeIds: number[]; dates: Date[] | null }`; `AggregationResult = { rows: { group: string; count: number; sum: number; avg: number }[]; total: number }`; `ValidationResult = { blocking: Issue[]; warnings: Issue[] }`.

**ADs obeyed.** AD-4 says "new fields extend these types; no shadow shapes." Because AD-4 seeds **no fields** for `FilterState`, `AggregationResult`, or `ValidationResult` (it only names them and defines `Column`/`Row`/`CellValue`), *any* shape is a "new field." Both units extend the named types.

**Incompatibility.** The `charts` adapter, `PivotTable`, `FilterBar`, and `exporter/xlsx` were each written against one shape. A's `groups[].key: string` vs B's `rows[].group` means the chart adapter and the exporter cannot share an input type; A's `hasBlocking` vs B's split arrays means the UI gate reads a different field. AD-4's stated purpose ("prevents each surface inventing its own shape") is not delivered for these three types. Same for `ColumnRef`/column identity in the filter shape.

**Proposed AD-4.1 — Seed the shells.**
- **Binds:** CAP-2…CAP-7.
- **Prevents:** surfaces and adapters binding to divergent field names for the same concept.
- **Rule:** Seed minimal, named fields in-tree for `FilterState` (category selections keyed by canonical column identity + optional inclusive date range + explicit "no filter" encoding), `AggregationResult` (`dimension`, `measure`, `groups[{ key, sum, count }]`), and `ValidationResult` (`issues: Issue[]`, derived `hasBlocking`). New fields may be added; none of the seeded fields may be renamed or shadowed. Mirror this in the ERD.

---

### F4 — Section-marker exclusion has no single owner; `RowSet` purity is undefined (HIGH)

**The pair.**

- **Unit A (exclude in pipeline).** `detectSectionMarkers` flags `isSectionMarker`, and `applyFilter` drops flagged rows; `RowSet` is marker-free by construction. Charts/pivot/export never see markers.
- **Unit B (exclude at consumer).** `RowSet` carries all rows (markers included); each of `aggregate`, `PivotTable`, and `exporter/xlsx` filters `!row.isSectionMarker` locally.

**ADs obeyed.** AD-6 defines the marker and sets `isSectionMarker`. AD-8 says `applyFilter` produces the `RowSet` and every view consumes it. AD-5 says warnings never silently repair. Both units flag and warn; neither repairs. Neither AD says **where** exclusion happens.

**Incompatibility.** Totals differ if any consumer forgets the local filter (B) — and AD-10's XLSX export from `RowSet` will contain or omit 49 marker rows depending on the unit. `isSectionMarker` also has two plausible computation sites: AD-6's `schema.ts`/header rules vs the `detectSectionMarkers` pipeline stage — and the declared order (`validate → inferTypes → detectSectionMarkers → applyFilter`) means markers are only known *after* type inference, so a builder that wants marker-free typing must compute markers early (violating order) or accept skew. Two more compliant variants exist for *when* the flag is set.

**Proposed AD-14 — Marker-free analysis invariant.**
- **Binds:** CAP-2, CAP-5, CAP-6, CAP-7.
- **Prevents:** consumers silently disagreeing on which rows count; export/screen row-set drift.
- **Rule:** Marker detection is owned solely by `detectSectionMarkers`; the pipeline emits a marker-free `RowSet` at a single defined point (before `applyFilter`). `RowSet` and everything downstream of it are marker-free; no consumer re-filters `isSectionMarker`. The warning is produced at detection time and carried in `ValidationResult`; exclusion is never silent (AD-5).

---

### F5 — `ValidationResult` is per-sheet in the ERD, single in the store, and `Issue` cannot name a sheet (MEDIUM-HIGH)

**The pair.**

- **Unit A (per-file).** Validate all sheets on load; store one `ValidationResult`; a blocking issue anywhere halts the whole file.
- **Unit B (per-sheet).** Store one `ValidationResult` that is recomputed when `SET_SHEET` fires; only the active sheet is validated.

**ADs obeyed.** AD-3 says the store holds "`ValidationResult`" (singular). The ERD says `SHEET ||--|| VALIDATIONRESULT` (one per sheet). AD-5 says "blocking halts analysis **for the file/sheet**" — using both nouns. AD-5's `Issue { severity, code, message, column? }` has **no `sheet` field**, so Unit A cannot attribute an issue to its sheet in the UI.

**Incompatibility.** For a multi-sheet workbook, A blocks the file when sheet 2 is invalid even while sheet 1 is clean; B lets the user proceed on sheet 1. The ERD and AD-3 already disagree on cardinality, and `Issue` cannot express the correct one. "New file" reset scope and the warning-banner lifetime ("до смены файла," per EXPERIENCE) also hinge on this.

**Proposed AD-15 — Validation scope & issue attribution.**
- **Binds:** CAP-1, CAP-2, CAP-3.
- **Prevents:** file-vs-sheet blocking divergence and unattributable issues.
- **Rule:** `ValidationResult` is **per sheet**; the store holds `Record<sheetKey, ValidationResult>` (or the active sheet's result plus a per-sheet map). Add `sheet?` to `Issue`. Blocking on one sheet halts analysis for that sheet only; parse-level failures (`UNSUPPORTED_FORMAT`, `CORRUPT_FILE`, `ROW_LIMIT_EXCEEDED`) remain file-scoped. Reconcile the ERD cardinality.

---

### F6 — Type-inference / date-filter seam: threshold, string-encoded dates, and AD-9 conflict (MEDIUM-HIGH)

**The pair.**

- **Unit A (strict, AD-9-pure).** Adapter reads with `cellDates`, so only true Excel date-formatted cells become `Date`. `inferTypes` classifies a column `date` iff the **majority** of non-empty values are `Date`. A column of date-like **strings** ("08.10.2026") stays `text` → no date filter. AD-9's "everything else `string`" is honored to the letter.
- **Unit B (capability-first).** `inferTypes` runs a date heuristic on strings, converting parseable ones to `Date`, and classifies `date` if **any** non-empty value parses. Date filter appears.

**ADs obeyed.** AD-9 says "at parse, date cells become `Date`… everything else `string`." Unit A is literal; Unit B adds a conversion in `inferTypes` (a domain function) that arguably still keeps "everything else" as string post-conversion. AD-8 says the date filter exists "only when at least one `Column.type === 'date'`" — both produce a `Column.type`. Story 2 fixes the **numeric** threshold ("по большинству непустых"), but the **date** threshold is defined nowhere.

**Incompatibility.** The same CRM/1С export produces a date filter in B and none in A — directly colliding with CAP-5 success ("фильтр можно снять") and the UX promise that a recognized date column activates the filter. AD-9 and CAP-5 are in tension for string-encoded dates, and no AD resolves it.

**Proposed AD-16 — One type-inference rule; UTC dates.**
- **Binds:** CAP-4, CAP-5, CAP-7.
- **Prevents:** two builders disagreeing on "is this a date column," and off-by-one-day filters.
- **Rule:** `inferTypes` owns one documented rule: a column is `date` iff the majority of non-empty values are dates (matching the numeric rule in Story 2); date-like strings are normalized to `Date` **only inside `inferTypes`** (one named step), not in the adapter; all `Date`s are normalized to UTC midnight for date-only data. The date filter uses inclusive `[from, to]` bounds in UTC; ISO-8601 export uses the same instant. Record the exact threshold and string formats accepted.

---

### F7 — Adapter ↔ store boundary: who dispatches, and can adapters import UI? (HIGH)

**The pair.**

- **Unit A (component orchestration).** `UploadScreen` calls `fileSource.read()` then `spreadsheet.parse()` then dispatches `{ type: 'LOAD_FILE' }`. Adapters are pure I/O.
- **Unit B (adapter/effect orchestration).** The parse adapter imports the store (or a dispatch singleton) and dispatches `LOAD_FILE` itself (or a "store effect" module calls adapters).

**ADs obeyed.** AD-2 only forbids `domain` from importing React/SheetJS/Chart.js/DOM — it says **nothing** about adapters, and the diagram edge `ADP --> DOM` permits adapters to depend on domain; importing UI is not forbidden by any AD. AD-3 says state changes via reducer actions — Unit B dispatches a reducer action.

**Incompatibility.** The spine's core promise is **one dependency direction** ("the single most load-bearing shape here"), yet Unit B creates `ADP → UI` (adapter imports store), an unlisted, backwards edge that the layer diagram does not show and no AD blocks. Unit A creates an async orchestration site (component callbacks) with no owner; Unit B creates an adapter that both parses and coordinates. The two units place async sequencing in different layers, and error handling (adapter throws vs dispatch blocking `Issue`) diverges. AD-2's prevention clause ("logic leaking into components or adapters") is not enforced for orchestration.

**Proposed AD-17 — Adapters are pure I/O; UI orchestrates.**
- **Binds:** all.
- **Prevents:** reverse dependencies (`ADP → UI`) and duplicated async orchestration.
- **Rule:** Adapters return data/throw typed errors and MUST NOT import `ui/`, the store, or dispatch anything. Dependency direction is exactly `UI → {DOM, ADP}`, `ADP → DOM`. A single UI orchestration layer (hooks, e.g. `useLoadWorkbook`) sequences adapter calls and dispatches reducer actions; every adapter error is mapped to an `Issue` at that boundary.

---

### F8 — "Mutated via reducer actions" invites in-place mutation → stale closures (HIGH)

**The pair.**

- **Unit A (immutable).** Every reducer action returns a new top-level state object; domain functions never mutate inputs.
- **Unit B (in-place).** `LOAD_FILE`/`SET_FILTER` mutate the workbook/filter object and return the same reference; a "delete marker rows" step `splice`s the workbook rows in place.

**ADs obeyed.** AD-3 literally says the store is "**mutated** via reducer actions (`LOAD_FILE`, `SET_SHEET`, `SET_FILTER`, `RESET`)." Unit B is arguably the literal reading.

**Incompatibility.** With Unit B, `useMemo`/`React.memo` keys on the workbook or RowSet never change → charts/derived data don't update (stale closures over the mutable workbook), and the mandate's named React hazards fire. AD-3 never states immutability, and the word "mutated" actively licenses the broken design. Combined with F1 (memo-in-component), this is fatal.

**Proposed AD-18 — Immutable session state.**
- **Binds:** CAP-1…CAP-7 (UI).
- **Prevents:** React missing updates due to identity-preserving mutation; stale closures over the workbook.
- **Rule:** Reducer actions return new top-level state; the `Workbook`, `Sheet`, `RowSet`, and `FilterState` are treated as immutable. Domain pipeline functions are pure and never mutate their arguments. Replace "mutated via reducer actions" with "updated via reducer actions."

---

### F9 — Chart/canvas instance ownership and StrictMode double-invoke (HIGH)

**The pair.**

- **Unit A (adapter owns instance).** `adapters/charts.ts` creates a `new Chart(canvas, ...)`, stores it in a module-level map keyed by canvas id, and never destroys it except on explicit teardown. The PNG exporter reads from the same stored instance.
- **Unit B (component owns instance).** `ChartCard` holds the instance in a ref created inside `useEffect`, destroys it in the effect cleanup, and the exporter reads the canvas element via `canvas.toBlob` at click time.

**ADs obeyed.** AD-2 (Chart.js stays out of domain), AD-10 (PNG "reproduces the active chart canvas"). Neither AD names the instance owner, lifecycle, resize handling, or StrictMode behavior.

**Incompatibility.** Under React 19 `StrictMode` (dev), effects mount→unmount→mount: Unit B must destroy/recreate exactly once or it leaks a second canvas/instance and PNG exports a blank or wrong chart; Unit A's module-level map survives the doubled mount but pins the "active" canvas even after the component unmounts, so the exporter can read a detached canvas. The two units also diverge on theme re-render (chart must be rebuilt on theme change per EXPERIENCE) and on devicePixelRatio. All of this is invisible to the current ADs; the export "matches the screen" guarantee (AD-10) is only as good as an unstated single-owner rule.

**Proposed AD-19 — One canvas, one instance, one owner.**
- **Binds:** CAP-6, CAP-7.
- **Prevents:** leaked/duplicated Chart.js instances, blank or stale PNG exports, StrictMode double-invoke breakage.
- **Rule:** Exactly one owner creates, resizes, and destroys each chart instance, keyed to that canvas's ref; instances are destroyed on unmount/replacement and re-created on theme/data change. The exporter reads the live instance owned by that hook — never a module-level registry. Side effects that parse/render are idempotent under StrictMode double-invoke.

---

### F10 — AD-2 ("every data rule in the domain") contradicts AD-7 (row limit in the adapter) (MEDIUM)

**The pair.**

- **Unit A (adapter guard).** `spreadsheet.ts` rejects >30 000 rows immediately after SheetJS read, before building the model — exactly AD-7. Counts **all** non-empty rows.
- **Unit B (domain guard).** A `domain` function `enforceRowLimit` runs in the pipeline and counts **data** rows (excluding header + the 49 markers) — arguably required by AD-2 ("every data rule… lives in the domain as a pure function").

**ADs obeyed.** AD-7 says "the parse adapter rejects any file above **30 000 data rows**"; AD-2 says every data rule is a domain pure function. Both units cite an AD.

**Incompatibility.** The two ADs prescribe different owners for the same rule; the two units implement different counts ("all non-empty rows" vs "data rows") and enforce at different stages, so a 30 050-row file with 100 markers is rejected by A and accepted by B — while both pass review. `file-source.ts` is annotated "(AD-7)" but only returns bytes and cannot count rows; the real check is in `spreadsheet.ts`, an unstated relocation.

**Proposed AD-7.1 — Row-limit ownership and count.**
- **Binds:** CAP-1.
- **Prevents:** two enforcement sites and an ambiguous row count near the limit.
- **Rule:** The row limit is a domain constant and a domain pure predicate (`exceedsRowLimit(count, limit)`); the parse adapter invokes it once, after decode and before model construction. "Data row" = a non-empty row excluding the header and section-marker rows. A `ROW_LIMIT_EXCEEDED` blocking `Issue` names both the count and the limit (30 000).

---

### F11 — Structure-normalization ownership: header row, merged cells, hidden sheets, formulas (MEDIUM)

**The pair.**

- **Unit A (adapter normalizes).** `spreadsheet.ts` finds the header row, fills merged cells, drops hidden sheets, and reads formula cached values.
- **Unit B (domain normalizes).** The adapter emits the raw grid; `validateStructure`/`schema.ts` locate the header row and treat merged/hidden/formula cases, emitting warnings.

**ADs obeyed.** AD-6 owns header **matching** (normalization of names) but not header-**row detection**. `data-input-rules.md` requires warnings for extra header rows, merged cells, hidden sheets, and "formulas as-is," but **no AD assigns these to a layer**; both units are defensible under AD-2/AD-3.

**Incompatibility.** Header-row detection in the adapter (A) means `validateStructure` never sees the raw rows and cannot warn about "extra header rows"; in the domain (B) means the adapter surface differs. Merged-cell fill changes row shape before `Row{ cells }` is built in A but after in B. Formula cells: A reads `v` (cached value), B may surface `f` as a string → type inference sees `text` and the sum column breaks. The 49-marker rule (a form of "extra header row") is owned by AD-6 while merged/hidden are owned by nobody.

**Proposed AD-20 — One structure-normalization stage.**
- **Binds:** CAP-1, CAP-2, CAP-4.
- **Prevents:** normalization split across adapter and domain; silently dropped hidden sheets; formula text polluting types.
- **Rule:** The adapter only transcribes raw cells (using cached formula values, `cellFormula:false`); all structure interpretation — header-row detection, merged-cell fill, section-marker detection, hidden-sheet and irregular-construct warnings — lives in one named domain stage that emits `Issue`s. Hidden sheets are never silently dropped (per `data-input-rules.md`).

---

### F12 — `Issue.code` catalog is incomplete → message-catalog divergence (MEDIUM)

**The pair.**

- **Unit A** emits invented codes for conditions the spine doesn't name: `MERGED_CELLS_PRESENT`, `HIDDEN_SHEETS_PRESENT`, `MISSING_VALUES`, `TYPE_MISMATCH`.
- **Unit B** emits different codes for the same conditions: `MERGED_CELL_FILLED`, `HIDDEN_SHEET_EXCLUDED`, `EMPTY_VALUES`, `IMPLIED_TYPE_FALLBACK`.

**ADs obeyed.** AD-5 fixes the `Issue` **shape** but names only five codes (`MISSING_REQUIRED_COLUMN`, `ROW_LIMIT_EXCEEDED`, `SECTION_ROWS_EXCLUDED`, `UNSUPPORTED_FORMAT`, `CORRUPT_FILE`). The consistency convention says errors map to UI text **by `code`**. Inventing codes for unnamed conditions violates nothing.

**Incompatibility.** `data-input-rules.md` mandates warnings for merged cells, hidden sheets, extra header rows, and missing values — all code-less in the spine — so the single `ru` catalog keyed by `code` disagrees between units and the "one Issue shape" promise (AD-5) yields different user-facing text for the same file.

**Proposed AD-5.1 — Closed code catalog.**
- **Binds:** CAP-2 and all error surfaces.
- **Prevents:** divergent codes and untranslatable issues for spec-mandated warnings.
- **Rule:** The `Issue.code` catalog is a closed domain enum covering every warning in `data-input-rules.md` (add codes for merged cells, hidden sheets, missing values, type-inference fallback, irregular header rows). New codes require a spine update; the `ru` catalog is keyed 1:1 to codes.

---

### F13 — Filter empty-selection semantics: "no filter" vs "match nothing" (MEDIUM)

**The pair.**

- **Unit A.** An empty category selection means *no filter* (show all); `RESET` clears arrays.
- **Unit B.** An empty selection means *match nothing* (empty result → "Фильтр без результатов" empty state).

**ADs obeyed.** AD-8 fixes AND-across/OR-within but never defines the empty-selection case or how `FilterState` encodes "unfiltered."

**Incompatibility.** On first load / after "Сбросить фильтры," A shows all data, B shows an empty state — a visible, immediate divergence with no AD violated. The UX "Сбросить — один клик" and empty-state copy depend on which meaning is canonical.

**Proposed AD-8.1 — Filter tri-state.**
- **Binds:** CAP-5.
- **Prevents:** "no filter" and "match nothing" colliding.
- **Rule:** `FilterState` distinguishes "category unfiltered" (absent key) from "category filtered to a set" (present key, non-empty); an empty set is never produced by the UI. `RESET` removes keys, restoring the unfiltered state.

---

## Nitpicks (not gate-blocking)

- **N1 — "sheets keyed by name."** Excel normally forbids duplicate sheet names, but a malformed file can yield collisions that would silently collapse two sheets under one key. Low; a note to prefer a stable synthetic sheet key (index + name) would remove the ambiguity. The mandates "active sheet owned by store" is otherwise adequately covered by AD-3 + F1.
- **N2 — `Column` identity "index + normalized header name"** becomes ambiguous with duplicate headers (two "Статус" columns). Low; document the tie-break (first occurrence wins) or require a unique disambiguator.
- **N3 — Chart/export theme.** AD-10's "view config" does not mention the light/dark theme that EXPERIENCE says must apply to charts and exports. Partly subsumed by F2's `ViewConfig`; call it out there rather than as a separate AD.
- **N4 — Deferred Web Worker trigger "<1s parse."** Unmeasurable as written and untestable; not an architectural hole, just an unimplementable trigger. Suggest a concrete percentile or drop the number.
- **N5 — Fonts/`Intl` determinism.** AD-9's `Intl ru-RU` display vs "numbers unformatted in exports" is clear; the only residue is whether grouping separators ever leak into XLSX. Covered by AD-9 already — not a hole.

---

## Summary of proposed closures

| # | Hole (one line) | Severity | Proposed AD (gist) |
| --- | --- | --- | --- |
| F1 | Two owners of derived `RowSet`/`AggregationResult` (memo vs reducer) | High | AD-12: one derivation owner in store; consumers read only |
| F2 | Singular `AggregationResult` can't serve 4 views → export/screen drift | High | AD-13: canonical `ViewConfig`; export consumes it |
| F3 | AD-4 names `FilterState`/`AggregationResult`/`ValidationResult` without fields | High | AD-4.1: seed minimal fields; no renames |
| F4 | Section-marker exclusion has no owner; `RowSet` purity undefined | High | AD-14: marker-free invariant at one pipeline point |
| F5 | Validation per-file vs per-sheet; `Issue` can't name a sheet | Med-High | AD-15: per-sheet `ValidationResult`; `Issue.sheet` |
| F6 | Date filter: threshold + string dates; AD-9 vs CAP-5 tension | Med-High | AD-16: one inference rule; UTC dates/bounds |
| F7 | Adapter may import store/dispatch; async orchestration unowned | High | AD-17: adapters pure I/O; UI orchestrates; no `ADP→UI` |
| F8 | "mutated via reducer" invites in-place mutation → stale closures | High | AD-18: immutable state; pure domain functions |
| F9 | Chart/canvas instance ownership + StrictMode double-invoke | High | AD-19: one canvas, one instance, one owner; idempotent |
| F10 | AD-2 vs AD-7: row-limit owner and "data row" count | Medium | AD-7.1: domain predicate, single adapter call, defined count |
| F11 | Header-row/merged/hidden/formula normalization unowned | Medium | AD-20: adapter transcribes; one domain normalization stage |
| F12 | `Issue.code` catalog incomplete for spec-mandated warnings | Medium | AD-5.1: closed code catalog; 1:1 catalog keys |
| F13 | Empty filter selection = "all" vs "none" | Medium | AD-8.1: tri-state filter; absent key = unfiltered |

**Gate opinion:** the spine should not be marked build-ready until at least **F1, F2, F3, F4, F7, F8, F9** are closed (all High). F2+F4+F10 together are what let two builders ship apps whose charts and exports disagree while passing every current AD — the exact failure mode this gate exists to catch.
