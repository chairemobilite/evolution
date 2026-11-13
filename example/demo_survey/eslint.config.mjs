/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import baseConfig from '../../configs/base.eslint.config.mjs';

export default defineConfig([
    globalIgnores([
        '**/lib/',
        '**/references/',
        '**/runtime/',
        '**/assets/images/',
        '**/assets/documents/',
        '**/locales/',
        '**/__tests__/',
        '**/jest.config.js',
        '**/playwright-example.config.ts',
        '**/playwright.config.ts',
        '**/webpack.config.js',
        '**/webpack.admin.config.js',
        '**/config.js'
    ]),
    baseConfig,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { vars: 'all', args: 'after-used', argsIgnorePattern: '^_', ignoreRestSiblings: false }
            ]
        }
    }
]);
