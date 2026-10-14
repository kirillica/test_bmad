---
title: '3 — Фильтры по категориям и дате'
type: 'feature'
created: '2026-10-14'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'dc886a653abd7f4647709cb9921c5c0132ef3e6f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Данные после загрузки можно только листать: чтобы увидеть трудозатраты по конкретному исполнителю, статусу или типу работы, приходится прокручивать таблицу. Контракт (CAP-5/FR-5) требует фильтров по категориям и дате, применяемых к аналитике.

**Approach:** Ввести вкладку U3 «Анализ» (UX IA: CAP-5 живёт там же, где будут графики) — панель фильтров-чипов по категориям (Статус, Тип работы, Тип задачи, Исполнитель, Эпик; «Дата» — только при наличии распознанной колонки-даты), счётчик «Показано X из Y строк» и пустое состояние со сбросом. Фильтрация — чистая функция домена `applyFilter`; отфильтрованный `RowSet` и опции фильтров считает store (AD-8, AD-12). Графики, сводную и представление «Таблица» добавляет Story 4 на ту же вкладку.

## Boundaries & Constraints

**Always:**
- `applyFilter` — чистая функция домена без React/SheetJS/DOM; вход — строки листа без маркеров (AD-2, AD-14).
- Единый store, иммутабельные обновления; `FilterState` в store, `RowSet` и опции store считает один раз (AD-3, AD-12).
- Единовременная семантика: категории — И, значения внутри категории — ИЛИ (AD-8).
- Дата-фильтр доступен только при наличии колонки с типом «дата»; в эталонном образце её нет — секции нет (ожидаемо).
- Исходные данные не мутируются; фильтр снимается без потери данных (AD-16).
- Все строки UI — в каталоге `ru`; числа — `Intl` `ru-RU` (AD-9).

**Ask First:**
- Новая зависимость вне таблицы Stack остова.
- Расширение списка категорий за пределы 5 контрактных колонок.
- Изменение поведения U2 или CAP-1/CAP-2.

**Never:**
- Графики, сводная, представление «Таблица», экспорт (CAP-6/CAP-7) — истории 4–5.
- Фильтрация по «Задача» (идентификатор, не категория) и по числовым колонкам как категориям.
- Ручное редактирование данных, пересчёт формул, сеть/бэкенд (AD-1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Книга загружена; открыта вкладка «Анализ» | Чипы доступных категорий; без фильтров счётчик «Y строк» | — |
| FILTER_CATEGORY | Выбрано ≥1 значение категории | Счётчик «Показано X из Y строк»; набор — только совпавшие строки | — |
| MULTI_OR | Несколько значений одной категории | Совпадение по любому (ИЛИ) | — |
| MULTI_AND | Значения в двух категориях | Совпадение по обеим категориям (И) | — |
| FILTER_EMPTY | Комбинация не даёт строк | Пустое состояние «Нет строк по фильтрам» + «Сбросить фильтры» | — |
| RESET_FILTERS | «Сбросить» | Фильтры сняты; счётчик = «Y строк» | — |
| DATE_ABSENT | В листе нет колонки-даты (образец) | Секции «Дата» нет | — |
| DATE_RANGE | Есть колонка-дата; задан диапазон «с»/«по» | Строки вне диапазона и строки без даты исключены | — |
| EMPTY_SHEET | У активного листа нет строк данных | Вкладка «Анализ» недоступна (disabled) | — |
| MUTATION_SAFETY | Любая фильтрация | Исходные строки листа не изменяются | — |

</frozen-after-approval>

## Code Map

- `SPEC.md` (CAP-5), PRD §4.3 (FR-5), `EXPERIENCE.md` (U3, чипы фильтров), `data-input-rules.md:32` (дата-фильтр), остов (AD-8/AD-12/AD-14) -- контракт.
- `src/domain/model.ts:65` -- `FilterState` уже есть; добавить `RowSet`, `FilterOption` -- AD-4.
- `src/domain/schema.ts:8,24` -- `CATEGORY_COLUMNS` (Статус, Тип работы, Тип задачи, Исполнитель, Эпик) + нормализованный набор; `normalizeHeader` переиспользуется для значений -- AD-6.
- `src/domain/pipeline/applyFilter.ts` -- НОВЫЙ: `buildFilterOptions(sheet)`, `applyFilter(sheet, filterState)` -- CAP-5/AD-8/AD-14.
- `src/domain/pipeline/selectActiveSheet.ts` -- НОВЫЙ: чистый селектор активного листа (перенос из `DataScreen.tsx:52`) -- один владелец (AD-12).
- `src/ui/store/reducer.ts:5,23` -- `filterState` в `StoreState`; действия `SET_FILTER`/`CLEAR_FILTERS`; сброс при `LOAD_SUCCESS`/`SET_SHEET`/`RESET` -- AD-3.
- `src/ui/store/context.ts:4` + `workbook-store.tsx:51` -- `rowSet`, `filterOptions`, `setFilter`, `clearFilters` в `StoreApi` -- AD-12.
- `src/ui/components/FilterBar.tsx` + `SurfaceTabs.tsx` -- НОВЫЕ: чипы-дропдауны/секция «Дата»/«Сбросить» и вкладки «Данные»/«Анализ» (ARIA tabs, disabled на пустом листе) -- UX.
- `src/ui/screens/AnalysisScreen.tsx` -- НОВЫЙ: U3 (фильтры, счётчик, пустое состояние) -- CAP-5.
- `src/app/App.tsx:13` + `src/ui/screens/DataScreen.tsx:51` -- вкладки U2/U3 через селектор листа -- UX IA.
- `src/ui/i18n/ru.ts` + `src/index.css` -- строки фильтров/счётчика и стили чипов (токены DESIGN.md).
- `tests/` -- `applyFilter.test.ts`, `analysisScreen.test.tsx`, `filterBar.test.tsx` (новые) + обновить стабы `StoreState`/`StoreApi` в `reducer.test.ts`, `appRouting.test.tsx`, `dataScreen.test.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/schema.ts` -- `CATEGORY_COLUMNS` + нормализованный набор -- источник категорий (AD-6).
- [x] `src/domain/model.ts` -- типы `RowSet`, `FilterOption` -- канонические типы (AD-4).
- [x] `src/domain/pipeline/selectActiveSheet.ts` -- селектор активного листа -- один владелец (AD-12).
- [x] `src/domain/pipeline/applyFilter.ts` -- опции фильтров и фильтрация -- CAP-5/AD-8/AD-14.
- [x] `src/ui/store/reducer.ts` + `context.ts` + `workbook-store.tsx` -- `filterState`, действия и производные `rowSet`/`filterOptions` -- AD-3/AD-12.
- [x] `src/ui/components/FilterBar.tsx` + `SurfaceTabs.tsx` -- фильтры-чипы и вкладки поверхностей -- UX.
- [x] `src/ui/screens/AnalysisScreen.tsx` -- U3: фильтры, счётчик, пустое состояние -- CAP-5.
- [x] `src/app/App.tsx` + `src/ui/screens/DataScreen.tsx` -- вкладки U2/U3 -- UX IA.
- [x] `src/ui/i18n/ru.ts` + `src/index.css` -- строки и стили -- конвенция i18n/токены.
- [x] `tests/applyFilter.test.ts`, `tests/analysisScreen.test.tsx`, `tests/filterBar.test.tsx` + обновление стабов -- покрытие матрицы -- READY.

**Acceptance Criteria:**
- Given книга загружена, when открыта вкладка «Анализ», then показаны чипы доступных категорий.
- Given выбрано значение категории, when фильтр применён, then счётчик показывает «Показано X из Y строк», а набор содержит только совпавшие строки.
- Given выбраны значения двух категорий, when применено, then остаются строки, совпавшие по обеим.
- Given фильтр не даёт строк, when он применён, then показано пустое состояние с действием «Сбросить фильтры».
- Given есть распознанная колонка-дата, when задан диапазон, then строки вне диапазона и строки без даты исключены; без колонки-даты секции «Дата» нет.
- Given фильтры активны, when переход U2↔U3, then фильтры сохраняются; при смене листа или файла — сбрасываются.
- Given у активного листа нет строк данных, when открыт U2, then вкладка «Анализ» недоступна.
- Given любая фильтрация, when она выполняется, then исходные строки листа не изменяются и сетевых запросов нет.

## Spec Change Log

## Design Notes

- Почему U3, а не U2: UX IA относит CAP-5/6/7 к «Анализу»; Story 2 отложила U3, Story 3 создаёт поверхность, Story 4 наполняет её графиками. Предпросмотр U2 (CAP-3) не фильтруется — фильтры применяются к аналитике (CAP-6), как в контракте.
- Семантика: категории — И, значения внутри категории — ИЛИ (AD-8). Пустой набор значений = фильтр не задан. Сравнение значений — через `normalizeHeader` (trim/регистр/ё→е) ради устойчивости к разнобою в выгрузке.
- Опции: категории из 5 контрактных колонок, присутствующих в листе и имеющих хотя бы одно значение в строках данных (пустая категория чипа не даёт), порядок — по позиции колонки; «Задача» не фильтруется.
- Дата: диапазон «с»/«по» (`<input type="date">`, ISO `YYYY-MM-DD`), включительно по календарному дню; строка без даты при активном диапазоне исключается.
- Счётчик: без фильтров — «626 строк»; с фильтрами — «Показано 312 из 626 строк» (именительный падеж для «626 строк», родительный «строки/строк» после «из» — в `ru`). Сброс: смена листа и загрузка нового файла очищают фильтры.

## Verification

**Commands:**
- `npm.cmd exec tsc -- --noEmit` -- expected: 0 ошибок.
- `npm.cmd exec vitest run` -- expected: прежние 84 + новые тесты зелёные.
- `npm.cmd exec eslint .` -- expected: 0 ошибок.
- `npm.cmd run build` -- expected: `dist/` собирается.

**Manual checks (if no CLI):**
- Образец (626 строк, без колонки-даты) → «Анализ»: чипы по 5 категориям, секции «Дата» нет, счётчик «626 строк»; «Тип работы → Документация» сужает счётчик; «Сбросить» возвращает 626; комбинация без совпадений → пустое состояние.
- Файл с колонкой-датой → появляется секция «Дата»; диапазон «с»/«по» сужает набор.

## Suggested Review Order

**Фильтрация — чистое ядро (CAP-5)**
- Начните здесь: категории — И, значения внутри категории — ИЛИ, диапазон дат включительно по дню ([applyFilter.ts:146](../../../../src/domain/pipeline/applyFilter.ts#L146))
- Опции для чипов: контрактные категории, присутствующие в листе и имеющие значения в строках данных, плюс опциональная колонка-дата ([applyFilter.ts:100](../../../../src/domain/pipeline/applyFilter.ts#L100))
- Единственный владелец скана «строки без маркеров» (AD-14), общий для пайплайна и предпросмотра ([applyFilter.ts:63](../../../../src/domain/pipeline/applyFilter.ts#L63))
- Список категорий — данные контракта, а не копирайт UI ([schema.ts:25](../../../../src/domain/schema.ts#L25))
- Канонические типы `FilterOption`/`RowSet` согласуют store и представления ([model.ts:71](../../../../src/domain/model.ts#L71))

**Состояние фильтров и производный набор (один store, AD-3/AD-12)**
- `filterState` в редьюсере: `SET_FILTER`/`CLEAR_FILTERS` и сброс при загрузке/смене листа ([reducer.ts:12](../../../../src/ui/store/reducer.ts#L12))
- `rowSet`/`filterOptions` вычисляются один раз на (лист, фильтры) и только читаются компонентами ([workbook-store.tsx:23](../../../../src/ui/store/workbook-store.tsx#L23))
- Публичная поверхность store, которую потребляют компоненты ([context.ts:5](../../../../src/ui/store/context.ts#L5))
- Селектор активного листа вынесен, чтобы U2 и фильтры не расходились ([selectActiveSheet.ts:8](../../../../src/domain/pipeline/selectActiveSheet.ts#L8))

**Поверхности U2/U3 (UX IA)**
- Маршрутизация «Данные»/«Анализ» и защита от пустого листа ([App.tsx:17](../../../../src/app/App.tsx#L17))
- ARIA-табы с roving tabindex; недоступный «Анализ» пропускается клавиатурой ([SurfaceTabs.tsx:20](../../../../src/ui/components/SurfaceTabs.tsx#L20))
- Предпросмотр U2 намеренно без фильтров (CAP-3) и теперь использует общий скан строк ([DataScreen.tsx:52](../../../../src/ui/screens/DataScreen.tsx#L52))

**Элементы фильтра и пустое состояние**
- Чипы, меню значений (переключатели `aria-pressed`, Esc возвращает фокус), диапазон дат, «Сбросить» ([FilterBar.tsx:23](../../../../src/ui/components/FilterBar.tsx#L23))
- U3: счётчик «Показано X из Y строк» и пустое состояние ([AnalysisScreen.tsx:12](../../../../src/ui/screens/AnalysisScreen.tsx#L12))
- Русские строки, включая родительный падеж после «из» ([ru.ts:58](../../../../src/ui/i18n/ru.ts#L58))
- Стили чипов, меню и поверхностей ([index.css:545](../../../../src/index.css#L545))

**Тесты**
- Домен: категории И/ИЛИ, диапазон дат, неизменность строк, пропуск пустой категории ([applyFilter.test.ts:51](../../../../tests/applyFilter.test.ts#L51))
- U3: счётчик, пустое состояние, сброс ([analysisScreen.test.tsx:171](../../../../tests/analysisScreen.test.tsx#L171))
- Чипы: ARIA меню значений и возврат фокуса по Esc ([filterBar.test.tsx:88](../../../../tests/filterBar.test.tsx#L88))
- Клавиатурный паттерн вкладок поверхностей ([surfaceTabs.test.tsx:53](../../../../tests/surfaceTabs.test.tsx#L53))
- Реальный store: сохранение фильтров U2↔U3, маршрутизация, пустой лист, сброс на новом файле ([appRouting.test.tsx:125](../../../../tests/appRouting.test.tsx#L125))
- Производные store и сброс фильтров при смене листа ([workbookStore.test.tsx:97](../../../../tests/workbookStore.test.tsx#L97))
