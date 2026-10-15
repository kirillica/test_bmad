---
title: '5 — Экспорт результата'
type: 'feature'
created: '2026-10-15'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: 'f62201bacfacae011d49f04509e68e858951e23c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** U3 показывает график и сводную, но вынести результат нельзя: пользователь делает скриншот вручную или переносит числа в Excel, а ручное воспроизведение не гарантирует совпадения с экраном (CAP-7 не реализован).

**Approach:** Добавить адаптер экспорта `src/adapters/exporter/*` (PNG/PDF/XLSX) как чистую производную текущего состояния: PNG/PDF снимают живой canvas карточки графика, XLSX собирается из `RowSet` + `AggregationResult`. В карточке графика — меню «Экспорт…» (PNG/PDF), рядом со счётчиком строк — «Экспорт XLSX»; подтверждение — тост.

## Boundaries & Constraints

**Always:** Экспорт — производная текущего состояния (AD-10): те же `RowSet`/`AggregationResult`/`ViewConfig`, что на экране, с активными фильтрами; второй проход пайплайна запрещён. PNG/PDF читают живой canvas графика и не создают собственный Chart.js-инстанс (AD-19). Тяжёлые адаптеры (jsPDF) грузятся лениво при первом экспорте (AD-20). В файлах числа — неформатированные, даты — ISO 8601 (AD-9). Скачивание локальное (`Blob` + object URL), без сети. Все строки — в `ru.ts`.

**Ask First:** иная структура XLSX, чем согласованные два листа; замена jsPDF; экспорт изображения таблицы.

**Never:** отправка данных на сервер/в облако; создание второго Chart.js-инстанса для PNG; пересчёт агрегации вне store; PNG/PDF для вида «Таблица»; экспорт при пустой выборке.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| EXPORT_PNG | Графический вид, чарт готов | Скачивается `<имя>-график.png` — снимок canvas с непрозрачным фоном текущей темы | Тост об ошибке; файл не создан |
| EXPORT_PDF | Графический вид, чарт готов | Скачивается `<имя>-отчёт.pdf` (A4): изображение графика, заголовок, активные фильтры, счётчик строк, дата формирования | Тост об ошибке |
| EXPORT_XLSX | Есть строки | Скачивается `<имя>-данные.xlsx`: лист «Данные» (шапка + отфильтрованные строки) и лист «Сводная» (разрез, показатель, число строк + «Итого») | Тост об ошибке |
| NO_ROWS | Фильтры дают 0 строк | «Экспорт XLSX» заблокирована и причина названа; PNG/PDF недоступны (нет карточки) | — |
| TABLE_VIEW | Вид «Таблица» | PNG/PDF не показываются; XLSX доступен | — |
| CHART_NOT_READY | Инстанс графика ещё грузится | Кнопки PNG/PDF заблокированы до готовности | — |
| CHART_FAILED | Chart.js не загрузился | Меню экспорта не показывается (canvas нет) | Текст ошибки карточки (Story 4) |
| FILTERED | Активны фильтры | Все три артефакта отражают отфильтрованный набор | — |
| TOAST_SUCCESS | Экспорт удался | Тост «Экспорт готов: <файл>», автоскрытие 5 с | — |
| TOAST_ERROR | Экспорт упал | Тост об ошибке без автоскрытия, закрывается кнопкой/Esc | — |
| NAME_FALLBACK | Имя исходного файла пустое | Базовое имя — «отчёт» | — |

</frozen-after-approval>

## Code Map

- `SPEC.md` (CAP-7), `EXPERIENCE.md:59,71` (PNG/PDF у графика, XLSX у данных; тост; пустая выборка — экспорт заблокирован), `DESIGN.md:144,194-195` (toast-токен, экспорт-меню в карточке), остов (AD-9/AD-10/AD-19/AD-20, карта `exporter/png.ts · pdf.ts · xlsx.ts`, Stack: jsPDF 4.2.1 — версия сверена в npm `latest`) -- контракт.
- `src/adapters/spreadsheet.ts:41` -- локальный тип `XlsxModule` знает только `read`; добавить write-примитив (`write`/`utils.aoa_to_sheet`/`book_new`/`book_append_sheet`) рядом с уже ленивым `import('xlsx')` (`:88`) -- единая точка SheetJS (AD-10).
- `src/adapters/exporter/download.ts` -- НОВЫЙ: `downloadBlob(blob, fileName)` (object URL + anchor + revoke) -- сайд-эффект скачивания отсутствует.
- `src/adapters/exporter/png.ts` -- НОВЫЙ: снимок canvas с непрозрачным фоном (offscreen 2D-композит) → `Blob` -- CAP-7/AD-19.
- `src/adapters/exporter/pdf.ts` -- НОВЫЙ: ленивый `import('jspdf')`; **встроенный шрифт с кириллицей** (`addFileToVFS` + `addFont` + `setFont` до первого текста) — стандартные шрифты jsPDF (`/WinAnsiEncoding`, без встроенного файла) русский текст НЕ рендерят; A4, изображение + заголовок + фильтры + счётчик + дата -- CAP-7/AD-9/AD-20.
- `@expo-google-fonts/pt-sans/400Regular/PTSans_400Regular.ttf` (через `?url`) -- кириллический TTF (OFL-1.1) для текста PDF; грузится лениво вместе с `pdf.ts` -- без него русский текст PDF нечитаем.
- `src/adapters/exporter/xlsx.ts` -- НОВЫЙ: сборка двух листов из `(sheet, rowSet, aggregation)` + вызов write-примитива -- CAP-7/AD-9/AD-10.
- `src/domain/pipeline/applyFilter.ts:59` -- `displayValue` (даты → ISO, прочее → `String`) -- переиспользовать для сериализации ячеек.
- `src/ui/components/ExportMenu.tsx` -- НОВЫЙ: кнопка «Экспорт…» + меню PNG/PDF; дропдаун, Esc и клик-вне — как в `FilterBar.tsx` (классы `.filter-chip-wrap`/`.filter-menu`) -- A11y-пол.
- `src/ui/components/Toast.tsx` -- НОВЫЙ: `role="status"` (успех) / `role="alert"` (ошибка), автоскрытие 5 с только для успеха -- UX.
- `src/ui/components/ChartCard.tsx:46,121` -- `canvasRef` — источник снимка; меню в шапке карточки (`figcaption.chart-title`); в ветке `failed` меню нет; отслеживать готовность инстанса; проп `onExportResult(kind)` -- AD-19.
- `src/ui/screens/AnalysisScreen.tsx:55` -- рядом со счётчиком — «Экспорт XLSX» (заблокирована при 0 строк) + владелец тоста; `activeSheet` из store -- UX.
- `src/ui/store/context.ts:15` -- добавить `activeSheet: Sheet | null` в `StoreApi` (store уже считает его в `workbook-store.tsx:33`) -- шапка листа «Данные», AD-12.
- `src/ui/store/reducer.ts:7` -- `state.fileName` — база имени файла (расширение отбросить) -- UX.
- `src/ui/i18n/ru.ts` -- НОВЫЕ ключи экспорта (без хардкода в компонентах); переиспользовать `chartTitle`, `filteredRowsCount`/`rowsCount`, `pivotCountLabel`/`pivotTotalLabel`, плюрализаторы -- конвенция.
- `src/index.css:546,723` -- НОВЫЕ `.chart-actions`/`.export-menu`/`.export-option`, `.analysis-header`, `.toast*` по токенам DESIGN.md (`.filter-menu` — образец дропдауна) -- конвенция.
- `package.json:19` -- добавить `jspdf@4.2.1` (lazy) и `@expo-google-fonts/pt-sans@0.4.1` (кириллический TTF для PDF) -- Stack.
- `tests/` -- НОВЫЕ `exporter.xlsx.test.ts`, `exporter.png.browser.test.ts`, `exporter.pdf.browser.test.ts`, `exportMenu.test.tsx`, `toast.test.tsx`; расширить `analysisScreen.test.tsx` и стабы `StoreApi` в `dataScreen`/`appRouting`/`reducer`/`workbookStore` -- покрытие матрицы.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- зависимости `jspdf@4.2.1` и `@expo-google-fonts/pt-sans@0.4.1` (объявлены) -- Stack.
- [x] `src/adapters/spreadsheet.ts` -- write-примитив SheetJS (Blob из листов) -- единая точка SheetJS.
- [x] `src/adapters/exporter/download.ts`, `png.ts`, `pdf.ts`, `xlsx.ts` -- экспорт PNG/PDF/XLSX -- CAP-7/AD-9/AD-10/AD-19/AD-20.
- [x] `src/adapters/exporter/pdf.ts` -- встроить кириллический шрифт (VFS/`addFont`) -- иначе русский текст PDF нечитаем (AC).
- [x] `src/adapters/exporter/pdf.ts` -- защита от нулевого изображения (деление на ноль) и переполнения страницы: высота изображения всегда > 0 -- AC.
- [x] `src/adapters/exporter/download.ts` -- отзывать object URL после клика, а не синхронно -- надёжность CAP-7.
- [x] `src/ui/components/ChartCard.tsx` -- при недоступном canvas сообщать `onExportResult(ok:false)`; ветка формата явная (`kind === 'pdf'`) -- конвенция.
- [x] `src/ui/components/ExportMenu.tsx`, `Toast.tsx` -- меню экспорта и тост -- UX.
- [x] `src/ui/components/ChartCard.tsx` -- меню в шапке, готовность инстанса, снимок canvas -- AD-19.
- [x] `src/ui/screens/AnalysisScreen.tsx` + `context.ts`/`workbook-store.tsx` -- «Экспорт XLSX», `activeSheet`, владелец тоста -- UX/AD-12.
- [x] `src/ui/i18n/ru.ts` + `src/index.css` -- строки и стили -- конвенция.
- [x] `tests/*` -- покрытие матрицы (новые `exporter.*`, `exportMenu`, `toast`; расширен `analysisScreen`; стабы `StoreApi` в `dataScreen`/`appRouting`) -- READY.
- [x] `src/ui/theme/palette.ts` -- токен `surface` (непрозрачный фон PNG/PDF из темы) -- AD-19.
- [x] `src/ui/components/toastTiming.ts` -- константа автоскрытия вынесена из `Toast.tsx` (react-refresh) -- конвенция.

**Acceptance Criteria:**
- Given активен графический вид и график готов, when «Экспорт…» → PNG, then скачивается PNG-снимок текущего графика с непрозрачным фоном темы.
- Given активен графический вид и график готов, when «Экспорт…» → PDF, then PDF содержит изображение графика, заголовок, активные фильтры, счётчик строк и дату формирования.
- Given есть строки, when «Экспорт XLSX», then файл содержит лист «Данные» (шапка + отфильтрованные строки) и лист «Сводная» (разрез, показатель, число строк, «Итого»).
- Given активны фильтры, when любой экспорт, then артефакт соответствует отфильтрованному набору (числа неформатированы, даты ISO).
- Given фильтры дают 0 строк, when открыт U3, then «Экспорт XLSX» заблокирована и причина названа; PNG/PDF недоступны.
- Given вид «Таблица», when открыт U3, then PNG/PDF не показываются, XLSX доступен.
- Given экспорт удался или упал, when он завершился, then тост об успехе автоскрывается через 5 с, а тост об ошибке — нет.
- Given обработка локальна, when выполняется любой экспорт, then нет сетевых запросов и серверного кода.

## Spec Change Log

- 2026-10-15 (loopback 1, bad_spec): PDF печатал русский текст стандартным шрифтом jsPDF (`/BaseFont /Helvetica`, `/Encoding /WinAnsiEncoding`, без встроенного файла шрифта) — кириллица не рендерилась, в поток PDF попадали управляющие/Latin-байты. Known-bad состояние: отчёт визуально нечитаем, но browser-тест (`%PDF-` + `size>0`) это пропускал. Исправление на уровне спеки: `pdf.ts` обязан встраивать кириллический TTF (`@expo-google-fonts/pt-sans`, OFL-1.1) через `addFileToVFS` + `addFont` + `setFont`; в Verification добавлена проверка встроенного шрифта (`/FontFile2`), а не только заголовка. KEEP (сохранить при передеривации): слой `exporter/{download,png,pdf,xlsx}.ts`; write-примитив SheetJS внутри `spreadsheet.ts`; два листа XLSX c заголовками через `XlsxLabels` (адаптеры не импортируют UI, AD-2); непрозрачный фон PNG/PDF композитом offscreen-canvas из токена `--surface`, без собственного Chart.js-инстанса (AD-19); `ExportMenu` в шапке карточки + «Экспорт XLSX» у счётчика строк; PNG/PDF скрыты в виде «Таблица» и в ветке `failed`; тост `role=status`/`role=alert` с автоскрытием 5 с только для успеха и константой в `toastTiming.ts`; имена файлов `<база>-график.png` / `-отчёт.pdf` / `-данные.xlsx` с фолбэком «отчёт»; `activeSheet` в `StoreApi`; ISO-дата PDF `YYYY-MM-DD` (локальные компоненты); структура тестов (`exporter.xlsx`, `exporter.png/pdf.browser`, `exportMenu`, `toast`, `analysisScreen` export-группа).

- 2026-10-15: `jspdf@4.2.1` установлен с `--strict-ssl=false`: корпоративный TLS-прокси MITM подменяет сертификат (`SELF_SIGNED_CERT_IN_CHAIN`), `$env:USERPROFILE\.npmrc` содержит `strict-ssl=true`. Версия сверена с npm `latest`.
- 2026-10-15: имена листов/заголовки XLSX передаются в адаптер как `XlsxLabels` — адаптеры не импортируют UI (AD-2).
- 2026-10-15: в `ChartPalette` добавлен токен `surface` (чтение `--surface`) — непрозрачный фон PNG-композита.
- 2026-10-15: `png.ts` отдаёт `exportPng` и `snapshotChart` (blob + dataUrl + размеры); `pdf.ts` принимает data URL и уже готовые тексты. `ChartCard` сообщает только результат (`onExportResult`), владелец тоста и имени файла — `AnalysisScreen` (AD-10).
- 2026-10-15: добавлена причина `exportBlockedNoView` для края «нет агрегации» (оборонительно, сверх матрицы).
- 2026-10-15: константа автоскрытия тоста вынесена в `toastTiming.ts` (правило `react-refresh/only-export-components`); рендер `analysisScreen`-харнесса сделан асинхронным, чтобы `ready` оседал внутри `act`.
- 2026-10-15: тесты дополнены строкой матрицы CHART_FAILED (`createChart` отклонён → `.chart-error`, меню PNG/PDF отсутствует) и стабами `StoreApi.activeSheet`; единственный падавший browser-тест PNG приведён к реальному контракту (нулевой размер canvas = «не готов»).
- 2026-10-15: «дата формирования» PDF приведена к ISO 8601 (`YYYY-MM-DD`, локальные компоненты) вместо `toLocaleDateString` — жёсткое условие «даты — ISO 8601» (AD-9) и согласованность с ISO-датами фильтров в том же отчёте; закреплено в `tests/ru.test.ts`.
- 2026-10-15 (loopback 1, раунд ревью 2): изменений спеки нет — только патчи по замечаниям раунда: явная ветвь `pdf` в `ChartCard` и защита от переполнения страницы в `pdf.ts` (выравнивание к Design Notes), тесты на тексты PDF-отчёта, `CHART_NOT_READY` и реальный `downloadBlob`; исправлена строка «PDF — график + сводка» в `_bmad-output/implementation-artifacts/epic-1-context.md` (противоречила `SPEC.md` и I/O-матрице).

## Design Notes

- AD-19 запрещает создавать собственный Chart.js-инстанс/графический canvas. Непрозрачный фон PNG делается композитом на offscreen 2D-canvas (заливка фоном темы + `drawImage` живого canvas) — это не нарушение AD-19.
- Имена файлов — от `state.fileName` без расширения: `<база>-график.png`, `<база>-отчёт.pdf`, `<база>-данные.xlsx`; без даты. При пустой базе — «отчёт».
- XLSX: лист «Данные» — **все** колонки активного листа с исходными заголовками и отфильтрованные строки; числа пишутся числами (Excel считает), даты — строкой ISO 8601 (AD-9), пустые — пустая ячейка. Лист «Сводная»: шапка `[разрез, показатель, «Строк»]`, строки групп по убыванию суммы и строка «Итого» (сумма показателя и сумма строк).
- Успех/ошибку сообщает владелец тоста (U3); карточка графика лишь передаёт результат через проп — UI тоста в ней не дублируется.
- PNG/PDF стартуют только после создания инстанса графика: иначе снимок canvas будет пустым.
- Дата формирования PDF — ISO 8601 `YYYY-MM-DD` (AD-9), как и даты фильтров в отчёте; локальные компоненты, чтобы дата совпадала с календарём пользователя.
- PDF: заголовок, фильтры, счётчик, дата и «Итого» печатаются ТОЛЬКО встроенным кириллическим шрифтом (PT Sans, OFL-1.1) через `addFileToVFS` + `addFont` + `setFont`; стандартные шрифты jsPDF кириллицу не рендерят. Шрифт грузится лениво (`?url` → `fetch` → base64) вместе с адаптером.
- Скачивание: `URL.revokeObjectURL` вызывать после завершения клика (например, через `setTimeout`), а не синхронно — иначе часть браузеров отменяет загрузку.
- PDF-раскладка: высота изображения всегда > 0; при нехватке места — новая страница или поджатие (без отрицательных размеров `addImage`).
- Формат в `ChartCard` обрабатывается явной ветвью (`png` / `pdf`); неизвестный вид не должен молча стать PDF.

## Verification

**Commands:**
- `npm.cmd exec tsc -- --noEmit` -- expected: 0 ошибок.
- `npm.cmd exec eslint .` -- expected: 0 ошибок и 0 предупреждений.
- `npm.cmd exec -- vitest run` -- expected: node/jsdom- и browser-проекты зелёные. Обязательно: browser-тест PDF проверяет, что отчёт ВСТРАИВАЕТ файл шрифта (`/FontFile2`) и содержит непустой русский текст — не только `%PDF-` и размер.
- `npm.cmd run build` -- expected: сборка `dist/` успешна; `jspdf` и `PTSans_400Regular` (TTF) — отдельные ленивые ассеты.
- Браузерный проект работает на локальном Chrome (`launchOptions.channel: 'chrome'` в `vite.config.ts`): CDN Playwright заблокирован корпоративным TLS-прокси.

**Manual checks (if no CLI):**
- Образец: U3 → «Экспорт…» → PNG/PDF (график + фильтры + счётчик + дата); «Экспорт XLSX» → оба листа; активный фильтр отражается в экспорте; 0 строк → XLSX заблокирована; вид «Таблица» → PNG/PDF отсутствуют; оба тоста ведут себя как в матрице.

## Suggested Review Order

**Экспорт живого canvas графика (ядро AD-19)**

- Точка входа: карточка снимает свой живой canvas, ветки png/pdf явные — второго инстанса Chart.js нет.
  [`ChartCard.tsx:153`](../../../../src/ui/components/ChartCard.tsx#L153)

- Непрозрачное изображение композитом на offscreen-canvas из токена `--surface`; canvas нулевого размера = «не готов».
  [`png.ts:44`](../../../../src/adapters/exporter/png.ts#L44)

**PDF-отчёт со встроенным кириллическим шрифтом (AD-9, AD-20)**

- Ленивый jsPDF плюс подгружаемый PT Sans (OFL-1.1); раскладка держит размер изображения положительным.
  [`pdf.ts:72`](../../../../src/adapters/exporter/pdf.ts#L72)

- VFS + addFont + setFont до первого текста: штатные шрифты jsPDF кириллицу не рендерят.
  [`pdf.ts:76`](../../../../src/adapters/exporter/pdf.ts#L76)

**Запись XLSX из двух листов (AD-9, AD-10)**

- Оба листа из тех же `RowSet`/`AggregationResult`, что на экране — без второго прохода пайплайна.
  [`xlsx.ts:45`](../../../../src/adapters/exporter/xlsx.ts#L45)

- Единственный write-примитив SheetJS; подписи приходят пропами — адаптеры не трогают UI (AD-2).
  [`spreadsheet.ts:133`](../../../../src/adapters/spreadsheet.ts#L133)

**Локальное скачивание и тайминг тоста**

- Object URL + anchor, отзыв только после клика — иначе часть браузеров отменяет загрузку.
  [`download.ts:15`](../../../../src/adapters/exporter/download.ts#L15)

- Константа автоскрытия вынесена из компонента (правило react-refresh).
  [`toastTiming.ts:6`](../../../../src/ui/components/toastTiming.ts#L6)

**Обвязка UI: меню, тост, экран, store, строки, стили**

- Дропдаун по образцу `FilterBar`: Esc возвращает фокус на кнопку, клик-вне закрывает.
  [`ExportMenu.tsx:18`](../../../../src/ui/components/ExportMenu.tsx#L18)

- Экран владеет именами файлов, скачиванием и тостом — карточка лишь сообщает результат (AD-10).
  [`AnalysisScreen.tsx:108`](../../../../src/ui/screens/AnalysisScreen.tsx#L108)

- Блокировка XLSX с названной причиной для строки матрицы NO_ROWS.
  [`AnalysisScreen.tsx:84`](../../../../src/ui/screens/AnalysisScreen.tsx#L84)

- Успех `role=status` автоскрывается за 5 с; ошибка `role=alert` держится до закрытия.
  [`Toast.tsx:21`](../../../../src/ui/components/Toast.tsx#L21)

- В `StoreApi` добавлен `activeSheet` — источник шапки листа «Данные» (AD-12).
  [`context.ts:15`](../../../../src/ui/store/context.ts#L15)

- Все новые строки экспорта — в русском каталоге; компоненты ничего не хардкодят.
  [`ru.ts:141`](../../../../src/ui/i18n/ru.ts#L141)

- Токен `--surface` питает непрозрачный фон PNG/PDF (обе темы).
  [`palette.ts:14`](../../../../src/ui/theme/palette.ts#L14)

- Стили меню, тоста и шапки анализа — по токенам DESIGN.md.
  [`index.css:741`](../../../../src/index.css#L741)

**Проверка (тесты и манифест)**

- Проверяет встроенный шрифт (`/FontFile2`) и реальный кириллический текст, а не только `%PDF-`.
  [`exporter.pdf.browser.test.ts:50`](../../../../tests/exporter.pdf.browser.test.ts#L50)

- Два листа, числа числами, даты ISO и строка «Итого».
  [`exporter.xlsx.test.ts:82`](../../../../tests/exporter.xlsx.test.ts#L82)

- Контракт экрана: имена файлов, скачивания, тосты, тексты PDF и блокировка CHART_NOT_READY.
  [`analysisScreen.test.tsx:477`](../../../../tests/analysisScreen.test.tsx#L477)

- Реальный жизненный цикл object URL и сайд-эффект anchor при скачивании.
  [`download.test.ts:34`](../../../../tests/download.test.ts#L34)

- Поведение меню: открытие/закрытие, Esc+фокус, заблокированные опции.
  [`exportMenu.test.tsx:47`](../../../../tests/exportMenu.test.tsx#L47)

- Новые зависимости: ленивый jsPDF и кириллический TTF PT Sans (OFL-1.1).
  [`package.json:19`](../../../../package.json#L19)
