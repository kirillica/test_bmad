# Rubric Walk Review — ARCHITECTURE-SPINE.md (XLS-Analytics)

- **Artifact reviewed:** `_bmad-output/planning-artifacts/architecture/architecture-bmad_test-2026-10-13/ARCHITECTURE-SPINE.md`
- **Reviewer role:** Rubric Walker (architecture-spine review gate)
- **Date:** 2026-10-13
- **Altitude:** feature (7 CAP, 5 stories)
- **Cross-checked against:** SPEC.md + data-input-rules.md + success-metrics.md + stories.yaml (`spec-xls-analytics`), PRD draft, UX `DESIGN.md` / `EXPERIENCE.md`, `.memlog.md`.
- **Method:** each of the 8 checklist items walked independently; every CAP mapping verified against the source tree; every AD checked for enforceability against its stated divergence; web re-verification attempted but search was cancelled, so the Stack is treated as *claimed-verified* and sanity-checked for internal coherence only.

**Verdict (one line):** The spine is well-shaped and genuinely fixes the big structural divergence points (pure domain, single store, one Issue shape, shared `RowSet`), but it leaves the **data-semantics layer** (type inference, blank values, unstable XLS constructs, severity gating) under-governed and is **silent on the operations dimension** — several real Story-level divergences are therefore still open.

---

## Rubric item 1 — Fixes the real divergence points for the level below, misses none

**Partial.** The spine nails the *structural* divergences (layer direction AD-2, single store AD-3, one model AD-4, one issue shape AD-5). But the level below is 5 stories, and these divergences between them are **not fixed anywhere**:

- Story 2 (CAP-4) vs Story 1 (CAP-2): how a *column* is classified (`inferTypes`) — threshold/percentage, empty-column handling, "majority of non-empty values" rule stated in `stories.yaml` story 2 and `data-input-rules.md` — is decided by no AD. `AD-4` fixes the *set* of types, `AD-9` fixes *per-cell* normalization; neither fixes *column inference*.
- Story 1 vs Story 4/5: what a blank cell means for aggregation (excluded vs `0`) and how missing values in required columns are surfaced (blocking vs warning) — ungoverned; see finding **C1**.
- Story 1: atomic load / "no residual partial state" (explicit in SPEC CAP-1 success and `stories.yaml` story 1) — ungoverned; see **H2**.
- Merged cells & hidden sheets (spec Constraints, `data-input-rules.md`) — ungoverned; see **H1**.

## Rubric item 2 — Every AD's Rule is enforceable and prevents its stated divergence

| AD | Enforceable? | Prevents stated divergence? | Note |
|---|---|---|---|
| AD-1 no egress | Yes (review/lint + network-assertion test) | Yes | Strong. |
| AD-2 layer direction | Yes (import boundary) | Yes | Strongest rule here. |
| AD-3 single store | Convention-level | Yes | Not mechanically enforced; reviewable. |
| AD-4 canonical model | Yes (types) | Yes | Mirrors ERD; good. |
| AD-5 one issue shape | Convention-level | Yes | Good; but severity *matrix* missing (H4). |
| AD-6 schema/headers | Yes (constant) | Mostly | Section-marker rule good; header-row location not fixed. |
| AD-7 row limit | **No** | **Not reliably** | Self-contradiction + not enforceable as written; see **H5**. |
| AD-8 filter/aggregate shared | Yes | Yes | Strong; conj/disj rule is a real fix. |
| AD-9 date/number norm | Mostly | Yes | ISO-8601-vs-native-XLSX-date incoherence; see **L7**. |
| AD-10 export derivation | Yes | Yes | Good. |
| AD-11 static artifact | Yes | Yes | Good. |

Net: 10 of 11 ADs are sound. **AD-7 is the weak one** (and it is the AD guarding a hard spec limit).

## Rubric item 3 — Nothing under Deferred could let two units diverge

**Pass, with one caveat.** All six Deferred items are single-decision, non-divergent (Web Worker, PWA, extra i18n, session persistence—blocked by AD-3, column-mapping UI, theme tokens). Caveat: "Column-mapping UI for non-standard headers" is deferred *and* the underlying `REQUIRED_COLUMNS` set is provisional (single sample). That is safe for v1 because non-conforming files hard-block at AD-6, so no divergence — but the deferral should state that explicitly. No Deferred item is a divergence hazard.

## Rubric item 4 — Named tech verified-current (sanity-check coherence)

Internal coherence is **mostly good**: Node `^20.19.0 || >=22.12.0` matches a Vite-8-era requirement; `@vitejs/plugin-react` 6.1.2 / React 19.3.0 align; Vitest 5.0.4 trio (`@vitest/browser`, `@vitest/coverage-v8`) is consistent; `jsdom` canvas caveat is correctly handled; SheetJS CDN-tarball + banned `xlsx@0.18.5` is correct and coherent.

Two coherence concerns (cannot re-verify online — search tool cancelled; treated as claimed-verified):
- **M5:** `ESLint 10.12.0` + `typescript-eslint 8.71.2` is a risky pair — typescript-eslint v8 historically peers ESLint `^8.57 || ^9`; ESLint 10 typically needs typescript-eslint v9. Verify peer graph.
- **L4:** `@vitest/browser` is pinned at 5.0.4 but the Playwright driver it requires is unpinned.

Note: the TS `6.0.x` pin is justified by a *different* peer constraint (`typescript-eslint <6.1.0`) than the ESLint risk above — so both constraints must hold simultaneously; worth a single verification pass.

## Rubric item 5 — Ratifies rather than contradicts a brownfield codebase

**N/A.** Greenfield: `glob **/*.{ts,tsx,js,jsx,json}` returns nothing; no `src/`, `package.json`, or build files exist. No codebase to ratify.

## Rubric item 6 — A spec drove it; all CAP-1..CAP-7 map to real locations, none ungoverned

**All 7 capabilities map to real locations and cite governing ADs.** Verified against the source tree in the Structural Seed:

| CAP | Location exists in tree? | Governance sufficient? |
|---|---|---|
| CAP-1 | `adapters/file-source.ts`, `adapters/spreadsheet.ts`, `ui/screens/` | Partly — corrupt-file Issue shape comes from AD-5, not cited; row-limit rule broken (H5). |
| CAP-2 | `domain/pipeline/` + `domain/schema.ts` | Partly — type/passthrough validation not clearly governed. |
| CAP-3 | `ui/screens/` + `ui/store` | **No** — preview behavior (row count, marker/hidden-sheet visibility) ungoverned (M6). |
| CAP-4 | `domain/pipeline/inferTypes` | **No** — inference rule itself ungoverned (C1); map cites AD-6 (schema) which is not about types. |
| CAP-5 | `domain/pipeline/applyFilter` + `ui/components/FilterBar` | Partly — filterable set & date operators ungoverned (M1). |
| CAP-6 | `ui/components/` + `adapters/charts.ts` | Partly — aggregation measure/grouping ungoverned (M2). |
| CAP-7 | `adapters/exporter/*` | Partly — export payload ambiguity (M3). |

So: **coverage = yes, governance = incomplete** for CAP-3 and CAP-4 in particular. Also note the spec's own residual contradiction (SPEC.md line 80 still says the required-column set "не определён / блокер", while `data-input-rules.md` fixes B–G and the memlog says the blocker was closed). The spine correctly *chooses* B–G but its Deferred text echoes the stale "open blocker" (L2).

## Rubric item 7 — No inherited parent spine

**N/A.** Frontmatter declares `altitude: feature` and no parent spine; `sources:` lists only the spec/PRD/UX. Correct.

## Rubric item 8 — Every owned dimension decided, deferred, or an open question

| Dimension | State | Assessment |
|---|---|---|
| Design paradigm | Decided | Good. |
| Invariants / boundaries | Decided (AD-1..AD-11) | Good; AD-7 weak. |
| Data model | Decided | Good; semantics gaps (C1). |
| Stack | Decided | Good; peer risks (M5/L4). |
| Deployment & environments | Decided | Good (static `dist/`, dev Vite). |
| Infra / provider strategy | Implicitly decided | "Any static host / local"; acceptable for client-only, but not framed as a decision. |
| **Operations** | **SILENT** | **Whole dimension missing** (H6): no error-reporting/diagnostics, no release/versioning, no CI, no telemetry stance. |
| Security | Partial | AD-1 (no egress) good; XLSX formula-injection on export & CSP unaddressed (M7). |
| Performance | Partial | `< 1 min` is a spec architectural constraint but has no budget/invariant (H3). |
| Testing | Decided | Good (Vitest + browser mode). |
| i18n | Partial | "one ru catalog" but no library/mechanism (M4). |
| Accessibility | Not referenced | UX owns WCAG 2.2 AA; spine doesn't defer it explicitly (L6). |
| Browser support matrix | Silent | Desktop stated in UX, not pinned here (L5). |
| Human-readable view | Partial | Memlog decides a C4 set (context/containers/components); spine delivers container only (L3). |

The two whole-dimension flags the rubric specifically asks about: **Operations** (H6, silent) and the **operational/environmental envelope** more broadly — deployment is covered, infra implicitly covered, **operations is not**.

---

## Findings

### CRITICAL

**C1 — Type inference and blank-value policy are ungoverned; aggregation can silently produce different numbers per story.**
`AD-4` fixes the *type set* and `AD-9` fixes *per-cell* normalization, but no rule fixes (a) how `inferTypes` classifies a **column** (threshold / majority-of-non-empty, as `stories.yaml` story 2 and `data-input-rules.md` require), or (b) whether a `null`/blank cell is **excluded** from or counted as **0** in `aggregate`. Two builders (Story 2 vs Story 4) will differ, and because `aggregate` is the input to CAP-6/CAP-7 the divergence is invisible until the numbers disagree — directly undermining SM-1/SM-2 and the pivot.
*Fix:* add `AD-12 — Column type inference & missing-value semantics`: define the classification rule (e.g. a column is `number`/`date` if ≥X% of non-empty values parse as such, else `text`; partial-column rule = majority of non-empty), and state the blank policy per type (`null` preserved; aggregation excludes `null`, never coerces to `0`); bind CAP-2/CAP-4/CAP-6; and fix it as a pure domain function so it is unit-testable.

### HIGH

**H1 — Merged cells and hidden sheets (spec-mandated XLS constructs) are not architected.**
`data-input-rules.md` requires merged cells, extra header rows, and hidden sheets be handled without crashing and **warned, not silently fixed**. Only "extra header rows" (section markers) is governed (AD-6). Nothing says how a merged cell maps into `CellValue`/`Column`, or whether hidden sheets are listed/analyzed/warned. Two builders will diverge, and the failure mode is exactly the "silent distortion" the spec forbids.
*Fix:* extend AD-5/AD-6 with a rule: merged-cell fill-forward with a `MERGED_CELLS` warning; hidden sheets detected and named via a `HIDDEN_SHEET` warning and either excluded or explicitly flagged in the sheet list; bind to CAP-2/CAP-3.

**H2 — No atomic-load / "no partial state on failure" rule (Story 1 requirement).**
SPEC CAP-1 success and `stories.yaml` story 1 both require that a corrupt/invalid file leaves **no residual partial state**. `AD-3` lists a `RESET` action but nothing makes load transactional. A builder can commit a partially-parsed workbook before the error, violating the contract.
*Fix:* add a rule: `LOAD_FILE` is atomic — on any blocking `Issue` the store returns to the pre-load (or empty) state; no partial `Workbook`/`Sheet` is observable. Bind CAP-1.

**H3 — The `< 1 minute` envelope is a spec-level architectural constraint with no architecture invariant.**
SPEC Assumptions and `success-metrics.md` explicitly elevate "загрузка → первый график < 1 минуты" to a constraint "ограничивающий архитектурные решения", yet the spine has no performance budget or invariant (only a Deferred Web-Worker *trigger*). Nothing stops a builder re-parsing/re-aggregating on every render, blowing the envelope.
*Fix:* add a performance rule/budget: parse+infer+first-aggregate on the main thread must complete within a stated budget at 30 000 rows; `applyFilter`/`aggregate` memoized on `(RowSet, filterState)` identity; bind all CAPs and cite the metric.

**H4 — Blocking-vs-warning severity matrix is unspecified.**
AD-5 defines the *shape* of `Issue{severity}` but not *which* conditions are blocking vs warning. The spec fixes only "missing required column → blocking"; it is silent on blank values in required columns, wrong types, unparseable dates, empty sheet, no-data-after-filter. Different builders will gate differently (block vs warn), diverging Stories 1–4.
*Fix:* add a severity matrix table (condition → severity → code) to AD-5, e.g. missing required column = blocking; blank value in required column = warning; undetectable type = warning→text; empty post-filter result = non-issue (empty state). Bind all error surfaces.

**H5 — AD-7 (row limit) is unenforceable and self-contradictory; it does not prevent the divergence it claims.**
AD-7 says "rejects any file above 30 000 **data rows** … **before** constructing the `Sheet` model … **per-file constant**." Problems: (i) counting *data* rows (excluding 49 marker rows) requires reading/parsing all rows, so the adapter cannot know the count "before" parsing, and SheetJS has already materialized the sheet — the stated OOM prevention is not delivered; (ii) "data rows" vs "raw rows" changes the limit outcome for marker-heavy files, contradicting "per-file"; (iii) per-file vs per-sheet is exactly the "per-sheet-vs-per-file inconsistency" it claims to prevent. `EXPERIENCE.md` Flow-2 counts "строк 45 000" (raw).
*Fix:* restate: the limit is **30 000 raw rows per file** (all sheets summed, header row excluded, marker rows counted), checked in the parse adapter using the sheet range (`!ref`) before materializing cell arrays; name the exact counter and bind CAP-1.

**H6 — The Operations dimension is entirely silent.**
No decision, deferral, or open question for: error reporting/diagnostics (how a field parse failure is diagnosed given AD-1 forbids egress), logging policy beyond "no cell contents", release/versioning, or CI/build pipeline. Rubric item 8 explicitly requires whole dimensions be decided, deferred, or opened — this one is left blank.
*Fix:* add an "Operations & environments" subsection: state explicitly that telemetry/remote error reporting is **out of scope** (client-only + AD-1) and therefore diagnostics are local-only; defer release/versioning and CI as explicit Deferred bullets with triggers. At minimum, mark the dimension as a conscious N/A.

### MEDIUM

**M1 — Filterable-column set and date-filter semantics ungoverned.**
Story 3 fixes categories (Статус, Тип работы, Тип задачи, Исполнитель, Эпик) and AD-8 fixes boolean logic, but nothing enumerates the filterable set (e.g. is Эпик, a *recommended* column, a filter when absent?) or defines date-filter operators (range vs exact, inclusive bounds).
*Fix:* add a domain constant `FILTERABLE_CATEGORIES` (with graceful drop when a column is absent) and a date-filter rule (inclusive range on `Date`), bind CAP-5.

**M2 — Aggregation/pivot measure, grouping, and ordering ungoverned.**
AD-8 says `AggregationResult` derives from `RowSet` but never fixes *what* is summed (must be `Затрачено времени (ч)` = column G, not H/I), the grouping dimension set, or the ordering of groups/bars/categories. Two builders diverge on numbers and layout.
*Fix:* add: pivot = group-by(dimension) × sum(G); `MEASURE_COLUMN` constant; define stable ordering (e.g. descending sum, ties alphabetical).

**M3 — XLSX export payload and PDF "summary" ambiguous.**
AD-10 says XLSX writes "current `RowSet`/`AggregationResult`" (which one?) and PDF renders "chart + summary" (which summary?).
*Fix:* specify XLSX = filtered `RowSet` (raw rows) with an aggregated sheet option; PDF = active chart image + the current pivot table; bind CAP-7.

**M4 — i18n mechanism undecided.**
The convention mandates "one `ru` message catalog — no hardcoded strings", but no library/approach is named, so two builders pick different mechanisms.
*Fix:* name the approach (e.g. a typed plain-TS catalog module with `code → string` lookup) or state it is intentionally ad hoc; bind AD-5 error mapping.

**M5 — `ESLint 10.12.0` + `typescript-eslint 8.71.2` peer-compatibility risk.**
Coherence check: typescript-eslint v8 has historically not supported ESLint 10; combined with the separate TS `<6.1.0` peer this is a two-way peer squeeze.
*Fix:* verify the exact peer graph on peer-fetch; if incompatible, move to `typescript-eslint` v9 or ESLint 9.

**M6 — CAP-3 preview behavior ungoverned.**
How many preview rows, whether section-marker rows are shown in preview, and whether hidden sheets appear — none decided; the map merely points at the store.
*Fix:* add a preview rule (e.g. first 50 post-validation rows of the active sheet, markers visible but styled) to AD-3/AD-4 and bind CAP-3.

**M7 — Security beyond no-egress is unaddressed.**
No stance on XLSX **formula injection** on export (cells beginning `=`,`+`,`-`,`@` become live formulas), nor on CSP for the static host. Given local sensitive data, this is a real gap.
*Fix:* add an export-sanitization rule (prefix/escape formula-leading strings) and a Deferred/notes bullet for a strict CSP on the static host.

### LOW

**L1 — Capability→Architecture Map drift.** Paths are inconsistent with the source tree (`ui/store` vs `ui/store/workbook-store.ts`; `ui/screens/UploadScreen` vs `UploadScreen.tsx`), CAP-1 omits AD-5 (its corrupt-file error) and CAP-4 cites AD-6 (schema) for a type-inference concern.
*Fix:* align path notation and re-cite governing ADs (CAP-4 → new AD-12).

**L2 — Stale spec blocker echoed into Deferred.** SPEC.md line 80 still says the required-column set is undefined/blocked, while data-input-rules + memlog closed it; the spine's Deferred repeats "already an open blocker".
*Fix:* reword the Deferred bullet to say the blocker was resolved by the sample and B–G; note SPEC.md line 80 is stale.

**L3 — C4 human-readable view incomplete.** The memlog decides context/containers/components; the spine delivers a container view + ERD + tree, no context (external actors/systems) or component view.
*Fix:* either add a minimal context view (user ↔ browser ↔ local file) and a component view, or mark the reduced scope as intentional.

**L4 — Playwright unpinned.** `@vitest/browser` 5.0.4 needs a Playwright driver with a pinned version.
*Fix:* add `playwright` to the Stack with a version.

**L5 — No browser-support matrix.** `DESIGN`/`EXPERIENCE` say desktop; features used (`File API`, `canvas.toBlob`, `Intl ru-RU`, ESM Chart.js) imply a support floor.
*Fix:* add a one-line browser baseline (e.g. current evergreen desktop Chrome/Edge/Firefox/Safari).

**L6 — Accessibility floor not referenced.** EXPERIENCE owns WCAG 2.2 AA (chart color tokens, alt-table); the spine never defers to it.
*Fix:* add a one-line reference/deferral to `EXPERIENCE.md` Accessibility Floor under conventions.

**L7 — AD-9 vs XLSX export incoherence.** "exports serialize dates as ISO 8601" conflicts with writing native date cells, since SheetJS writes a date-formatted cell, not an ISO string.
*Fix:* clarify — ISO 8601 applies to JSON/text boundaries only; XLSX exports use native date cells; bind AD-10.

---

## Summary of counts
- Critical: 1 · High: 6 · Medium: 7 · Low: 7
- Rubric items fully passed: 3 (Deferred), 5 (brownfield N/A), 7 (parent N/A).
- Rubric items partially failed: 1, 2, 4, 6, 8.
- **Gate recommendation:** not-ready — the data-semantics cluster (C1 + H1–H5) should be closed before the spine is used as build substrate, since those gaps let the 5 stories diverge on data correctness, not just on structure.
