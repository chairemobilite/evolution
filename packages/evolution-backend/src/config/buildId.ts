/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { resolveAppBuildId } from './resolveBuildId';

let backendBuildId: string | undefined;

/**
 * Initialize and cache the backend commit hash at startup.
 * @param env environment variables object
 */
export const initializeBackendBuildId = (env: NodeJS.ProcessEnv = process.env): string => {
    if (!backendBuildId) {
        backendBuildId = resolveAppBuildId(env);
        console.info(`Evolution backend build id: ${backendBuildId}`);
    }
    return backendBuildId;
};

/**
 * Return the cached backend commit hash.
 */
export const getBackendBuildId = (): string => {
    return backendBuildId ?? initializeBackendBuildId();
};
