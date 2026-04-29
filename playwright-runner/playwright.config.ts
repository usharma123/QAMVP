import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: true,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 2,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(rootDir, 'test_data/test-results/playwright-results.json') }],
    ['html', { outputFolder: path.join(rootDir, 'test_data/test-results/playwright-html-report'), open: 'never' }]
  ],
  outputDir: path.join(rootDir, 'test_data/test-results/playwright-output'),
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command:
      'npm install --silent --prefix ../mock-trading-app && npx --prefix ../mock-trading-app ng serve --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
