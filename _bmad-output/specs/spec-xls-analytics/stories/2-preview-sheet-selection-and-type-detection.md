---
title: '2 — Предпросмотр, выбор листа и автоопределение типов'
type: 'feature'
created: '2026-10-14'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd412c1ce7888d8a326474f3c09375f0cedd04f2a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** После успешной загрузки данные недоступны для просмотра: пользователь не видит строки листа, не может переключить лист, а автоопределённые типы колонок нигде не показаны. До построения аналитики нельзя убедиться, что файл распознан верно.

**Approach:** Ввести поверхность U2 «Данные» (CAP-3 + CAP-4): сразу после успешной загрузки приложение переходит на неё и показывает первые строки активного листа, вкладки листов с переключением предпросмотра и чипы автотипа каждой колонки (число/дата/текст). Инференс типов выносится в чистую функцию домена `inferTypes` (AD-15) по остову ARCHITECTURE-SPINE.

## Boundaries & Constraints

**Always:**
- Логика типов — чистая функция домена, без React/SheetJS/DOM (AD-2); тип = большинство непустых значений (AD-15).
- Один store, иммутабельные обновления; активный лист — поле `Workbook.activeSheetName` (AD-3, AD-4).
- Предпросмотр строится по листу без строк-маркеров (AD-14); исходные данные не мутируются (AD-16).
- Атомарность загрузки сохраняется (AD-17); предупреждения — один баннер, теперь на U2 (AD-5, AD-16).
- Все строки UI — в каталоге `ru`; числа и даты выводятся через `Intl` `ru-RU` (AD-9).
- Тип колонки не редактируется пользователем (UX: автоопределение).

**Ask First:**
- Новая зависимость вне таблицы Stack остова (`jsdom` в таблице Stack есть — берётся оттуда).
- Изменение набора обязательных колонок B–G или набора/текстов ошибок и предупреждений.
- Изменение поведения CAP-1/CAP-2 из Story 1, кроме перехода с U1 на U2.

**Never:**
- Фильтры, графики, сводная таблица, экспорт (CAP-5/CAP-6/CAP-7) — истории 3–5.
- Ручное изменение типов или данных, пересчёт формул, дозагрузка из сети.
- Бэкенд/API/БД и передача содержимого файла по сети (AD-1, AD-11).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Книга загружена (`ok`/`warnings`) | U2: первые строки активного листа, вкладки листов, чипы типов | — |
| SWITCH_SHEET | Клик по вкладке другого листа | Предпросмотр отражает выбранный лист; `activeSheetName` обновлён | — |
| SINGLE_SHEET | В книге один видимый лист | Предпросмотр показан; вкладки не выводятся | — |
| EMPTY_SHEET | Лист без строк данных | Заметка «Лист пуст», таблица не рендерится | — |
| TYPE_MAJORITY | Колонка с частично заполненными числами (H/I) | Тип «число» по большинству непустых; показан счётчик непустых | — |
| TYPE_DATE / TYPE_TEXT | Колонка-дата / текстовая | Чип «дата» / «текст» | — |
| AMBIGUOUS_TYPE | По числу типов ничья | Чип показывает выбранный тип; предупреждение `UNKNOWN_COLUMN_TYPE` | Предупреждение в баннере |
| HIDDEN_SHEET | В файле есть скрытый лист | Скрытый лист не предлагается во вкладках | Предупреждение `HIDDEN_SHEETS` |
| WARN_ON_U2 | Загрузка со статусом `warnings` | Янтарный баннер на U2, действует до нового файла | — |
| RESET | Кнопка «Новый файл» | Возврат на U1, состояние сессии сброшено | — |
| PAGINATION | Лист длиннее одной страницы (626 строк) | Постраничный предпросмотр по 50; счётчик «Строки 1–50 из 626», «Назад/Вперёд» и переход по номеру; смена листа возвращает на стр. 1 | — |

</frozen-after-approval>

## Code Map

- `_bmad-output/specs/spec-xls-analytics/SPEC.md` (CAP-3, CAP-4), `data-input-rules.md` (эталонная схема, порядок обработки), остов `ARCHITECTURE-SPINE.md` (AD-4/AD-14/AD-15, дерево) -- контракт.
- `src/domain/pipeline/inferTypes.ts` -- НОВЫЙ модуль: перенос `classifyCell` (`validateStructure.ts:41`), `inferColumnType` (`:49`), приоритет `TYPE_PRIORITY` (`:26`) и `DATE_PATTERNS` (`:28`) -- CAP-4/AD-15.
- `src/domain/pipeline/validateStructure.ts:20,99,111` -- потреблять `inferTypes`; состав issues без изменений -- сохранение CAP-2.
- `src/domain/model.ts:15,31,43` -- `Column`/`Sheet`/`Workbook.activeSheetName` (только чтение).
- `src/ui/store/reducer.ts:23` -- добавить действие `SET_SHEET`; `:53` `RESET` -- переключение листа, AD-3.
- `src/ui/store/context.ts:4` + `workbook-store.tsx:49` -- добавить `setActiveSheet` в `StoreApi` -- AD-12 (владелец состояния — store).
- `src/ui/screens/DataScreen.tsx` -- НОВЫЙ: U2 (таблица предпросмотра + вкладки + чипы + пустой лист) -- CAP-3.
- `src/ui/components/SheetTabs.tsx`, `src/ui/components/TypeChip.tsx` -- НОВЫЕ -- паттерны UX.
- `src/app/App.tsx:32` -- переключение U1/U2 по `state.workbook` -- авто-переход UX.
- `src/ui/i18n/ru.ts` -- новые строки; `src/index.css` -- стили таблицы/вкладок/чипов (токены DESIGN.md).
- `vite.config.ts:8` (include `tests/**/*.test.tsx`) + `package.json` (`jsdom`) -- компонентные тесты.
- `tests/fixtures.ts` (`makeSheet`, `makeWorkbook`, `rowFor`) -- переиспользуемые фикстуры.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/pipeline/inferTypes.ts` -- новый чистый модуль инференса типов -- CAP-4/AD-15.
- [x] `src/domain/pipeline/validateStructure.ts` -- импортировать `inferTypes`, убрать дублирование -- AD-2.
- [x] `src/ui/store/reducer.ts` + `context.ts` + `workbook-store.tsx` -- `SET_SHEET`/`setActiveSheet` -- переключение листа.
- [x] `src/ui/components/TypeChip.tsx` + `SheetTabs.tsx` -- чип типа и вкладки листов -- UX-паттерны.
- [x] `src/ui/screens/DataScreen.tsx` -- поверхность U2 -- CAP-3.
- [x] `src/app/App.tsx` -- рендер U2 при загруженной книге -- авто-переход.
- [x] `src/ui/i18n/ru.ts` + `src/index.css` -- строки и стили -- конвенция i18n/токены.
- [x] `vite.config.ts` + `package.json` -- jsdom и include `.tsx` -- компонентные тесты.
- [x] `tests/inferTypes.test.ts`, `tests/dataScreen.test.tsx`, `tests/appRouting.test.tsx`, `tests/reducer.test.ts` -- покрытие матрицы -- READY.
- [x] `src/ui/components/Pagination.tsx` -- постраничная навигация предпросмотра -- CAP-3.
- [x] `tests/pagination.test.tsx` + `tests/dataScreen.test.tsx` -- покрытие строки PAGINATION -- READY.

**Acceptance Criteria:**
- Given успешная загрузка файла, when она завершена, then отображается U2 с предпросмотром активного листа.
- Given книга с несколькими видимыми листами, when выбран другой лист, then предпросмотр показывает строки выбранного листа.
- Given колонка с частично заполненными числами, when отображается, then её тип — «число».
- Given лист без строк данных, when он выбран, then показано «Лист пуст» без таблицы.
- Given загрузка со статусом `warnings`, when показан U2, then баннер предупреждений виден и не блокирует работу.
- Given лист длиннее 50 строк, when открыт предпросмотр, then доступны страницы по 50 строк со счётчиком «Строки X–Y из N», «Назад/Вперёд» и переходом к произвольной странице.
- Given любая работа на U2, when она выполняется, then сетевых запросов с содержимым файла нет.

## Spec Change Log

- 2026-10-14 — **Пагинация предпросмотра** (явный запрос владельца, дополнение к Story 2). Было: срез «первые 50 строк» с уведомлением. Стало: страницы по 50 с навигацией «Назад/Вперёд», счётчиком и переходом по номеру. Затронуто: frozen-матрица (строка PAGINATION), Design Notes, Acceptance Criteria, задачи, Verification. Frozen-блок был дополнен по прямому запросу человека (условие `frozen-after-approval` соблюдено).

## Design Notes

- Решения (подтверждаются на checkpoint): U2 заменяет result-карточку U1, а баннер предупреждений переносится на U2 — по UX IA и Core States; вкладки листов показывают только видимые листы; предпросмотр — постранично по 50 строк без строк-маркеров; вкладка «Анализ» появится в истории 4 вместе с U3.
- Пример инференса: колонка с 140 числами и 487 пустыми → тип «число», подпись «140 непустых значений».
- Пример отображения ячеек: `12.5` → `12,5` (Intl `ru-RU`, tabular-nums), дата → `дд.мм.гггг`, пусто → пустая ячейка.
- Правки по ревью (patch, итерация 0): пустой заголовок колонки заменяется на «Колонка N»; дата-подобные строки форматируются через `Intl`; вкладки листов получили полный ARIA-паттерн (tabpanel, roving tabindex, стрелки); «Лист пуст» определяется без учёта строк-маркеров; ошибки загрузки (AD-17) показываются и на U2.
- Пагинация (запрос владельца): срез «Показаны первые 50 из N строк» заменён страницами по 50 — «Строки X–Y из N» плюс переход по номеру; смена листа сбрасывает страницу на 1; контрол переиспользуемый (`Pagination`).

## Verification

**Commands:**
- `npm.cmd install --strict-ssl=false` -- expected: успех, добавлен `jsdom`.
- `npm.cmd exec tsc -- --noEmit` -- expected: 0 ошибок.
- `npm.cmd exec vitest run` -- expected: прежние 39 + новые тесты зелёные (сейчас 84).
- `npm.cmd exec eslint .` -- expected: 0 ошибок.
- `npm.cmd run build` -- expected: `dist/` собирается.

**Manual checks (if no CLI):**
- Загрузить образец `C:\Users\golovin_k_s\Downloads\Новый документ от 08.10.2026.xlsx` → U2: лист «Main sheet», первые строки, тип колонки «Затрачено времени (ч)» — «число», баннер про 49 служебных строк.
- Тот же образец (626 строк данных) → 13 страниц: «Строки 1–50 из 626»; «Вперёд» листает диапазон; ввод «13» открывает «Строки 601–626 из 626» (26 строк, «Вперёд» недоступна); смена листа возвращает на страницу 1.

## Suggested Review Order

**Маршрутизация поверхностей**

- Единственное решение о том, какая поверхность показана: книга есть → U2, иначе U1.
  [`App.tsx:13`](../../../../src/app/App.tsx#L13)

**Тип-инференс в домене (CAP-4, AD-15)**

- Чистый модуль инференса: перенос из `validateStructure` без React/DOM.
  [`inferTypes.ts:51`](../../../../src/domain/pipeline/inferTypes.ts#L51)
- Общий `parseDateLike` — типы и вывод дат трактуют «дату» одинаково.
  [`inferTypes.ts:22`](../../../../src/domain/pipeline/inferTypes.ts#L22)
- Валидация теперь потребляет инференс, а не дублирует его.
  [`validateStructure.ts:20`](../../../../src/domain/pipeline/validateStructure.ts#L20)

**Состояние: переключение листа (AD-3)**

- Иммутабельный `SET_SHEET` с защитой от скрытых/неизвестных/повторных кликов.
  [`reducer.ts:54`](../../../../src/ui/store/reducer.ts#L54)
- Тонкая обёртка store: `setActiveSheet` только диспетчит действие.
  [`workbook-store.tsx:51`](../../../../src/ui/store/workbook-store.tsx#L51)

**Поверхность U2 (CAP-3)**

- Композиция U2: вкладки, панель, предпросмотр, пустой лист, баннеры.
  [`DataScreen.tsx:42`](../../../../src/ui/screens/DataScreen.tsx#L42)
- Вывод ячейки через `Intl ru-RU` + защита от Invalid Date.
  [`DataScreen.tsx:23`](../../../../src/ui/screens/DataScreen.tsx#L23)
- Панель предпросмотра как `tabpanel`, связанная с активной вкладкой.
  [`DataScreen.tsx:84`](../../../../src/ui/screens/DataScreen.tsx#L84)
- Постраничный предпросмотр: срез по 50, клампинг устаревшей страницы, сброс при смене листа.
  [`DataScreen.tsx:63`](../../../../src/ui/screens/DataScreen.tsx#L63)

**Компоненты**

- Вкладки видимых листов с полным ARIA-паттерном и клавиатурой.
  [`SheetTabs.tsx:17`](../../../../src/ui/components/SheetTabs.tsx#L17)
- Переиспользуемый контрол пагинации: счётчик диапазона, шаги, переход по номеру, клампинг.
  [`Pagination.tsx:21`](../../../../src/ui/components/Pagination.tsx#L21)
- Общие id для связки вкладка ↔ панель (вне компонента ради react-refresh).
  [`sheetTabsIds.ts:7`](../../../../src/ui/components/sheetTabsIds.ts#L7)
- Нейтральный чип автотипа; тип продублирован в accessible name.
  [`TypeChip.tsx:8`](../../../../src/ui/components/TypeChip.tsx#L8)
- Единый баннер блокирующих ошибок (AD-17), переиспользуется U1 и U2.
  [`ErrorBanner.tsx:8`](../../../../src/ui/components/ErrorBanner.tsx#L8)

**Строки и стили**

- Новые строки UI (плейсхолдер колонки, пагинация, плюрализация).
  [`ru.ts:37`](../../../../src/ui/i18n/ru.ts#L37)
- Стили панели, пагинации, вкладок, таблицы и чипа.
  [`index.css:252`](../../../../src/index.css#L252)

**Периферия: конфиг и тесты**

- Компонентные тесты стали возможны: jsdom + include `.tsx`.
  [`vite.config.ts:8`](../../../../vite.config.ts#L8)
- Матрица I/O & edge-case покрыта компонентными тестами U2.
  [`dataScreen.test.tsx:192`](../../../../tests/dataScreen.test.tsx#L192)
- Тесты контрола пагинации: границы, клампинг, ru-RU-форматирование.
  [`pagination.test.tsx:85`](../../../../tests/pagination.test.tsx#L85)
- Оба маршрута U1↔U2 и `CurrentScreen` под стабом store.
  [`appRouting.test.tsx:45`](../../../../tests/appRouting.test.tsx#L45)
- Реальная диспетчеризация `setActiveSheet` через настоящий провайдер.
  [`workbookStore.test.tsx:66`](../../../../tests/workbookStore.test.tsx#L66)
- Единичные ветки инференса типов.
  [`inferTypes.test.ts:30`](../../../../tests/inferTypes.test.ts#L30)
- Плюрализация счётчика непустых значений.
  [`ru.test.ts:4`](../../../../tests/ru.test.ts#L4)
