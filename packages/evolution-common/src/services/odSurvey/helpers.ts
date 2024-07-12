/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getResponse } from '../../utils/helpers';
import { Household, Journey, Person, Trip, UserInterviewAttributes, VisitedPlace } from '../interviews/interview';

// This file contains helper function that retrieves various data from the
// responses field of the interview

// TODO This should eventually all be replaced with function directly from a
// survey object that will return other survey objects, once the objects have
// stabilized and are ready to be used during the survey

/**
 * Get a person by its ID or the currently actively person if no ID is specified
 *
 * @param {UserInterviewAttributes} interview
 * @param {string|null} [personId=null]
 * @returns
 */
export const getPerson = (interview: UserInterviewAttributes, personId: string | null = null): Person | null => {
    const requestedPersonId = personId || getResponse(interview, '_activePersonId', null);
    if (requestedPersonId) {
        return getResponse(interview, `household.persons.${requestedPersonId}`, null) as Person;
    } else {
        return null;
    }
};

/**
 * Get the household object in the interview responses, or an empty object if
 * the household has not been initialized
 *
 * @param {UserInterviewAttributes} interview The interview object
 * @returns The household object
 */
export const getHousehold = (interview: UserInterviewAttributes): Partial<Household> => {
    return interview.responses.household || {};
};

/**
 * Get the currently active person, as defined in the interview responses. If
 * the active person is not set but there are persons defined, the first one
 * will be returned. If the person is not found, an empty object will be
 * returned.
 *
 * @param {UserInterviewAttributes} interview The interview object
 * @returns The current person object
 */
export const getActivePerson = (interview: UserInterviewAttributes): Partial<Person> => {
    const currentPerson = interview.responses._activePersonId;
    const hh = getHousehold(interview);
    if (currentPerson !== undefined) {
        return (hh.persons || {})[currentPerson] || {};
    } else {
        // Get first person
        const persons = Object.values(hh.persons || {});
        // TODO: Fix this type, it should be a Person[] or {}
        // but I need it like that for now because it's not working with Generator
        return persons.length !== 0 ? (persons[0] as Partial<Person>) : ({} as Partial<Person>);
    }
};

/**
 * Get the persons object in the interview responses, or an empty object if
 * there are no persons in the survey
 * @param {UserInterviewAttributes} interview
 * @returns
 */
export const getPersons = (interview: UserInterviewAttributes): { [personId: string]: Person } => {
    return (interview.responses.household || {}).persons || {};
};

/**
 * Get the persons array from the interview responses, or an empty array if
 * there are no persons in the survey
 * @param {UserInterviewAttributes} interview
 * @returns {Person[]}
 */
export const getPersonsArray = (interview: UserInterviewAttributes): Person[] => {
    const persons = getPersons(interview);
    return Object.values(persons).sort((personA, personB) => {
        return personA._sequence - personB._sequence;
    });
};

/**
 * Get the active journey for a person, or null if there is no active journey,
 * or if the active journey does not belong to the person.
 * @param {UserInterviewAttributes} interview The participant interview
 * @param {Person|null} person The person for which to get the active journey.
 * If null, the active person will be used.
 * @returns
 */
export const getActiveJourney = (interview: UserInterviewAttributes, person: Person | null = null) => {
    const requestedPerson = person || getPerson(interview);
    if (requestedPerson === null) {
        return null;
    }
    const journeys = getJourneys(requestedPerson);
    const activeJourneyId = getResponse(interview, '_activeJourneyId', null) as string | null;
    return activeJourneyId ? journeys[activeJourneyId] || null : null;
};

/**
 * Get the journeys for a person
 * @param {Person} person The person for which to get the journeys
 * @returns {Object} The journeys object, with they key being the journey ID, or
 * an empty object if there are no journeys for this person
 */
export const getJourneys = function (person: Person): { [journeyId: string]: Journey } {
    return person.journeys || {};
};

/**
 * Get the journeys array for a person, or an empty array if there are no
 * journeys for this person.
 * @param {Person} person The person for whom to get the journeys
 * @returns {Journey[]} The journeys, sorted by sequence
 */
export const getJourneysArray = function (person: Person): Journey[] {
    const journeys = getJourneys(person);
    return Object.values(journeys).sort((journeyA, journeyB) => journeyA._sequence - journeyB._sequence);
};

/**
 * Get the active trip for a journey, or null if there is no active trip,
 * or if the active trip is not part of the journey
 * @param {UserInterviewAttributes} interview The participant interview
 * @param {Journey|null} journey The journey for which to get the active interview.
 * If null, the active journey will be used.
 * @returns {Trip|null} The active trip, or `null` if there is no active trip.
 */
export const getActiveTrip = (interview: UserInterviewAttributes, journey: Journey | null = null): Trip | null => {
    const activeJourney = journey !== null ? journey : getActiveJourney(interview);
    if (activeJourney === null) {
        return null;
    }
    const trips = getTrips(activeJourney);
    const activeTripId = getResponse(interview, '_activeTripId', null) as string | null;
    return activeTripId ? trips[activeTripId] || null : null;
};

/**
 * Get the trips from a journey
 * @param {Journey} journey The journey for which to get the trips
 * @returns {Object} The trips object, with they key being the trip ID, or
 * an empty object if there are no trips in this journey
 */
export const getTrips = function (journey: Journey): { [tripId: string]: Trip } {
    return journey.trips || {};
};

/**
 * Get the trips array from a journey, or an empty array if there are no
 * trips for this journey.
 * @param {Journey} journey The journey for which to get the trips
 * @returns {Journey[]} The trips, sorted by sequence
 */
export const getTripsArray = function (journey: Journey): Trip[] {
    const trips = getTrips(journey);
    return Object.values(trips).sort((tripA, tripB) => tripA._sequence - tripB._sequence);
};

/**
 * Get the visited places object for a journey, or an empty object if
 * there are no visited places for this journey.
 * @param {Journey} journey
 * @returns
 */
export const getVisitedPlaces = (journey: Journey): { [visitedPlaceId: string]: VisitedPlace } => {
    return journey.visitedPlaces || {};
};

/**
 * Get the visited places array for a journey, or an empty array if there are no
 * visited places for this journey.
 * @param {Journey} journey
 * @returns {VisitedPlace[]} The visited places, sorted by sequence
 */
export const getVisitedPlacesArray = function (journey: Journey): VisitedPlace[] {
    const visitedPlaces = getVisitedPlaces(journey);
    return Object.values(visitedPlaces).sort(
        (visitedPlaceA, visitedPlaceB) => visitedPlaceA._sequence - visitedPlaceB._sequence
    );
};

/**
 * Replace visited places that are shortcuts to the given location by the data
 * of this location. Only the first shortcut will be replaced, the others will
 * use the first place as new shortcut
 * @param interview The interview
 * @param visitedPlacesPath The path of the visited place to replace
 */
export const replaceVisitedPlaceShortcuts = (
    interview: UserInterviewAttributes,
    shortcutTo: string
): { updatedValuesByPath: { [path: string]: any }; unsetPaths: string[] } | undefined => {
    const originalVisitedPlace = getResponse(interview, shortcutTo, {}) as VisitedPlace;

    // Find shortcuts to this place
    const placesWithShortcut = getPersonsArray(interview).flatMap((person) =>
        getJourneysArray(person).flatMap((journey) =>
            getVisitedPlacesArray(journey)
                .filter(
                    (visitedPlace) => (visitedPlace as any).shortcut && (visitedPlace as any).shortcut === shortcutTo
                )
                .map((visitedPlace) => ({ person, journey, visitedPlace }))
        )
    );

    if (placesWithShortcut.length === 0) {
        return undefined;
    }
    const updatedValuesByPath: { [path: string]: any } = {};
    const unsetPaths: string[] = [];

    // Replace first place's name and geography with original and remove shortcut if necessary. The original place can itself be a shortcut
    const firstVisitedPlace = placesWithShortcut[0];
    const firstPlacePath = `household.persons.${firstVisitedPlace.person._uuid}.journeys.${firstVisitedPlace.journey._uuid}.visitedPlaces.${firstVisitedPlace.visitedPlace._uuid}`;

    if ((originalVisitedPlace as any).shortcut) {
        updatedValuesByPath[`responses.${firstPlacePath}.shortcut`] = (originalVisitedPlace as any).shortcut;
    } else {
        unsetPaths.push(`responses.${firstPlacePath}.shortcut`);
        updatedValuesByPath[`responses.${firstPlacePath}.name`] = (originalVisitedPlace as any).name;
    }
    updatedValuesByPath[`responses.${firstPlacePath}.geography`] = (originalVisitedPlace as any).geography;

    // Replace all other places' shortcut with first place
    placesWithShortcut
        .slice(1)
        .forEach(
            (place) =>
                (updatedValuesByPath[
                    `responses.household.persons.${place.person._uuid}.journeys.${place.journey._uuid}.visitedPlaces.${place.visitedPlace._uuid}.shortcut`
                ] = firstPlacePath)
        );

    return { updatedValuesByPath, unsetPaths };
};