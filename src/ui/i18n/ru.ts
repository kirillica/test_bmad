import type { Issue } from '../../domain/model';
import { ROW_LIMIT } from '../../domain/schema';

const ROW_LIMIT_TEXT = ROW_LIMIT.toLocaleString('ru-RU');

/** Every user-facing string lives here — components never hardcode copy. */
export const ru = {
  appTitle: 'XLS-Аналитика',
  newFile: 'Новый файл',
  themeToLight: 'Светлая тема',
  themeToDark: 'Тёмная тема',
  screenTitle: 'Загрузка данных',
  chooseFile: 'Выбрать файл',
  dropTitle: 'Перетащите файл сюда',
  dropHint: 'или нажмите, чтобы выбрать на устройстве',
  formatsHint: `Поддерживаются файлы XLS и XLSX, до ${ROW_LIMIT_TEXT} строк на файл.`,
  privacy: 'Файл обрабатывается локально и не покидает устройство.',
  reading: 'Чтение файла и проверка структуры…',
  readingFile: (name: string) => `Чтение файла «${name}» и проверка структуры…`,
  ready: 'Файл готов к анализу',
  errorTitle: 'Файл не загружен',
  fixAndRetry: 'Проверьте структуру файла и загрузите снова.',
  sheetsCount: (count: number) => `Листов: ${count}`,
  fileNameLine: (name: string) => `Файл: ${name}`,
  rejectedFile: (name: string) => `Файл «${name}» не поддерживается.`,
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
