# Review — Verification (reality-check of committed decisions)

- **Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-bmad_test-2026-10-13/ARCHITECTURE-SPINE.md`
- **Lens:** Verification — verify every committed decision was web-researched / reality-checked rather than asserted from training data (current versions, technologies still exist and fit, greenfield starter defaults).
- **Reviewer role:** VERIFICATION reviewer (architecture-spine review gate)
- **Date:** 2026-10-13
- **Method:** independent spot-check against authoritative sources — live npm registry metadata (`registry.npmjs.org/<pkg>/latest`), vendor docs (SheetJS, Chart.js, Vite, ESLint), and the Node.js release schedule. All fetches performed at review time.
- **Constraint honored:** the spine and all other project files were not modified.

## Verdict

**PASS WITH FINDINGS — no fabricated or non-existent technology was found; every pinned version except one interpretive range is the current release, but the Node.js runtime range is materially inconsistent with the spine's own test/template toolchain and will not install/run on part of the declared floor.**

The `SEED` comment claims versions were "verified on the web at authoring (2026-10-13, live npm registry + vendor docs)." That claim holds for nearly all pins (each equals the current registry latest), but the `Node` row reads like Vite's minimum range was copied without reconciling it against Vitest 5 / jsdom 30 / ESLint 10 engines. This is the one decision that is *wrong*, not merely stale.

## Verification matrix (claim → independent source → result)

| Pin (as written) | Claimed | Registry latest @ review | Result |
| --- | --- | --- | --- |
| Node | `^20.19.0 \|\| >=22.12.0` | Vite 8.3.4 engine: `^20.19.0 \|\| >=22.12.0` ✅ but see **F1** | **FAIL (as applied)** |
| TypeScript | 6.0.x (not 7.0.2) | latest = **7.0.2** ✅; typescript-eslint peer `<6.1.0` ✅ | PASS |
| Vite | 8.3.4 | **8.3.4** | PASS |
| create-vite + `react-ts` | 9.2.1 | **9.2.1**; `react-ts` listed in Vite docs templates | PASS |
| React / react-dom | 19.3.0 | **19.3.0** | PASS |
| `@types/react` / `@types/react-dom` | 19.3.0 | `@types/react` = **19.3.0** | PASS (`@types/react-dom` not individually pulled; plausible) |
| `@vitejs/plugin-react` | 6.1.2 | **6.1.2** (peer `vite ^8.0.0`) | PASS |
| `@vitejs/plugin-react-swc` | 4.3.3 (option) | **4.3.3** | PASS |
| SheetJS (`xlsx`) | 0.20.3 via CDN tarball; npm `xlsx@0.18.5` banned | CDN docs: 0.20.3 = "current version"; npm registry `xlsx` latest = **0.18.5** | PASS |
| Chart.js | 4.5.1, "ESM-only" | **4.5.1** ✅ but ships CJS+UMD → **F2** | PARTIAL (F2) |
| jsPDF | 4.2.1 | **4.2.1** | PASS |
| `jspdf-autotable` (optional) | named | **5.0.8**, peer `jspdf ^2 \|\| ^3 \|\| ^4` | PASS |
| Vitest + jsdom | 5.0.4 + 30.1.2 | **5.0.4**, **30.1.2** ✅, but engines exclude Node 20 → **F1** | PASS (versions) / F1 |
| `@vitest/browser` / Playwright | 5.0.4 | `@vitest/browser@5.0.4` exists; providers are `@vitest/browser-playwright@5.0.4` → **F3** | PARTIAL (F3) |
| `@vitest/coverage-v8` | 5.0.4 | referenced at 5.0.4 in vitest peers | PASS |
| ESLint + plugins | 10.12.0, flat-only; `@eslint/js` 10.0.1; typescript-eslint 8.71.2; react-hooks 7.1.1; react-refresh 0.5.7 | **10.12.0 / 10.0.1 / 8.71.2 / 7.1.1 / 0.5.7**; flat-config-only confirmed | PASS |
| Prettier | 3.9.10 (+ `eslint-config-prettier`) | **3.9.10**; `eslint-config-prettier` latest **10.1.8** | PASS |

## Findings

### F1 — Node.js range is inconsistent with the pinned test stack (Severity: HIGH)

- **Claim (Stack table, line 130):** Node `^20.19.0 || >=22.12.0`, note "required by Vite 8".
- **Evidence:**
  - `vite@8.3.4` `engines.node` = `^20.19.0 || >=22.12.0` (registry).
  - `vitest@5.0.4` `engines.node` = `^22.12.0 || ^24.0.0 || >=26.0.0` → **Node 20 is not supported at all.**
  - `jsdom@30.1.2` `engines.node` = `^22.22.2 || ^24.15.0 || >=26.0.0` → Node 20 and Node 22.12–22.21 are **not supported**.
  - `eslint@10.12.0` `engines.node` = `^20.19.0 || ^22.13.0 || >=24`; ESLint docs "Migrate to v10.x": *"Node.js v20.19.0 and above; v22.13.0 and above; v24 and above"* — Node 22.12.x and 23.x are rejected.
  - Vite docs, Compatibility Note: *"Vite requires Node.js version 20.19+, 22.12+. However, some templates require a higher Node.js version to work."*
  - Node.js release schedule (2026-10-13): v20 **EOL** (last release 2026-03-24), v22 **LTS**, v23 **EOL**, v24 **LTS**, v26 **Current**.
- **Why it matters:** the declared range admits Node 20.19.x (unsupported by Vitest 5 and jsdom 30; EOL) and Node 22.12–22.21 / 23.x / 25.x (rejected by at least one pinned tool). A builder on Node 20 (commonly still installed) or Node 22.12 cannot run the declared test stack: `npm install` will warn and Vitest/jsdom will fail on the engines gate, and ESLint 10 will refuse to run on odd/EOL lines. This is the single decision that is *wrong*, not merely stale.
- **Suggested correction:** replace the Node pin with the effective intersection of the whole stack, e.g. `^22.22.2 || ^24.15.0 || >=26.0.0` (Vite's floor is lower; the app's own tooling is the binding constraint). Drop Node 20 (EOL). If a permissive `engines` field is wanted for the *build* only, state explicitly that the **test/tooling runtime floor is Node 22.22.2+ / 24.15+** and do not present `^20.19.0` as supported.

### F2 — Chart.js is described as "ESM-only", which is factually wrong (Severity: MEDIUM)

- **Claim (Stack table, line 136):** "Chart.js 4.5.1 — ESM-only; tree-shakeable (`chart.js/auto` vs manual registration)."
- **Evidence:** `chart.js@4.5.1` package.json (npm registry) declares `"main": "./dist/chart.cjs"`, `exports["."].require = "./dist/chart.cjs"`, and `"unpkg"/"jsdelivr": "./dist/chart.umd.min.js"`. The Chart.js docs Installation page documents CDNJS/jsDelivr UMD builds. Chart.js v3+ is *ESM-first*, but it ships ESM **and** CJS **and** UMD.
- **Why it matters:** "ESM-only" is a mischaracterization that can mislead a builder — e.g. into believing a CJS/UMD consumer or a non-ESM test/DOM path is impossible, or that CDN usage is unsupported. It also contradicts the spine's own reliance on `chart.js/auto` (which itself is exported in both `import` and `require` forms).
- **Suggested correction:** reword to "ESM-first (ships ESM + CJS + UMD); tree-shakeable — `chart.js/auto` (registers everything) vs. manual component registration."

### F3 — Vitest 5 browser mode needs a provider package, not just `@vitest/browser` (Severity: LOW)

- **Claim (Testing convention + Stack table, lines 122/138):** chart/canvas tests "via `@vitest/browser` 5.0.4 / Playwright".
- **Evidence:** `vitest@5.0.4` `peerDependencies` enumerate `@vitest/browser-playwright@5.0.4` and `@vitest/browser-preview@5.0.4` (and `@vitest/browser-webdriverio`), while `@vitest/browser@5.0.4` exists separately with peer `vitest 5.0.4`. In Vitest 5 the browser *provider* is the documented install target.
- **Suggested correction:** name the concrete provider, e.g. "chart/canvas tests via `@vitest/browser-playwright@5.0.4` (Playwright provider) with `@vitest/browser@5.0.4`". Low impact — the testing *strategy* (jsdom has no `<canvas>` → use browser mode) is correct.

### F4 — npm `xlsx` advisory characterization is accurate but one half is disputed by the vendor (Severity: LOW)

- **Claim (Stack table, line 135):** npm `xlsx@0.18.5` is banned ("frozen 2022 + prototype-pollution/ReDoS advisories").
- **Evidence:** registry `xlsx@0.18.5` (published 2022) is the latest on npm; the real advisories are CVE-2023-30533 (prototype pollution, fixed <0.19.3) and CVE-2024-22363 (ReDoS, fixed <0.20.2). SheetJS's own install docs call the Snyk prototype-pollution report a **false positive** ("The issue is resolved in version 0.19.3"; "Snyk is falsely reporting vulnerabilities").
- **Suggested correction:** keep the ban — it is fully justified by the frozen 2022 registry copy and the ReDoS advisory — but ground it primarily on staleness + ReDoS rather than presenting prototype-pollution as settled. Optional note: "SheetJS disputes the Snyk prototype-pollution advisory; the ban stands on staleness + ReDoS."

### F5 — Client-side bundle weight / lazy-loading (Severity: LOW, advisory)

- **Context:** this is a "purely client-side browser app" (AD-1/AD-11) delivered as static assets. The pinned dependencies are heavy: jsPDF `unpackedSize ≈ 30 MB` with optional `html2canvas`/`dompurify`/`canvg`, and the SheetJS **full** build (required here because mini drops `.xls` — see below).
- **Why it matters:** not a correctness defect, but a greenfield "fit" concern for first-load performance. The spine already structures adapters as side-effect edges (`src/adapters/*`), which makes lazy loading natural.
- **Suggested correction:** add a one-line convention/note that `spreadsheet` and `exporter/*` adapters are loaded via dynamic `import()` at their entry surfaces (SheetJS docs explicitly recommend a wrapper + dynamic import), keeping the initial bundle limited to UI + domain. Optional, but it makes the client-only promise operationally sound.

### Note N1 — SheetJS "full build vs mini" claim is CORRECT (no action)

- **Claim (line 135):** "use the **full** build — `mini` drops `.xls`."
- **Evidence:** SheetJS Standalone docs: `xlsx.mini.min.js` "omits ... XLSB / **XLS** / Lotus 1-2-3 / SpreadsheetML 2003 / Apple Numbers file formats" and CSV/SYLK encodings. Since the app ingests `.xls` and `.xlsx` (CAP-1), the full build is required. Confirmed. This is a good catch by the author.

## Item-by-item results for the requested spot-checks

- **(a) SheetJS CDN tarball still the current recommended install path; 0.20.3 current?** **YES.** Both the NodeJS and Frameworks/Bundlers install pages (last updated Aug 3, 2026) direct users to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, call the CDN "the authoritative source," and label 0.20.3 "the current version." Vendoring the `.tgz` is explicitly "strongly recommended" — matching the spine.
- **(b) npm `xlsx` still stale/flagged?** **YES.** npm registry `xlsx` latest is still `0.18.5` (2022 publish). See F4 for the advisory nuance.
- **(c) typescript-eslint still not supporting TypeScript 7 (justifying 6.0.x)?** **YES.** `typescript-eslint@8.71.2` `peerDependencies.typescript = ">=4.8.4 <6.1.0"`; registry latest TypeScript is `7.0.2` (exactly the version the spine names as "not 7.0.2"). TS 6.0.x is inside the supported range. The pin and its `[ASSUMPTION]` rationale are correct as of today.
- **(d) Chart.js 4.5.1 current and ESM-only?** **Current: YES. ESM-only: NO** (see F2).
- **(e) jsPDF 4.x current?** **YES.** `jspdf` latest = `4.2.1`; `jspdf-autotable@5.0.8` supports `jspdf ^4`.
- **(f) Vite 8 / create-vite react-ts template current?** **YES.** Vite `8.3.4` (docs site header also shows v8.3.4), `create-vite@9.2.1`, and `react-ts` is a first-class template in the Vite scaffolding docs.
- **(g) ESLint 10 flat-config-only?** **YES.** ESLint v10 migration guide, "Old config format no longer supported": starting with v10.0.0 the `.eslintrc` format is no longer supported; `FlatESLint`/`LegacyESLint` removed. Flat config is the only format.

## Correct / well-judged decisions (independently confirmed)

- Every version pin equals the current npm latest except TypeScript — which is a deliberate, correctly-justified hold-back.
- The TypeScript 6.0.x-vs-7.0.2 reasoning is exactly right and cites the real peer constraint.
- The SheetJS install method (CDN tarball, imports as `xlsx`, vendor the `.tgz`) matches current vendor guidance; the "banned npm `xlsx`" call is sound.
- `react-ts` from `create-vite` is a real, current template; `@vitejs/plugin-react@6.1.2` is current and peer-compatible with Vite 8.
- The client-only "no network egress" stance (AD-1) is coherent with the chosen stack — all pinned libs are client-runnable; none requires a server runtime.

## Unverifiable / residual uncertainty (do not treat as failures)

- `@types/react-dom@19.3.0` was not pulled individually; its pairing with `react-dom@19.3.0` is conventional and low-risk.
- "SheetJS full build" vs "mini build" is browser-script terminology; the bundler import path pulls the full package by default, so the practical guidance is right even if the wording blends the standalone-script build matrix with the npm package.
- `@vitejs/plugin-react@6.x` now appears to integrate `oxc-transform-react` (optional peer) rather than relying solely on Babel/SWC; the spine's "SWC variant is an option" framing is not wrong but is slightly dated. Informational only.
- Advisory identifiers (CVE-2023-30533 / CVE-2024-22363) were matched from official advisory knowledge, not fetched from NVD at review time.

## Summary of required corrections

1. **HIGH — fix the Node.js range** to match the toolchain intersection (`^22.22.2 || ^24.15.0 || >=26.0.0`); stop presenting Node `^20.19.0` as supported. (F1)
2. **MEDIUM — reword Chart.js** away from "ESM-only". (F2)
3. **LOW — name the Vitest browser provider** (`@vitest/browser-playwright@5.0.4`). (F3)
4. **LOW — tighten the `xlsx` ban rationale** (staleness + ReDoS primary). (F4)
5. **LOW/advisory — note dynamic import** for the spreadsheet/exporter adapters. (F5)
