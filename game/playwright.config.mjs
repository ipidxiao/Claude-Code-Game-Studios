// @ts-check
/** Playwright config — browser release gate, run by npm run ci. */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/playwright',
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    fullyParallel: false,
    // python http.server handles one request at a time; three cold boots stall the first page.
    workers: 1,
    forbidOnly: !!process.env.CI,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:8080',
        headless: true,
        trace: process.env.CI ? 'on-first-retry' : 'off',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: 'npm run serve',
        url: 'http://127.0.0.1:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
