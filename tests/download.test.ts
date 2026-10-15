// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '../src/adapters/exporter/download';

/**
 * The local download side-effect (CAP-7, AD-10). Every export path goes through
 * `downloadBlob`, so the object URL lifecycle and the anchor that actually saves
 * the file are pinned here — the screen tests only observe the stubbed call.
 */

const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();

let originalCreate: typeof URL.createObjectURL | undefined;
let originalRevoke: typeof URL.revokeObjectURL | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  URL.createObjectURL = originalCreate as typeof URL.createObjectURL;
  URL.revokeObjectURL = originalRevoke as typeof URL.revokeObjectURL;
});

describe('downloadBlob (CAP-7)', () => {
  it('clicks a named anchor for the blob URL and revokes it only afterwards', () => {
    let attachedAtClick = false;
    let downloadName = '';
    let href = '';
    let rel = '';
    // jsdom cannot save files; record the anchor as the click handler would see it.
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        const anchor = document.querySelector('a[download]');
        if (!anchor) return;
        attachedAtClick = document.body.contains(anchor);
        downloadName = anchor.getAttribute('download') ?? '';
        href = anchor.getAttribute('href') ?? '';
        rel = anchor.getAttribute('rel') ?? '';
      });

    const blob = new Blob(['data'], { type: 'text/plain' });
    downloadBlob(blob, 'sample-график.png');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    // The anchor must be in the document when clicked, so the browser fires it.
    expect(attachedAtClick).toBe(true);
    expect(downloadName).toBe('sample-график.png');
    expect(href).toBe('blob:mock-url');
    expect(rel).toBe('noopener');
    // …and removed right after, leaving the DOM clean.
    expect(document.querySelector('a')).toBeNull();

    // Revoking synchronously would cancel the download in some browsers.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
