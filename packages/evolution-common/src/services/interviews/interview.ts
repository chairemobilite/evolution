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

type Required<T> = { [P in keyof T]-?: T[P] };
// This recursive generic type is taken from this stack overflow question:
// https://stackoverflow.com/questions/65332597/typescript-is-there-a-recursive-keyof
// But in order to be able to type-check strings for objects with uuid keys, we
// only allow simple fields in this type, not fields reaching object types (like
// `household` directly)
// TODO This is not evolution-specific, it can go somewhere else once the types are fixed
type RecursiveFinalKeyOf<TObj extends object> = {
    [TKey in keyof TObj & (string | number)]: TObj[TKey] extends any[]
        ? `${TKey}`
        : TObj[TKey] extends object | undefined
        ? `${TKey}.${RecursiveFinalKeyOf<Required<TObj[TKey]>>}`
        : `${TKey}`;
}[keyof TObj & (string | number)];

export type InterviewResponsePath<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = RecursiveFinalKeyOf<
    Required<InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>>
>;

type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object | undefined
        ? RecursivePartial<T[P]>
        : T[P];
};

export type PartialInterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = RecursivePartial<
    InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
>;

// Type for the validations, which should have the same keys as the responses, but with boolean values
type RecursiveBoolean<TObj extends object> = {
    [TKey in keyof TObj]?: TObj[TKey] extends object ? RecursiveBoolean<Required<TObj[TKey]>> : boolean;
};
export type InterviewValidations<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = RecursiveBoolean<
    Required<InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>>
>;

export type BasePerson = {
    _uuid: string;
    _sequence: number;
};

export type Person<CustomPerson> = BasePerson & CustomPerson;

export type Household<CustomHousehold, CustomPerson> = {
    // TODO Are there any fields that will be common to ALL households?
    size: number;
    persons: {
        // TODO Are there any fields valid for all persons?
        [personId: string]: Person<CustomPerson>;
    };
} & CustomHousehold;

type SectionStatus = {
    _isCompleted?: boolean;
    _startedAt: number;
};

/**
 * Type the common response fields for any survey
 *
 * @export
 * @interface InterviewResponses
 */
export type InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    // Volatile survey workflow fields:
    _activePersonId?: string;
    _activeSection?: string;

    // Participant/web interview data
    _browser?: { [key: string]: unknown };
    _ip?: string;
    _startedAt?: number;
    _updatedAt?: number;
    _language?: string;
    _isCompleted?: boolean;

    _sections?: {
        [sectionName: string]: SectionStatus & {
            [subSection: string]: SectionStatus;
        };
    } & {
        _actions: {
            section: string;
            action: 'start';
            ts: number;
        }[];
    };

    // Actual responses
    household?: Household<CustomHousehold, CustomPerson>;
    home?: {
        region?: string;
        country?: string;
    } & CustomHome;
} & CustomSurvey;

type ValidatedResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = InterviewResponses<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    _validationComment?: string;
};

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
export interface UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: number;
    uuid: string;
    participant_id: number;
    is_completed: boolean;
    responses: InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    validations: InterviewValidations<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
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
export interface InterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
    extends UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    is_active?: boolean;
    is_started?: boolean;
    logs: { timestamp: number; valuesByPath: { [key: string]: unknown }; unsetPaths?: string[] }[];
    validated_data?: ValidatedResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    audits?: InterviewAudits;
    is_validated?: boolean;
    is_frozen?: boolean;
    // TODO Type the following fields to date times
    start_at?: string;
    end_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface InterviewListAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: number;
    uuid: string;
    participant_id: number;
    responses: InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    validated_data: ValidatedResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
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
export interface InterviewStatusAttributesBase<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: number;
    uuid: string;
    responses: PartialInterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
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
export const auditInterview = function <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    validatedData: InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    originalResponses: InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    interview: InterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
