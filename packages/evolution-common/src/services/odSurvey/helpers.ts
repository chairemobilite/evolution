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
} from '../interviews/interview';
import { TFunction } from 'i18next';
import config from '../../config/project.config';

// This file contains helper function that retrieves various data from the
// responses field of the interview

// TODO This should eventually all be replaced with function directly from a
// survey object that will return other survey objects, once the objects have
// stabilized and are ready to be used during the survey

// Person and household related functions

/**
 * Get a person by its ID or the currently actively person if no ID is specified
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview - The interview object.
 * @param {string|null} [options.personId=null] - The ID of the person to
 * retrieve. If not specified, the currently active person will be returned.
 * @returns
 */
export const getPerson = ({
    interview,
    personId = null
}: {
    interview: UserInterviewAttributes;
    personId?: string | null;
}): Person | null => {
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
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns The household object
 */
export const getHousehold = ({ interview }: { interview: UserInterviewAttributes }): Partial<Household> => {
    return interview.responses.household || {};
};

/**
 * Get the currently active person, as defined in the interview responses. If
 * the active person is not set but there are persons defined, the first one
 * will be returned. If the person is not found, an empty object will be
 * returned.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns The current person object
 */
export const getActivePerson = ({ interview }: { interview: UserInterviewAttributes }): Partial<Person> => {
    const currentPerson = interview.responses._activePersonId;
    const hh = getHousehold({ interview });
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
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview
 * @returns
 */
export const getPersons = ({ interview }: { interview: UserInterviewAttributes }): { [personId: string]: Person } => {
    return (interview.responses.household || {}).persons || {};
};

/**
 * Get the persons array from the interview responses, or an empty array if
 * there are no persons in the survey
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {Person[]}
 */
export const getPersonsArray = ({ interview }: { interview: UserInterviewAttributes }): Person[] => {
    const persons = getPersons({ interview });
    return Object.values(persons).sort((personA, personB) => {
        return personA._sequence - personB._sequence;
    });
};

/**
 * Count the number of persons in the household. This function uses the person
 * defined in the household and not the household size specified by the
 * respondent.
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns The number of persons in the household
 */
export const countPersons = ({ interview }: { interview: UserInterviewAttributes }): number => {
    const personIds = getResponse(interview, 'household.persons', {}) as { [personId: string]: Person };
    return Object.keys(personIds).length;
};

/**
 * Return whether the person is self-declared or not. A person is self-declared
 * if she is responding for herself and has an age greater than the
 * self-response age defined in the configuration
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} optins.interview The interview object
 * @param {Person} options.person The person to check
 * @returns `true` if the person is self-declared, `false` otherwise
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
 * @returns `true` if the person may have a disability, `false` otherwise
 */
export const personMayHaveDisability = ({ person }: { person: Person }): boolean =>
    // FIXME Do we want undefined to return `true`? ie surveys without this question everyone potentially disabled
    person.hasDisability !== undefined && ['yes', 'preferNotToAnswer', 'dontKnow'].includes(person.hasDisability);

/**
 * Return whether there are persons in the household that may have disabilities
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns `true` if anyone in the household may have disabilities
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
 * @returns
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
 * Get the journeys for a person
 *
 * @param {Object} options - The options object.
 * @param {Person} options.person The person for which to get the journeys
 * @returns {Object} The journeys object, with they key being the journey ID, or
 * an empty object if there are no journeys for this person
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
 * @returns {Journey[]} The journeys, sorted by sequence
 */
export const getJourneysArray = function ({ person }: { person: Person }): Journey[] {
    const journeys = getJourneys({ person });
    return Object.values(journeys).sort((journeyA, journeyB) => journeyA._sequence - journeyB._sequence);
};

// *** Trip-related functions

/**
 * Get the active trip for a journey, or null if there is no active trip, or if
 * the active trip is not part of the journey
 *
 * @param {Object} options - The options object.
 * @param {UserInterviewAttributes} options.interview The participant interview
 * @param {Journey|null} [options.journey=null] The journey for which to get the
 * active interview.  If null, the active journey will be used.
 * @returns {Trip|null} The active trip, or `null` if there is no active trip.
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
 * Get the trips from a journey
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey for which to get the trips
 * @returns {Object} The trips object, with they key being the trip ID, or an
 * empty object if there are no trips in this journey
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
 * @returns {Journey[]} The trips, sorted by sequence
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
 * @returns {Trip|null} The previous trips, or `null` if the trip is the first
 */
export const getPreviousTrip = ({ currentTrip, journey }: { currentTrip: Trip; journey: Journey }): Trip | null => {
    const trips = getTripsArray({ journey });
    const indexOfTrip = trips.findIndex((trip) => trip._uuid === currentTrip._uuid);
    return indexOfTrip > 0 ? trips[indexOfTrip - 1] : null;
};

/**
 * Get the origin visited place of a trip
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The trip for which to get the origin visited place
 * @param {Object} options.visitedPlaces The object containing all visited places, keyed by ID
 * @returns The origin visited place, or `null` if the place does not exist
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
 * @returns The destination visited place, or `null` if the place does not exist
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
 * Get the visited places object for a journey, or an empty object if there are
 * no visited places for this journey.
 *
 * @param {Object} options - The options object.
 * @param {Journey} options.journey The journey containing the visited places
 * @returns
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
 * @returns {VisitedPlace[]} The visited places, sorted by sequence
 */
export const getVisitedPlacesArray = function ({ journey }: { journey: Journey }): VisitedPlace[] {
    const visitedPlaces = getVisitedPlaces({ journey });
    return Object.values(visitedPlaces).sort(
        (visitedPlaceA, visitedPlaceB) => visitedPlaceA._sequence - visitedPlaceB._sequence
    );
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

/**
 * Returns visited place name string. If no name will return generic name
 * followed by sequence
 *
 * @param {Object} options - The options object.
 * @param {TFunction} options.t The translation function
 * @param {VisitedPlace} options.visitedPlace The visited place for which to get
 * the name
 * @param {UserInterviewAttributes} options.interview The interview object
 * @returns {string} The visited place name
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
 * @returns {GeoJSON.Feature<GeoJSON.Point> | null} The visited place geography,
 * or `null` if it does not exist
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

// *** Segments-related functions

/**
 * Get the segments object for a trip, or an empty object if there are no
 * segments for this trip.
 *
 * @param {Object} options - The options object.
 * @param {Trip} options.trip The trip for which to get the segments
 * @returns {Object} The segments object, with they key being the segment ID
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
 * @returns {Segment[]} The segments, sorted by sequence
 */
export const getSegmentsArray = ({ trip }: { trip: Trip }): Segment[] => {
    const segments = getSegments({ trip });
    return Object.values(segments).sort((segmentA, segmentB) => segmentA._sequence - segmentB._sequence);
};
