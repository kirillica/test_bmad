import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ru } from '../i18n/ru';
import type { ExportFormat } from './ChartCard';

interface ExportMenuProps {
  /** True while the chart is not ready — PNG/PDF are offered but disabled. */
  disabled: boolean;
  /** Why the options are disabled, shown as a tooltip on each option. */
  disabledReason: string;
  onSelect: (kind: ExportFormat) => void;
}

/**
 * The chart card's «Экспорт…» menu (CAP-7, EXPERIENCE.md: PNG/PDF у графика).
 * A toggle button with a dropdown of PNG/PDF; the menu closes on Escape (focus
 * returns to the button) and on a click outside, mirroring `FilterBar` (A11y).
 */
export function ExportMenu({ disabled, disabledReason, onSelect }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return;
    setOpen(false);
    buttonRef.current?.focus();
  };

  const options: Array<{ kind: ExportFormat; label: string }> = [
    { kind: 'png', label: ru.exportPng },
    { kind: 'pdf', label: ru.exportPdf },
  ];

  return (
    <div className="export-menu-wrap" ref={wrapRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        ref={buttonRef}
        className="btn export-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {ru.exportMenuLabel}
      </button>

      {open ? (
        <ul id={menuId} className="export-menu" role="group" aria-label={ru.exportMenuLabel}>
          {options.map((option) => (
            <li key={option.kind}>
              <button
                type="button"
                className="export-option"
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                onClick={() => {
                  setOpen(false);
                  onSelect(option.kind);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
