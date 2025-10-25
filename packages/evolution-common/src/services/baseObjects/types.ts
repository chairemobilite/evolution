/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { Interview } from './interview/Interview';
import { Household } from './Household';
import { Home } from './Home';

/**
 * Survey objects
 *
 * This is the base type to store survey objects.
 * Composed objects are inside their parent object
 * (like persons inside a household, visited places inside a journey, etc.).
 */
export type ParentSurveyObjects = {
    interview: Optional<Interview>; // undefined if not valid (has errors)
    household: Optional<Household>; // undefined if not valid (has errors) or if no household is surveyed
    home: Optional<Home>; // undefined if not valid (has errors) or if no home is surveyed
};

/**
 * Names of survey objects
 *
 * This is the list of names of survey objects.
 */
export type SurveyObjectNames =
    | 'interview'
    | 'household'
    | 'home'
    | 'organization'
    | 'vehicle'
    | 'person'
    | 'journey'
    | 'tripChain'
    | 'visitedPlace'
    | 'trip'
    | 'segment'
    | 'junction'
    | 'workPlace'
    | 'schoolPlace';

/**
 * Errors by survey object type
 *
 * When we try to create a survey object, we may get errors after
 * validateParams runs on each survey object type.
 * We store the errors by survey object type to be able to convert them
 * to audits later.
 * FIXME: uuids of parent objects whould be included in the errors.
 */
export type ErrorsBySurveyObject = {
    interviewUuid: string;
    interview: Error[];
    homeUuid: string;
    home: Error[];
    householdUuid: string;
    household: Error[];
    personsByUuid: { [key: string]: Error[] };
    journeysByUuid: { [key: string]: Error[] };
    visitedPlacesByUuid: { [key: string]: Error[] };
    tripsByUuid: { [key: string]: Error[] };
    segmentsByUuid: { [key: string]: Error[] };
};

/**
 * Survey objects with errors
 *
 * When we try to create a survey object, we may get errors after
 * validateParams runs on each survey object type.
 * We store the errors by survey object type to be able to convert them
 * to audits later. Any object with at least one error will be undefined.
 */
export type SurveyObjectsWithErrors = ParentSurveyObjects & {
    errorsByObject: ErrorsBySurveyObject;
};
