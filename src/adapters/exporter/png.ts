/**
 * PNG export of the live chart canvas (CAP-7, AD-19). The snapshot is a pure
 * read of the current canvas: the exporter never creates its own Chart.js
 * instance or graphics canvas. The theme background is composited on an
 * offscreen 2D canvas so the saved image is opaque instead of transparent.
 */

export interface ChartSnapshot {
  /** PNG bytes ready to download. */
  blob: Blob;
  /** The same image as a data URL, for the PDF report (jsPDF accepts it directly). */
  dataUrl: string;
  width: number;
  height: number;
}

/** Raised when the chart canvas has no pixels yet — the instance is not painted. */
export class EmptyCanvasError extends Error {
  constructor() {
    super('Chart canvas is empty');
    this.name = 'EmptyCanvasError';
  }
}

/** Decodes a `data:` URL into a `Blob` without touching the network. */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const header = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  const mime = /^data:([^;,]+)/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Snapshots `canvas` over an opaque `background` (the theme's `--surface`). A
 * zero-sized canvas is not ready — Chart.js has not painted it yet — so the
 * caller can report failure instead of saving a blank image.
 */
export function snapshotChart(canvas: HTMLCanvasElement, background: string): ChartSnapshot {
  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) throw new EmptyCanvasError();

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const context = offscreen.getContext('2d');
  if (!context) throw new Error('2D context is unavailable');

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.drawImage(canvas, 0, 0);

  const dataUrl = offscreen.toDataURL('image/png');
  return { blob: dataUrlToBlob(dataUrl), dataUrl, width, height };
}

/** The PNG artifact for the current chart (CAP-7): a snapshot's bytes. */
export function exportPng(canvas: HTMLCanvasElement, background: string): Blob {
  return snapshotChart(canvas, background).blob;
}
