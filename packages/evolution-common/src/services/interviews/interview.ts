/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash.get';
import _set from 'lodash.set';
import _isEqual from 'lodash.isequal';
import _cloneDeep from 'lodash.clonedeep';

/**
 * Type the common response fields for any survey
 *
 * @export
 * @interface InterviewResponses
 */
export interface InterviewResponses {
    _activeSection?: string;
    _browser?: { [key: string]: unknown };
    _ip?: string;
    _updatedAt?: number;
    _language?: string;
    _startedAt?: number;
    _isCompleted?: boolean;
    // Array of user_id of users who edited this interview, excluding the user himself
    // FIXME Remove from here (see https://github.com/chairemobilite/transition-legacy/issues/1987)
    _editingUsers?: number[];
    _sections?: {
        [key: string]:
            | {
                  _isCompleted?: boolean;
                  _startedAt: number;
              }
            | {
                  [key: string]: {
                      _isCompleted?: boolean;
                      _startedAt: number;
                  };
              };
    } & {
        _actions: {
            section: string;
            action: 'start';
            ts: number;
        }[];
    };
    household?: {
        size?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface ValidatedResponses extends InterviewResponses {
    _validationComment?: string;
}

export interface InterviewAudits {
    [validationId: string]: number;
}

/**
 * Interview attributes visible to users. This is a user-facing object and does
 * not contain any administrative data for this interview.
 *
 * @export
 * @interface UserInterviewAttributes
 */
export interface UserInterviewAttributes {
    id: number;
    uuid: string;
    user_id: number;
    is_completed: boolean;
    responses: InterviewResponses;
    validations: { [key: string]: unknown };
    is_valid: boolean;
    userRoles?: string[];
}

/**
 * Interview attributes, describing a complete interview object. This object
 * will typically be available to admins to other user roles.
 *
 * @export
 * @interface InterviewAttributes
 */
export interface InterviewAttributes extends UserInterviewAttributes {
    is_active?: boolean;
    is_started?: boolean;
    logs: { timestamp: number; valuesByPath: { [key: string]: unknown }; unsetPaths?: string[] }[];
    validated_data?: ValidatedResponses;
    audits?: InterviewAudits;
    is_validated?: boolean;
    is_frozen?: boolean;
    // TODO Type the following fields to date times
    start_at?: string;
    end_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface InterviewListAttributes {
    id: number;
    uuid: string;
    user_id: number;
    responses: InterviewResponses;
    validated_data: ValidatedResponses;
    is_valid?: boolean;
    is_completed?: boolean;
    is_validated?: boolean;
    username: string;
    facebook: boolean;
    google: boolean;
    audits?: InterviewAudits;
    created_at?: string;
    updated_at?: string;
}

/**
 * Type of the interview for validation and administrative lists
 *
 * TODO: See if the consumers of this type can template it so it can be fully
 * typed per project
 */
export interface InterviewStatusAttributesBase {
    id: number;
    uuid: string;
    responses: Partial<InterviewResponses>;
    is_valid?: boolean;
    is_completed?: boolean;
    is_validated?: boolean;
    username: string;
    facebook: boolean;
    google: boolean;
}

/**
 * Runs the audit validations on the interview data and returns the audit result
 *
 * @param interview The Interview to audit
 * @param validations TODO Type
 * @param surveyProjectHelper TODO Type
 * @returns The audit result, where the key is the ID of the validation to run
 * and the value is the number of times this validation fails on the responses.
 */
export const auditInterview = function (
    validatedData: InterviewResponses,
    originalResponses: InterviewResponses,
    interview: InterviewAttributes,
    validations: any,
    surveyProjectHelper: any
): { [validationId: string]: number } {
    const auditsCountByValidationId: { [validationId: string]: number } = {};
    const responses = validatedData ? validatedData : originalResponses;
    const household = _get(responses, 'household', {});
    const home = _get(responses, 'home', {});
    const validatedInterview = _cloneDeep(interview);
    validatedInterview.responses = responses;
    // TODO Rethink this, the _responses field does not exist on the type and should not have to exist
    (validatedInterview as any)._responses = originalResponses;
    const persons = surveyProjectHelper.getPersons(validatedInterview, false);
    const personsArray = surveyProjectHelper.getPersons(validatedInterview, true);
    const audits: any[] = [];
    audits.push(
        ...surveyProjectHelper.validateInterview(
            validations.interview,
            null,
            {},
            validatedInterview,
            responses,
            household,
            home,
            persons,
            personsArray
        ).audits
    );
    audits.push(
        ...surveyProjectHelper.validateHousehold(
            validations.household,
            null,
            {},
            validatedInterview,
            responses,
            household,
            home,
            persons,
            personsArray
        ).audits
    );

    for (const personId in persons) {
        const person = persons[personId];
        audits.push(
            ...surveyProjectHelper.validatePerson(
                validations.person,
                null,
                {},
                validatedInterview,
                responses,
                household,
                home,
                persons,
                personsArray,
                person
            ).audits
        );

        const visitedPlaces = surveyProjectHelper.getVisitedPlaces(person, null, false);
        const visitedPlacesArray = surveyProjectHelper.getVisitedPlaces(person, null, true);

        for (let i = 0, count = visitedPlacesArray.length; i < count; i++) {
            const visitedPlace = visitedPlacesArray[i];
            audits.push(
                ...surveyProjectHelper.validateVisitedPlace(
                    validations.visitedPlace,
                    null,
                    {},
                    validatedInterview,
                    responses,
                    household,
                    home,
                    persons,
                    personsArray,
                    person,
                    visitedPlaces,
                    visitedPlacesArray,
                    visitedPlace
                ).audits
            );
        }

        const trips = surveyProjectHelper.getTrips(person, false);
        const tripsArray = surveyProjectHelper.getTrips(person, true);

        for (let i = 0, count = tripsArray.length; i < count; i++) {
            const trip = tripsArray[i];
            audits.push(
                ...surveyProjectHelper.validateTrip(
                    validations.trip,
                    null,
                    {},
                    validatedInterview,
                    responses,
                    household,
                    home,
                    persons,
                    personsArray,
                    person,
                    visitedPlaces,
                    visitedPlacesArray,
                    trips,
                    tripsArray,
                    trip
                ).audits
            );

            const segments = surveyProjectHelper.getSegments(trip, false);
            const segmentsArray = surveyProjectHelper.getSegments(trip, true);

            for (let j = 0, countJ = segmentsArray.length; j < countJ; j++) {
                const segment = segmentsArray[j];
                audits.push(
                    ...surveyProjectHelper.validateSegment(
                        validations.segment,
                        null,
                        {},
                        validatedInterview,
                        responses,
                        household,
                        home,
                        persons,
                        personsArray,
                        person,
                        visitedPlaces,
                        visitedPlacesArray,
                        trips,
                        tripsArray,
                        trip,
                        segments,
                        segmentsArray,
                        segment
                    ).audits
                );
            }
        }
    }

    for (let i = 0, count = audits.length; i < count; i++) {
        const audit = audits[i];
        if (!auditsCountByValidationId[audit.id]) {
            auditsCountByValidationId[audit.id] = 0;
        }
        auditsCountByValidationId[audit.id]++;
    }

    return auditsCountByValidationId;
};

// this function will use parsers to clean and fix the interviews. Parsers can change any path in the interview, to normalize repsonses or clean errors or typos in some fields:
// the input is validated_data responses if available, otherwise, it will use original respondent responses
// output will be valuesByPath which are each changes made to the responses, by path
export const getChangesAfterCleaningInterview = function (
    validatedData,
    originalResponses,
    interview,
    parsers,
    surveyProjectHelper
): { [key: string]: any } {
    // TODO: type this function and parsers

    const valuesByPath = {};

    let changeModesWalk = false;

    const responses = validatedData || originalResponses;
    const validatedInterview = _cloneDeep(interview);
    validatedInterview.responses = responses;
    validatedInterview._responses = originalResponses;
    const household = responses.household || {};
    const home = responses.home || {};
    const persons = surveyProjectHelper.getPersons(validatedInterview, false);
    const personsArray = surveyProjectHelper.getPersons(validatedInterview, true);

    for (let i = 0, count = parsers.length; i < count; i++) {
        const parser = parsers[i];
        for (const path in parser.parsers.interview) {
            const newValue = parser.parsers.interview[path](
                {},
                validatedInterview,
                responses,
                household,
                home,
                persons,
                personsArray
            );
            const absolutePath = path;
            const oldValue = _get(validatedInterview, absolutePath);
            if (!_isEqual(newValue, oldValue)) {
                valuesByPath[path] = newValue;
                _set(validatedInterview, absolutePath, newValue); // update values
            }
        }
        for (const path in parser.parsers.household) {
            if (household) {
                const newValue = parser.parsers.household[path](
                    {},
                    validatedInterview,
                    responses,
                    household,
                    home,
                    persons,
                    personsArray
                );
                const absolutePath = 'responses.household.' + path;
                const oldValue = _get(validatedInterview, absolutePath);
                if (!_isEqual(newValue, oldValue)) {
                    valuesByPath[absolutePath] = newValue;
                    _set(validatedInterview, absolutePath, newValue); // update values
                    _set(household, path, newValue); // update values
                }
            }
        }
        for (const personId in persons) {
            const person = persons[personId];
            for (const path in parser.parsers.person) {
                const newValue = parser.parsers.person[path](
                    {},
                    validatedInterview,
                    responses,
                    household,
                    home,
                    persons,
                    personsArray,
                    person
                );
                const absolutePath = `responses.household.persons.${personId}.` + path;
                const oldValue = _get(validatedInterview, absolutePath);
                if (!_isEqual(newValue, oldValue)) {
                    valuesByPath[absolutePath] = newValue;
                    _set(validatedInterview, absolutePath, newValue); // update values
                    _set(person, path, newValue); // update values
                }
            }

            const visitedPlaces = surveyProjectHelper.getVisitedPlaces(person, null, false);
            const visitedPlacesArray = surveyProjectHelper.getVisitedPlaces(person, null, true);
            for (const visitedPlaceId in visitedPlaces) {
                const visitedPlace = visitedPlaces[visitedPlaceId];
                for (const path in parser.parsers.visitedPlace) {
                    const newValue = parser.parsers.visitedPlace[path](
                        {},
                        validatedInterview,
                        responses,
                        household,
                        home,
                        persons,
                        personsArray,
                        person,
                        visitedPlaces,
                        visitedPlacesArray,
                        visitedPlace
                    );
                    const absolutePath =
                        `responses.household.persons.${personId}.visitedPlaces.${visitedPlaceId}.` + path;
                    const oldValue = _get(validatedInterview, absolutePath);
                    if (!_isEqual(newValue, oldValue)) {
                        valuesByPath[absolutePath] = newValue;
                        _set(validatedInterview, absolutePath, newValue); // update values
                        _set(visitedPlace, path, newValue); // update values
                    }
                }
            }

            const trips = surveyProjectHelper.getTrips(person, false);
            const tripsArray = surveyProjectHelper.getTrips(person, true);
            for (const tripId in trips) {
                const trip = trips[tripId];

                for (const path in parser.parsers.trip) {
                    const newValue = parser.parsers.trip[path](
                        {},
                        validatedInterview,
                        responses,
                        household,
                        home,
                        persons,
                        personsArray,
                        person,
                        trips,
                        tripsArray,
                        trip
                    );
                    const absolutePath = `responses.household.persons.${personId}.trips.${tripId}.` + path;
                    const oldValue = _get(validatedInterview, absolutePath);
                    if (!_isEqual(newValue, oldValue)) {
                        valuesByPath[absolutePath] = newValue;
                        _set(validatedInterview, absolutePath, newValue); // update values
                        _set(trip, path, newValue);
                        if (absolutePath.endsWith('segments')) {
                            //console.log(path, newValue, trip.segments);
                            changeModesWalk = true;
                        }
                    }
                }

                const segments = surveyProjectHelper.getSegments(trip, false);
                const segmentsArray = surveyProjectHelper.getSegments(trip, true);
                for (const segmentId in segments) {
                    const segment = segments[segmentId];
                    for (const path in parser.parsers.segment) {
                        const newValue = parser.parsers.segment[path](
                            {},
                            validatedInterview,
                            responses,
                            household,
                            home,
                            persons,
                            personsArray,
                            person,
                            trips,
                            tripsArray,
                            trip,
                            segments,
                            segmentsArray,
                            segment
                        );
                        const absolutePath =
                            `responses.household.persons.${personId}.trips.${tripId}.segments.${segmentId}.` + path;
                        const oldValue = _get(validatedInterview, absolutePath);
                        if (!_isEqual(newValue, oldValue)) {
                            valuesByPath[absolutePath] = newValue;
                            _set(validatedInterview, absolutePath, newValue); // update values
                            _set(segment, path, newValue);
                        }
                    }
                }
            }
        }
    }
    if (changeModesWalk) {
        //console.log('valuesByPath', valuesByPath);
    }
    return valuesByPath;
};
