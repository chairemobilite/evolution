/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { execSync } from 'child_process';
import { resolveAppBuildId, resolveGitBuildId } from '../resolveBuildId';

jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('resolveBuildId', () => {
    beforeEach(() => {
        mockExecSync.mockReset();
    });

    describe('resolveGitBuildId', () => {
        it('should return the git commit hash', () => {
            mockExecSync.mockReturnValue('git-sha\n');

            expect(resolveGitBuildId()).toBe('git-sha');
        });
    });

    describe('resolveAppBuildId', () => {
        it('should prefer the BUILD_ID env value over git', () => {
            mockExecSync.mockReturnValue('git-sha\n');

            expect(resolveAppBuildId({ BUILD_ID: 'env-sha' } as NodeJS.ProcessEnv)).toBe('env-sha');
            expect(mockExecSync).not.toHaveBeenCalled();
        });

        it('should fall back to git when BUILD_ID is not set', () => {
            mockExecSync.mockReturnValue('git-sha\n');

            expect(resolveAppBuildId({} as NodeJS.ProcessEnv)).toBe('git-sha');
        });

        it('should fall back to dev when BUILD_ID and git are unavailable', () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('git not available');
            });

            expect(resolveAppBuildId({} as NodeJS.ProcessEnv)).toBe('dev');
        });
    });
});
