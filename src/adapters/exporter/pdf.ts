import fontUrl from '@expo-google-fonts/pt-sans/400Regular/PTSans_400Regular.ttf?url';

/**
 * PDF export (CAP-7, AD-9, AD-20). The adapter receives the chart image as a data
 * URL and every text already rendered by the UI (AD-2 — adapters never import the
 * UI), lays them out on A4 and returns the document as a `Blob`.
 *
 * jsPDF's standard fonts use `/WinAnsiEncoding` and cannot render Cyrillic, so a
 * Cyrillic TTF (PT Sans, OFL-1.1) is embedded through the virtual file system
 * before the first `text()` call. The font is fetched lazily as a static asset —
 * never uploaded (AD-1) — and cached for the session.
 */

export interface PdfReport {
  /** `data:image/png;base64,…` snapshot of the live chart canvas (AD-19). */
  imageDataUrl: string;
  /** Report heading, e.g. «Столбчатый: Затрачено времени (ч) по «Исполнителю»». */
  title: string;
  /** Active filters line (already labelled by the UI). */
  filters: string;
  /** Current row counter line. */
  rowsCount: string;
  /** Generation date as ISO 8601 `YYYY-MM-DD` (AD-9). */
  date: string;
}

/** A4 portrait in millimetres (the sheet `unit`). */
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;

/** The VFS file name and the jsPDF font alias — both internal to this module. */
const FONT_FILE = 'PTSans-Regular.ttf';
const FONT_NAME = 'PTSans';

let fontBase64Promise: Promise<string> | null = null;

/** Encodes raw bytes as base64 without `btoa`'s argument-length limit. */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/** Loads and caches the Cyrillic TTF as base64; retries after a failed fetch. */
function loadFont(): Promise<string> {
  if (!fontBase64Promise) {
    fontBase64Promise = fetch(fontUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Font asset request failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(toBase64)
      .catch((error: unknown) => {
        // Do not cache a rejected promise — a later export may succeed.
        fontBase64Promise = null;
        throw error;
      });
  }
  return fontBase64Promise;
}

/**
 * Renders the report `Blob`: heading, filters, row counter, generation date and
 * the chart image. The image height is always positive; a too-tall image is
 * scaled down to the remaining space instead of overflowing the page.
 */
export async function exportPdf(report: PdfReport): Promise<Blob> {
  const [{ jsPDF }, base64] = await Promise.all([import('jspdf'), loadFont()]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addFileToVFS(FONT_FILE, base64);
  pdf.addFont(FONT_FILE, FONT_NAME, 'normal');
  // Every subsequent text() uses the embedded Cyrillic font.
  pdf.setFont(FONT_NAME, 'normal');

  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const bottom = PAGE_HEIGHT - MARGIN;
  let cursorY = MARGIN + 6;

  /** Starts a new page when `needed` millimetres would run past the bottom. */
  const ensureSpace = (needed: number): void => {
    if (cursorY + needed > bottom) {
      pdf.addPage();
      cursorY = MARGIN;
    }
  };

  pdf.setFontSize(16);
  for (const line of pdf.splitTextToSize(report.title, contentWidth) as string[]) {
    ensureSpace(7);
    pdf.text(line, MARGIN, cursorY);
    cursorY += 7;
  }
  cursorY += 2;

  pdf.setFontSize(11);
  for (const meta of [report.filters, report.rowsCount, report.date]) {
    for (const line of pdf.splitTextToSize(meta, contentWidth) as string[]) {
      ensureSpace(6);
      pdf.text(line, MARGIN, cursorY);
      cursorY += 6;
    }
  }
  cursorY += 4;

  // Keep the chart at a usable size: a fresh page when too little room is left.
  const MIN_IMAGE_HEIGHT = 60;
  if (bottom - cursorY < MIN_IMAGE_HEIGHT) {
    pdf.addPage();
    cursorY = MARGIN;
  }

  const properties = pdf.getImageProperties(report.imageDataUrl);
  const ratio =
    properties.width > 0 && properties.height > 0 ? properties.height / properties.width : 0.6;
  let imageWidth = contentWidth;
  let imageHeight = imageWidth * ratio;

  const availableHeight = bottom - cursorY;
  if (imageHeight > availableHeight) {
    imageHeight = Math.max(availableHeight, 1);
    imageWidth = imageHeight / ratio;
  }
  // Guard against a degenerate image: addImage must never receive a non-positive size.
  if (imageHeight < 1) imageHeight = 1;
  if (imageWidth < 1) imageWidth = 1;

  pdf.addImage(report.imageDataUrl, 'PNG', MARGIN, cursorY, imageWidth, imageHeight);

  return pdf.output('blob');
}
