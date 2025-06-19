import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // Look for test files in the "tests" directory, relative to this configuration file.
    testDir: './tests',
    // Ignore the test-assets directory.
    // testIgnore: '*test-assets',
    // Look for test files in the "todo-tests" directory.
    // testMatch: '*todo-tests/*.spec.ts',
    // Run all tests in parallel.
    // Should be set to false if there are more than one tests case, otherwise they seem to run concurrently
    fullyParallel: false,
    // Fail the build on CI if you accidentally left test.only in the source code.
    forbidOnly: !!process.env.CI,
    // Retry on CI only.
    retries: process.env.CI ? 2 : 0,
    // Each test is given 15 seconds.
    timeout: 15000,
    // Limit the number of workers on CI, use default locally.
    workers: process.env.CI ? 1 : undefined,
    // Reporter to use: [html, line, list, dot, json, junit, null]
    reporter:
        process.env.CI === 'true'
            ? [['list', { printSteps: true }]]
            : [['html', { outputFolder: 'playwright-report', open: 'always' }]],
    use: {
        // Base URL to use in actions like `await page.goto('/')`.
        baseURL: 'http://localhost:8080',
        // Collect trace when retrying the failed test.
        trace: 'on-first-retry',
        screenshot: {
            mode: 'only-on-failure',
            fullPage: true
        }
    },

    /* Configure projects for major browsers */
    projects: [
        // Test against desktop viewports.
        // {
        //     name: 'chromium',
        //     use: { ...devices['Desktop Chrome'] }
        // },
        {
            name: 'Google Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' }
        }
        // {
        //     name: 'Microsoft Edge',
        //     use: {
        //         ...devices['Desktop Edge'],
        //         channel: 'msedge'
        //     }
        // },
        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] }
        // },
        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] }
        // }

        /* Test against mobile viewports. */
        // {
        //     name: 'Mobile Chrome',
        //     use: { ...devices['Pixel 5'] }
        // },
        // {
        //     name: 'Mobile Safari',
        //     use: { ...devices['iPhone 12'] }
        // }
    ]

    /* Run your local dev server before starting the tests */
    // webServer: [
    //     {
    //         command: 'yarn build:dev',
    //         // url: 'http://localhost:8080',
    //         // reuseExistingServer: !process.env.CI,
    //     },
    //     {
    //         command: 'yarn start',
    //         // url: 'http://localhost:8080',
    //         // reuseExistingServer: !process.env.CI,
    //     }
    // ],

    // expect: {
    //     // Maximum time expect() should wait for the condition to be met.
    //     timeout: 5000,

    //     toHaveScreenshot: {
    //         // An acceptable amount of pixels that could be different, unset by default.
    //         maxDiffPixels: 10
    //     },

    //     toMatchSnapshot: {
    //         // An acceptable ratio of pixels that are different to the total amount of pixels, between 0 and 1.
    //         maxDiffPixelRatio: 0.1
    //     }
    // }
});
