/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/** Snapshot of survey object types at migration time; kept in sync with `surveyObjectNames`. */
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
