import { describe, expect, it } from 'vitest';
import { isSupportedFileName, loadWorkbookFile } from '../src/adapters/file-source';
import type { CellValue, RawWorkbook } from '../src/domain/model';
import { HEADERS, makeSheet, makeWorkbook, rowFor } from './fixtures';

const okBytes = () => Promise.resolve(new ArrayBuffer(16));

function workbookWithDataRows(count: number): RawWorkbook {
  const rows: CellValue[][] = [[...HEADERS]];
  for (let index = 0; index < count; index += 1) {
    rows.push(
      rowFor(HEADERS, {
        'Тип задачи': 'Задача',
        Задача: `A${index}`,
        Статус: 'Готово',
        Исполнитель: 'Иванов',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': index,
      }),
    );
  }
  return makeWorkbook([makeSheet(rows)]);
}

describe('isSupportedFileName', () => {
  it('accepts xls/xlsx only, case-insensitively', () => {
    expect(isSupportedFileName('a.xlsx')).toBe(true);
    expect(isSupportedFileName('a.XLS')).toBe(true);
    expect(isSupportedFileName('a.csv')).toBe(false);
    expect(isSupportedFileName('a.pdf')).toBe(false);
    expect(isSupportedFileName('a.xlsm')).toBe(false);
    expect(isSupportedFileName('a.xls.txt')).toBe(false);
  });
});

describe('loadWorkbookFile', () => {
  it('BAD_FORMAT: rejects unsupported extensions', async () => {
    const result = await loadWorkbookFile('data.csv', okBytes, {
      parse: () => workbookWithDataRows(1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({ code: 'UNSUPPORTED_FORMAT', severity: 'blocking' });
    }
  });

  it('CORRUPT: a read failure becomes a blocking issue', async () => {
    const result = await loadWorkbookFile(
      'data.xlsx',
      () => Promise.reject(new Error('io error')),
      { parse: () => workbookWithDataRows(1) },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('CORRUPT_FILE');
  });

  it('CORRUPT: a parser failure becomes a blocking issue', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => {
        throw new Error('bad archive');
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('CORRUPT_FILE');
  });

  it('CORRUPT: a workbook with no sheets is rejected', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, { parse: () => makeWorkbook([]) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('CORRUPT_FILE');
  });

  it('OVER_LIMIT: total data rows above the limit block the load', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => workbookWithDataRows(4),
      rowLimit: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({ code: 'ROW_LIMIT_EXCEEDED', count: 4 });
    }
  });

  it('BOUNDARY: exactly the limit passes, one more blocks', async () => {
    const atLimit = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => workbookWithDataRows(3),
      rowLimit: 3,
    });
    expect(atLimit.ok).toBe(true);

    const overLimit = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => workbookWithDataRows(4),
      rowLimit: 3,
    });
    expect(overLimit.ok).toBe(false);
  });

  it('counts rows across every sheet', async () => {
    const sheet = workbookWithDataRows(2).sheets[0];
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => makeWorkbook([sheet, sheet]),
      rowLimit: 3,
    });
    expect(result.ok).toBe(false);
  });

  it('HAPPY_PATH: a within-limit file yields the workbook', async () => {
    const result = await loadWorkbookFile('data.xlsx', okBytes, {
      parse: () => workbookWithDataRows(2),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.workbook.sheets).toHaveLength(1);
  });
});
