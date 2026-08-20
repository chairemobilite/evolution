/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { BuildId } from '../baseObjects/attributeTypes/InterviewParadataAttributes';

/**
 * Append a build id to the history when it differs from the last entry.
 * @param existingBuildIds the current build id history
 * @param newBuildId git commit hash to append
 * @param startTimestamp unix epoch timestamp in seconds
 * @returns the updated history, or `undefined` when nothing changed
 */
export const appendBuildIdIfChanged = (
    existingBuildIds: BuildId[] | undefined,
    newBuildId: string | undefined,
    startTimestamp: number = Math.floor(Date.now() / 1000)
): BuildId[] | undefined => {
    if (!newBuildId) {
        return undefined;
    }

    const lastBuildId = existingBuildIds?.[existingBuildIds.length - 1]?.buildId ?? null;
    if (lastBuildId === newBuildId) {
        return undefined;
    }

    const updatedBuildIds = [...(existingBuildIds ?? [])];
    if (updatedBuildIds.length > 0) {
        const lastIndex = updatedBuildIds.length - 1;
        updatedBuildIds[lastIndex] = {
            ...updatedBuildIds[lastIndex],
            endTimestamp: startTimestamp
        };
    }

    return [...updatedBuildIds, { buildId: newBuildId, startTimestamp }];
};
