// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '../src/ui/components/Toast';
import { TOAST_AUTOHIDE_MS } from '../src/ui/components/toastTiming';

/**
 * Export confirmation toast (UX). Success is a `status` region that auto-hides
 * after 5 s; an error is an `alert` that stays until the user dismisses it with
 * the button or Escape. Timers are faked so the auto-hide is deterministic.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
});

function toast(): HTMLElement | null {
  return container.querySelector('.toast');
}

describe('Toast (CAP-7)', () => {
  it('success is a status region that auto-hides after the delay', () => {
    const onClose = vi.fn();
    act(() => {
      root.render(<Toast kind="success" message="Экспорт готов: x-grafik.png" onClose={onClose} />);
    });

    expect(toast()?.getAttribute('role')).toBe('status');
    expect(container.textContent).toContain('Экспорт готов: x-grafik.png');
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(TOAST_AUTOHIDE_MS - 1);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('error is an alert without auto-hide, closing via the button', () => {
    const onClose = vi.fn();
    act(() => {
      root.render(<Toast kind="error" message="Не удалось выполнить экспорт" onClose={onClose} />);
    });

    expect(toast()?.getAttribute('role')).toBe('alert');

    act(() => {
      vi.advanceTimersByTime(TOAST_AUTOHIDE_MS * 3);
    });
    expect(onClose).not.toHaveBeenCalled();

    const close = container.querySelector<HTMLButtonElement>('.toast-close');
    if (!close) throw new Error('close button not found');
    act(() => {
      close.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    act(() => {
      root.render(<Toast kind="error" message="Ошибка" onClose={onClose} />);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
