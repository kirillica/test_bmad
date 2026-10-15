import type { ColumnType, Issue, ViewConfig } from '../../domain/model';
import { ROW_LIMIT } from '../../domain/schema';

const ROW_LIMIT_TEXT = ROW_LIMIT.toLocaleString('ru-RU');

const numberFormat = new Intl.NumberFormat('ru-RU');

/** Formats a number with `Intl` `ru-RU` (AD-9). */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/**
 * Formats a `Date` as ISO 8601 `YYYY-MM-DD` from its local parts (AD-9). Used for
 * the PDF's generation date so it matches the user's calendar and the ISO date
 * bounds in the same report.
 */
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Russian plural for "строка" agreeing with the cardinal (1/2/5). */
function pluralRows(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'строка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'строки';
  return 'строк';
}

/**
 * Russian genitive plural for «строк» after «из»: «строки» only for counts whose
 * last digit is 1 (but not the teens), otherwise «строк» (`из 21 строки`).
 */
function pluralRowsGenitive(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'строки';
  return 'строк';
}

/** Russian plural for "значение" agreeing with the cardinal (1/2/5). */
function pluralValues(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} непустое значение`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} непустых значения`;
  }
  return `${count} непустых значений`;
}

/** Russian plural for "группа" agreeing with the cardinal (1/2/5). */
function pluralGroups(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} группа`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} группы`;
  return `${count} групп`;
}

/** Every user-facing string lives here — components never hardcode copy. */
export const ru = {
  appTitle: 'XLS-Аналитика',
  newFile: 'Новый файл',
  themeToLight: 'Светлая тема',
  themeToDark: 'Тёмная тема',
  screenTitle: 'Загрузка данных',
  dataTitle: 'Данные',
  analysisTitle: 'Анализ',
  dataTab: 'Данные',
  analysisTab: 'Анализ',
  surfacesLabel: 'Разделы',
  filtersLabel: 'Фильтры',
  filterValuesLabel: (header: string) => `Значения: ${header}`,
  selectedCount: (count: number) => `выбрано: ${count}`,
  clearFilters: 'Сбросить',
  resetFilters: 'Сбросить фильтры',
  noRowsForFilters: 'Нет строк по фильтрам',
  rowsCount: (count: number) => `${numberFormat.format(count)} ${pluralRows(count)}`,
  filteredRowsCount: (shown: number, total: number) =>
    `Показано ${numberFormat.format(shown)} из ${numberFormat.format(total)} ${pluralRowsGenitive(total)}`,
  dateSectionLabel: 'Дата',
  dateFrom: 'с',
  dateTo: 'по',
  sheetsLabel: 'Листы файла',
  emptySheet: 'Лист пуст',
  chooseFile: 'Выбрать файл',
  dropTitle: 'Перетащите файл сюда',
  dropHint: 'или нажмите, чтобы выбрать на устройстве',
  formatsHint: `Поддерживаются файлы XLS и XLSX, до ${ROW_LIMIT_TEXT} строк на файл.`,
  privacy: 'Файл обрабатывается локально и не покидает устройство.',
  reading: 'Чтение файла и проверка структуры…',
  readingFile: (name: string) => `Чтение файла «${name}» и проверка структуры…`,
  errorTitle: 'Файл не загружен',
  fixAndRetry: 'Проверьте структуру файла и загрузите снова.',
  sheetsCount: (count: number) => `Листов: ${count}`,
  unnamedColumn: (n: number) => `Колонка ${n}`,
  paginationLabel: 'Постраничная навигация',
  prevPage: 'Назад',
  nextPage: 'Вперёд',
  goToPage: 'Страница',
  pageOf: (count: number) => `из ${count}`,
  rowsRange: (from: string, to: string, total: string) => `Строки ${from}–${to} из ${total}`,
  columnTypes: {
    number: 'число',
    date: 'дата',
    text: 'текст',
  } satisfies Record<ColumnType, string>,
  nonEmptyValues: pluralValues,
  rejectedFile: (name: string) => `Файл «${name}» не поддерживается.`,
  // U3 views (CAP-6): the view switcher, the dimension/measure selectors and the
  // two representations (chart card and pivot table).
  viewLabel: 'Представление',
  viewTypes: {
    line: 'Линейный',
    bar: 'Столбчатый',
    pie: 'Круговой',
    table: 'Таблица',
  } satisfies Record<ViewConfig['chartType'], string>,
  dimensionLabel: 'Разрез',
  measureLabel: 'Показатель',
  blankDimension: '(не указано)',
  noDimensionReason: 'Представления недоступны: в листе нет категории со значениями.',
  noMeasureReason: 'Представления недоступны: в листе нет числовой колонки.',
  pivotCountLabel: 'Строк',
  pivotTotalLabel: 'Итого',
  pivotLabel: (dimension: string, measure: string) =>
    `Сводная таблица: ${measure} по «${dimension}»`,
  chartTitle: (view: string, measure: string, dimension: string) =>
    `${view}: ${measure} по «${dimension}»`,
  chartAriaLabel: (view: string, measure: string, dimension: string, groups: number) =>
    `${view}, ${measure} по «${dimension}» — ${pluralGroups(groups)}`,
  // Shown in place of the canvas when the lazy Chart.js chunk fails to load.
  chartError: 'График недоступен: не удалось загрузить модуль графиков.',
  // Export (CAP-7): the chart menu, the XLSX button, file names, PDF report
  // lines and the toasts. Components never hardcode this copy.
  exportMenuLabel: 'Экспорт…',
  exportPng: 'PNG',
  exportPdf: 'PDF',
  exportXlsx: 'Экспорт XLSX',
  exportChartNotReady: 'График ещё строится',
  exportBlockedNoRows: 'Экспорт недоступен: нет строк по фильтрам',
  exportBlockedNoView: 'Экспорт недоступен: представление не построено',
  exportPngSuffix: 'график',
  exportPdfSuffix: 'отчёт',
  exportXlsxSuffix: 'данные',
  exportFallbackName: 'отчёт',
  exportSheetData: 'Данные',
  exportSheetPivot: 'Сводная',
  exportNoFilters: 'не заданы',
  exportFiltersLabel: (text: string) => `Фильтры: ${text}`,
  exportDateLabel: (date: string) => `Дата формирования: ${date}`,
  exportReady: (file: string) => `Экспорт готов: ${file}`,
  exportError: 'Не удалось выполнить экспорт',
  toastClose: 'Закрыть',
};

export function messageForIssue(issue: Issue): string {
  switch (issue.code) {
    case 'UNSUPPORTED_FORMAT':
      return 'Поддерживаются только файлы XLS и XLSX.';
    case 'CORRUPT_FILE':
      return 'Не удалось прочитать файл — он повреждён или пуст.';
    case 'ROW_LIMIT_EXCEEDED':
      return `Файл превышает лимит ${ROW_LIMIT_TEXT} строк (${issue.count ?? 0}). Сократите выгрузку и загрузите снова.`;
    case 'MISSING_REQUIRED_COLUMN':
      return `Не найдена обязательная колонка «${issue.column ?? ''}».`;
    case 'SECTION_ROWS_EXCLUDED':
      return `Обнаружено ${issue.count ?? 0} служебных строк — исключены из анализа. Проверьте, что это ожидаемо.`;
    case 'MERGED_CELLS':
      return 'В файле есть объединённые ячейки — данные не изменялись.';
    case 'HIDDEN_SHEETS':
      return 'В файле есть скрытые листы — они не изменялись.';
    case 'EXTRA_HEADER_ROWS':
      return 'Перед заголовком есть лишние строки — использована строка с названиями колонок.';
    case 'UNKNOWN_COLUMN_TYPE':
      return issue.column
        ? `Тип колонки «${issue.column}» определён неуверенно.`
        : 'Тип одной из колонок определён неуверенно.';
    default:
      // Never leak a raw issue code to the user.
      return 'Не удалось обработать файл. Проверьте структуру и попробуйте снова.';
  }
}
