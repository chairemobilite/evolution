/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _get from 'lodash/get';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { getResponse } from '../../utils/helpers';
import {
    Household,
    Journey,
    Person,
    Segment,
    Trip,
    UserInterviewAttributes,
    VisitedPlace
} from '../questionnaire/types';
import { TFunction } from 'i18next';
import config from '../../config/project.config';
import { loopActivities } from './types';

// This file contains helper function that retrieves various data from the
// response field of the interview

// TODO This should eventually all be replaced with function directly from a
// survey object that will return other survey objects, once the objects have
// stabilized and are ready to be used during the survey

// Person and household related functions

/**
 * Get a person by its ID, path or the currently actively person if no ID or
 * path are specified. The `personId` argument has precedence over path if both
 * are provided.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview - The interview object.
 * @param {string|null} [options.personId=null] - The ID of the person to
 * retrieve. If not specified, the currently active person will be returned.
 * @param {string|null} [options.path=null] - Optional path string to extract
 * the person ID from (typically for the householdMembers group). The path
 * should have format `household.persons.{personId}.[...restOfPath]`.
 * @returns {Person | null} The person object with the specified ID or the
 * active person, or `null` if not found.
 */
export const getPerson = ({
    interview,
    personId = null,
    path
}: {
    interview: UserInterviewAttributes;
    personId?: string | null;
    path?: string;
}): Person | null => {
    const requestedPersonId = personId || getCurrentPersonId({ interview, path });
    // Return the person object if found, otherwise null
    if (requestedPersonId) {
        return getResponse(interview, `household.persons.${requestedPersonId}`, null) as Person;
    } else {
        return null;
    }
};

/**
 * Get the current person ID from the interview response.
 * If a path is provided and matches the pattern 'household.persons.{personId}.', extracts the personId from the path.
 * Otherwise, returns the currently active person ID from the interview response.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview - The interview object.
 * @param {string} [options.path] - Optional path string to extract the person ID from.
 * @returns {string | null} The current person ID, or null if not found.
 */
export const getCurrentPersonId = ({
    interview,
    path
}: {
    interview: UserInterviewAttributes;
    path?: string;
}): string | null => {
    // 1. Try to extract personId from path if it matches household.persons.{personId}.
    if (path) {
        const match = path.match(/household\.persons\.([^.]+)\./);
        if (match) {
            return match[1];
        }
    }
    // 2. Otherwise, use the active person id from the interview response
    return interview.response._activePersonId ?? null;
};

/**
 * Get the household object in the interview response, or an empty object if
 * the household has not been initialized
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {Partial<Household>} The household object or an empty object if not initialized.
 */
export const getHousehold = ({ interview }: { interview: UserInterviewAttributes }): Partial<Household> => {
    return interview.response.household || {};
};

/**
 * Get the currently active person, as defined in the interview response. If
 * the active person is not set but there are persons defined, the first one
 * will be returned. If the person is not found, `null` will be returned
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {Person | null} The active person object or `null` if not found.
 */
export const getActivePerson = ({ interview }: { interview: UserInterviewAttributes }): Person | null => {
    const currentPerson = interview.response._activePersonId;
    const hh = getHousehold({ interview });
    if (currentPerson !== undefined) {
        return (hh.persons || {})[currentPerson] || null;
    } else {
        // Get first person
        const persons = getPersonsArray({ interview });
        return persons.length !== 0 ? persons[0] : null;
    }
};

/**
 * @typedef {Object.<string, Person>} PersonsObject
 * An object where the keys are person IDs and the values are Person objects.
 */

/**
 * Get the persons object in the interview response, or an empty object if
 * there are no persons in the survey.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object.
 * @returns {PersonsObject} The persons object or an empty object if no persons exist.
 */
export const getPersons = ({ interview }: { interview: UserInterviewAttributes }): { [personId: string]: Person } => {
    return (interview.response.household || {}).persons || {};
};

/**
 * Get the persons array from the interview response, or an empty array if
 * there are no persons in the survey
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {Person[]} The array of persons sorted by sequence, or an empty array if no persons exist.
 */
export const getPersonsArray = ({ interview }: { interview: UserInterviewAttributes }): Person[] => {
    const persons = getPersons({ interview });
    return Object.values(persons).sort((personA, personB) => {
        return personA._sequence - personB._sequence;
    });
};

/**
 * Get the interviewable persons array from the interview response, or an empty
 * array if there are no persons with the interviewable age in the survey. The
 * person is considered interviewable if the age is greater than the
 * interviewable age defined in the configuration or if the age is not set.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {Person[]} The array of interviewable persons sorted by sequence, or an empty array if none exist.
 */
export const getInterviewablePersonsArray = ({ interview }: { interview: UserInterviewAttributes }): Person[] => {
    const persons = getPersons({ interview });
    const personsArray = Object.values(persons).sort((personA, personB) => {
        return personA._sequence - personB._sequence;
    });
    return personsArray.filter((person) => typeof person.age !== 'number' || person.age >= config.interviewableAge);
};

/**
 * Count the number of persons in the household. This function uses the person
 * defined in the household and not the household size specified by the
 * respondent.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {number} The number of persons in the household.
 */
export const countPersons = ({ interview }: { interview: UserInterviewAttributes }): number => {
    const personIds = getResponse(interview, 'household.persons', {}) as { [personId: string]: Person };
    return Object.keys(personIds).length;
};

/**
 * Counts the number of adults in the given interview.  An adult is defined as a
 * person who is `adultAge` years or older and has a defined age.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {number} The count of adults within the interview (only persons with
 * a defined age >= adultAge).
 */
export const countAdults = ({ interview }: { interview: UserInterviewAttributes }): number => {
    const persons = getPersonsArray({ interview });

    // Count persons with age adultAge or more
    let count: number = 0;
    persons.forEach((person) => {
        if (person?.age && person.age >= config.adultAge) {
            count++;
        }
    });
    return count;
};

/**
 * Return whether the person is self-declared or not. A person is self-declared
 * if she is responding for herself and has an age greater than the
 * self-response age defined in the configuration
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} optins.interview The interview object
 * @param {Person} options.person The person to check
 * @returns {boolean} `true` if the person is self-declared, `false` otherwise.
 */
export const isSelfDeclared = ({
    interview,
    person
}: {
    interview: UserInterviewAttributes;
    person: Person;
}): boolean => {
    const persons: any = getPersonsArray({ interview });
    const personsCanSelfRespond = persons.filter((p: Person) => p.age && p.age >= config.selfResponseMinimumAge);
    return (
        (personsCanSelfRespond.length === 1 && person._uuid === personsCanSelfRespond[0]._uuid) ||
        (!_isBlank(person.whoWillAnswerForThisPerson) ? person.whoWillAnswerForThisPerson === person._uuid : false)
    );
};

/**
 * Return the number of person in the household, or if the person is
 * self-declared, it will return 1. This function is used to know if the
 * labels should directly address the respondent or use a nickname
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview
 * @param {Person} options.person The current person being interviews
 * @returns {number} The number of persons in the household or 1 if the person is self-declared.
 */
export const getCountOrSelfDeclared = ({
    interview,
    person
}: {
    interview: UserInterviewAttributes;
    person: Person;
}): number => {
    const personsCount = countPersons({ interview });
    if (personsCount > 1 && isSelfDeclared({ interview, person })) {
        return 1;
    }
    return personsCount;
};

/**
 * Return whether this person may have a disability
 *
 * @param {Object} options - The options object.
 * @param {Person} options.person The current person being interviews
 * @returns {boolean} `true` if the person may have a disability, `false` otherwise.
 */
export const personMayHaveDisability = ({ person }: { person: Person }): boolean =>
    // FIXME Do we want undefined to return `true`? ie surveys without this question everyone potentially disabled
    person.hasDisability !== undefined && ['yes', 'preferNotToAnswer', 'dontKnow'].includes(person.hasDisability);

/**
 * Return whether there are persons in the household that may have disabilities
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {boolean} `true` if anyone in the household may have disabilities, `false` otherwise.
 */
export const householdMayHaveDisability = ({ interview }: { interview: UserInterviewAttributes }): boolean =>
    getPersonsArray({ interview }).some((person) => personMayHaveDisability({ person }));

// *** Journey-related functions

/**
 * Get the active journey for a person, or null if there is no active journey,
 * or if the active journey does not belong to the person.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The participant interview
 * @param {Person|null} [options.person=null] The person for which to get the
 * active journey.  If null, the active person will be used.
 * @returns {Journey | null} The active journey for the person, or `null` if not found.
 */
export const getActiveJourney = ({
    interview,
    person = null
}: {
    interview: UserInterviewAttributes;
    person?: Person | null;
}) => {
    const requestedPerson = person || getPerson({ interview });
    if (requestedPerson === null) {
        return null;
    }
    const journeys = getJourneys({ person: requestedPerson });
    const activeJourneyId = getResponse(interview, '_activeJourneyId', null) as string | null;
    return activeJourneyId ? journeys[activeJourneyId] || null : null;
};

/**
 * @typedef {Object.<string, Journey>} JourneysObject
 * An object where the keys are journey IDs and the values are Journey objects.
 */

/**
 * Get the journeys for a person.
 *
 * @param {Object} options - The options object.
 * @param {Person} options.person The person for which to get the journeys.
 * @returns {JourneysObject} The journeys object or an empty object if no journeys exist.
 */
export const getJourneys = function ({ person }: { person: Person }): { [journeyId: string]: Journey } {
    return person.journeys || {};
};

/**
 * Get the journeys array for a person, or an empty array if there are no
 * journeys for this person.
 *
 * @param {Object} options - The options object.
 * @param {Person} options.person The person for whom to get the journeys
 * @returns {Journey[]} The array of journeys sorted by sequence, or an empty array if no journeys exist.
 */
export const getJourneysArray = function ({ person }: { person: Person }): Journey[] {
    const journeys = getJourneys({ person });
    return Object.values(journeys).sort((journeyA, journeyB) => journeyA._sequence - journeyB._sequence);
};

// *** Trip-related functions

/**
 * @typedef {Object.<string, Trip>} TripsObject
 * An object where the keys are trip ID's and the values are Trip objects.
 */

/**
 * Get the active trip for a journey, or null if there is no active trip, or if
 * the active trip is not part of the journey
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The participant interview
 * @param {Journey|null} [options.journey=null] The journey for which to get the
 * active interview.  If null, the active journey will be used.
 * @returns {Trip | null} The active trip for the journey, or `null` if not found.
 */
export const getActiveTrip = ({
    interview,
    journey = null
}: {
    interview: UserInterviewAttributes;
    journey?: Journey | null;
}): Trip | null => {
    const activeJourney = journey !== null ? journey : getActiveJourney({ interview });
    if (activeJourney === null) {
        return null;
    }
    const trips = getTrips({ journey: activeJourney });
    const activeTripId = getResponse(interview, '_activeTripId', null) as string | null;
    return activeTripId ? trips[activeTripId] || null : null;
};

/**
 * Get the trips from a journey.
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey for which to get the trips.
 * @returns {TripsObject} The trips object or an empty object if no trips exist.
 */
export const getTrips = function ({ journey }: { journey: Journey }): { [tripId: string]: Trip } {
    return journey.trips || {};
};

/**
 * Get the trips array from a journey, or an empty array if there are no
 * trips for this journey.
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey for which to get the trips
 * @returns {Trip[]} The array of trips sorted by sequence, or an empty array if no trips exist.
 */
export const getTripsArray = function ({ journey }: { journey: Journey }): Trip[] {
    const trips = getTrips({ journey });
    return Object.values(trips).sort((tripA, tripB) => tripA._sequence - tripB._sequence);
};

/**
 * Get the previous trip from a journey, chronologically
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.currentTrip The current trip, of which to get the
 * previous trip
 * @param {Journey} options.journey The journey for which to get the trips
 * @returns {Trip | null} The previous trip in the journey, or `null` if the current trip is the first.
 */
export const getPreviousTrip = ({ currentTrip, journey }: { currentTrip: Trip; journey: Journey }): Trip | null => {
    const trips = getTripsArray({ journey });
    const indexOfTrip = trips.findIndex((trip) => trip._uuid === currentTrip._uuid);
    return indexOfTrip > 0 ? trips[indexOfTrip - 1] : null;
};

/**
 * Get the next incomplete trip from a journey
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey for which to get the next
 * incomplete trips
 * @returns {Trip | null} The next incomplete trip in the journey, or `null` if all trips are complete.
 */
export const selectNextIncompleteTrip = ({ journey }: { journey: Journey }): Trip | null => {
    const trips = getTripsArray({ journey });
    const visitedPlaces = getVisitedPlaces({ journey });
    for (let i = 0, count = trips.length; i < count; i++) {
        const trip = trips[i];
        const origin = getOrigin({ trip, visitedPlaces });

        // ignore on the road/leisure stroll second trip:
        // FIXME Review how we handle loop activities in trips
        if (origin && origin.activity && loopActivities.includes(origin.activity)) {
            continue;
        }
        // FIXME The content of this function should depend on the survey's
        // segment section configuration. Now we suppose there should be
        // segments and only the mode is mandatory
        const segments = getSegmentsArray({ trip });
        if (segments.length === 0) {
            return trip;
        } else {
            // Return the trip if one of the segments does not have a mode
            const incompleteSegment = segments.find((segment) => _isBlank(segment) || _isBlank(segment.mode));
            if (incompleteSegment) {
                return trip;
            }
            // Return the trip if the last segment does not have the next mode to `false`
            const lastSegment = segments[segments.length - 1];
            if (lastSegment.hasNextMode !== false) {
                return trip;
            }
        }
    }
    return null;
};

/**
 * Get the origin visited place of a trip
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The trip for which to get the origin visited place
 * @param {Object} options.visitedPlaces The object containing all visited places, keyed by ID
 * @returns {VisitedPlace | null} The origin visited place of the trip, or `null` if not found.
 */
export const getOrigin = function ({
    trip,
    visitedPlaces
}: {
    trip: Trip;
    visitedPlaces: { [visitedPlaceId: string]: VisitedPlace };
}): VisitedPlace | null {
    return trip._originVisitedPlaceUuid ? visitedPlaces[trip._originVisitedPlaceUuid] || null : null;
};

/**
 * Get the destination visited place of a trip
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The trip for which to get the destination visited
 * place
 * @param {Object} options.visitedPlaces The object containing all visited
 * places, keyed by ID
 * @returns {VisitedPlace | null} The destination visited place of the trip, or `null` if not found.
 */
export const getDestination = function ({
    trip,
    visitedPlaces
}: {
    trip: Trip;
    visitedPlaces: { [visitedPlaceId: string]: VisitedPlace };
}): VisitedPlace | null {
    return trip._destinationVisitedPlaceUuid ? visitedPlaces[trip._destinationVisitedPlaceUuid] || null : null;
};

// *** Visited place-related functions

/**
 * @typedef {Object.<string, VisitedPlace>} VisitedPlacesObject
 * An object where the keys are visited place IDs and the values are VisitedPlace objects.
 */

/**
 * Get the visited places object for a journey, or an empty object if there are
 * no visited places for this journey.
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey containing the visited places.
 * @returns {VisitedPlacesObject} The visited places object or an empty object if none exist.
 */
export const getVisitedPlaces = ({ journey }: { journey: Journey }): { [visitedPlaceId: string]: VisitedPlace } => {
    return journey.visitedPlaces || {};
};

/**
 * Get the visited places array for a journey, or an empty array if there are no
 * visited places for this journey.
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey for which to get the visited
 * places
 * @returns {VisitedPlace[]} The array of visited places sorted by sequence, or an empty array if none exist.
 */
export const getVisitedPlacesArray = function ({ journey }: { journey: Journey }): VisitedPlace[] {
    const visitedPlaces = getVisitedPlaces({ journey });
    return Object.values(visitedPlaces).sort(
        (visitedPlaceA, visitedPlaceB) => visitedPlaceA._sequence - visitedPlaceB._sequence
    );
};

/**
 * Get the active visited place for a journey, or null if there is no active
 * visited place, or if the active visited place is not part of the journey
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The participant interview
 * @param {Journey|null} [options.journey=null] The journey for which to get the
 * active visited place.  If null, the active journey will be used.
 * @returns {VisitedPlace | null} The active visited place for the journey, or `null` if not found.
 */
export const getActiveVisitedPlace = ({
    interview,
    journey = null
}: {
    interview: UserInterviewAttributes;
    journey?: Journey | null;
}): VisitedPlace | null => {
    const activeJourney = journey !== null ? journey : getActiveJourney({ interview });
    if (activeJourney === null) {
        return null;
    }
    const visitedPlaces = getVisitedPlaces({ journey: activeJourney });
    const activeTripId = getResponse(interview, '_activeVisitedPlaceId', null) as string | null;
    return activeTripId ? visitedPlaces[activeTripId] || null : null;
};

/**
 * Replace visited places that are shortcuts to the given location by the data
 * of this location. Only the first shortcut will be replaced, the others will
 * use the first place as new shortcut
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @param {string} options.shortcutTo The path of the visited place for which to
 * replace all shortcuts
 * @param visitedPlacesPath The path of the visited place to replace
 */
export const replaceVisitedPlaceShortcuts = ({
    interview,
    shortcutTo
}: {
    interview: UserInterviewAttributes;
    shortcutTo: string;
}): { updatedValuesByPath: { [path: string]: any }; unsetPaths: string[] } | undefined => {
    const originalVisitedPlace = getResponse(interview, shortcutTo, {}) as VisitedPlace;

    // Find shortcuts to this place
    const placesWithShortcut = getPersonsArray({ interview }).flatMap((person) =>
        getJourneysArray({ person }).flatMap((journey) =>
            getVisitedPlacesArray({ journey })
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
        updatedValuesByPath[`response.${firstPlacePath}.shortcut`] = (originalVisitedPlace as any).shortcut;
    } else {
        unsetPaths.push(`response.${firstPlacePath}.shortcut`);
        updatedValuesByPath[`response.${firstPlacePath}.name`] = (originalVisitedPlace as any).name;
    }
    updatedValuesByPath[`response.${firstPlacePath}.geography`] = (originalVisitedPlace as any).geography;

    // Replace all other places' shortcut with first place
    placesWithShortcut
        .slice(1)
        .forEach(
            (place) =>
                (updatedValuesByPath[
                    `response.household.persons.${place.person._uuid}.journeys.${place.journey._uuid}.visitedPlaces.${place.visitedPlace._uuid}.shortcut`
                ] = firstPlacePath)
        );

    return { updatedValuesByPath, unsetPaths };
};

/**
 * Returns visited place name string. If no name will return generic name
 * followed by sequence
 *
 * @param {Object} options - The options object.
 * @param {TFunction} options.t The translation function
 * @param {VisitedPlace} options.visitedPlace The visited place for which to get
 * the name
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {string} The visited place name or a generic name followed by its sequence.
 */
export const getVisitedPlaceName = function ({
    t,
    visitedPlace,
    interview
}: {
    t: TFunction;
    visitedPlace: VisitedPlace;
    interview: UserInterviewAttributes;
}): string {
    if (visitedPlace && visitedPlace.activity === 'home') {
        return t(`survey:visitedPlace:activityCategories:${visitedPlace.activity}`);
    }

    // Resolve any shortcut, then return the name if available
    const actualVisitedPlace =
        visitedPlace.alreadyVisitedBySelfOrAnotherHouseholdMember && visitedPlace.shortcut !== undefined
            ? getResponse(interview, visitedPlace.shortcut, null)
            : visitedPlace;
    if (actualVisitedPlace && (actualVisitedPlace as VisitedPlace).name) {
        return (actualVisitedPlace as VisitedPlace).name as string;
    }

    return `${t('survey:placeGeneric')} ${visitedPlace._sequence}`;
};

/**
 * Returns the visited place geography.
 *
 * @param {Object} options - The options object.
 * @param {VisitedPlace} options.visitedPlace The visited place for which to get
 * the geography
 * @param {UserInterviewAttributes} options.interview The interview object
 * @param {UserInterviewAttributes} options.person The person object
 * @returns {GeoJSON.Feature<GeoJSON.Point> | null} The visited place geography, or `null` if not found.
 */
export const getVisitedPlaceGeography = function ({
    visitedPlace,
    interview,
    person
}: {
    visitedPlace: VisitedPlace;
    interview: UserInterviewAttributes;
    person: Person;
}): GeoJSON.Feature<GeoJSON.Point> | null {
    let geojson: GeoJSON.Feature<GeoJSON.Point> | null = null;
    if (visitedPlace.activity === 'home') {
        geojson = getResponse(interview, 'home.geography', null) as GeoJSON.Feature<GeoJSON.Point> | null;
    } else {
        geojson = (visitedPlace.geography || null) as GeoJSON.Feature<GeoJSON.Point> | null;
        if (!geojson) {
            // FIXME In some surveys, 'workUsual' and 'schoolUsual' are special
            // cases, like 'home'. If the geography is not found with the
            // default visitedPlace way, we look in the person's
            // `usualWorkPlace` and `usualSchoolPlace` fields, but they are not
            // specified. This is too custom. It needs to be generalized.
            if (visitedPlace.activity === 'workUsual') {
                geojson = _get(person, 'usualWorkPlace', null) as GeoJSON.Feature<GeoJSON.Point> | null;
            } else if (visitedPlace.activity === 'schoolUsual') {
                geojson = _get(person, 'usualSchoolPlace', null) as GeoJSON.Feature<GeoJSON.Point> | null;
            }
        }
    }
    return geojson;
};

/**
 * Get the place visited after the requested visited place id, in the journey
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey the visited place is part of
 * @param {string} options.visitedPlaceId The ID of the visited place from which
 * we want the next place id
 * @returns {VisitedPlace | null} The next visited place in the journey, or `null` if none exist.
 */
export const getNextVisitedPlace = function ({
    journey,
    visitedPlaceId
}: {
    journey: Journey;
    visitedPlaceId: string;
}): VisitedPlace | null {
    const visitedPlacesArray = getVisitedPlacesArray({ journey });
    for (let i = 0, count = visitedPlacesArray.length - 1; i < count; i++) {
        if (visitedPlacesArray[i]._uuid === visitedPlaceId) {
            return visitedPlacesArray[i + 1];
        }
    }
    return null; // provided visitedPlace was the last or not part of this journey
};

/**
 * Get the place visited before the requested visited place id, in the journey
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey the visited place is part of
 * @param {string} options.visitedPlaceId The ID of the visited place from which
 * we want the previous place id
 * @returns {VisitedPlace | null} The previous visited place in the journey, or `null` if none exist.
 */
export const getPreviousVisitedPlace = function ({
    journey,
    visitedPlaceId
}: {
    journey: Journey;
    visitedPlaceId: string;
}): VisitedPlace | null {
    const visitedPlacesArray = getVisitedPlacesArray({ journey });
    for (let i = 1, count = visitedPlacesArray.length; i < count; i++) {
        if (visitedPlacesArray[i]._uuid === visitedPlaceId) {
            return visitedPlacesArray[i - 1];
        }
    }
    return null; // provided visitedPlace was the first or not part of this journey
};

// *** Segments-related functions

/**
 * @typedef {Object.<string, Segment>} SegmentsObject
 * An object where the keys are segment IDs and the values are Segment objects.
 */

/**
 * Get the segments object for a trip, or an empty object if there are no
 * segments for this trip.
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The trip for which to get the segments.
 * @returns {SegmentsObject} The segments object or an empty object if no segments exist.
 */
export const getSegments = ({ trip }: { trip: Trip }): { [segmentId: string]: Segment } => {
    return trip.segments || {};
};

/**
 * Get the segments array for a trip, or an empty array if there are no
 * segments for this trip.
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The trip for which to get the segments
 * @returns {Segment[]} The array of segments sorted by sequence, or an empty array if no segments exist.
 */
export const getSegmentsArray = ({ trip }: { trip: Trip }): Segment[] => {
    const segments = getSegments({ trip });
    return Object.values(segments).sort((segmentA, segmentB) => segmentA._sequence - segmentB._sequence);
};
