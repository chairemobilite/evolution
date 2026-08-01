/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { resolveAppBuildId } from '../resolveBuildId';

describe('resolveBuildId', () => {
    describe('resolveAppBuildId', () => {
        it('should return the BUILD_ID env value when set', () => {
            expect(resolveAppBuildId({ BUILD_ID: 'env-sha' } as NodeJS.ProcessEnv)).toBe('env-sha');
        });

        it('should fall back to dev when BUILD_ID is not set', () => {
            expect(resolveAppBuildId({} as NodeJS.ProcessEnv)).toBe('dev');
        });
    });
});
