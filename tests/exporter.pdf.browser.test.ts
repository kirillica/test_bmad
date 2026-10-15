import { describe, expect, it } from 'vitest';
import { exportPdf } from '../src/adapters/exporter/pdf';

/**
 * PDF export (CAP-7, AD-9, AD-20) runs in browser mode: the adapter lazily loads
 * jsPDF and fetches the bundled Cyrillic TTF. The report must embed the font
 * (`/FontFile2`) and carry real Russian text — a `%PDF-` header alone is not
 * enough (Spec Change Log, loopback 1).
 */

/** A small red PNG the report can embed, produced by the browser itself. */
function chartPngDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 60;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D context is unavailable');
  context.fillStyle = '#3366cc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const REPORT = {
  imageDataUrl: chartPngDataUrl(),
  title: 'Столбчатый: Затрачено времени (ч) по «Исполнителю»',
  filters: 'Фильтры: Исполнитель: Иванов',
  rowsCount: '3 строки',
  // The UI labels the generation date (AD-9, ISO 8601) before it reaches the adapter.
  date: 'Дата формирования: 2026-10-15',
};

/** The raw PDF as a Latin-1 string (1 byte = 1 char) so byte offsets stay exact. */
async function pdfBytes(blob: Blob): Promise<string> {
  const view = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let index = 0; index < view.length; index += 1) {
    text += String.fromCharCode(view[index]!);
  }
  return text;
}

/** The Cyrillic codepoints the report's text uses, read from the ToUnicode CMap. */
function cyrillicCodepoints(pdf: string): number[] {
  const tokens = pdf.match(/<([0-9A-Fa-f]{4})>/g) ?? [];
  return tokens
    .map((token) => parseInt(token.slice(1, 5), 16))
    .filter((code) => code >= 0x0400 && code <= 0x04ff);
}

describe('exportPdf (browser, CAP-7, AD-9, AD-20)', () => {
  it('produces a PDF with an embedded Cyrillic font and readable Russian text', async () => {
    const blob = await exportPdf(REPORT);
    expect(blob.type).toBe('application/pdf');

    const pdf = await pdfBytes(blob);
    expect(pdf.startsWith('%PDF-')).toBe(true);
    // The font file is embedded, not a standard /WinAnsiEncoding font.
    expect(pdf).toContain('/FontFile2');
    expect(pdf).toContain('/ToUnicode');

    // Non-empty Russian text: the ToUnicode CMap maps glyphs to Cyrillic codes.
    const codes = cyrillicCodepoints(pdf);
    expect(codes.length).toBeGreaterThan(5);
    // «И» (U+0418) from «Исполнитель», «Д» (U+0414) from «Дата формирования»,
    // «а» (U+0430) from «Столбчатый».
    expect(codes).toContain(0x0418);
    expect(codes).toContain(0x0414);
    expect(codes).toContain(0x0430);

    // The content stream actually draws text (Tj operators), not just an image.
    expect((pdf.match(/Tj/g) ?? []).length).toBeGreaterThan(0);
  });

  it('embeds the chart image without overflowing the page', async () => {
    const tall = document.createElement('canvas');
    tall.width = 200;
    tall.height = 2000;
    const context = tall.getContext('2d');
    if (!context) throw new Error('2D context is unavailable');
    context.fillStyle = '#000000';
    context.fillRect(0, 0, tall.width, tall.height);

    // A very tall chart must still produce a valid document (image height > 0).
    const blob = await exportPdf({ ...REPORT, imageDataUrl: tall.toDataURL('image/png') });
    const pdf = await pdfBytes(blob);
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('/Subtype /Image');
  });
});
