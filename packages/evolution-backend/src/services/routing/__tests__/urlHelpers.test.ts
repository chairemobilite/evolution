/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { hasFileExtension } from '../urlHelpers';

describe('hasFileExtension', () => {
    describe.each([
        { pathname: '/path/to/file.js', description: 'common JavaScript file' },
        { pathname: '/path/to/style.css', description: 'CSS stylesheet' },
        { pathname: '/images/logo.png', description: 'PNG image' },
        { pathname: '/documents/report.pdf', description: 'PDF document' },
        { pathname: '/data/config.json', description: 'JSON configuration' },
        { pathname: '/assets/icon.svg', description: 'SVG icon' },
        { pathname: '/file.min.js', description: 'minified JavaScript' },
        { pathname: '/component.test.ts', description: 'TypeScript test file' },
        { pathname: '/app.config.json', description: 'application config' },
        { pathname: '/favicon.ico', description: 'favicon in root' },
        { pathname: '/robots.txt', description: 'robots.txt in root' },
        { pathname: '/archive.tar.gz', description: 'compressed archive' },
        { pathname: '/script.sh', description: 'shell script' },
        { pathname: '/data.xml', description: 'XML data' },
        { pathname: '/.hidden', description: 'hidden file' },
        { pathname: '/path/.gitignore', description: 'gitignore file' },
        { pathname: '/.env.local', description: 'local environment file' }
    ])('should return true for paths with file extensions', ({ pathname, description }) => {
        test(`${description}: ${pathname}`, () => {
            expect(hasFileExtension({ pathname })).toBe(true);
        });
    });

    describe.each([
        { pathname: '/path/to/directory', description: 'regular directory path' },
        { pathname: '/users/123', description: 'user ID path' },
        { pathname: '/api/v1/data', description: 'API endpoint' },
        { pathname: '/home', description: 'home directory' },
        { pathname: '/v1.2/api/users', description: 'versioned API with dots' },
        { pathname: '/node_modules/.bin/command', description: 'node_modules binary' },
        { pathname: '/app.domain.com/page', description: 'domain-like path' },
        { pathname: '/', description: 'root path' },
        { pathname: '', description: 'empty string' },
        { pathname: '/path/to/directory/', description: 'directory with trailing slash' },
        { pathname: '/api/', description: 'API path with trailing slash' },
        { pathname: '/path/with.dots/but/no/extension', description: 'dots in directory names' },
        { pathname: '/version.1.2/endpoint', description: 'version number in path' },
        { pathname: '/path/ending/with/dot.', description: 'path ending with dot' },
        { pathname: '/.', description: 'root dot' }
    ])('should return false for paths without file extensions', ({ pathname, description }) => {
        test(`${description}: ${pathname}`, () => {
            expect(hasFileExtension({ pathname })).toBe(false);
        });
    });
});
