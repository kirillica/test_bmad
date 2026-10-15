---
title: '4 — Графики и сводная таблица'
type: 'feature'
created: '2026-10-15'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '38dc2ae9d62e73a21fd7774d8306726bfc81ceba'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** U3 сейчас только фильтрует: набор сужен, но увидеть трудозатраты по исполнителю, статусу или эпику нельзя — приходится читать строки. Контракт (CAP-6/FR-6) требует линейный, столбчатый и круговой графики плюс сводную таблицу на том же наборе данных, с переключением представлений без сброса фильтров.

**Approach:** Добавить на U3 доменную агрегацию (чистая `aggregate`) и каноническое описание представления `ViewConfig` (вид + разрез + показатель, AD-4/AD-13); store считает `AggregationResult` из `(лист, фильтры, viewConfig)` (AD-12). UI — переключатель вида, селекторы разреза (5 контрактных категорий) и показателя (числовые колонки) и две реализации: `ChartCard` (Chart.js за узким адаптером, один canvas/инстанс, AD-19) и `PivotTable` («Таблица» = сводная: разрез → сумма и число строк).

## Boundaries & Constraints

**Always:**
- `aggregate` — чистая функция домена (без React/Chart.js/DOM); данные берёт только из `RowSet` (AD-8, AD-14), идентичность колонок — из листа.
- `ViewConfig` и `AggregationResult` — канонические типы (AD-4); меняется только `ViewConfig` (AD-13); `AggregationResult` вычисляет store один раз (AD-12).
- Один canvas и один инстанс Chart.js на представление-график: создаётся один раз, обновляется при смене данных/темы, уничтожается при размонтировании; идемпотентно к двойному вызову StrictMode (AD-19).
- Chart.js — только в адаптере `src/adapters/charts.ts` за узким интерфейсом; домен его не импортирует (AD-2). Адаптер загружается лениво (`await import('chart.js/auto')`), как SheetJS (AD-20).
- Суммируются только непустые числа; пустые значения не превращаются в 0 (AD-15). Пустая ячейка разреза — отдельная группа «(не указано)».
- Цвета графика — из токенов `--chart-1..6` и текстовых токенов DESIGN.md; смена темы перекрашивает график без пересоздания инстанса.
- Все строки UI — в каталоге `ru`; числа — `Intl` `ru-RU` (AD-9).
- Переключение вида/разреза/показателя не сбрасывает фильтры (UX IA).

**Ask First:**
- Зависимости сверх Chart.js 4.5.1 и Vitest browser mode (Playwright) из таблицы Stack остова.
- Расширение разреза за пределы 5 контрактных категорий или показателя за пределы числовых колонок.
- Изменение поведения U2 или CAP-1…CAP-5.

**Never:**
- Экспорт PNG/PDF/XLSX (CAP-7) — Story 5.
- Кросс-таблица (два разреза), агрегация по нечисловым колонкам, пользовательская палитра, глубокие настройки графика (только тултипы).
- Ручное редактирование данных, пересчёт формул, сеть/бэкенд (AD-1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Книга загружена; открыт U3; фильтров нет | Столбчатый график «Затрачено времени (ч)» по «Исполнителю»; переключатель вида и селекторы | — |
| SWITCH_VIEW | Выбран другой вид (линейный/круговой/таблица) | Представление меняется; разрез, показатель и фильтры сохранены | — |
| CHANGE_DIMENSION | Выбран другой разрез | Агрегация пересчитана по новому разрезу | — |
| CHANGE_MEASURE | Выбран другой числовой показатель | Суммы пересчитаны по новому показателю | — |
| FILTERED_AGGREGATION | Активны фильтры | Агрегация — только по отфильтрованному `RowSet`; переключение вида фильтры не сбрасывает | — |
| NO_ROWS | Фильтры дают 0 строк | График/таблица не показываются — пустое состояние фильтров (Story 3) | — |
| BLANK_DIMENSION | У части строк разрез пуст | Отдельная группа «(не указано)» с суммой этих строк | — |
| BLANK_MEASURE | У части строк показатель пуст | Пустые не суммируются (не 0); число строк группы их учитывает | — |
| NO_MEASURE | В листе нет числовой колонки | Представления недоступны; названа причина «нет числовой колонки» | — |
| NO_DIMENSION | В листе нет контрактной категории со значениями | Представления недоступны; названа причина «нет категории» | — |
| SHEET_CHANGE | Сменился лист | Разрез/показатель — по умолчанию для нового листа; фильтры сброшены (Story 3) | — |
| THEME_SWITCH | Смена светлой/тёмной темы | График перекрашен токенами темы; инстанс не пересоздан | — |
| MUTATION_SAFETY | Любая агрегация и рендер | Исходные строки листа и `RowSet` не изменяются | — |

</frozen-after-approval>

## Code Map

- `SPEC.md` (CAP-6), PRD §4.4 (FR-6), `EXPERIENCE.md` (U3: view-switcher, графики, A11y-пол), `DESIGN.md:32-43,140-143` (`chart-1..6`, `chart-container`), остов (AD-4/AD-8/AD-12/AD-13/AD-19/AD-20) -- контракт.
- `src/domain/model.ts:104` -- `ViewConfig` уже есть; добавить `AggregationBucket`, `AggregationResult`, `ViewOptions`, `DimensionOption`, `MeasureOption` -- AD-4.
- `src/domain/schema.ts:24` -- `CATEGORY_COLUMNS`/`NORMALIZED_CATEGORY` -- источник разрезов (переиспользовать, AD-6).
- `src/domain/pipeline/aggregate.ts` -- НОВЫЙ: `buildViewOptions`, `defaultViewConfig`, `aggregate` -- CAP-6/AD-8/AD-12.
- `src/domain/pipeline/applyFilter.ts:63` -- `dataRows`/`applyFilter` -- источник `RowSet` (переиспользовать).
- `src/ui/store/reducer.ts:5` -- поле `viewConfig: ViewConfig | null` в `StoreState` + действие `SET_VIEW`; сброс к `null` в LOAD_SUCCESS/SET_SHEET/RESET (рядом с `emptyFilter`) -- AD-3.
- `src/ui/store/context.ts:5` + `workbook-store.tsx:23` -- `viewConfig`, `aggregation`, `setView` в `StoreApi`; производные считать один раз вместе с `rowSet` -- AD-12.
- `src/adapters/charts.ts` -- НОВЫЙ: узкий интерфейс Chart.js (создать/обновить/уничтожить) с ленивым `import('chart.js/auto')` -- AD-2/AD-19/AD-20.
- `src/ui/theme/palette.ts` -- НОВЫЙ: чтение палитры из CSS-переменных + подписка на `data-theme` (`src/app/theme.ts:28`) -- темы.
- `src/ui/components/ViewSwitcher.tsx`, `ChartCard.tsx`, `PivotTable.tsx` -- НОВЫЕ: переключатель вида, график (canvas), сводная («Таблица») -- CAP-6/UX.
- `src/ui/screens/AnalysisScreen.tsx:12` -- встроить управление и представление ниже счётчика -- CAP-6.
- `src/ui/i18n/ru.ts` + `src/index.css` -- строки представлений/разрезов/показателя и стили (токены DESIGN.md, `--chart-*`) -- конвенция.
- `vite.config.ts:6` -- проект Vitest browser mode (`tests/**/*.browser.test.{ts,tsx}`, Playwright) рядом с текущим node/jsdom -- конвенция Testing остова.
- `tests/` -- `aggregate.test.ts`, `viewSwitcher.test.tsx`, `pivotTable.test.tsx` (новые, jsdom), `chartCard.browser.test.tsx` (browser mode); обновить стабы `StoreState`/`StoreApi` в `reducer.test.ts`, `analysisScreen.test.tsx`, `dataScreen.test.tsx`, `appRouting.test.tsx`; в `analysisScreen.test.tsx` замокать `../src/adapters/charts` -- покрытие матрицы.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- добавить `chart.js@4.5.1`, `@vitest/browser`, `@vitest/browser-playwright` -- таблица Stack остова.
- [x] `src/domain/model.ts` -- `AggregationBucket`, `AggregationResult`, `ViewOptions`, `DimensionOption`, `MeasureOption` -- канонические типы (AD-4).
- [x] `src/domain/pipeline/aggregate.ts` -- `buildViewOptions`, `defaultViewConfig`, `aggregate` -- CAP-6/AD-8/AD-12.
- [x] `src/ui/store/reducer.ts` + `context.ts` + `workbook-store.tsx` -- `viewConfig`/`SET_VIEW`, производный `aggregation`, `setView` -- AD-3/AD-12.
- [x] `src/adapters/charts.ts` -- ленивый Chart.js за узким интерфейсом -- AD-2/AD-19.
- [x] `src/ui/theme/palette.ts` -- палитра из токенов и подписка на `data-theme` -- темы.
- [x] `src/ui/components/ViewSwitcher.tsx`, `ChartCard.tsx`, `PivotTable.tsx` -- переключатель, график, сводная -- CAP-6.
- [x] `src/ui/screens/AnalysisScreen.tsx` -- встроить управление и представление -- CAP-6.
- [x] `src/ui/i18n/ru.ts` + `src/index.css` -- строки и стили -- конвенция i18n/токены.
- [x] `vite.config.ts` -- проект Vitest browser mode -- конвенция Testing.
- [x] `tests/aggregate.test.ts`, `tests/viewSwitcher.test.tsx`, `tests/pivotTable.test.tsx`, `tests/chartCard.browser.test.tsx` + обновление стабов -- покрытие матрицы -- READY.

**Acceptance Criteria:**
- Given книга загружена и фильтров нет, when открыт U3, then показан столбчатый график «Затрачено времени (ч)» по «Исполнителю», доступны переключатель вида и селекторы.
- Given активен график, when выбран другой вид, then представление меняется, а фильтры, разрез и показатель сохраняются.
- Given активны фильтры, when выбрано представление, then оно построено только по отфильтрованному `RowSet`.
- Given у части строк разрез пуст, when построена агрегация, then эти строки образуют группу «(не указано)».
- Given у части строк показатель пуст, when агрегируется, then пустые не суммируются, а число строк группы учитывает все строки.
- Given в листе нет числовой колонки, when открыт U3, then представления недоступны и причина названа.
- Given сменился лист, when открыт U3, then разрез и показатель соответствуют новому листу.
- Given смена темы, when график отображён, then цвета взяты из токенов темы, а инстанс не пересоздан.
- Given любая агрегация и рендер, when они выполняются, then исходные строки не изменяются и сетевых запросов нет.

## Spec Change Log

- 2026-10-15: браузерный проект Vitest переведён с загружаемого Chromium на локальный Chrome (`launchOptions.channel: 'chrome'`): корпоративный TLS-прокси блокирует CDN Playwright. Проверочная команда `playwright install chromium` заменена — реальный браузер и настоящий `<canvas>` сохранены.
- 2026-10-15: добавлен тест `MEASURE_CHANGE` в `tests/analysisScreen.test.tsx` (фикстура с двумя числовыми колонками) — закрывает строку матрицы CHANGE_MEASURE, которая осталась без покрытия.
- 2026-10-15: правки после ревью Story 4: идемпотентность создания инстанса под StrictMode + тест; восстановлен `role="status"` на счётчике строк (регрессия Story 3); оси графика подписаны и значения форматируются `ru-RU` через `ChartInput` (без связи `adapters → ui`); `.is-numeric` расширен на `th`; удалён мёртвый `chartColorToken`; `displayValue` вынесен из дубликата; `SET_VIEW` больше не трогает фильтры; `ChartCard` показывает причину при отказе загрузки чанка Chart.js; склонение «групп» в `aria-label`; расширены тесты store (`aggregation`/`viewConfig`/`viewOptions`), `aggregate` (частичный `RowSet`) и browser-тесты (StrictMode, смена вида bar→pie→line).

## Design Notes

- Один `ViewConfig` на U3 (AD-13): `chartType` + `dimension` + `measure` — нормализованные заголовки колонок. Состояние хранит выбор пользователя (`ViewConfig | null`), store достраивает умолчание для активного листа (`defaultViewConfig`), поэтому смена листа/файла не оставляет «мёртвый» разрез.
- Разрез — 5 контрактных категорий (Статус, Тип работы, Тип задачи, Исполнитель, Эпик), присутствующих в листе со значениями (тот же набор, что у фильтров); показатель — числовые колонки. Умолчания: вид — «Столбчатый», разрез — «Исполнитель» (или первая доступная категория), показатель — «Затрачено времени (ч)» (или первая числовая).
- Агрегация: группировка по значению разреза (идентичность — `normalizeHeader`), сумма — только непустые числа, `count` — число строк группы; сортировка по убыванию суммы, при равенстве — по первому появлению; `total` — сумма всех групп. «Таблица» — та же агрегация: разрез, сумма, число строк + строка «Итого».
- AD-19 на практике: canvas живёт в `ChartCard`, а «один владелец» — один эффект, который создаёт инстанс один раз (идемпотентно к двойному вызову StrictMode), обновляет при смене `AggregationResult`/темы и уничтожает при размонтировании. Story 5 прочитает этот же живой canvas.
- Переключатель вида — группа кнопок-переключателей (`role="group"` + `aria-pressed`), как решено для меню фильтров в Story 3: честная семантика без roving tabindex. Недоступности отдельного вида не бывает: пока U3 показан, `viewConfig` непустой, а «Таблица» доступна всегда — поэтому `disabled` нигде не ставится.
- Текстовый эквивалент графика — представление «Таблица» (A11y-пол UX); canvas получает `role="img"` и `aria-label` с видом, разрезом, показателем и числом групп.

## Verification

**Commands:**
- `npm.cmd exec tsc -- --noEmit` -- expected: 0 ошибок.
- `npm.cmd exec vitest run` -- expected: node/jsdom-проект и browser-проект зелёные (21 файл / 162 теста, включая 6 браузерных).
- `npm.cmd exec eslint .` -- expected: 0 ошибок.
- `npm.cmd run build` -- expected: сборка `dist/` успешна, `chart.js` — в отдельном (ленивом) чанке.
- Браузерный проект работает на локальном Chrome (`launchOptions.channel: 'chrome'` в `vite.config.ts`): CDN Playwright заблокирован корпоративным TLS-прокси, поэтому скачиваемый Chromium недоступен. Движок и настоящий `<canvas>` сохранены.

**Manual checks (if no CLI):**
- Образец: U3 → столбчатый график трудозатрат по исполнителям; переключение на круговой/линейный/таблицу; смена разреза на «Статус» и показателя; фильтр «Тип работы» → график и таблица пересчитаны, фильтры сохранены; смена темы → перекраска без пересоздания инстанса.

## Suggested Review Order

**Доменная агрегация (ядро)**

- Каноническое описание представления: вид + разрез + показатель как нормализованные заголовки.
  [`model.ts:104`](../../../../src/domain/model.ts#L104)

- Единственная точка расчёта: группировка по разрезу из `RowSet`, пустые не суммируются, сортировка по убыванию суммы.
  [`aggregate.ts:88`](../../../../src/domain/pipeline/aggregate.ts#L88)

- Умолчание вида достраивается из доступных колонок; `null` — представлений нет, и UI называет причину.
  [`aggregate.ts:56`](../../../../src/domain/pipeline/aggregate.ts#L56)

- Набор разрезов/показателей — те же контрактные категории, что у фильтров, плюс числовые колонки.
  [`aggregate.ts:38`](../../../../src/domain/pipeline/aggregate.ts#L38)

**Состояние: вывод из данных**

- `rowSet`/`viewConfig`/`aggregation` считаются один раз из активного листа, фильтров и выбора вида (AD-12).
  [`workbook-store.tsx:48`](../../../../src/ui/store/workbook-store.tsx#L48)

- `SET_VIEW` обновляет только вид — фильтры и `rowSet` не трогает (сохранение фильтров при переключении, AD-13).
  [`reducer.ts:90`](../../../../src/ui/store/reducer.ts#L90)

**Граница адаптера Chart.js**

- Единственный модуль с Chart.js; ленивый импорт держит библиотеку в отдельном чанке (AD-2, AD-20).
  [`charts.ts:135`](../../../../src/adapters/charts.ts#L135)

- Смена вида (`kind`) уничтожает и пересоздаёт инстанс на том же canvas — Chart.js не умеет менять тип.
  [`charts.ts:144`](../../../../src/adapters/charts.ts#L144)

- Оси подписаны, значения и тултипы форматируются `ru-RU` через `ChartInput` — адаптер не знает про `src/ui`.
  [`charts.ts:77`](../../../../src/adapters/charts.ts#L77)

**Жизненный цикл графика**

- Один canvas/инстанс: создание идемпотентно к двойному вызову StrictMode, обновление на месте, destroy при размонтировании (AD-19).
  [`ChartCard.tsx:79`](../../../../src/ui/components/ChartCard.tsx#L79)

- Цвета берутся из токенов темы и перекрашивают живой инстанс без пересоздания.
  [`palette.ts:56`](../../../../src/ui/theme/palette.ts#L56)

**Экран и представления**

- U3: переключатель вида, селекторы разреза/показателя; фильтры и счётчик строк сохранены.
  [`AnalysisScreen.tsx:73`](../../../../src/ui/screens/AnalysisScreen.tsx#L73)

- Счётчик строк остаётся `role="status"` — живой регион для скринридера (регрессию устранили).
  [`AnalysisScreen.tsx:55`](../../../../src/ui/screens/AnalysisScreen.tsx#L55)

- «Таблица» — та же агрегация: разрез, сумма, число строк и строка «Итого».
  [`PivotTable.tsx:15`](../../../../src/ui/components/PivotTable.tsx#L15)

- Переключатель — группа кнопок с `aria-pressed`, без roving tabindex (семантика Story 3).
  [`ViewSwitcher.tsx:17`](../../../../src/ui/components/ViewSwitcher.tsx#L17)

**Текст и стили**

- `aria-label` графика: вид, показатель, разрез и число групп со склонением.
  [`ru.ts:123`](../../../../src/ui/i18n/ru.ts#L123)

- Числовые `th` выровнены как `td` — заголовки таблиц не «прыгают».
  [`index.css:386`](../../../../src/index.css#L386)

**Периферия: тесты и конфигурация**

- Браузерный проект на локальном Chrome (CDN Playwright заблокирован прокси), реальный `<canvas>`.
  [`vite.config.ts:24`](../../../../vite.config.ts#L24)

- Реальный жизненный цикл Chart.js: один инстанс под StrictMode и смена вида bar→pie→line.
  [`chartCard.browser.test.tsx:66`](../../../../tests/chartCard.browser.test.tsx#L66)

- Агрегация и частичный `RowSet` в чистом домене.
  [`aggregate.test.ts:82`](../../../../tests/aggregate.test.ts#L82)

- Store: агрегация следует за отфильтрованным `RowSet`, `setView` не трогает фильтры.
  [`workbookStore.test.tsx:163`](../../../../tests/workbookStore.test.tsx#L163)
