---
name: XLS-Analytics
status: draft
description: Браузерное веб-приложение для локального анализа XLS/XLSX: графики и сводные таблицы без работы в Excel. Data-first интерфейс, светлая и тёмная темы, русский язык.
colors:
  # Светлая тема (default) + тёмная через суффикс -dark.
  background: '#F6F8FB'
  background-dark: '#0B1220'
  surface: '#FFFFFF'
  surface-dark: '#111A2C'
  foreground: '#101828'
  foreground-dark: '#E2E8F0'
  muted: '#64748B'
  muted-dark: '#94A3B8'
  border: '#E2E8F0'
  border-dark: '#1E293B'
  primary: '#2563EB'
  primary-foreground: '#FFFFFF'
  primary-dark: '#60A5FA'
  primary-foreground-dark: '#0B1220'
  # Акцент — только для предупреждений/внимания, не для декора.
  accent: '#D97706'
  accent-foreground: '#1A1208'
  accent-dark: '#FBBF24'
  accent-foreground-dark: '#1A1208'
  success: '#059669'
  success-dark: '#34D399'
  destructive: '#DC2626'
  destructive-dark: '#F87171'
  # Категориальная палитра графиков: различима при дейтеранопии/протанопии
  # (голубой — сине-зелёный — янтарь — фиолет — роза — грифель).
  chart-1: '#2563EB'
  chart-2: '#0D9488'
  chart-3: '#D97706'
  chart-4: '#7C3AED'
  chart-5: '#E11D48'
  chart-6: '#475569'
  chart-1-dark: '#60A5FA'
  chart-2-dark: '#2DD4BF'
  chart-3-dark: '#FBBF24'
  chart-4-dark: '#A78BFA'
  chart-5-dark: '#FB7185'
  chart-6-dark: '#94A3B8'
typography:
  # [ASSUMPTION: стек не выбран — системный стек; на этапе архитектуры
  # допускается замена на Inter 400/500/600 с сохранением токенов.]
  fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
  display:
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  heading:
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  title:
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.4'
  body:
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  small:
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.45'
  label:
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: 0.02em
  # Все числа и суммы — табулярные цифры.
  numeric:
    fontVariantNumeric: tabular-nums
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  drop-zone: 16px
  chip: 999px
  switch: 8px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  '12': 48px
components:
  button-primary:
    background: '{colors.primary}'
    color: '{colors.primary-foreground}'
    borderRadius: '{rounded.md}'
    height: 36px
    paddingX: 16px
  button-secondary:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    color: '{colors.foreground}'
    borderRadius: '{rounded.md}'
    height: 36px
  drop-zone:
    border: '2px dashed {colors.border}'
    borderRadius: '{rounded.drop-zone}'
    padding: '{spacing.12}'
    background: '{colors.surface}'
    activeBorder: '{colors.primary}'
  type-chip:
    background: '{colors.muted}'
    opacity: '0.12'
    color: '{colors.foreground}'
    borderRadius: '{rounded.chip}'
    fontSize: '{typography.small.fontSize}'
  warning-banner:
    background: 'color-mix(in srgb, {colors.accent} 8%, {colors.surface})'
    border: '1px solid {colors.accent}'
    color: '{colors.foreground}'
    borderRadius: '{rounded.md}'
  filter-chip:
    borderRadius: '{rounded.chip}'
    height: 28px
    selectedBackground: 'color-mix(in srgb, {colors.primary} 12%, {colors.surface})'
    selectedBorder: '1px solid {colors.primary}'
  view-switcher:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    borderRadius: '{rounded.switch}'
    activeBackground: '{colors.surface}'
    activeShadow: '0 1px 2px rgba(16,24,40,0.12)'
  data-table:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    headerBackground: 'color-mix(in srgb, {colors.muted} 10%, {colors.surface})'
    rowHeight: 32px
  chart-container:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    borderRadius: '{rounded.lg}'
  toast:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    borderRadius: '{rounded.md}'
    shadow: '0 8px 24px rgba(16,24,40,0.16)'
---

# XLS-Analytics — Design Spine

> `[ASSUMPTION: стек не выбран (архитектура впереди).]` Токены заданы самостоятельно, без привязки к UI-киту; реализация допустима на любом веб-стеке, где токены мапятся как CSS-переменные. Стоимость переезда между стеками минимальна, т.к. контракт — уровень токенов и компонент.

## Brand & Style

Инструмент для работы с данными, не игрушка. Визуальный характер — **спокойный, data-first**: нейтральные поверхности, один функциональный акцентный цвет (`{colors.primary}`), цвет в интерфейсе несёт информацию (типы колонок, статусы, предупреждения), а не настроение. Тёмная тема — полноправная, не «инвертированная после обеда»: глубина и контраст поддерживаются в обеих темах одинаково.

Отношение «инструмент/декор» — 90/10: украшать можно только то, что помогает читать данные (заголовки секций, границы карточек), запрещено — то, что отвлекает (градиенты в данных, анимации без необходимости, эмодзи в служебных сообщениях).

## Colors

Двухтемная система: светлая (default) и тёмная. Каждый токен имеет пару `-dark`. Контрастные требования — по `EXPERIENCE.md` → Accessibility Floor (WCAG 2.2 AA).

- **Поверхности:** `{colors.background}` — фон приложения; `{colors.surface}` — карточки (таблица, график, панель фильтров).
- **Смысловые:** `{colors.primary}` — действия и активные состояния; `{colors.accent}` — **только** предупреждения; `{colors.success}` — успешная валидация; `{colors.destructive}` — блокирующие ошибки.
- **Палитра графиков** `chart-1…chart-6` — категориальная, подобрана с учётом дейтеранопии/протанопии (голубой → сине-зелёный → янтарь и т.д.). Значение кодируется не только цветом: у линий — различимые маркеры, у сегментов пирога — подписи/доли.

## Typography

Системный стек (`{typography.fontFamily}`), размерная шкала `display → heading → title → body → small → label`. Числа (значения осей, суммы, проценты, ячейки таблицы) — всегда `{typography.numeric}` (tabular-nums), чтобы колонки читались по-циферблатному. Заголовки секций — `heading`; карточные заголовки — `title`; подписи контролов — `label` (uppercase не обязателен, регистр обычный).

## Layout & Spacing

Шаг сетки — 4 пикселя (`{spacing}`). Контентная колонка — до 1280px, поля страницы — `{spacing.6}`. Высота шапки — 56px (desktop), кнопки — 36px (`{components.button-primary.height}`) с зоной касания не менее 32px для кликабельных элементов. Отступы внутри карточек — `{spacing.5}`; между карточками — `{spacing.4}`; пустые состояния — `{spacing.12}` по вертикали в центре зоны.

## Elevation & Depth

Лёгкая иерархия поверхностей: фон — без тени, карточки — `border` + минимальная тень (не нужна вовсе на ровной сетке). Поднятые элементы (активный пункт переключателя, тост, экспорт-меню) получают слабую тень: светлая тема — `rgba(16,24,40,0.12)`, тёмная — `rgba(0,0,0,0.4)` с увеличенным диффузом. Фокус-кольцо — 2px `{colors.primary}` с отступом 2px от элемента (контраст ≥3:1 к соседнему фону).

## Shapes

Радиусы шкалы: карточки/контейнеры — `{rounded.lg}`; контролы и кнопки — `{rounded.md}`; дроп-зона — `{rounded.drop-zone}`; чипы типов и фильтров — `{rounded.chip}`. Таблицы данных — скругление только внешнего контейнера, строки — прямоугольные.

## Components

- **Кнопка primary** — единственное действие зоны (`{components.button-primary}`); secondary для альтернатив.
- **Drop-zone** (`{components.drop-zone}`): пунктирная рамка, состояние drag-over — рамка `{colors.primary}` + подложка primary 4%; текст-подсказка «Перетащите файл или нажмите».
- **Type-chip** (`{components.type-chip}`): подпись автотипа колонки (число/дата/текст); в hover показывает счётчик непустых значений.
- **Warning-banner** (`{components.warning-banner}`): янтарная подложка 8%, рамка `{colors.accent}`, иконка предупреждения; ставится над зоной контента, не перекрывает её.
- **Filter-chip** (`{components.filter-chip}`): активный — рамка `{colors.primary}` + подложка primary 12%; неактивный — поверхность + `{colors.border}`.
- **View-switcher** (`{components.view-switcher}`): сегменты линейный/столбчатый/круговой/таблица; активный сегмент — поверхность со сдвигом-тенью.
- **Data-table** (`{components.data-table}`): шапка с подложкой, вложенная в контейнер таблицы; без зебры (плотность важнее), разлиновка только горизонтальная.
- **Chart-container** (`{components.chart-container}`): карточка с заголовком и контентом графика; экспорт-кнопки в правом верхнем углу карточки.
- **Toast** (`{components.toast}`): поверхностный, с поднятой тенью; автоскрытие 5с, для ошибок — без автоскрытия.
- **Тема:** переключатель светлая/тёмная в шапке; выбор хранится в localStorage, default — тёмная системная или светлая.

## Do's and Don'ts

**Do:**
- Числа — табулярные; колонки сумм выравниваются по правому краю.
- Один акцентный цвет; второй смысловой (янтарь) — только предупреждения.
- Графики с подписями/долями — не цвет-единственный код.
- Одна тема = одна система токенов, никаких «хот-фиксов» цвета по одному экрану.
- Пустое/ошибочное состояние — с инструкцией, чем заняться дальше.

**Don't:**
- Градиенты, тени-дождевики и анимации в зоне данных.
- Эмодзи в заголовках, баннерах и ошибках (интерфейс — инструмент, не чат).
- «Весёлые» цвета для служебных состояний: ошибка — только `{colors.destructive}`, предупреждение — только `{colors.accent}`.
- Менять контраст ради стиля: обе темы проходят WCAG AA всегда.