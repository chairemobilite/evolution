/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/*
 * Build ids stored in the interview paradata are git commit hashes of the *deployed repository*.
 * For a survey deployment, this is the survey project's repository, not evolution's: the survey
 * repository references evolution as a git submodule, so its commit hash is enough to recover the
 * exact evolution version (`git submodule status` at that commit).
 */

import { execSync } from 'child_process';

/** Environment variable holding the git commit hash of the current deployment (`github.sha` in CI). */
export const BUILD_ID_ENV_KEY = 'BUILD_ID';

/**
 * Resolve the current git commit hash from the local repository.
 */
export const resolveGitBuildId = (): string | undefined => {
    try {
        return execSync('git rev-parse HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    } catch {
        return undefined;
    }
};

/**
 * Resolve the deployment commit hash from the `BUILD_ID` environment variable, falling back to the
 * local git repository, then to `'dev'` (local dev without git). Read at backend startup.
 * @param env environment variables object
 */
export const resolveAppBuildId = (env: NodeJS.ProcessEnv = process.env): string => {
    return env[BUILD_ID_ENV_KEY] || resolveGitBuildId() || 'dev';
};
