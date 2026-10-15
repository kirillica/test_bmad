/**
 * Local download side-effect (CAP-7, AD-1): a `Blob` becomes a file through an
 * object URL and an anchor click. No network is involved — the object URL points
 * at in-memory data only.
 */

/** Delay before revoking the object URL, so the browser has finished the click. */
const REVOKE_DELAY_MS = 1_000;

/**
 * Triggers a local download of `blob` under `fileName`. The object URL is revoked
 * after the click is handled (not synchronously), because some browsers cancel
 * the download when the URL disappears in the same task.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
