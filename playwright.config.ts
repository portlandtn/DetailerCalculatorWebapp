import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: process.env.CALC_TEST_URL || 'http://127.0.0.1:18983',
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.CALC_CHROME_PATH
      ? { executablePath: process.env.CALC_CHROME_PATH }
      : {},
  },
  webServer: process.env.CALC_TEST_URL ? undefined : {
    command: 'CHOKIDAR_USEPOLLING=1 npx wrangler dev --config wrangler.test.jsonc --port 18983 --local',
    url: 'http://127.0.0.1:18983',
    timeout: 60000,
  },
});
