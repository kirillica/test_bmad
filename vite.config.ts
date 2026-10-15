import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

/**
 * Two Vitest projects (Testing convention): a Node/jsdom project for the domain
 * and component tests, and a real-browser project for the chart tests — jsdom
 * has no `<canvas>`, so Chart.js can only be exercised in browser mode (AD-19).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            // The corporate proxy blocks the Playwright CDN, so the browser
            // project drives the locally installed Chrome instead of the
            // downloaded Chromium build (same engine, real <canvas>).
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
