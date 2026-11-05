/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { SurveyObjectVisitContext } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';

/**
 * Parent of each exported object type. The uuid of the parent is written in a
 * `_<parentType>Uuid` column, to link the rows of the files together. The
 * interview uuid is written for all objects, in the `_interviewUuid` column.
 */
export const parentObjectTypeByObjectType = {
    interview: undefined,
    home: 'interview',
    household: 'interview',
    person: 'household',
    journey: 'person',
    visitedPlace: 'journey',
    trip: 'journey',
    segment: 'trip'
} as const;

export type ExportedObjectType = keyof typeof parentObjectTypeByObjectType;

/** Object types that are the parent of other exported object types */
export const parentObjectTypes = new Set<ExportedObjectType>(
    Object.values(parentObjectTypeByObjectType).filter((objectType) => objectType !== undefined)
);

/**
 * Get the key identifying an object within its interview. The type is part of
 * the key, as the home and household have the uuid of the interview.
 *
 * @param {ExportedObjectType} objectType - Type of the object
 * @param {string} [objectUuid] - Uuid of the object
 * @returns {string} The key of the object
 */
export const getObjectKey = (objectType: ExportedObjectType, objectUuid?: string): string =>
    `${objectType}:${objectUuid}`;

/**
 * Get the keys of the ancestors of a visited object, from its parent to the
 * interview.
 *
 * @param {ExportedObjectType} objectType - Type of the visited object
 * @param {SurveyObjectVisitContext} context - Context of the visited object
 * @returns {string[]} The keys of the ancestors, see {@link getObjectKey}
 */
export const getAncestorKeys = (objectType: ExportedObjectType, context: SurveyObjectVisitContext): string[] => {
    const ancestorKeys: string[] = [];
    for (
        let ancestorType = parentObjectTypeByObjectType[objectType];
        ancestorType !== undefined;
        ancestorType = parentObjectTypeByObjectType[ancestorType]
    ) {
        ancestorKeys.push(getObjectKey(ancestorType, context[ancestorType]?.uuid));
    }
    return ancestorKeys;
};
