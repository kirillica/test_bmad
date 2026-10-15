import { describe, expect, it } from 'vitest';
import { EmptyCanvasError, exportPng, snapshotChart } from '../src/adapters/exporter/png';

/**
 * PNG export (CAP-7, AD-19) needs a real `<canvas>` — jsdom has none — so this
 * runs in browser mode. The snapshot must be opaque (the theme background is
 * composited under the live canvas) and never create a second Chart.js instance.
 */

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function bytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function makeCanvas(width: number, height: number, paint: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  if (paint) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context is unavailable');
    context.fillStyle = '#123456';
    context.fillRect(0, 0, width, height);
  }
  return canvas;
}

/** The pixel at `(x, y)` of an encoded PNG data URL. */
async function pixelAt(dataUrl: string, x: number, y: number): Promise<number[]> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D context is unavailable');
  context.drawImage(image, 0, 0);
  return Array.from(context.getImageData(x, y, 1, 1).data);
}

describe('snapshotChart / exportPng (browser, AD-19)', () => {
  it('snapshots the live canvas dimensions and a PNG data URL', () => {
    const canvas = makeCanvas(120, 80, true);
    const snapshot = snapshotChart(canvas, '#ffffff');

    expect(snapshot.width).toBe(120);
    expect(snapshot.height).toBe(80);
    expect(snapshot.dataUrl.startsWith('data:image/png')).toBe(true);
    expect(snapshot.blob.type).toBe('image/png');
  });

  it('exportPng returns real PNG bytes', async () => {
    const canvas = makeCanvas(64, 48, true);
    const blob = exportPng(canvas, '#ffffff');
    const view = await bytes(blob);

    expect(Array.from(view.slice(0, PNG_MAGIC.length))).toEqual(PNG_MAGIC);
    expect(view.byteLength).toBeGreaterThan(PNG_MAGIC.length);
  });

  it('composites an opaque themed background under a transparent canvas', async () => {
    // Nothing painted: the raw canvas is fully transparent.
    const canvas = makeCanvas(32, 24, false);
    const snapshot = snapshotChart(canvas, '#ff0000');

    expect(await pixelAt(snapshot.dataUrl, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(await pixelAt(snapshot.dataUrl, 31, 23)).toEqual([255, 0, 0, 255]);
  });

  it('throws EmptyCanvasError when the canvas has no pixels yet (CHART_NOT_READY)', () => {
    const canvas = makeCanvas(0, 0, false);
    expect(() => snapshotChart(canvas, '#ffffff')).toThrow(EmptyCanvasError);
  });
});
