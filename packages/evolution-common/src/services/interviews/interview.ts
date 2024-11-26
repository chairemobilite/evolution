/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _get from 'lodash/get';
import _set from 'lodash/set';
import _isEqual from 'lodash/isEqual';
import _cloneDeep from 'lodash/cloneDeep';
import { InterviewAttributes, InterviewResponses } from '../questionnaire/types';

/**
 * Prefix used for the username of the participants created for a
 * computer-aided telephone interview (CATI)
 * */
export const INTERVIEWER_PARTICIPANT_PREFIX = 'telephone';

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
