---
title: '1 — Загрузка XLS/XLSX и валидация структуры'
type: 'feature'
created: '2026-10-14'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'NO_VCS'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Приложения ещё нет — негде принять Excel-выгрузку и проверить её структуру, поэтому невозможны предпросмотр, фильтры, графики и экспорт.

**Approach:** Поднять чисто клиентское SPA (Vite + React + TS) по контракту `SPEC-xls-analytics` и остову `ARCHITECTURE-SPINE.md` и реализовать в нём CAP-1/CAP-2: локальный приём XLS/XLSX (выбор файла и drag-and-drop), разбор и валидация структуры по эталонной схеме B–G, блокирующие ошибки и предупреждения, атомарная загрузка, UI на русском.

## Boundaries & Constraints

**Always:**
- Обработка локальная; содержимое файла не уходит в сеть (AD-1).
- `domain` без импортов React/SheetJS/DOM; `adapters` без импортов UI/store; правила — чистые функции (AD-2).
- Один `WorkbookStore` (context+reducer), иммутабельно, только в памяти (AD-3).
- Типы AD-4 без переименований; один `Issue{severity, code, message, column?}` (AD-5).
- `REQUIRED_COLUMNS` B–G — одна константа; заголовки нормализуются: trim, case-fold, `ё→е`, схлопывание пробелов (AD-6).
- Лимит — 30 000 строк данных суммарно по листам файла, проверка по метаданным до материализации строк (AD-7).
- Даты → `Date`, числа → `number`, прочее → `string` (AD-9).
- Грязные конструкции (объединённые ячейки, скрытые листы, лишние шапки, строки-маркеры) — предупреждать, не чинить (AD-5, AD-16).
- Атомарная загрузка: store меняется только при успешном разборе+валидации (AD-17).
- Severity — одна таблица код→уровень (AD-18).
- Все строки UI — в каталоге `ru`, без хардкода.

**Ask First:**
- Новая зависимость вне таблицы Stack остова.
- Изменение набора B–G или текстов ошибок/предупреждений.

**Never:**
- Бэкенд/API/БД/телеметрия (AD-1, AD-11, AD-20).
- Пересчёт формул, автоисправление данных, дозагрузка из сети, персистентность книги.
- CAP-3…CAP-7 в этой истории.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Корректный файл, B–G на месте, ≤30 000 строк | `status='ok'`, книга в store | — |
| MISSING_COLUMN | Нет одной из B–G | `status='blocked'`, `Issue{MISSING_REQUIRED_COLUMN, column}` | Сообщение с именем отсутствующей колонки + перечень нужных |
| WARN_MARKERS | Строки, где заполнена только «Эпик» | `status='warnings'`; строки `isSectionMarker`; данные принимаются | `SECTION_ROWS_EXCLUDED` |
| WARN_DIRTY | Объединённые ячейки / скрытые листы / лишние шапки | Загрузка продолжается, данные не меняются | `MERGED_CELLS`/`HIDDEN_SHEETS`/`EXTRA_HEADER_ROWS` |
| OVER_LIMIT | >30 000 строк данных суммарно | Книга не строится | `ROW_LIMIT_EXCEEDED` (blocking) с числом и лимитом |
| BAD_FORMAT | Не XLS/XLSX | Книга не строится | `UNSUPPORTED_FORMAT` (blocking) |
| CORRUPT | Повреждённый/пустой файл | Книга не строится | `CORRUPT_FILE` (blocking) |
| DRAG_NON_XLS | Перетащен не-XLS | Дроп отклонён | Сообщение; зона активна |
| RETRY_AFTER_BLOCK | Новый файл после блокирующей ошибки | Прежнее состояние сохраняется до успеха | — |

</frozen-after-approval>

## Code Map

Проект пуст (greenfield) — всё создаётся здесь; целевое дерево — из остова.
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` -- каркас Vite+React+TS, версии по Stack.
- `src/domain/model.ts` -- типы AD-4; `schema.ts` -- `REQUIRED_COLUMNS` B–G + нормализация; `issues.ts` -- коды + матрица severity.
- `src/domain/pipeline/validateStructure.ts` -- колонки/типы/пропуски; `detectSectionMarkers.ts` -- `isSectionMarker`.
- `src/adapters/file-source.ts` -- File API → байты + guard лимита по метаданным; `spreadsheet.ts` -- SheetJS 0.20.3 (CDN-tarball, full build, `cellDates`), ленивый импорт.
- `src/ui/store/workbook-store.ts` -- context+reducer, действия `LOAD_FILE`, `RESET`.
- `src/ui/screens/UploadScreen.tsx` + `src/ui/components/DropZone.tsx` + `WarningBanner.tsx`; `src/ui/i18n/ru.ts`.
- `tests/` -- Vitest: домен (pure) + компоненты (jsdom).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` + `vite.config.ts` + `tsconfig.json` + `index.html` -- каркас Vite+React+TS, пин версий по Stack -- база истории.
- [x] `src/domain/model.ts` -- типы AD-4 -- контракт слоёв.
- [x] `src/domain/schema.ts` -- `REQUIRED_COLUMNS` B–G + нормализация -- AD-6.
- [x] `src/domain/issues.ts` -- `Issue` + коды + матрица severity -- AD-5/AD-18.
- [x] `src/domain/pipeline/detectSectionMarkers.ts` -- пометка строк-маркеров -- AD-6/AD-14.
- [x] `src/domain/pipeline/validateStructure.ts` -- колонки/типы/пропуски → `ValidationResult` -- CAP-2/AD-15.
- [x] `src/adapters/file-source.ts` -- приём файла + guard лимита -- CAP-1/AD-7.
- [x] `src/adapters/spreadsheet.ts` -- SheetJS-чтение .xls/.xlsx -- CAP-1/AD-9.
- [x] `src/ui/store/workbook-store.ts` -- store + атомарная загрузка -- AD-3/AD-17.
- [x] `src/ui/i18n/ru.ts` -- строки UI -- конвенция i18n.
- [x] `src/ui/screens/UploadScreen.tsx` + `DropZone.tsx` + `WarningBanner.tsx` -- U1 -- CAP-1.
- [x] `tests/**` -- юнит-тесты домена на кейсы матрицы -- READY-стандарт.

**Acceptance Criteria:**
- Given корректный файл с B–G и ≤30 000 строк, when загружен, then `status='ok'` и предупреждений нет.
- Given файл без обязательной колонки, when загружен, then `status='blocked'` и сообщение называет именно её.
- Given файл со строками-маркерами, when загружен, then загрузка продолжается, маркеры помечены, показано предупреждение (не молчаливое удаление).
- Given файл >30 000 строк данных, when загружен, then книга не строится и показано `ROW_LIMIT_EXCEEDED` с числом и лимитом.
- Given не-XLS/XLSX или повреждённый файл, when загружен, then блокирующая ошибка, а прежнее состояние store не изменилось.
- Given drag-and-drop не-XLS, when отпущен, then дроп отклонён сообщением, зона активна.
- Given любая загрузка, when выполняется, then сетевого запроса с содержимым файла нет.

## Spec Change Log

## Design Notes

- Порядок: `parse (adapter) → validateStructure → detectSectionMarkers`; маркеры исключаются в одной точке, `RowSet` без маркеров (AD-14).
- Тексты (черновик; баннер живёт на U2): «Не найдена обязательная колонка «Статус».» + «Нужны колонки: Тип задачи, Задача, Статус, Исполнитель, Тип работы, Затрачено времени (ч).»; «Файл превышает лимит 30 000 строк (45 120).»; «Обнаружено 49 служебных строк — исключены из анализа. Проверьте, что это ожидаемо.»

## Verification

**Commands:**
- `npm.cmd install` -- expected: успех; `xlsx` ставится из CDN-tarball.
- `npm.cmd exec tsc -- --noEmit` -- expected: 0 ошибок.
- `npm.cmd exec vitest run` -- expected: тесты домена зелёные.
- `npm.cmd exec eslint .` -- expected: 0 ошибок.
- `npm.cmd run build` -- expected: `dist/` собирается.

**Manual checks (if no CLI):**
- Открыть `dist/` и перетащить образец `C:\Users\golovin_k_s\Downloads\Новый документ от 08.10.2026.xlsx` -- ожидается `status='warnings'` (49 маркеров) и успешная загрузка.

## Suggested Review Order

**Upload → validate pipeline**

- Store orchestrates the atomic load, race-guards stale results, and keeps warnings out of the error banner.
  [`workbook-store.tsx:14`](../../../../src/ui/store/workbook-store.tsx#L14)

- Adapter boundary reads bytes, delegates parsing, and enforces the row limit before any workbook is built.
  [`file-source.ts:28`](../../../../src/adapters/file-source.ts#L28)

**Row-limit correctness (AD-7)**

- Read cap is `limit + 2` so an over-limit sheet is detectable instead of silently truncated at the limit.
  [`spreadsheet.ts:16`](../../../../src/adapters/spreadsheet.ts#L16)

- One domain constant backs both the guard and the UI copy.
  [`schema.ts:5`](../../../../src/domain/schema.ts#L5)

**Structure validation (CAP-2)**

- Per-sheet analysis: columns, type inference (empty column → text), section markers, dirty-construct warnings.
  [`validateStructure.ts:82`](../../../../src/domain/pipeline/validateStructure.ts#L82)

- Required columns block only visible sheets; hidden sheets warn rather than blocking the workbook.
  [`validateStructure.ts:120`](../../../../src/domain/pipeline/validateStructure.ts#L120)

**UI copy, theme and resilience**

- All user-facing strings (including the limit and the issue→message map) centralised; no raw code leaks.
  [`ru.ts:28`](../../../../src/ui/i18n/ru.ts#L28)

- Pre-paint theme bootstrap avoids a light flash when a dark theme is stored.
  [`index.html:17`](../../../../index.html#L17)

- `localStorage` access is guarded so blocked storage cannot crash startup.
  [`theme.ts:5`](../../../../src/app/theme.ts#L5)

- Header surfaces the in-flight file name while a different file is loading.
  [`Header.tsx:13`](../../../../src/ui/components/Header.tsx#L13)

**Supporting: tests and config**

- Real SheetJS adapter test; locks the row-limit boundary (at limit passes, +1 blocks).
  [`spreadsheet.test.ts:1`](../../../../tests/spreadsheet.test.ts#L1)

- Domain matrix tests: markers, missing column, dirty constructs, hidden-sheet exemption, empty-column type.
  [`validateStructure.test.ts:1`](../../../../tests/validateStructure.test.ts#L1)

- Repository hygiene: run instructions, accepted formats, limit and privacy statement.
  [`README.md:1`](../../../../README.md#L1)
