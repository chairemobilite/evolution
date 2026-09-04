/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { validate as uuidValidate } from 'uuid';

const VISITED_PLACE_PATH_REGEX = /^household\.persons\.([^.]+)\.journeys\.([^.]+)\.visitedPlaces\.([^.]+)$/;
const USUAL_PLACE_PATH_REGEX = /^household\.persons\.[^.]+\.(usualWorkPlace|usualSchoolPlace)$/;

/**
 * Convert an interview `shortcut` (uuid or response path) to a visited-place uuid.
 * Usual work/school place paths have no visited-place uuid: returns undefined.
 *
 * @param shortcut Interview shortcut: visited-place uuid, or path written by
 * `getShortcutVisitedPlaces`
 * @returns The target visited-place uuid, or undefined when the shortcut is a
 * usual place or is not a known visited-place reference
 */
export const interviewShortcutToVisitedPlaceUuid = (shortcut: string): string | undefined => {
    if (uuidValidate(shortcut)) {
        return shortcut;
    }
    const visitedPlaceMatch = shortcut.match(VISITED_PLACE_PATH_REGEX);
    if (visitedPlaceMatch !== null && uuidValidate(visitedPlaceMatch[3])) {
        return visitedPlaceMatch[3];
    }
    return undefined;
};

/**
 * Whether an interview shortcut points to a person's usual work or school place
 * (`household.persons.{id}.usualWorkPlace` / `usualSchoolPlace`).
 *
 * @param shortcut Interview shortcut value
 * @returns True when the shortcut is a usual-place path
 */
export const isUsualPlaceInterviewShortcut = (shortcut: string): boolean => USUAL_PLACE_PATH_REGEX.test(shortcut);
