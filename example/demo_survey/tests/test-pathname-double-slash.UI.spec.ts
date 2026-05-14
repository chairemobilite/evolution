/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { expect, test } from '@playwright/test';

/**
 * Origin for building absolute URLs with intentional `//` in the path (Playwright resolves
 * `page.goto('//home')` as a scheme-relative URL, so we cannot use a path-only goto here).
 * Falls back if `project.use.baseURL` is unset (regression guard).
 */
const getOrigin = (): string => {
    const baseUrl = test.info().project.use.baseURL;
    const resolved = typeof baseUrl === 'string' && baseUrl.length > 0 ? baseUrl : 'http://localhost:8080';
    return new URL(resolved).origin;
};

/**
 * Regression for packages/evolution-frontend/src/utils/normalizeBrowserLocationPathname.ts:
 * duplicate slashes in the path must normalize so React Router matches routes.
 */
test.describe('pathname duplicate slashes', () => {
    test('leading // before a public route collapses to a single slash', async ({ page }) => {
        const origin = getOrigin();
        await page.goto(`${origin}//home`);
        await expect(page).toHaveURL(`${origin}/home`);
        expect(new URL(page.url()).pathname).toBe('/home');
    });

    test('keeps query string and hash after normalization', async ({ page }) => {
        const origin = getOrigin();
        await page.goto(`${origin}//home?x=1#frag`);
        const u = new URL(page.url());
        expect(u.pathname).toBe('/home');
        expect(u.search).toBe('?x=1');
        expect(u.hash).toBe('#frag');
        await expect(page).toHaveURL(`${origin}/home?x=1#frag`);
    });

    test('duplicate slashes on root path normalize to /', async ({ page }) => {
        const origin = getOrigin();
        await page.goto(`${origin}//`);
        expect(new URL(page.url()).pathname).toBe('/');
    });
});
