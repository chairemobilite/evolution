/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// The backend build id must be resolved once at server startup and stay immutable for the
// lifetime of the process: the paradata stamping logic (appendBuildIdIfChanged) relies on it,
// otherwise a changing value would append spurious entries to the build id histories.
describe('buildId', () => {
    beforeEach(() => {
        // The cache is a module-level variable; reset the module registry so the dynamic
        // import below gets a fresh, uninitialized module regardless of other tests.
        jest.resetModules();
    });

    it('should resolve the backend build id from the environment and cache it', async () => {
        const { initializeBackendBuildId, getBackendBuildId } = await import('../buildId');

        // Resolved from the BUILD_ID environment variable (highest priority in resolveAppBuildId)
        expect(initializeBackendBuildId({ BUILD_ID: 'cached-build-id' } as NodeJS.ProcessEnv)).toBe('cached-build-id');
        // Subsequent calls return the cached value, even with a different environment
        expect(initializeBackendBuildId({ BUILD_ID: 'other-build-id' } as NodeJS.ProcessEnv)).toBe('cached-build-id');
        // The getter used by the stamping code reads the cache without re-resolving
        expect(getBackendBuildId()).toBe('cached-build-id');
    });
});
