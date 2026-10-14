import { describe, expect, it } from 'vitest';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { loadWorkbookFile } from '../src/adapters/file-source';
import { HEADERS, makeSheet, makeWorkbook, rowFor, sampleRows } from './fixtures';

const okBytes = () => Promise.resolve(new ArrayBuffer(8));

describe('upload flow (adapter + domain)', () => {
  it('a sample-like file loads and reports section-row warnings', async () => {
    const loaded = await loadWorkbookFile('sample.xlsx', okBytes, {
      parse: () => makeWorkbook([makeSheet(sampleRows())]),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const { validation } = analyzeWorkbook(loaded.workbook);
    expect(validation.status).toBe('warnings');
  });

  it('a missing required column blocks before any analytics is built', async () => {
    const headers = HEADERS.filter((header) => header !== 'Исполнитель');
    const rows = [
      headers,
      rowFor(headers, {
        'Тип задачи': 'Задача',
        Задача: 'A',
        Статус: 'Готово',
        'Тип работы': 'Разработка',
        'Затрачено времени (ч)': 3,
      }),
    ];
    const loaded = await loadWorkbookFile('sample.xlsx', okBytes, {
      parse: () => makeWorkbook([makeSheet(rows)]),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const { validation } = analyzeWorkbook(loaded.workbook);
    expect(validation.status).toBe('blocked');
  });
});
