import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'd1-block.spec.ts', workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:8080', trace: 'on' },
  outputDir: 'docs/d1/evidence/browser/playwright',
  webServer: { command: 'VITE_TFCL_D1=true npm run dev', url: 'http://localhost:8080', timeout: 60000 },
});
