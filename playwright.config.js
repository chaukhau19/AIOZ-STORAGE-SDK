// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './Tests',
    timeout: 10 * 60 * 1000,
    expect: { timeout: 30_000 },
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [
        ['list'],
        ['html', { 
            outputFolder: 'playwright-report',
            open: 'never'
        }]
    ],
    use: {
        actionTimeout: 0,
        trace: 'on-first-retry'
    }
});


