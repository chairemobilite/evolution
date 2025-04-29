import isEmpty from 'lodash/isEmpty';
import maxBy from 'lodash/maxBy';
import _upperFirst from 'lodash/upperFirst';
import _cloneDeep from 'lodash/cloneDeep';
import {
    distance as turfDistance,
    booleanPointInPolygon as turfPointInPolygon,
    lineIntersect as turfLineIntersects
} from '@turf/turf';
import moment from 'moment-business-days';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { isFeature } from 'geojson-validation';

import Preferences from 'chaire-lib-common/lib/config/Preferences';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { Person, UserInterviewAttributes, VisitedPlace } from 'evolution-common/lib/services/questionnaire/types';

const minRadioValueByPath = {};

const maxRadioValueByPath = {};

const strikeStart = moment('2023-11-21');
// FIXME Mettre à jour quand la date sera connue
const strikeEnd = moment('2024-01-01');

const selfResponseAge = config.selfResponseMinimumAge || 14;

const isSchoolEnrolledTrueValues = [
    'kindergarten',
    'childcare',
    'primarySchool',
    'secondarySchool',
    'schoolAtHome',
    'other'
];

// TODO This should be typed as Person, but there's too many missing fields
const getPerson = function (interview, personId = null): any | null {
    personId = personId || surveyHelper.getResponse(interview, '_activePersonId', null);
    if (personId) {
        return surveyHelper.getResponse(interview, `household.persons.${personId}`, null) as Person;
    } else {
        return null;
    }
};

const isWorker = function (person) {
    // added to Person class √
    if (_isBlank(person)) {
        return false;
    }
    return ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].includes(person.occupation);
};

const isFullTimeWorker = function (person) {
    // added to Person class √
    if (_isBlank(person)) {
        return false;
    }
    return person.occupation === 'fullTimeWorker';
};

const isPartTimeWorker = function (person) {
    // added to Person class √
    if (_isBlank(person)) {
        return false;
    }
    return person.occupation === 'partTimeWorker';
};

const isFullTimeStudent = function (person) {
    // added to Person class √
    if (_isBlank(person)) {
        return false;
    }
    return person.occupation === 'fullTimeStudent';
};

const isPartTimeStudent = function (person) {
    // added to Person class √
    if (_isBlank(person)) {
        return false;
    }
    return person.occupation === 'partTimeStudent';
};

const isStudent = function (person) {
    // added to Person class √
    if (_isBlank(person)) {
        return false;
    }
    return ['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].includes(person.occupation);
};

const updateVisitedPlaces = function (
    person,
    visitedPlaces,
    interview,
    attributePrefix = null,
    includeSelectedVisitedPlaceId = true
) {
    const count = visitedPlaces.length;
    const updateValuesByPath = {};
    for (let i = 0; i < count; i++) {
        const visitedPlace = visitedPlaces[i];
        const visitedPlacePath = `household.persons.${person._uuid}.visitedPlaces.${visitedPlace._uuid}`;
        const nextVisitedPlace = i + 1 < count ? visitedPlaces[i + 1] : null;
        if (
            nextVisitedPlace &&
            nextVisitedPlace.activity === 'home' &&
            visitedPlace.nextPlaceCategory !== 'wentBackHome'
        ) {
            updateValuesByPath[`responses.${visitedPlacePath}.nextPlaceCategory`] = 'wentBackHome';
        }
        if (
            nextVisitedPlace &&
            nextVisitedPlace.activity !== 'home' &&
            visitedPlace.nextPlaceCategory === 'wentBackHome'
        ) {
            updateValuesByPath[`responses.${visitedPlacePath}.nextPlaceCategory`] = 'visitedAnotherPlace';
        }
        if (
            !nextVisitedPlace &&
            !_isBlank(visitedPlace.nextPlaceCategory) &&
            visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay'
        ) {
            // we need to nullify path for the previous visited place:
            updateValuesByPath[`responses.${visitedPlacePath}.nextPlaceCategory`] = null;
        }
        if (i === 0 && !_isBlank(visitedPlace.arrivalTime)) {
            updateValuesByPath[`responses.${visitedPlacePath}.arrivalTime`] = null;
        }
        if (
            visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay' &&
            i === count - 1 &&
            !_isBlank(visitedPlace.departureTime)
        ) {
            updateValuesByPath[`responses.${visitedPlacePath}.departureTime`] = null;
        }
        if (includeSelectedVisitedPlaceId) {
            updateValuesByPath[
                `responses._active${attributePrefix ? _upperFirst(attributePrefix) : ''}VisitedPlaceId`
            ] = selectNextVisitedPlaceId(visitedPlaces, person, interview);
        }
        return updateValuesByPath;
    }
};

const getPreviousVisitedPlace = function (visitedPlaceId, orderedVisitedPlacesArray) {
    for (let i = 1, count = orderedVisitedPlacesArray.length; i < count; i++) {
        if (orderedVisitedPlacesArray[i]._uuid === visitedPlaceId) {
            return orderedVisitedPlacesArray[i - 1];
        }
    }
    return null; // provided visitedPlace was the first
};

const getNextVisitedPlace = function (visitedPlaceId, orderedVisitedPlacesArray) {
    for (let i = 0, count = orderedVisitedPlacesArray.length - 1; i < count; i++) {
        if (orderedVisitedPlacesArray[i]._uuid === visitedPlaceId) {
            return orderedVisitedPlacesArray[i + 1];
        }
    }
    return null; // provided visitedPlace was the last
};

const selectNextVisitedPlaceId = function (visitedPlaces: any[], person: Person, interview) {
    const count = visitedPlaces.length;
    const lastVisitedlaces = maxBy(visitedPlaces, '_sequence');
    const lastSequence = lastVisitedlaces ? lastVisitedlaces._sequence : null;
    for (let i = 0; i < count; i++) {
        const visitedPlace = visitedPlaces[i];
        const nextVisitedPlace = visitedPlaces[i + 1];
        const geography = getGeography(visitedPlace, person, interview);

        if (
            _isBlank(visitedPlace.activityCategory) ||
            _isBlank(visitedPlace.activity) ||
            //(_isBlank(visitedPlace.departureTime) && (visitedPlace._sequence < count || visitedPlace._sequence === 1 || (visitedPlace._sequence === count && visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay'))) ||
            (visitedPlace._sequence === lastSequence &&
                visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay') ||
            (_isBlank(visitedPlace.arrivalTime) && visitedPlace._sequence > 1) ||
            (_isBlank(visitedPlace.nextPlaceCategory) && !nextVisitedPlace) ||
            //(visitedPlace.activityCategory === 'workOnTheRoad' && (_isBlank(visitedPlace.onTheRoadDepartureType) || _isBlank(visitedPlace.onTheRoadArrivalType)) && visitedPlace._sequence > 1) ||
            (_isBlank(geography) && !['workOnTheRoad', 'leisureStroll'].includes(visitedPlace.activity))
        ) {
            return visitedPlace._uuid;
        }
    }
    return null;
};

const getActiveVisitedPlaceId = function (interview, attributePrefix = null) {
    return surveyHelper.getResponse(
        interview,
        `_active${attributePrefix ? _upperFirst(attributePrefix) : ''}VisitedPlaceId`
    );
};

const getActiveVisitedPlace = function (interview, attributePrefix = null, person = null) {
    person = person || getPerson(interview);
    const visitedPlaces: any = getVisitedPlaces(person, attributePrefix, false);
    const activeVisitedPlaceId: any = surveyHelper.getResponse(
        interview,
        `_active${attributePrefix ? _upperFirst(attributePrefix) : ''}VisitedPlaceId`,
        null
    );
    return activeVisitedPlaceId && visitedPlaces[activeVisitedPlaceId] ? visitedPlaces[activeVisitedPlaceId] : null;
};

//TODO: add attributePrefix for custom named visitedPlaces:
const getHouseholdVisitedAndUsualPlacesArrayAndByPersonId = function (interview) {
    const persons: any = surveyHelper.getResponse(interview, 'household.persons', {});
    const visitedPlaces = [];
    const visitedPlacesByPersonId = {};
    const usualPlaces = [];
    const usualPlacesByPersonId = {};
    for (const personId in persons) {
        const person = persons[personId];
        const personVisitedPlaces = person.visitedPlaces || {};
        const personVisitedPlacesSorted = Object.values(personVisitedPlaces).sort((visitedPlaceA, visitedPlaceB) => {
            return visitedPlaceA['_sequence'] - visitedPlaceB['_sequence'];
        });
        visitedPlaces.push(...personVisitedPlacesSorted);
        visitedPlacesByPersonId[personId] = personVisitedPlacesSorted;

        // Get the person's usual places
        const personUsualPlaces = [];
        usualPlacesByPersonId[personId] = personUsualPlaces;
        if (person.usualWorkPlace) {
            personUsualPlaces.push(person.usualWorkPlace);
        }
        if (person.usualSchoolPlace) {
            personUsualPlaces.push(person.usualSchoolPlace);
        }
        usualPlaces.push(...personUsualPlaces);
        usualPlacesByPersonId[personId] = personUsualPlaces;
    }
    return {
        visitedPlaces,
        visitedPlacesByPersonId,
        usualPlaces,
        usualPlacesByPersonId
    };
};

const getVisitedPlaceAndPersonInHouseholdById = function (visitedPlaceId, attributePrefix = null, interview) {
    const persons: any = surveyHelper.getResponse(interview, 'household.persons', {});
    for (const personId in persons) {
        const person = persons[personId];
        const personVisitedPlaces = person[attributePrefix ? attributePrefix + 'VisitedPlaces' : 'visitedPlaces'] || {};
        for (const _visitedPlaceId in personVisitedPlaces) {
            if (_visitedPlaceId === visitedPlaceId) {
                return {
                    person: person,
                    visitedPlace: personVisitedPlaces[_visitedPlaceId]
                };
            }
        }
    }
    return null;
};

const getModeCategory = function (mode) {
    if (
        [
            'carDriver',
            'carPassenger',
            'bicycle',
            'bicycleBikeSharingElectric',
            'bicycleBikeSharing',
            'bicycleElectric',
            'taxi',
            'uber',
            'motorcycle',
            'carDriverCarsharingStationBased',
            'carDriverCarsharingFreeFloating'
        ].indexOf(mode) > -1
    ) {
        return 'private';
    } else if (
        [
            'transitBus',
            'transitSubway',
            'transitRail',
            'transitTaxi',
            'intercityBus',
            'intercityRail',
            'busOther',
            'plane'
        ].indexOf(mode) > -1
    ) {
        return 'public';
    }
    return 'other';
};

const getSegments = function (trip, asArray = true) {
    if (trip) {
        const segments = trip.segments || {};
        if (asArray) {
            return Object.values(segments).sort((segmentA, segmentB) => {
                return segmentA['_sequence'] - segmentB['_sequence'];
            });
        } else {
            return segments;
        }
    }
    return asArray ? [] : {};
};

const getPersons = function (interview, asArray = false) {
    const persons = surveyHelper.getResponse(interview, 'household.persons', {});
    if (asArray) {
        return Object.values(persons).sort((personA, personB) => {
            return personA['_sequence'] - personB['_sequence'];
        });
    } else {
        return persons;
    }
};

const countPersons = function (interview) {
    const personIds = surveyHelper.getResponse(interview, 'household.persons', {});
    return Object.keys(personIds).length;
};

const getVisitedPlaces = function (person, attributePrefix = null, asArray = true) {
    if (person) {
        const visitedPlaces = person[attributePrefix ? attributePrefix + 'VisitedPlaces' : 'visitedPlaces'] || {};
        if (asArray) {
            return Object.values(visitedPlaces).sort((visitedPlaceA, visitedPlaceB) => {
                return visitedPlaceA['_sequence'] - visitedPlaceB['_sequence'];
            });
        } else {
            return visitedPlaces;
        }
    }
    return asArray ? [] : {};
};

const getTrips = function (person, asArray = true) {
    if (person) {
        const trips = person.trips || {};
        if (asArray) {
            return Object.values(trips).sort((tripA, tripB) => {
                return tripA['_sequence'] - tripB['_sequence'];
            });
        } else {
            return trips;
        }
    }
    return asArray ? [] : {};
};

const getShortcutVisitedPlacePerson = function (shortcutVisitedPlaceId, interview) {
    if (!shortcutVisitedPlaceId) {
        return null;
    }
    const visitedAndUsualPlacesArrayAndByPersonId = getHouseholdVisitedAndUsualPlacesArrayAndByPersonId(interview);
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId) {
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            if (visitedPlace && visitedPlace._uuid === shortcutVisitedPlaceId) {
                return getPerson(interview, personId);
            }
        }
    }
    // It may be one of the usual places
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId) {
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            if (visitedPlace && visitedPlace._uuid === shortcutVisitedPlaceId) {
                return getPerson(interview, personId);
            }
        }
    }
    return null;
};

const getShortcutVisitedPlace = function (shortcutVisitedPlaceId, interview) {
    const visitedAndUsualPlacesArrayAndByPersonId = getHouseholdVisitedAndUsualPlacesArrayAndByPersonId(interview);
    // It may be one of the visited places
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId) {
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            if (visitedPlace && visitedPlace._uuid === shortcutVisitedPlaceId) {
                return visitedPlace;
            }
        }
    }
    // It may be one of the usual places
    for (const personId in visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId) {
        const personVisitedPlaces = visitedAndUsualPlacesArrayAndByPersonId.usualPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            if (visitedPlace && visitedPlace._uuid === shortcutVisitedPlaceId) {
                return visitedPlace;
            }
        }
    }
    return null;
};

const getShortcutVisitedPlaceName = function (shortcutVisitedPlace, interview) {
    if (!shortcutVisitedPlace) {
        return null;
    }
    if (shortcutVisitedPlace.name) {
        return shortcutVisitedPlace.name;
    } else if (shortcutVisitedPlace.activity === 'home') {
        return null;
    } else if (shortcutVisitedPlace.activity === 'workUsual') {
        const person: any = getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview);
        return person.usualWorkPlaceName || null;
    } else if (shortcutVisitedPlace.activity === 'schoolUsual') {
        const person: any = getShortcutVisitedPlacePerson(shortcutVisitedPlace._uuid, interview);
        return person.usualSchoolPlaceName || null;
    }
    return null;
};

const getGeography = function (visitedPlace, person, interview, recursive = false) {
    if (visitedPlace === null || visitedPlace === undefined) {
        return null;
    }
    let geojson = null;
    if (visitedPlace.activityCategory === 'home') {
        geojson = surveyHelper.getResponse(interview, 'home.geography', null);
    } else if (visitedPlace.activity === 'workUsual') {
        geojson =
            person.usualWorkPlace && person.usualWorkPlace.geography
                ? person.usualWorkPlace.geography
                : visitedPlace.geography;
        if (_isBlank(geojson) && recursive === false) {
            // it means the usualWorkPlace is for another person
            const matchingVisitedPlaceAndPerson = getVisitedPlaceAndPersonInHouseholdById(
                visitedPlace._uuid,
                null,
                interview
            );
            if (matchingVisitedPlaceAndPerson) {
                return getGeography(visitedPlace, matchingVisitedPlaceAndPerson.person, interview, true);
            } else {
                return null;
            }
        }
    } else if (visitedPlace.activity === 'schoolUsual') {
        geojson =
            person.usualSchoolPlace && person.usualSchoolPlace.geography
                ? person.usualSchoolPlace.geography
                : visitedPlace.geography;
        if (_isBlank(geojson) && recursive === false) {
            // it means the usualSchoolPlace is for another person
            const matchingVisitedPlaceAndPerson = getVisitedPlaceAndPersonInHouseholdById(
                visitedPlace._uuid,
                null,
                interview
            );
            if (matchingVisitedPlaceAndPerson) {
                return getGeography(visitedPlace, matchingVisitedPlaceAndPerson.person, interview, true);
            } else {
                return null;
            }
        }
    } else {
        geojson = visitedPlace.geography;
    }
    return geojson ? _cloneDeep(geojson) : null;
};

const getOrigin = function (trip, visitedPlaces) {
    const originVisitedPlaceId = trip._originVisitedPlaceUuid;
    return visitedPlaces[originVisitedPlaceId];
};

const getDestination = function (trip, visitedPlaces) {
    const destinationVisitedPlaceId = trip._destinationVisitedPlaceUuid;
    return visitedPlaces[destinationVisitedPlaceId];
};

const getOriginGeography = function (trip, visitedPlaces, person, interview, recursive = false) {
    const origin = getOrigin(trip, visitedPlaces);
    return getGeography(origin, person, interview, recursive);
};

const getDestinationGeography = function (trip, visitedPlaces, person, interview, recursive = false) {
    const destination = getDestination(trip, visitedPlaces);
    return getGeography(destination, person, interview, recursive);
};

const homeSectionComplete = function (interview) {
    const household: any = surveyHelper.getResponse(interview, 'household');
    const homeGeometry = surveyHelper.getResponse(interview, 'home.geography.geometry.coordinates');
    return !(
        _isBlank(household) ||
        _isBlank(household.size) ||
        _isBlank(household.carNumber) ||
        _isBlank(homeGeometry)
    );
};

const householdMembersSectionComplete = function (interview) {
    if (!homeSectionComplete(interview)) {
        return false;
    }
    const household: any = surveyHelper.getResponse(interview, 'household');
    if (household.size !== countPersons(interview)) {
        return false;
    }
    const persons: any = getPersons(interview);
    for (const personId in persons) {
        const person = persons[personId];
        if (!basicInfoForPersonComplete(person, household.size)) {
            return false;
        }
    }
    return true;
};

const basicInfoForPersonComplete = function (person, householdSize) {
    return !(
        _isBlank(person) ||
        !hasAge(person) ||
        (_isBlank(person.gender) && ageCompare(person, 5) >= 0) ||
        (householdSize > 1 && _isBlank(person.nickname)) ||
        (_isBlank(person.drivingLicenseOwner) && ageCompare(person, 16) >= 0)
    );
};

const profileInfoForPersonComplete = function (person, interview) {
    // _completedSections.profile. ==? suite aux recommendations de Kaligrafy et tahini on enleve le references a cette fonction
    if (_isBlank(person) || !hasAge(person)) {
        return false;
    }
    if (ageCompare(person, 5) < 0) {
        return true;
    }
    const profileSectionCompletedForPerson = surveyHelper.getResponse(
        interview,
        `household.persons.${person._uuid}._completedSections.profile`
    );
    return profileSectionCompletedForPerson || (!isWorker(person) && !isStudent(person));
};

const tripsIntroForPersonComplete = function (person, interview) {
    if (person && hasAge(person) && ageCompare(person, 5) < 0) {
        return true;
    }
    if (!_isBlank(person.shortTripSectionDidTripOnTripsDate)) {
        return true;
    }
    return surveyHelper.getResponse(interview, `household.persons.${person._uuid}._completedSections.tripsIntro`);
};

const visitedPlacesForPersonComplete = function (person, interview) {
    if (person && hasAge(person) && ageCompare(person, 5) < 0) {
        return true;
    }
    if (!_isBlank(person.personDidTrips) && person.personDidTrips !== 'yes' && person.personDidTrips !== true) {
        return true;
    }
    const visitedPlacesArray = getVisitedPlaces(person, null, true);
    const nextVisitedPlaceId = selectNextVisitedPlaceId(visitedPlacesArray, person, interview);
    return visitedPlacesArray.length >= 2 && !nextVisitedPlaceId;
};

// trips must be an array
const selectNextTripId = (person, trips): string | null => {
    const visitedPlaces = person ? person.visitedPlaces || {} : {};
    for (let i = 0, count = trips.length; i < count; i++) {
        const trip = trips[i];
        const origin = visitedPlaces[trip._originVisitedPlaceUuid];

        // ignore on the road/leisure stroll second trip:
        if (origin && ['workOnTheRoad', 'leisureStroll'].includes(origin.activity)) {
            continue;
        }
        if (_isBlank(trip.segments) || isEmpty(trip.segments)) {
            return trip._uuid;
        } else if (trip.segments) {
            for (const segmentUuid in trip.segments) {
                const segment = trip.segments[segmentUuid];
                if (_isBlank(segment) || _isBlank(segment.mode)) {
                    return trip._uuid;
                }
            }
        }
    }
    return null;
};

const tripsForPersonComplete = function (person, interview) {
    if (person && hasAge(person) && ageCompare(person, 5) < 0) {
        return true;
    }
    if (!_isBlank(person.personDidTrips) && person.personDidTrips !== 'yes' && person.personDidTrips !== true) {
        return true;
    }
    // short trip section:
    if (!_isBlank(person.shortTripSectionDidTripOnTripsDate)) {
        return true;
    }
    const trips = getTrips(person, true);
    const nextTripId = selectNextTripId(person, trips);
    return trips.length >= 1 && !nextTripId;
};

const travelBehaviorForPersonComplete = function (person, interview) {
    if ((person && hasAge(person) && ageCompare(person, 5) < 0) || (!isWorker(person) && !isStudent(person))) {
        return true;
    }
    return (
        surveyHelper.getResponse(
            interview,
            `household.persons.${person._uuid}._completedSections.travelBehavior`
        ) === true
    );
};

const allPersonsProfilesComplete = function (interview) {
    if (!householdMembersSectionComplete(interview)) {
        return false;
    }
    return true;
};

const allPersonsTripsAndTravelBehaviorComplete = function (interview) {
    if (!householdMembersSectionComplete(interview)) {
        return false;
    }
    const isSinglePersonInterview =
        config.singlePersonInterview || surveyHelper.getResponse(interview, 'accessCode', null) === null;
    if (isSinglePersonInterview) {
        const person = getPerson(interview);
        return travelBehaviorForPersonComplete(person, interview) && tripsForPersonComplete(person, interview);
    }
    const persons: any = getPersons(interview, false);
    for (const personId in persons) {
        const person = persons[personId];

        if (!travelBehaviorForPersonComplete(person, interview) || !tripsForPersonComplete(person, interview)) {
            return false;
        }
    }
    return true;
};

const getDurationWithHourFromSeconds = function (durationSeconds) {
    if (_isBlank(durationSeconds) || isNaN(Number(durationSeconds))) {
        return {
            hour: null,
            minute: null
        };
    }
    const hour = Math.floor(durationSeconds / 3600);
    const minute = Math.round(durationSeconds / 60) - hour * 60;
    return {
        hour,
        minute
    };
};

/* TODO: find better way to test for completion, maybe set incomplete when starting
a section and reset it to complete after validation is complete
(button is clicked and can change section) */

const getDurationSec = function (trip, visitedPlaces) {
    const origin = visitedPlaces[trip._originVisitedPlaceUuid];
    const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
    if (_isBlank(origin) || _isBlank(destination)) {
        return null;
    }
    return destination.arrivalTime - origin.departureTime;
};

const getBirdDistanceMeters = function (trip, visitedPlaces, person, interview) {
    const origin = visitedPlaces[trip._originVisitedPlaceUuid];
    const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
    if (_isBlank(origin) || _isBlank(destination)) {
        return null;
    }
    const originGeography = getGeography(origin, person, interview);
    const destinationGeography = getGeography(destination, person, interview);
    if (
        _isBlank(originGeography) ||
        _isBlank(destinationGeography) ||
        !isFeature(originGeography) ||
        !isFeature(destinationGeography)
    ) {
        return null;
    }
    return turfDistance(originGeography.geometry, destinationGeography.geometry, {
        units: 'meters'
    });
};

const isSelfDeclared = function (person, interview): boolean {
    // added to Person class √
    const persons: any = getPersons(interview, true);
    const selfRespondingPersons = persons.filter((p) => hasAge(p) && ageCompare(p, selfResponseAge) >= 0);
    return (
        (selfRespondingPersons.length === 1 && person._uuid === selfRespondingPersons[0]._uuid) ||
        (!_isBlank(person.whoWillAnswerForThisPerson) ? person.whoWillAnswerForThisPerson === person._uuid : false)
    );
};

const personMayHaveDisability = (person): boolean =>
    person && (person.hasDisability === 'yes' || person.hasDisability === 'preferNotToAnswer');

const householdHasDisabledPersons = (interview): boolean =>
    _booleish(interview.responses.household?.atLeastOnePersonWithDisability || false);

const getChoicesFromGeojsonBy = (
    features: GeoJSON.Feature<GeoJSON.Point, { shortname: string; internalId: string | number; name: string }>[],
    point: GeoJSON.Feature<GeoJSON.Point> | null | undefined
): {
    value: string;
    internalId: string | number;
    label: { fr: string; en: string };
    distance?: number;
    conditional?: any;
}[] => {
    const choices = features.map((station) => {
        return {
            value: station.properties.shortname,
            internalId: station.properties.internalId,
            label: {
                fr: station.properties.name,
                en: station.properties.name
            },
            distance: !_isBlank(point) ? turfDistance(point, station.geometry.coordinates) : 0
        };
    });
    if (!_isBlank(point)) {
        choices.sort((stationA, stationB) => {
            return stationA.distance - stationB.distance;
        });
    }
    return choices;
};

/**
 * Return the address as a one line string, including all the parts
 * @param obj The object from which to extract address parts
 */
const getAddressOneLine = (obj, includeRegion = false, includeCountry = false, includePostalCode = false): string => {
    if (!obj) {
        return '';
    }
    const civicNumberAndStreetName = obj.address as string | undefined;
    const city = obj.city as string | undefined;
    const region = obj.region as string | undefined;
    const country = obj.country as string | undefined;
    const postalCode = obj.postalCode as string | undefined;
    return !_isBlank(civicNumberAndStreetName) && !_isBlank(city)
        ? `${civicNumberAndStreetName}, ${city[0].toUpperCase() + city.substring(1)}${
            includeRegion && region ? `, ${region} ` : ''
        }${includeCountry && country ? `, ${country}` : ''}${
            includePostalCode && postalCode ? ' ' + postalCode.toUpperCase() : ''
        }`
        : '';
};

/**
 * Retunrs visited place name string. If no name will return Place X or Lieu X
 * @param visitedPlace
 * @param t
 * @param interview
 * @returns visitedPlace name
 */
const getVisitedPlaceName = function (visitedPlace, t, interview) {
    let name = `${t('survey:placeGeneric')} ${visitedPlace._sequence}`;
    //if place is a shortcut we change cisitedPlace for original place
    if (visitedPlace.alreadyVisitedBySelfOrAnotherHouseholdMember && !_isBlank(visitedPlace.shortcut)) {
        visitedPlace = surveyHelper.getResponse(interview, visitedPlace.shortcut, null, null);
    }

    if (visitedPlace && visitedPlace.activityCategory === 'home') {
        name = t(`survey:visitedPlace:activityCategories:${visitedPlace.activityCategory}`);
    } else if (visitedPlace && !_isBlank(visitedPlace.name)) {
        name = visitedPlace.name;
    }

    return name;
};

/**
 * Compare the age of a person with a requested age. This will look at the age
 * field, if set, or see if the desired age is within the ageGroup
 *
 * @param person The person for which to compare the age
 * @param age The age to compare to
 * @return -1 if the person age or age group is lower than the value, 0 if the
 * age is equal or the ageGroup includes the age, 1 if the person age or
 * ageGroup is higher than requested age, or null if the age and ageGroup are
 * unavailable
 */
const ageCompareWithNull = (person, age: number): number | null => {
    const personAge = person.age;
    if (typeof personAge === 'number') {
        return personAge < age ? -1 : personAge === age ? 0 : 1;
    }
    const ageGroup = person.ageGroup;
    if (typeof ageGroup !== 'string') {
        return null;
    }
    const separatorDashPos = ageGroup.indexOf('-');
    if (separatorDashPos !== -1) {
        const minAge = parseInt(ageGroup.substring(0, separatorDashPos));
        const maxAge = parseInt(ageGroup.substring(separatorDashPos + 1));
        if (!Number.isNaN(minAge) && !Number.isNaN(maxAge)) {
            return maxAge < age ? -1 : minAge > age ? 1 : 0;
        }
        return null;
    }
    const separatorPlusPos = ageGroup.indexOf('+');
    if (separatorPlusPos !== -1) {
        const minMaxAge = parseInt(ageGroup.substring(0, separatorPlusPos));
        if (!Number.isNaN(minMaxAge)) {
            return minMaxAge < age ? -1 : minMaxAge === age ? 0 : 1;
        }
    }
    return null;
};

/**
 * Compare the age of a person with a requested age. This will look at the age
 * field, if set, or see if the desired age is within the ageGroup. Make sure to
 * call hasAge(person) before, otherwise this function will throw an error if
 * the age is not set
 *
 * @param person The person for which to compare the age
 * @param age The age to compare to
 * @return -1 if the person age or age group is lower than the value, 0 if the
 * age is equal or the ageGroup includes the age, 1 if the person age or
 * ageGroup is higher than requested age, or throw an error if the age and
 * ageGroup are invalid or not present
 */
const ageCompare = (person, age: number): number => {
    const ageCompare = ageCompareWithNull(person, age);
    if (ageCompare === null) {
        throw new Error('Invalid age or ageGroup');
    }
    return ageCompare;
};

/**
 * Return whether the person has a valid age or age group
 * @param person The person
 * @returns true if the age or ageGroup is valid and higher than 0, false otherwise
 */
const hasAge = (person): boolean => {
    const compareAgeWith0 = ageCompareWithNull(person, 0);
    return !_isBlank(compareAgeWith0) && compareAgeWith0 >= 0;
};

const getAgeAsString = (person): string =>
    typeof person.age === 'number' ? String(person.age) : typeof person.ageGroup === 'string' ? person.ageGroup : '-';

const isStudentFromEnrolled = (person) => {
    const schoolType = person.schoolType;
    return !_isBlank(schoolType) && isSchoolEnrolledTrueValues.includes(schoolType);
};

const tripCrossesLine = function (person, trip, interview, lineToCross: GeoJSON.Feature<GeoJSON.LineString>) {
    const visitedPlaces = getVisitedPlaces(person, null, false);
    const origin = visitedPlaces[trip._originVisitedPlaceUuid];
    const originGeometry = origin ? getGeography(origin, person, interview) : null;
    const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
    const destinationGeometry = destination ? getGeography(destination, person, interview) : null;
    if (!_isBlank(originGeometry) && !_isBlank(destinationGeometry)) {
        console.log(
            'lines',
            JSON.stringify(lineToCross),
            JSON.stringify({
                type: 'LineString',
                coordinates: [originGeometry.geometry.coordinates, destinationGeometry.geometry.coordinates]
            }),
            turfLineIntersects(lineToCross, {
                type: 'LineString',
                coordinates: [originGeometry.geometry.coordinates, destinationGeometry.geometry.coordinates]
            })
        );
        return (
            turfLineIntersects(lineToCross, {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [originGeometry.geometry.coordinates, destinationGeometry.geometry.coordinates]
                }
            }).features.length > 0
        );
    }
    return false;
};

const shouldAskParentConsent = (person) => {
    return hasAge(person) && ageCompare(person, 5) >= 0 && ageCompare(person, 13) <= 0;
};

const shouldDisplayTripJunction = (previousSegment, currentSegment, activity) => {
    //tripJunction needed when changing from private to public modes (private modes: car driver, car passenger, moto, taxi - walking is excluded )
    if (
        !_isBlank(previousSegment) &&
        (['carDriver', 'carPassenger', 'bicycle', 'taxi', 'train', 'paratransit'].includes(previousSegment.modePre) ||
            [
                'taxi',
                'ferryWithCar',
                'motorcycle',
                'bicycle',
                'bicycleElectric',
                'scooterElectric',
                'plane',
                'other'
            ].includes(previousSegment.mode)) &&
        (currentSegment.modePre === 'transit' ||
            ['ferryNoCar', 'ferryNoCar', 'train', 'intercityBus', 'taxi'].includes(currentSegment.mode))
    ) {
        return activity !== 'workOnTheRoad';
    }
    if (
        !_isBlank(previousSegment) &&
        (['carDriver', 'carPassenger', 'bicycle', 'taxi', 'train', 'paratransit'].includes(currentSegment.modePre) ||
            [
                'taxi',
                'ferryWithCar',
                'motorcycle',
                'bicycle',
                'bicycleElectric',
                'scooterElectric',
                'plane',
                'other'
            ].includes(currentSegment.mode)) &&
        (previousSegment.modePre === 'transit' ||
            ['transitBus', 'ferryNoCar', 'train', 'intercityBus', 'taxi'].includes(previousSegment.mode))
    ) {
        return activity !== 'workOnTheRoad';
    }
    return false;
};

/**
 * Replace visited places that are shortcuts to the given location by the data
 * of this location. Only the first shortcut will be replaced, the others will
 * use the first place as new shortcut
 *
 * FIXME Function copied from od_mtl_2023, as the one in evolution-common uses
 * the new structure with journeys and it is not supported in this survey
 *
 * @param interview The interview
 * @param visitedPlacesPath The path of the visited place to replace
 */
export const replaceVisitedPlaceShortcuts = (
    interview: UserInterviewAttributes,
    shortcutTo: string
): { updatedValuesByPath: { [path: string]: any }; unsetPaths: string[] } | undefined => {
    const originalVisitedPlace = surveyHelper.getResponse(interview, shortcutTo, {}) as VisitedPlace;

    // Find shortcuts to this place
    const placesWithShortcut = (getPersons(interview, true) as any[]).flatMap((person) =>
        getVisitedPlaces(person, null, true)
            .filter((visitedPlace) => (visitedPlace as any).shortcut && (visitedPlace as any).shortcut === shortcutTo)
            .map((visitedPlace) => ({ person, visitedPlace }))
    );

    if (placesWithShortcut.length === 0) {
        return undefined;
    }
    const updatedValuesByPath: { [path: string]: any } = {};
    const unsetPaths: string[] = [];

    // Replace first place's name and geography with original and remove shortcut if necessary. The original place can itself be a shortcut
    const firstVisitedPlace = placesWithShortcut[0];
    const firstPlacePath = `household.persons.${firstVisitedPlace.person._uuid}.visitedPlaces.${firstVisitedPlace.visitedPlace._uuid}`;

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
                    `responses.household.persons.${place.person._uuid}.visitedPlaces.${place.visitedPlace._uuid}.shortcut`
                ] = firstPlacePath)
        );

    return { updatedValuesByPath, unsetPaths };
};

export default {
    selfResponseAge,
    isWorker,
    isFullTimeWorker,
    isPartTimeWorker,
    isFullTimeStudent,
    isPartTimeStudent,
    isStudent,
    getPerson,
    getPersons,
    countPersons,
    getShortcutVisitedPlace,
    getVisitedPlaces,
    getActiveVisitedPlaceId,
    getActiveVisitedPlace,
    getPreviousVisitedPlace,
    getNextVisitedPlace,
    getHouseholdVisitedAndUsualPlacesArrayAndByPersonId,
    getSegments,
    getTrips,
    getModeCategory,
    getGeography,
    getOrigin,
    getDestination,
    getOriginGeography,
    getDestinationGeography,
    getDurationSec,
    getBirdDistanceMeters,
    getDurationWithHourFromSeconds,
    getVisitedPlaceAndPersonInHouseholdById,
    homeSectionComplete,
    householdMembersSectionComplete,
    basicInfoForPersonComplete,
    //profileInfoForPersonComplete,
    tripsIntroForPersonComplete,
    visitedPlacesForPersonComplete,
    tripsForPersonComplete,
    travelBehaviorForPersonComplete,
    allPersonsTripsAndTravelBehaviorComplete,
    allPersonsProfilesComplete,
    selectNextVisitedPlaceId,
    getShortcutVisitedPlacePerson,
    getShortcutVisitedPlaceName,
    getVisitedPlaceName,
    ageCompare,
    hasAge,
    getAgeAsString,
    tripCrossesLine,
    isSelfDeclared,
    personMayHaveDisability,
    householdHasDisabledPersons,
    shouldAskParentConsent,
    getChoicesFromGeojsonBy,
    getAddressOneLine,
    isStudentFromEnrolled,
    shouldDisplayTripJunction,
    selectNextTripId,

    //TODO: add attributePrefix for custom named visitedPlaces:
    mergeVisitedPlace: function (visitedPlacePath, interview, startRemoveGroupedObjects, startUpdateInterview) {
        // this will remove this visitedPlace and create a new trip between previous and next visited places with merged segments (segments of previous trips will be added together)
        const visitedPlacePaths = [visitedPlacePath];

        startRemoveGroupedObjects(visitedPlacePaths, (interview) => {
            const person: any = getPerson(interview);
            let tripsUpdatesValueByPath = {};
            let tripsUpdatesUnsetPaths = [];
            const tripsPath = `household.persons.${person._uuid}.trips`;
            const visitedPlaces = getVisitedPlaces(person);
            const trips = getTrips(person);
            let tripToMergeFound = false;

            for (let tripSequence = 1, count = visitedPlaces.length - 1; tripSequence <= count; tripSequence++) {
                const origin = visitedPlaces[tripSequence - 1];
                const destination = visitedPlaces[tripSequence];
                const trip = trips[tripSequence - 1];
                if (_isBlank(trip)) {
                    // create trip if not exists for this sequence:
                    const addValuesByPath = surveyHelper.addGroupedObjects(interview, 1, tripSequence, tripsPath, [
                        {
                            _originVisitedPlaceUuid: origin._uuid,
                            _destinationVisitedPlaceUuid: destination._uuid
                        }
                    ]);
                    tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, addValuesByPath);
                } else if (
                    trip._originVisitedPlaceUuid !== origin._uuid ||
                    trip._destinationVisitedPlaceUuid !== destination._uuid
                ) {
                    // update origin and destination if wrong for this sequence:
                    tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}._originVisitedPlaceUuid`] =
                        origin._uuid;
                    tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}._destinationVisitedPlaceUuid`] =
                        destination._uuid;
                    // also merge existing segments:
                    const nextTrip = trips[tripSequence];
                    const tripSegmentsArray = getSegments(trip, true);
                    const nextTripSegmentsArray = getSegments(nextTrip, true);
                    let newSegments = [];
                    const newSegmentsById = {};
                    if (tripToMergeFound === false) {
                        newSegments = tripSegmentsArray.concat(nextTripSegmentsArray);
                        tripToMergeFound = true;
                    } else {
                        newSegments = nextTripSegmentsArray;
                    }

                    let segmentSequence = 1;
                    for (let i = 0, count = newSegments.length; i < count; i++) {
                        const segment = newSegments[i];
                        segment._sequence = segmentSequence;
                        newSegmentsById[segment._uuid] = segment;
                        segmentSequence++;
                    }

                    tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}.segments`] = newSegmentsById;
                }
            }
            if (trips.length >= visitedPlaces.length) {
                // remove superfluous trips:
                const tripsPathsToRemove = [];
                for (
                    let tripSequence = visitedPlaces.length, count = trips.length;
                    tripSequence <= count;
                    tripSequence++
                ) {
                    const trip = trips[tripSequence - 1];
                    tripsPathsToRemove.push(`${tripsPath}.${trip._uuid}`);
                }
                if (tripsPathsToRemove.length > 0) {
                    const [updateValuePaths, unsetValuePaths] = surveyHelper.removeGroupedObjects(
                        interview,
                        tripsPathsToRemove
                    );
                    tripsUpdatesUnsetPaths = tripsUpdatesUnsetPaths.concat(unsetValuePaths);
                    tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, updateValuePaths);
                }
            }
            // update needed origin and destination visited places uuids:
            if (!isEmpty(tripsUpdatesValueByPath) || !isEmpty(tripsUpdatesUnsetPaths)) {
                startUpdateInterview('visitedPlaces', tripsUpdatesValueByPath, tripsUpdatesUnsetPaths, null);
            }
        });
    },

    getDrivers: function (interview, asArray = false): { [personId: string]: unknown } | unknown[] {
        const persons: any = getPersons(interview, false);
        const drivers = {};
        for (const personId in persons) {
            const person = persons[personId];
            if (person.drivingLicenseOwner === 'yes') {
                drivers[personId] = person;
            }
        }
        return asArray ? Object.values(drivers) : drivers;
    },

    getActiveTripId: function (interview) {
        return surveyHelper.getResponse(interview, '_activeTripId');
    },

    getActiveTrip: function (interview, person = null) {
        person = person || getPerson(interview);
        const trips: any = getTrips(person, false);
        const activeTripId: any = surveyHelper.getResponse(interview, '_activeTripId', null);
        return activeTripId ? trips[activeTripId] : null;
    },

    getPreviousTrip: function (tripId, orderedTripsArray) {
        for (let i = 1, count = orderedTripsArray.length; i < count; i++) {
            if (orderedTripsArray[i]._uuid === tripId) {
                return orderedTripsArray[i - 1];
            }
        }
        return null; // provided trip was the first
    },

    getNextTrip: function (tripId, orderedTripsArray) {
        for (let i = 0, count = orderedTripsArray.length - 1; i < count; i++) {
            if (orderedTripsArray[i]._uuid === tripId) {
                return orderedTripsArray[i + 1];
            }
        }
        return null; // provided trip was the last
    },

    //TODO: add attributePrefix for custom named visitedPlaces:
    deleteVisitedPlace: function (visitedPlacePath, interview, startRemoveGroupedObjects, startUpdateInterview) {
        const person: any = getPerson(interview);
        const visitedPlaces = getVisitedPlaces(person, null, true);
        const visitedPlacePaths = [visitedPlacePath];
        const visitedPlace: any = surveyHelper.getResponse(interview, visitedPlacePath, null);
        const previousVisitedPlace = getPreviousVisitedPlace(visitedPlace._uuid, visitedPlaces);
        const nextVisitedPlace = getNextVisitedPlace(visitedPlace._uuid, visitedPlaces);
        if (
            nextVisitedPlace &&
            previousVisitedPlace &&
            ((nextVisitedPlace.activity === 'home' && previousVisitedPlace.activity === 'home') ||
                (nextVisitedPlace.activity === 'workUsual' && previousVisitedPlace.activity === 'workUsual') ||
                (nextVisitedPlace.activity === 'schoolUsual' && previousVisitedPlace.activity === 'schoolUsual') ||
                (nextVisitedPlace.activity === 'workOnTheRoad' && previousVisitedPlace.activity === 'workOnTheRoad') ||
                (nextVisitedPlace.activity === 'leisureStroll' && previousVisitedPlace.activity === 'leisureStroll'))
        ) {
            const nextVisitedPlacePath = `household.persons.${person._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`;
            visitedPlacePaths.push(nextVisitedPlacePath);
        }
        // Before deleting, replace the location shortcuts by original data, the will be updated after group removal
        const updatedValues = visitedPlacePaths
            .map((placePath) => replaceVisitedPlaceShortcuts(interview, placePath))
            .filter((updatedPaths) => updatedPaths !== undefined)
            .reduce(
                (previous: any, current: any) => ({
                    updatedValuesByPath: Object.assign(previous.updatedValuesByPath, current.updatedValuesByPath),
                    unsetPaths: previous.unsetPaths.push(...current.unsetPaths)
                }),
                { updatedValuesByPath: {}, unsetPaths: [] }
            );

        startRemoveGroupedObjects(visitedPlacePaths, (interview) => {
            const person = getPerson(interview);
            const visitedPlaces = getVisitedPlaces(person);
            const updateValuesByPath = updateVisitedPlaces(person, visitedPlaces, interview, null, true);
            startUpdateInterview(
                'visitedPlaces',
                Object.assign(updatedValues.updatedValuesByPath, updateValuesByPath),
                updatedValues.unsetPaths
            );
        });
    },

    /*deleteVisitedPlace: function (visitedPlacePath, interview, startRemoveGroupedObjects, startUpdateInterview, attributePrefix = null) {
        const visitedPlacePaths = [visitedPlacePath];
        startRemoveGroupedObjects(visitedPlacePaths, (function (interview) {
            const person = getPerson(interview);
            const visitedPlaces = getVisitedPlaces(person, null, attributePrefix);
            const updateValuesByPath = updateVisitedPlaces(person, visitedPlaces, interview, attributePrefix, true);
            startUpdateInterview(`${attributePrefix ? attributePrefix + 'VisitedPlaces' : 'visitedPlaces'}`, updateValuesByPath);
        }).bind(this));
    },*/

    //TODO: add attributePrefix for custom named visitedPlaces:
    getFirstVisitedPlace: function (orderedVisitedPlacesArray) {
        if (!Array.isArray(orderedVisitedPlacesArray) || orderedVisitedPlacesArray.length === 0) {
            return null;
        }
        return orderedVisitedPlacesArray[0];
    },

    getNVisitedPlace: function (orderedVisitedPlacesArray, n) {
        if (!Array.isArray(orderedVisitedPlacesArray) || orderedVisitedPlacesArray.length === 0) {
            return null;
        }
        return orderedVisitedPlacesArray[n - 1];
    },

    //TODO: add attributePrefix for custom named visitedPlaces:
    getLastVisitedPlace: function (orderedVisitedPlacesArray) {
        if (!Array.isArray(orderedVisitedPlacesArray) || orderedVisitedPlacesArray.length === 0) {
            return null;
        }
        return orderedVisitedPlacesArray[orderedVisitedPlacesArray.length - 1];
    },

    //TODO: add attributePrefix for custom named visitedPlaces:
    getFirstTrip: function (orderedTripsArray) {
        if (!Array.isArray(orderedTripsArray) || orderedTripsArray.length === 0) {
            return null;
        }
        return orderedTripsArray[0];
    },

    //TODO: add attributePrefix for custom named visitedPlaces:
    getLastTrip: function (orderedTripsArray) {
        if (!Array.isArray(orderedTripsArray) || orderedTripsArray.length === 0) {
            return null;
        }
        return orderedTripsArray[orderedTripsArray.length - 1];
    },

    getTripTransferCategory: function (trip) {
        if (trip) {
            const segments = getSegments(trip, true);
            let lastModeCategory = null;
            let lastMode = null;
            for (let i = 0, count = segments.length; i < count; i++) {
                const segment = segments[i];
                const mode = segment.mode;
                const modeCategory = mode ? getModeCategory(mode) : null;
                if (lastModeCategory) {
                    if (lastModeCategory === 'public' && modeCategory === 'private') {
                        return {
                            category: 'public_private',
                            previousMode: lastMode,
                            nextMode: mode
                        };
                    } else if (lastModeCategory === 'private' && modeCategory === 'public') {
                        return {
                            category: 'private_public',
                            previousMode: lastMode,
                            nextMode: mode
                        };
                    }
                }
                lastMode = mode;
                lastModeCategory = modeCategory;
            }
        }
        return null;
    },

    getGenderString: function (person, femaleStr, maleStr, customStr, defaultStr) {
        if (_isBlank(person) || _isBlank(person.gender)) {
            return defaultStr;
        } else if (person.gender === 'female') {
            return femaleStr;
        } else if (person.gender === 'male') {
            return maleStr;
        } else if (person.gender === 'custom') {
            return customStr;
        }
        return defaultStr;
    },

    //TODO: add attributePrefix for custom named visitedPlaces:

    getStartAt: function (trip, visitedPlaces) {
        const origin = visitedPlaces[trip._originVisitedPlaceUuid];
        return origin ? origin.departureTime : null;
    },

    getEndAt: function (trip, visitedPlaces) {
        const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
        return destination ? destination.arrivalTime : null;
    },

    getBirdSpeedMps: function (trip, visitedPlaces, person, interview) {
        const birdDistance = getBirdDistanceMeters(trip, visitedPlaces, person, interview);
        const duration = getDurationSec(trip, visitedPlaces);
        if (!_isBlank(birdDistance) && !_isBlank(duration) && duration > 0 && birdDistance >= 0) {
            return birdDistance / duration;
        } else {
            return null;
        }
    },

    validateInterview(
        validations,
        language = 'en',
        user,
        interview,
        responses,
        household,
        home,
        personsById,
        personsArray
    ) {
        const errors = [];
        const warnings = [];
        const validationResults = [];
        for (const validationId in validations) {
            try {
                const validation = validations[validationId];
                if (!validation.isValid(user, interview, responses, household, home, personsById, personsArray)) {
                    if (validation.isWarning) {
                        warnings.push(validationId);
                    } else {
                        errors.push(validationId);
                    }
                    validationResults.push({
                        id: validationId,
                        isWarning: validation.isWarning || false,
                        code: validation.errorCode,
                        messages: validation.errorMessage
                    });
                }
            } catch (error) {
                console.log(`Exception dans la validation de l'entrevue ${validationId}: `, error);
            }
        }
        return {
            errors,
            warnings,
            audits: validationResults
        };
    },

    validateHousehold(
        validations,
        language = 'en',
        user,
        interview,
        responses,
        household,
        home,
        personsById,
        personsArray
    ) {
        const errors = [];
        const warnings = [];
        const validationResults = [];
        for (const validationId in validations) {
            try {
                const validation = validations[validationId];
                if (!validation.isValid(user, interview, responses, household, home, personsById, personsArray)) {
                    if (validation.isWarning) {
                        warnings.push(validationId);
                    } else {
                        errors.push(validationId);
                    }
                    validationResults.push({
                        id: validationId,
                        isWarning: validation.isWarning || false,
                        code: validation.errorCode,
                        messages: validation.errorMessage
                    });
                }
            } catch (error) {
                console.log(`Exception dans la validation du ménage ${validationId}: `, error);
            }
        }
        return {
            errors,
            warnings,
            audits: validationResults
        };
    },

    validatePerson(
        validations,
        language = 'en',
        user,
        interview,
        responses,
        household,
        home,
        personsById,
        personsArray,
        person
    ) {
        const errors = [];
        const warnings = [];
        const validationResults = [];
        for (const validationId in validations) {
            try {
                const validation = validations[validationId];
                if (
                    !validation.isValid(user, interview, responses, household, home, personsById, personsArray, person)
                ) {
                    if (validation.isWarning) {
                        warnings.push(validationId);
                    } else {
                        errors.push(validationId);
                    }
                    validationResults.push({
                        id: validationId,
                        isWarning: validation.isWarning || false,
                        code: validation.errorCode,
                        messages: validation.errorMessage
                    });
                }
            } catch (error) {
                console.log(`Exception dans la validation d'une personne ${validationId}: `, error);
            }
        }
        return {
            errors,
            warnings,
            audits: validationResults
        };
    },

    validateVisitedPlace(
        validations,
        language = 'en',
        user,
        interview,
        responses,
        household,
        home,
        personsById,
        personsArray,
        person,
        visitedPlacesById,
        visitedPlacesArray,
        visitedPlace
    ) {
        const errors = [];
        const warnings = [];
        const validationResults = [];
        for (const validationId in validations) {
            try {
                const validation = validations[validationId];
                if (
                    !validation.isValid(
                        user,
                        interview,
                        responses,
                        household,
                        home,
                        personsById,
                        personsArray,
                        person,
                        visitedPlacesById,
                        visitedPlacesArray,
                        visitedPlace
                    )
                ) {
                    if (validation.isWarning) {
                        warnings.push(validationId);
                    } else {
                        errors.push(validationId);
                    }
                    validationResults.push({
                        id: validationId,
                        isWarning: validation.isWarning || false,
                        code: validation.errorCode,
                        messages: validation.errorMessage
                    });
                }
            } catch (error) {
                console.log(`Exception dans la validation d'un lieu ${validationId}: `, error);
            }
        }
        return {
            errors,
            warnings,
            audits: validationResults
        };
    },

    validateTrip(
        validations,
        language = 'en',
        user,
        interview,
        responses,
        household,
        home,
        personsById,
        personsArray,
        person,
        visitedPlacesById,
        visitedPlacesArray,
        tripsById,
        tripsArray,
        trip
    ) {
        const errors = [];
        const warnings = [];
        const validationResults = [];
        for (const validationId in validations) {
            try {
                const validation = validations[validationId];
                if (
                    !validation.isValid(
                        user,
                        interview,
                        responses,
                        household,
                        home,
                        personsById,
                        personsArray,
                        person,
                        visitedPlacesById,
                        visitedPlacesArray,
                        tripsById,
                        tripsArray,
                        trip
                    )
                ) {
                    if (validation.isWarning) {
                        warnings.push(validationId);
                    } else {
                        errors.push(validationId);
                    }
                    validationResults.push({
                        id: validationId,
                        isWarning: validation.isWarning || false,
                        code: validation.errorCode,
                        messages: validation.errorMessage
                    });
                }
            } catch (error) {
                console.log(`Exception dans la validation d'un trajet ${validationId}: `, error);
            }
        }
        return {
            errors,
            warnings,
            audits: validationResults
        };
    },

    validateSegment(
        validations,
        language = 'en',
        user,
        interview,
        responses,
        household,
        home,
        personsById,
        personsArray,
        person,
        visitedPlacesById,
        visitedPlacesArray,
        tripsById,
        tripsArray,
        trip,
        segmentsById,
        segmentsArray,
        segment
    ) {
        const errors = [];
        const warnings = [];
        const validationResults = [];
        for (const validationId in validations) {
            try {
                const validation = validations[validationId];
                if (
                    !validation.isValid(
                        user,
                        interview,
                        responses,
                        household,
                        home,
                        personsById,
                        personsArray,
                        person,
                        visitedPlacesById,
                        visitedPlacesArray,
                        tripsById,
                        tripsArray,
                        trip,
                        segmentsById,
                        segmentsArray,
                        segment
                    )
                ) {
                    if (validation.isWarning) {
                        warnings.push(validationId);
                    } else {
                        errors.push(validationId);
                    }
                    validationResults.push({
                        id: validationId,
                        isWarning: validation.isWarning || false,
                        code: validation.errorCode,
                        messages: validation.errorMessage
                    });
                }
            } catch (error) {
                console.log(`Exception dans la validation d'un segment ${validationId}: `, error);
            }
        }
        return {
            errors,
            warnings,
            audits: validationResults
        };
    },

    generateSectionAction(interview, section, action) {
        let sectionsActions: any = surveyHelper.getResponse(interview, '_sections._actions', []);
        if (sectionsActions.length > 200) {
            // reset if too many actions (for test users mostly)
            sectionsActions = [
                {
                    section: '',
                    action: 'eraseOldActionTooMany',
                    ts: moment().unix()
                }
            ];
        }
        sectionsActions.push({
            section,
            action,
            ts: moment().unix()
        });
        return sectionsActions;
    },

    detectLanguageChanges(interview, language) {
        const languages: any = surveyHelper.getResponse(interview, '_languages', []);
        if (!(languages.length > 200)) {
            // ignore if too many languages (should not happen in real life!)
            if (languages[languages.length - 1] !== language) {
                languages.push(language);
            }
        }
        return languages;
    },

    carsharingMembersCountInHousehold(interview) {
        let count = 0;
        const persons: any = getPersons(interview);
        for (const personId in persons) {
            const person = persons[personId];
            if (person && person.carSharingMember === 'yes') {
                count++;
            }
        }
        return count;
    },

    bikesharingMembersCountInHousehold(interview) {
        let count = 0;
        const persons: any = getPersons(interview);
        for (const personId in persons) {
            const person = persons[personId];
            if (
                person &&
                (person.usedBixiBikesharingServicesInLast6Months === 'yes' ||
                    person.usedBixiBikesharingServicesInLast6Months === 'dontKnow')
            ) {
                count++;
            }
        }
        return count;
    },
    getInterviewablePersons(interview) {
        // deprecated, Household.getInterviewablePersons
        const persons: any = getPersons(interview, false);
        const interviewablePersons = [];
        for (const personId in persons) {
            const person = persons[personId];
            if (person && hasAge(person) && ageCompare(person, config.interviewableMinimumAge) >= 0) {
                interviewablePersons.push(person);
            }
        }
        return interviewablePersons;
    },

    // TODO Remove? Now that we don't ask the trip dates question anymore
    getPersonDidTripsForHouseholdTripsDate(interview, personId: string | null = null) {
        const householdTripsDate = surveyHelper.getResponse(interview, 'household.tripsDate', null);
        if (!householdTripsDate) {
            console.error('householdTripsDate is missing');
            return null;
        }

        const person: any = getPerson(interview, personId); // will use active person if personId is undefined
        if (!person) {
            console.error('could no find the person');
            return null;
        }
        if (!person.previousWeekDidTripsDays) {
            console.error('the person is missing previousWeekDidTripsDays array');
            return null;
        }
        if (!hasAge(person)) {
            console.error('the person is missing age');
            return null;
        }
        if (ageCompare(person, 5) < 0) {
            // too young for trips
            return null;
        }

        const personPreviousWeekDidTripsDays = person.previousWeekDidTripsDays || [];
        return (
            personPreviousWeekDidTripsDays.indexOf(householdTripsDate) !== -1 ||
            personPreviousWeekDidTripsDays.indexOf('everyday') !== -1
        );
    },

    isInterviewer: function (interview) {
        return Preferences.get('interviewMode', 'participant') === 'interviewer';
    },

    isTest: function (user, interview) {
        const userRoles = interview ? interview.userRoles || [] : [];
        return (
            userRoles.indexOf('test') !== -1 ||
            (user && (user.is_test === true || (user.email || '').endsWith('@test.test')))
        );
    },

    /**
     * Formats a trip duration as a presentable and localized string
     *
     * @param {number} startTime trip start time: number of seconds since midnight
     * @param {number} endTime trip end time: number of seconds since midnight
     * @param {string} language localization language: either 'fr' or 'en'.
     *
     * @return {string} the formatted trip duration. Ex: <span class="_pale _oblique">(déplacement de 2 heures 5 minutes)</span>
     */
    formatTripDuration: function (startTime, endTime, language) {
        if (_isBlank(startTime) || _isBlank(endTime)) {
            return '';
        }

        const travelTimeSeconds = startTime - endTime;
        const travelTimeHourAndMinute = getDurationWithHourFromSeconds(travelTimeSeconds);
        if (!_isBlank(travelTimeHourAndMinute)) {
            const hour = travelTimeHourAndMinute.hour;
            const minute = travelTimeHourAndMinute.minute;

            // TODO: Do this localization with the i18n system properly
            if (language === 'fr') {
                const travelTimeStr = travelTimeHourAndMinute
                    ? `${hour > 0 ? ` ${hour} heure${hour >= 2 ? 's' : ''}` : ''}${
                        hour === 0 && minute === 0 ? ' moins de 5 minutes' : minute > 0 ? ` ${minute} minutes` : ''
                    }`
                    : '';
                return `<br /><span class="_pale _oblique">(déplacement de${travelTimeStr})</span>`;
            } else {
                const travelTimeStr = travelTimeHourAndMinute
                    ? `${hour > 0 ? `${hour} h` : ''}${
                        hour === 0 && minute === 0
                            ? 'less than 5 min'
                            : minute > 0
                                ? `${hour > 0 ? ' ' : ''}${minute} min`
                                : ''
                    }`
                    : '';
                return `<br /><span class="_pale _oblique">(${travelTimeStr} trip)</span>`;
            }
        }
    },

    /**
     * Verification of condition to ask work commuting related question for a persone in household section.
     * Conditions are household selected for work communting section, not more than two person asked per household, worker and not student
     *
     * @param {Object} interview
     * @param {Object} person
     *
     * @return {boolean} asking condition
     */
    shouldAskPersonWorkCommutingQuestions: function (interview, person) {
        let shouldAskPersonWorkCommutingQuestions;
        const shouldAskWorkCommutingQuestions = surveyHelper.getResponse(
            interview,
            'household._shouldAskWorkCommutingQuestions',
            null
        );

        if (!shouldAskWorkCommutingQuestions) {
            shouldAskPersonWorkCommutingQuestions = false;
        } else {
            const persons = surveyHelper.getResponse(interview, 'household.persons', []);
            const alreadyAskForCommut = Object.values(persons).filter(
                (pers) => pers._sequence < person._sequence && isWorker(pers) && !isStudent(pers)
            );
            shouldAskPersonWorkCommutingQuestions =
                alreadyAskForCommut.length < 2 && isWorker(person) && !isStudent(person);
        }

        return shouldAskPersonWorkCommutingQuestions;
    },

    /**
     * Verification of condition to ask school commuting related question for a persone in household section.
     * Conditions are household selected for school communting section, not more than two person asked per household, student with place of studies or children not working from home
     *
     * @param {Object} interview
     * @param {Object} person
     *
     * @return {boolean} asking condition
     */
    shouldAskPersonSchoolCommutingQuestions: function (interview, person) {
        let shouldAskPersonSchoolCommutingQuestions;
        const shouldAsSchoolCommutingQuestions = surveyHelper.getResponse(
            interview,
            'household._shouldAskSchoolCommutingQuestions',
            null
        );

        if (!shouldAsSchoolCommutingQuestions) {
            shouldAskPersonSchoolCommutingQuestions = false;
        } else {
            const persons = surveyHelper.getResponse(interview, 'household.persons', []);
            const alreadyAskForCommut = Object.values(persons).filter(
                (pers) =>
                    pers._sequence < person._sequence &&
                    (pers.studiesFromFixedLocation === 'yes' || pers.studiesFromFixedLocation === true)
            );
            shouldAskPersonSchoolCommutingQuestions =
                alreadyAskForCommut.length < 2 &&
                (person.studiesFromFixedLocation === 'yes' || person.studiesFromFixedLocation === true);
        }

        return shouldAskPersonSchoolCommutingQuestions;
    },

    /**
     * Verification of condition to ask school commuting related question for a persone in household section.
     * Conditions are household selected for school communting section, not more than two person asked per household, student with place of studies or children not working from home
     *
     * @param {Object} interview
     * @param {Object} person
     *
     * @return {boolean} asking condition
     */
    shouldAskPersonAnyTripModesFrequenciesQuestions: function (interview, person) {
        let shouldAskPersonAnyTripModesFrequenciesQuestions;
        const shouldAskAnyTripModesFrequencies = surveyHelper.getResponse(
            interview,
            'household._shouldAskAnyTripModesFrequencies',
            null
        );

        if (!shouldAskAnyTripModesFrequencies) {
            shouldAskPersonAnyTripModesFrequenciesQuestions = false;
        } else {
            const persons = surveyHelper.getResponse(interview, 'household.persons', []);
            const alreadyAskForCommut = Object.values(persons).filter(
                (pers) => pers._sequence < person._sequence && hasAge(pers) && ageCompare(pers, 5) >= 0
            );
            shouldAskPersonAnyTripModesFrequenciesQuestions =
                alreadyAskForCommut.length < 2 && hasAge(person) && ageCompare(person, 5) >= 0;
        }
        return shouldAskPersonAnyTripModesFrequenciesQuestions;
    },

    /**
     * Return the number of person in the household, or if the person is
     * self-declared, it will return 1. This function is used to know if the
     * labels should directly address the respondent or use a nickname
     * @param person The current person being interviews
     * @param interview The interview
     */
    getCountOrSelfDeclared: (interview, person): number => {
        if (person && isSelfDeclared(person, interview)) {
            return 1;
        }
        return countPersons(interview);
    },

    /**
     * Return the home address as a one line string, including all the parts
     * @param interview The interview
     */
    getHomeAddressOneLine: (
        interview,
        includeRegion = false,
        includeCountry = false,
        includePostalCode = false
    ): string => {
        const homeObj = surveyHelper.getResponse(interview, 'home', undefined);
        return getAddressOneLine(homeObj, includeRegion, includeCountry, includePostalCode);
    },

    isStrikeDay: (day: unknown): boolean => {
        const momentDate = typeof day === 'string' ? moment(day) : undefined;
        return momentDate !== undefined && momentDate >= strikeStart && momentDate <= strikeEnd;
    }
};
