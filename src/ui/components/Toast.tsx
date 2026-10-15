import { useEffect, useRef } from 'react';
import { ru } from '../i18n/ru';
import { TOAST_AUTOHIDE_MS } from './toastTiming';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  kind: ToastKind;
  message: string;
}

interface ToastProps extends ToastMessage {
  onClose: () => void;
}

/**
 * Export confirmation (UX: «тост-подтверждение»). Success announces itself to
 * assistive tech as a `status` region and auto-hides after 5 s; an error is an
 * `alert`, stays until dismissed and closes on the button or Escape.
 */
export function Toast({ kind, message, onClose }: ToastProps) {
  // Keep the latest callback in a ref: the auto-hide timer must not reset on a
  // parent re-render, only when a new toast arrives.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (kind !== 'success') return;
    const timer = setTimeout(() => onCloseRef.current(), TOAST_AUTOHIDE_MS);
    return () => clearTimeout(timer);
  }, [kind, message]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`toast toast-${kind}`} role={kind === 'success' ? 'status' : 'alert'}>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label={ru.toastClose}
        onClick={() => onCloseRef.current()}
      >
        ×
      </button>
    </div>
  );
}
