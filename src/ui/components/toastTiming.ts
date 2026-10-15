/**
 * Toast auto-hide delay (DESIGN.md components.toast: «автоскрытие 5с, для ошибок
 * — без автоскрытия»). Kept in its own module so `Toast.tsx` only exports
 * components (react-refresh/only-export-components).
 */
export const TOAST_AUTOHIDE_MS = 5_000;
