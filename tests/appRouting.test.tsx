// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App, CurrentScreen } from '../src/app/App';
import type { Workbook } from '../src/domain/model';
import { analyzeWorkbook } from '../src/domain/pipeline/validateStructure';
import { StoreContext, type StoreApi } from '../src/ui/store/context';
import { makeSheet, makeWorkbook, sampleRows } from './fixtures';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** A store stub good enough for CurrentScreen: only `state.workbook` matters. */
function stubApi(workbook: Workbook | null): StoreApi {
  return {
    state: {
      status: workbook ? 'loaded' : 'empty',
      fileName: workbook?.fileName ?? null,
      pendingFileName: null,
      workbook,
      validation: workbook ? { status: 'ok', issues: [] } : null,
      errorIssues: [],
    },
    loadFile: async () => {},
    reset: () => {},
    setActiveSheet: () => {},
  };
}

describe('App surface routing', () => {
  // RESET target: with no loaded workbook the app must fall back to U1 (AD-17/UX IA).
  it('shows U1 «Загрузка» and no U2 «Данные» when no workbook is loaded', () => {
    act(() => {
      root.render(<App />);
    });

    expect(container.querySelector('.upload-screen')).not.toBeNull();
    expect(container.querySelector('.data-screen')).toBeNull();
  });
});

describe('CurrentScreen routing', () => {
  function renderScreen(workbook: Workbook | null): void {
    const ui: ReactElement = (
      <StoreContext.Provider value={stubApi(workbook)}>
        <CurrentScreen />
      </StoreContext.Provider>
    );
    act(() => {
      root.render(ui);
    });
  }

  it('renders U1 «Загрузка» with no workbook', () => {
    renderScreen(null);
    expect(container.querySelector('.upload-screen')).not.toBeNull();
    expect(container.querySelector('.data-screen')).toBeNull();
  });

  it('renders U2 «Данные» once a workbook is loaded', () => {
    const workbook = analyzeWorkbook(makeWorkbook([makeSheet(sampleRows())])).workbook;
    renderScreen(workbook);
    expect(container.querySelector('.data-screen')).not.toBeNull();
    expect(container.querySelector('.upload-screen')).toBeNull();
  });
});
