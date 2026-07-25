/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import { collapseConsecutiveSlashesInPathname } from '../normalizeBrowserLocationPathname';

each([
    ['/', '/'],
    ['/interviews/byCode/ABC123', '/interviews/byCode/ABC123'],
    ['//interviews/byCode/ABC123', '/interviews/byCode/ABC123'],
    ['///interviews/byCode/ABC123', '/interviews/byCode/ABC123'],
    ['/interviews//byCode/ABC123', '/interviews/byCode/ABC123'],
    ['', '/']
]).test('collapseConsecutiveSlashesInPathname(%s) => %s', (input, expected) => {
    expect(collapseConsecutiveSlashesInPathname(input)).toBe(expected);
});
