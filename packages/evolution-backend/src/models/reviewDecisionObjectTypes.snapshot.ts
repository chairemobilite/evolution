/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Manually maintained snapshot of survey object types at migration time (frozen DB enum).
 * Not auto-synced with `surveyObjectNames`; drift is verified in CI by
 * `reviewDecisionObjectTypes.snapshot.test.ts`.
 */
export const reviewDecisionObjectTypes = [
    'interview',
    'household',
    'home',
    'organization',
    'vehicle',
    'person',
    'journey',
    'tripChain',
    'visitedPlace',
    'trip',
    'segment',
    'junction',
    'workPlace',
    'schoolPlace'
] as const;
