/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/** TODO: This file was previously in the demo_survey project, but is required
 * in the files in src/, so it was moved here. These survey helper should be
 * moved to typescript and use object-like structures, properly typed. */
import moment       from 'moment-business-days';
import isEmpty      from 'lodash/isEmpty';
import isEqual      from 'lodash/isEqual';
import _get         from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import { distance as turfDistance } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import i18n                     from 'chaire-lib-frontend/lib/config/i18n.config';
import * as surveyHelperNew     from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper     from 'evolution-common/lib/services/odSurvey/helpers';
import surveyHelper             from './survey';
import getTripMultimodeCategory from './helperFunctions/getTripMultimodeCategory';

const getPerson = function(interview, personId = null) {
  personId = personId || surveyHelperNew.getResponse(interview, '_activePersonId', null);
  if (personId)
  {
    return surveyHelperNew.getResponse(interview, `household.persons.${personId}`, null);
  }
  else
  {
    return null;
  }
};

const isWorker = function(occupation)
{
  return ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].indexOf(occupation) > -1;
};

const isStudent = function(occupation)
{
  return ['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].indexOf(occupation) > -1;
};

const updateVisitedPlaces = function(person, visitedPlaces, includeSelectedVisitedPlaceId = true)
{
  const count              = visitedPlaces.length;
  const updateValuesByPath = {};
  for (let i = 0; i < count; i++)
  {
    const visitedPlace         = visitedPlaces[i];
    const visitedPlacePath     = `household.persons.${person._uuid}.visitedPlaces.${visitedPlace._uuid}`;
    const nextVisitedPlace     = (i + 1 < count) ? visitedPlaces[i + 1] : null;
    if (nextVisitedPlace && nextVisitedPlace.activity === 'home' && visitedPlace.nextPlaceCategory !== 'wentBackHome')
    {
      updateValuesByPath[`responses.${visitedPlacePath}.nextPlaceCategory`] = 'wentBackHome';
    }
    if (nextVisitedPlace && nextVisitedPlace.activity !== 'home' && visitedPlace.nextPlaceCategory === 'wentBackHome')
    {
      updateValuesByPath[`responses.${visitedPlacePath}.nextPlaceCategory`] = 'visitedAnotherPlace';
    }
    if (!nextVisitedPlace && !_isBlank(visitedPlace.nextPlaceCategory) && visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay') // we need to nullify path for the previous visited place:
    {
      updateValuesByPath[`responses.${visitedPlacePath}.nextPlaceCategory`] = null;
    }
    if (i === 0 && !_isBlank(visitedPlace.arrivalTime))
    {
      updateValuesByPath[`responses.${visitedPlacePath}.arrivalTime`] = null;
    }
    if (visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay' && i === (count - 1) && !_isBlank(visitedPlace.departureTime))
    {
      updateValuesByPath[`responses.${visitedPlacePath}.departureTime`] = null;
    }
    if (includeSelectedVisitedPlaceId)
    {
      updateValuesByPath['responses._activeVisitedPlaceId'] = selectNextVisitedPlaceId(visitedPlaces);
    }
    return updateValuesByPath;
  }
}

const getPreviousVisitedPlace = function(visitedPlaceId, orderedVisitedPlacesArray)
{
  for (let i = 1, count = orderedVisitedPlacesArray.length; i < count; i++)
  {
    if (orderedVisitedPlacesArray[i]._uuid == visitedPlaceId)
    {
      return orderedVisitedPlacesArray[i-1];
    }
  }
  return null; // provided visitedPlace was the first
};

const getNextVisitedPlace = function(visitedPlaceId, orderedVisitedPlacesArray)
{
  for (let i = 0, count = orderedVisitedPlacesArray.length - 1; i < count; i++)
  {
    if (orderedVisitedPlacesArray[i]._uuid == visitedPlaceId)
    {
      return orderedVisitedPlacesArray[i+1];
    }
  }
  return null; // provided visitedPlace was the last
};

const getVisitedPlaceDescription = function(visitedPlace, withTimes = false, allowHtml = true)
{
  let times = '';
  if (withTimes)
  {
    const arrivalTime   = visitedPlace.arrivalTime   ? ' ' + secondsSinceMidnightToTimeStr(visitedPlace.arrivalTime) : '';
    const departureTime = visitedPlace.departureTime ? ' -> ' + secondsSinceMidnightToTimeStr(visitedPlace.departureTime) : '';
    times = arrivalTime + departureTime;
  }
  if (allowHtml)
  {
    return `${i18n.t(`survey:visitedPlace:activities:${visitedPlace.activity}`)}${ visitedPlace.name ? ` • <em>${visitedPlace.name}</em>`: ''}${times}`
  }
  else
  {
    return `${i18n.t(`survey:visitedPlace:activities:${visitedPlace.activity}`)}${ visitedPlace.name ? ` • ${visitedPlace.name}`: ''}${times}`
  }
};

const selectNextVisitedPlaceId = function(visitedPlaces)
{
  const count = visitedPlaces.length;
  for (let i = 0; i < count; i++)
  {
    const visitedPlace = visitedPlaces[i];
    if (
          _isBlank(visitedPlace.activity)
      || (_isBlank(visitedPlace.departureTime)     && (visitedPlace._sequence < count || visitedPlace._sequence === 1 || (visitedPlace._sequence === count && visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay')))
      || (_isBlank(visitedPlace.arrivalTime)       && visitedPlace._sequence > 1 )
      || (_isBlank(visitedPlace.nextPlaceCategory) && visitedPlace._sequence > 1 )
      || (_isBlank(visitedPlace.geography)         && ['home', 'workUsual', 'schoolUsual', 'workOnTheRoadFromHome', 'workOnTheRoadFromUsualWork'].indexOf(visitedPlace.activity) <= -1 )
    )
    {
      return visitedPlace._uuid;
    }
  }
  return null;
};

const getActiveVisitedPlaceId = function(interview)
{
  return surveyHelperNew.getResponse(interview, '_activeVisitedPlaceId');
};

const getActiveVisitedPlace = function(interview, person = null)
{
        person               = person || getPerson(interview);
  const visitedPlaces        = getVisitedPlaces(person, false);
  const activeVisitedPlaceId = surveyHelperNew.getResponse(interview, '_activeVisitedPlaceId', null);
  return activeVisitedPlaceId ? visitedPlaces[activeVisitedPlaceId] : null;
};

const getHouseholdVisitedPlacesArrayAndByPersonId = function(interview)
{
  const persons                 = surveyHelperNew.getResponse(interview, `household.persons`, {});
  let   visitedPlaces           = [];
  const visitedPlacesByPersonId = {};
  for (let personId in persons)
  {
    const person                      = persons[personId];
    const personVisitedPlaces         = person.visitedPlaces || {};
    const personVisitedPlacesSorted   = Object.values(personVisitedPlaces).sort((visitedPlaceA, visitedPlaceB) => {
      return visitedPlaceA['_sequence'] - visitedPlaceB['_sequence'];
    });
    visitedPlaces                     = visitedPlaces.concat(personVisitedPlacesSorted);
    visitedPlacesByPersonId[personId] = personVisitedPlacesSorted;
  }
  return {visitedPlaces, visitedPlacesByPersonId};
};

const getVisitedPlaceAndPersonInHouseholdById = function(visitedPlaceId, interview)
{
  const persons = surveyHelperNew.getResponse(interview, `household.persons`, {});
  for (let personId in persons)
  {
    const person              = persons[personId];
    const personVisitedPlaces = person.visitedPlaces || {};
    for (let _visitedPlaceId in personVisitedPlaces)
    {
      if (_visitedPlaceId === visitedPlaceId)
      {
        return {person: person, visitedPlace: personVisitedPlaces[_visitedPlaceId]};
      }
    }
  }
  return null;
};

const getModeCategory = function(mode) {
  if (['carDriver', 'carPassenger', 'bicycle', 'taxi', 'uber', 'motorcycle'].indexOf(mode) > -1)
  {
    return 'private';
  }
  else if (['transitBus', 'transitSubway', 'transitRail', 'transitTaxi', 'intercityBus', 'intercityRail', 'busOther', 'plane'].indexOf(mode) > -1)
  {
    return 'public';
  }
  return 'other';
};

const getSegments = function(trip, asArray = true) {
  if (trip)
  {
    const segments = trip.segments || {};
    if (asArray)
    {
      return Object.values(segments).sort((segmentA, segmentB) => {
        return segmentA['_sequence'] - segmentB['_sequence'];
      });
    }
    else
    {
      return segments;
    }
    
  }
  return asArray ? [] : {};
};

const getPersons = (interview, asArray = false) => asArray ? odSurveyHelper.getPersonsArray(interview) : odSurveyHelper.getPersons(interview);

const countPersons = function(interview)
{
  const personIds = surveyHelperNew.getResponse(interview, `household.persons`, {});
  return Object.keys(personIds).length;
};

const getVisitedPlaces = (journey, asArray = true) => asArray ? odSurveyHelper.getVisitedPlacesArray(journey) : odSurveyHelper.getVisitedPlaces(journey);

const getTrips = function(journey, asArray = true)
{
  if (journey)
  {
    const trips = journey.trips || {};
    if (asArray)
    {
      return Object.values(trips).sort((tripA, tripB) => {
        return tripA['_sequence'] - tripB['_sequence'];
      });
    }
    else
    {
      return trips;
    }
  }
  return asArray ? [] : {};
};

const getGeography = function(visitedPlace, person, interview, recursive = false)
{
  if (visitedPlace === null || visitedPlace ===  undefined)
  {
    return null;
  }
  let geojson = null;
  if (visitedPlace.activity === 'home' || visitedPlace.activity === 'workOnTheRoadFromHome')
  {
    geojson = surveyHelperNew.getResponse(interview, 'home.geography', null);
  }
  else if (visitedPlace.activity === 'workUsual' || visitedPlace.activity === 'workOnTheRoadFromUsualWork')
  {
    geojson = person.usualWorkPlace || visitedPlace.geography;
    if (_isBlank(geojson) && recursive === false) // it means the usualWorkPlace is for another person
    {
      const matchingVisitedPlaceAndPerson = getVisitedPlaceAndPersonInHouseholdById(visitedPlace._uuid, interview);
      if (matchingVisitedPlaceAndPerson)
      {
        return getGeography(visitedPlace, matchingVisitedPlaceAndPerson.person, interview, true);
      }
      else
      {
        return null;
      }
    }
  }
  else if (visitedPlace.activity === 'schoolUsual')
  {
    geojson = person.usualSchoolPlace || visitedPlace.geography;
    if (_isBlank(geojson) && recursive === false) // it means the usualSchoolPlace is for another person
    {
      const matchingVisitedPlaceAndPerson = getVisitedPlaceAndPersonInHouseholdById(visitedPlace._uuid, interview);
      if (matchingVisitedPlaceAndPerson)
      {
        return getGeography(visitedPlace, matchingVisitedPlaceAndPerson.person, interview, true);
      }
      else
      {
        return null;
      }
    }
  }
  else
  {
    geojson = visitedPlace.geography;
  }
  return geojson ? _cloneDeep(geojson) : null;
};

const getOrigin = function(trip, visitedPlaces) {
  const originVisitedPlaceId = trip._originVisitedPlaceUuid;
  return visitedPlaces[originVisitedPlaceId];
};

const getDestination = function(trip, visitedPlaces) {
  const destinationVisitedPlaceId = trip._destinationVisitedPlaceUuid;
  return visitedPlaces[destinationVisitedPlaceId];
};

const getOriginGeography = function(trip, visitedPlaces, person, interview, recursive = false) {
  const origin = getOrigin(trip, visitedPlaces);
  return getGeography(origin, person, interview, recursive);
};

const getDestinationGeography = function(trip, visitedPlaces, person, interview, recursive = false) {
  const destination = getDestination(trip, visitedPlaces);
  return getGeography(destination, person, interview, recursive);
};

const homeSectionComplete = function(interview) {
  const household    = surveyHelperNew.getResponse(interview, 'household');
  const tripsDate    = surveyHelperNew.getResponse(interview, 'tripsDate');
  const homeGeometry = surveyHelperNew.getResponse(interview, 'home.geography.geometry.coordinates');
  return !(
       _isBlank(tripsDate)
    || _isBlank(household)
    || _isBlank(household.size)
    || _isBlank(household.carNumber)
    || _isBlank(homeGeometry) 
  );
};

const homeSectionPartOneComplete = function(interview) {
  const household    = surveyHelperNew.getResponse(interview, 'household');
  const homeGeometry = surveyHelperNew.getResponse(interview, 'home.geography.geometry.coordinates');
  return !(
       _isBlank(household)
    || _isBlank(household.size)
    || _isBlank(household.carNumber)
    || _isBlank(homeGeometry) 
  );
};

const householdMembersSectionComplete = function(interview) {
  if (!homeSectionComplete(interview)) { return false; }
  const household = surveyHelperNew.getResponse(interview, 'household');
  if (household.size !== countPersons(interview)) { return false; }
  const persons = getPersons(interview);
  for (const personId in persons)
  {
    const person = persons[personId];
    if (!basicInfoForPersonComplete(person, household.size)) { return false; }
  }
  return true;
};

const householdMembersSectionPartOneComplete = function(interview) {
  if (!homeSectionPartOneComplete(interview)) { return false; }
  const household = ssurveyHelperNew.getResponse(interview, 'household');
  if (household.size !== countPersons(interview)) { return false; }
  const persons = getPersons(interview);
  for (const personId in persons)
  {
    const person = persons[personId];
    if (!basicInfoForPersonComplete(person, household.size)) { return false; }
  }
  return true;
};

const basicInfoForPersonComplete = function(person, householdSize) {
  return !(
       _isBlank(person)
    || _isBlank(person.age)
    || _isBlank(person.gender)
    || (householdSize > 1 && _isBlank(person.nickname))
  );
};

const profileInfoForPersonComplete = function(person, interview) {
  if (_isBlank(person)) { return false; }
  if (person.age < 5)    { return true;  }
  const _isWorker  = isWorker(person.occupation);
  const _isStudent = isStudent(person.occupation);
  if (person.usualWorkPlaceIsHome !== true && _isWorker)
  {
    const usualWorkPlaceGeometry = _get(person, 'usualWorkPlace.geometry.coordinates');
    if (_isBlank(usualWorkPlaceGeometry)) { return false; }
  }
  else if (_isWorker && _isBlank(person.usualWorkPlaceIsHome)) { return false; }
  if (_isStudent)
  {
    const usualSchoolPlaceGeometry = _get(person, 'usualSchoolPlace.geometry.coordinates');
    if (_isBlank(usualSchoolPlaceGeometry)) { return false; }
  }
  return true;
};

const tripsIntroForPersonComplete = function(person, interview) {
  if (person && person.age < 5) { return true; }
  if (
       !profileInfoForPersonComplete(person, interview)
    || _isBlank(person.didTripsOnTripsDate)
    || ((person.didTripsOnTripsDate === 'yes' || person.didTripsOnTripsDate === true) && _isBlank(person.departurePlaceType))
  ) { return false; }
  return true;
};

const visitedPlacesForPersonComplete = function(person, interview) {
  if (person && person.age < 5) { return true; }
  if (!tripsIntroForPersonComplete(person, interview)) { return false; }
  if (person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) { return true; }
  const visitedPlaces      = getVisitedPlaces(person, false);
  const countVisitedPlaces = Object.keys(visitedPlaces).length;
  if (countVisitedPlaces <= 1) { return false; }
  for (const visitedPlaceId in visitedPlaces)
  {
    const visitedPlace = visitedPlaces[visitedPlaceId];
    if (
         _isBlank(visitedPlace._uuid)
      || _isBlank(visitedPlace._sequence)
      || _isBlank(visitedPlace.activity)
      || (visitedPlace._sequence === 1 && _isBlank(visitedPlace.departureTime))
      || (visitedPlace._sequence === countVisitedPlaces && _isBlank(visitedPlace.arrivalTime))
      || (visitedPlace._sequence > 1 && visitedPlace._sequence < countVisitedPlaces && (_isBlank(visitedPlace.arrivalTime) || _isBlank(visitedPlace.departureTime)))
      || (_isBlank(getGeography(visitedPlace, person, interview)))
    ) { return false; }
  }
  return true;
};

const tripsForPersonComplete = function(person, interview) {
  if (person && person.age < 5) { return true; }
  if (
       !visitedPlacesForPersonComplete(person, interview)
  ) { return false; }
  const trips = getTrips(person, false);
  for (const tripId in trips)
  {
    const trip     = trips[tripId];
    const segments = getSegments(trip, false);
    if ( _isBlank(trip.segments)) { return false; }
    for (const segmentId in segments)
    {
      const segment = segments[segmentId];
      if (
           _isBlank(segment._sequence)
        || _isBlank(segment.mode)
      ) { return false; }
    }
  }
  return true;
};

const travelBehaviorForPersonComplete = function(person, interview) {
  if (person && person.age < 5) { return true; }
  if (!tripsForPersonComplete(person, interview)) { return false; }
  const household = surveyHelperNew.getResponse(interview, 'household');
  if (household.size > 1 && _isBlank(person.whoAnsweredForThisPerson)) { return false; }
  return true;
}

const allPersonsTripsAndTravelBehaviorComplete = function(interview) {
  if (!householdMembersSectionComplete(interview)) { return false; }
  const persons = getPersons(interview, false);
  for (const personId in persons)
  {
    const person = persons[personId];
    if (!travelBehaviorForPersonComplete(person, interview)) { return false; }
  }
  return true;
};

const getDurationSec = function(trip, visitedPlaces)
{
  const origin      = visitedPlaces[trip._originVisitedPlaceUuid];
  const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
  if (_isBlank(origin) || _isBlank(destination))
  {
    return null;
  }
  return destination.arrivalTime - origin.departureTime;
};
  
const getBirdDistanceMeters = function(trip, visitedPlaces, person, interview)
{
  const origin      = visitedPlaces[trip._originVisitedPlaceUuid];
  const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
  if (_isBlank(origin) || _isBlank(destination))
  {
    return null;
  }
  const originGeography      = getGeography(origin, person, interview);
  const destinationGeography = getGeography(destination, person, interview);
  if (_isBlank(originGeography) || _isBlank(destinationGeography))
  {
    return null;
  }
  return turfDistance(originGeography.geometry, destinationGeography.geometry, {units: 'meters'});
};

export default {
  isWorker                                   : isWorker,
  isStudent                                  : isStudent,
  getPerson                                  : getPerson,
  getPersons                                 : getPersons,
  countPersons                               : countPersons,
  getVisitedPlaces                           : getVisitedPlaces,
  getActiveVisitedPlaceId                    : getActiveVisitedPlaceId,
  getActiveVisitedPlace                      : getActiveVisitedPlace,
  getPreviousVisitedPlace                    : getPreviousVisitedPlace,
  getNextVisitedPlace                        : getNextVisitedPlace,
  getVisitedPlaceDescription                 : getVisitedPlaceDescription,
  getHouseholdVisitedPlacesArrayAndByPersonId: getHouseholdVisitedPlacesArrayAndByPersonId,
  getSegments                                : getSegments,
  getTrips                                   : getTrips,
  getModeCategory                            : getModeCategory,
  getGeography                               : getGeography,
  getDurationSec                             : getDurationSec,
  getBirdDistanceMeters                      : getBirdDistanceMeters,
  getVisitedPlaceAndPersonInHouseholdById    : getVisitedPlaceAndPersonInHouseholdById,
  homeSectionComplete                        : homeSectionComplete,
  homeSectionPartOneComplete                 : homeSectionPartOneComplete,
  householdMembersSectionComplete            : householdMembersSectionComplete,
  householdMembersSectionPartOneComplete     : householdMembersSectionPartOneComplete,
  basicInfoForPersonComplete                 : basicInfoForPersonComplete,
  profileInfoForPersonComplete               : profileInfoForPersonComplete,
  tripsIntroForPersonComplete                : tripsIntroForPersonComplete,
  visitedPlacesForPersonComplete             : visitedPlacesForPersonComplete,
  tripsForPersonComplete                     : tripsForPersonComplete,
  travelBehaviorForPersonComplete            : travelBehaviorForPersonComplete,
  allPersonsTripsAndTravelBehaviorComplete   : allPersonsTripsAndTravelBehaviorComplete,
  getTripMultimodeCategory                   : getTripMultimodeCategory,
  selectNextVisitedPlaceId                   : selectNextVisitedPlaceId,
  getOrigin                                  : getOrigin,
  getDestination                             : getDestination,
  getOriginGeography                         : getOriginGeography,
  getDestinationGeography                    : getDestinationGeography,

  getDrivers: function(interview, asArray = false)
  {
    const persons = getPersons(interview, false);
    const drivers = asArray ? [] : {};
    for (const personId in persons)
    {
      const person = persons[personId];
      if (person.drivingLicenseOwner === 'yes')
      {
        if (asArray)
        {
          drivers.push(person);
        }
        else
        {
          drivers[personId] = person;
        }
      }
    }
    return drivers;
  },

  getActiveTripId: function(interview)
  {
    return surveyHelperNew.getResponse(interview, '_activeTripId');
  },

  getActiveTrip: function(interview, person = null)
  {
          person       = person || getPerson(interview);
    const trips        = getTrips(person, false);
    const activeTripId = surveyHelperNew.getResponse(interview, '_activeTripId', null);
    return activeTripId ? trips[activeTripId] : null;
  },

  getPreviousTrip: function(tripId, orderedTripsArray)
  {
    for (let i = 1, count = orderedTripsArray.length; i < count; i++)
    {
      if (orderedTripsArray[i]._uuid == tripId)
      {
        return orderedTripsArray[i-1];
      }
    }
    return null; // provided trip was the first
  },

  getNextTrip: function(tripId, orderedTripsArray)
  {
    for (let i = 0, count = orderedTripsArray.length - 1; i < count; i++)
    {
      if (orderedTripsArray[i]._uuid == tripId)
      {
        return orderedTripsArray[i+1];
      }
    }
    return null; // provided trip was the last
  },

  selectNextTripId: function(trips)
  {
    for (let i = 0, count = trips.length; i < count; i++)
    {
      const trip = trips[i];
      if (_isBlank(trip.segments) || isEmpty(trip.segments))
      {
        return trip._uuid;
      }
    }
    return null;
  },

  deleteVisitedPlace: function(visitedPlacePath, interview, startRemoveGroupedObjects, startUpdateInterview)
  {
    const person               = getPerson(interview);
    const visitedPlaces        = getVisitedPlaces(person, true);
    const visitedPlacePaths    = [visitedPlacePath];
    const visitedPlace         = surveyHelperNew.getResponse(interview, visitedPlacePath, null);
    const previousVisitedPlace = getPreviousVisitedPlace(visitedPlace._uuid, visitedPlaces);
    const nextVisitedPlace     = getNextVisitedPlace(visitedPlace._uuid, visitedPlaces);
    if (nextVisitedPlace && nextVisitedPlace.activity === 'home' && previousVisitedPlace && previousVisitedPlace.activity === 'home')
    {
      const nextVisitedPlacePath = `household.persons.${person._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`;
      visitedPlacePaths.push(nextVisitedPlacePath);
    }
    // Before deleting, replace the location shortcuts by original data, the will be updated after group removal
    const updatedValues = visitedPlacePaths
        .map(placePath => surveyHelperNew.replaceVisitedPlaceShortcuts(interview, placePath))
        .filter(updatedPaths => updatedPaths !== undefined)
        .reduce((previous, current) => ({
            updatedValuesByPath: Object.assign(previous.updatedValuesByPath, current.updatedValuesByPath),
            unsetPaths: previous.unsetPaths.push(...current.unsetPaths)
        }), { updatedValuesByPath: {}, unsetPaths: [] });
    
    startRemoveGroupedObjects(visitedPlacePaths, (function(interview) {
      const person             = getPerson(interview);
      const visitedPlaces      = getVisitedPlaces(person);
      const updateValuesByPath = updateVisitedPlaces(person, visitedPlaces, true);
      startUpdateInterview('visitedPlaces', Object.assign(updatedValues.updatedValuesByPath, updateValuesByPath), updatedValues.unsetPaths);
    }).bind(this));
  },
  
  
  mergeVisitedPlace: function(visitedPlacePath, interview, startRemoveGroupedObjects, startUpdateInterview) {
    // this will remove this visitedPlace and create a new trip between previous and next visited places with merged segments (segments of previous trips will be added together)
    const visitedPlacePaths    = [visitedPlacePath];

    startRemoveGroupedObjects(visitedPlacePaths, (function(interview) {
      const person                   = getPerson(interview);
      let   tripsUpdatesValueByPath  = {};
      let   tripsUpdatesUnsetPaths   = [];
      const tripsPath                = `household.persons.${person._uuid}.trips`;
      const visitedPlaces            = getVisitedPlaces(person);
      let   trips                    = getTrips(person);
      let   tripToMergeFound         = false;

      for (let tripSequence = 1, count = visitedPlaces.length - 1; tripSequence <= count; tripSequence++)
      {
        const origin      = visitedPlaces[tripSequence - 1];
        const destination = visitedPlaces[tripSequence];
        const trip        = trips[tripSequence - 1];
        if (_isBlank(trip))
        {
          // create trip if not exists for this sequence:
          const addValuesByPath = surveyHelper.addGroupedObjects(interview, 1, tripSequence, tripsPath, [{
            _originVisitedPlaceUuid:      origin._uuid,
            _destinationVisitedPlaceUuid: destination._uuid,
          }]);
          tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, addValuesByPath);
        }
        else if (trip._originVisitedPlaceUuid !== origin._uuid || trip._destinationVisitedPlaceUuid !== destination._uuid)
        {
          // update origin and destination if wrong for this sequence:
          tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}._originVisitedPlaceUuid`]      = origin._uuid;
          tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}._destinationVisitedPlaceUuid`] = destination._uuid;
          // also merge existing segments:
          const nextTrip              = trips[tripSequence];
          const tripSegmentsArray     = getSegments(trip, true);
          const nextTripSegmentsArray = getSegments(nextTrip, true);
          let   newSegments           = [];
          const newSegmentsById       = {};
          if (tripToMergeFound === false)
          {
            newSegments      = tripSegmentsArray.concat(nextTripSegmentsArray);
            tripToMergeFound = true;
          }
          else
          {
            newSegments = nextTripSegmentsArray;
          }

          let segmentSequence = 1;
          for (let i = 0, count = newSegments.length; i < count; i++)
          {
            const segment                  = newSegments[i];
            segment._sequence              = segmentSequence;
            newSegmentsById[segment._uuid] = segment;
            segmentSequence++;
          }
          
          tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}.segments`] = newSegmentsById;
        }
      }
      if (trips.length >= visitedPlaces.length)
      {
        // remove superfluous trips:
        let tripsPathsToRemove = [];
        for (let tripSequence = visitedPlaces.length, count = trips.length; tripSequence <= count; tripSequence++)
        {
          const trip = trips[tripSequence - 1];
          tripsPathsToRemove.push(`${tripsPath}.${trip._uuid}`);
        }
        if (tripsPathsToRemove.length > 0)
        {
          let updateValuePaths = {};
          let unsetValuePaths  = [];
          [updateValuePaths, unsetValuePaths] = surveyHelper.removeGroupedObjects(interview, tripsPathsToRemove);
          tripsUpdatesUnsetPaths  = tripsUpdatesUnsetPaths.concat(unsetValuePaths);
          tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, updateValuePaths);
        }
      }
      // update needed origin and destination visited places uuids:
      if (!isEmpty(tripsUpdatesValueByPath) || !isEmpty(tripsUpdatesUnsetPaths))
      {
        startUpdateInterview('visitedPlaces', tripsUpdatesValueByPath, tripsUpdatesUnsetPaths, null);
      }

    }).bind(this));

  },

  getFirstVisitedPlace: function(orderedVisitedPlacesArray)
  {
    if (!Array.isArray(orderedVisitedPlacesArray) || orderedVisitedPlacesArray.length == 0)
    {
      return null;
    }
    return orderedVisitedPlacesArray[0];
  },

  getLastVisitedPlace: function(orderedVisitedPlacesArray)
  {
    if (!Array.isArray(orderedVisitedPlacesArray) || orderedVisitedPlacesArray.length == 0)
    {
      return null;
    }
    return orderedVisitedPlacesArray[orderedVisitedPlacesArray.length-1];
  },

  getFirstTrip: function(orderedTripsArray)
  {
    if (!Array.isArray(orderedTripsArray) || orderedTripsArray.length == 0)
    {
      return null;
    }
    return orderedTripsArray[0];
  },

  getLastTrip: function(orderedTripsArray)
  {
    if (!Array.isArray(orderedTripsArray) || orderedTripsArray.length == 0)
    {
      return null;
    }
    return orderedTripsArray[orderedTripsArray.length-1];
  },

  getFormattedTripsDate: function(interview, withRelative = false) {
    const tripsDate          = moment(surveyHelperNew.getResponse(interview, 'tripsDate'));
    let formattedTripsDate   = moment(tripsDate).format('LL');
    if (withRelative)
    {
      const today            = moment(0, 'HH'); // today
      const numberOfDaysDiff = today.diff(tripsDate, 'days');
      if (numberOfDaysDiff == 1)
      {
        formattedTripsDate += ` (${i18n.t('main:yesterday')})`;
      }
      else if (numberOfDaysDiff == 2)
      {
        formattedTripsDate += ` (${i18n.t('main:dayBeforeYesterday')})`;
      }
    }
    return formattedTripsDate;
  },

  getTripTransferCategory: function(trip) {
    if (trip)
    {
      const segments         = getSegments(trip, true);
      let   lastModeCategory = null;
      let   lastMode         = null;
      for (let i = 0, count = segments.length; i < count; i++)
      {
        const segment      = segments[i];
        const mode         = segment.mode;
        const modeCategory = mode ? getModeCategory(mode) : null;
        if (lastModeCategory)
        {
          if (lastModeCategory === 'public' && modeCategory === 'private')
          {
            return { category: 'public_private', previousMode: lastMode, nextMode: mode };
          }
          else if (lastModeCategory === 'private' && modeCategory === 'public')
          {
            return { category: 'private_public', previousMode: lastMode, nextMode: mode };
          }
        }
        lastMode         = mode;
        lastModeCategory = modeCategory;
      }
    }
    return null;
  },

  getGenderString: function(person, femaleStr, maleStr, customStr, defaultStr)
  {
    if (_isBlank(person) || _isBlank(person.gender))
    {
      return defaultStr;
    }
    else if (person.gender === 'female')
    {
      return femaleStr;
    }
    else if (person.gender === 'male')
    {
      return maleStr;
    }
    else if (person.gender === 'custom')
    {
      return customStr;
    }
    return defaultStr;
  },

  getShortcutVisitedPlaces: function(interview) {
    const actualPerson                    = getPerson(interview);
    const actualVisitedPlaces             = getVisitedPlaces(actualPerson);
    const actualVisitedPlace              = getActiveVisitedPlace(interview, actualPerson)
    const previousVisitedPlace            = getPreviousVisitedPlace(actualVisitedPlace._uuid, actualVisitedPlaces);
    const previousVisitedPlaceGeography   = getGeography(previousVisitedPlace, actualPerson, interview);
    const previousVisitedPlaceCoordinates = _get(previousVisitedPlaceGeography, 'geometry.coordinates', null);
    const visitedPlacesArrayAndByPersonId = getHouseholdVisitedPlacesArrayAndByPersonId(interview);
    const shortcutsOrderedByPerson        = [];
    for (let personId in visitedPlacesArrayAndByPersonId.visitedPlacesByPersonId)
    {
      const person                = getPerson(interview, personId);
      const personVisitedPlaces   = visitedPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
      for (let i = 0, count = personVisitedPlaces.length; i < count; i++)
      {
        const visitedPlace            = personVisitedPlaces[i];
        const visitedPlaceGeography   = getGeography(visitedPlace, person, interview);
        const visitedPlaceCoordinates = _get(visitedPlaceGeography, 'geometry.coordinates', null);
        const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, true, false);
        if (
             visitedPlace.activity !== 'home' 
          && visitedPlace.activity !== 'workOnTheRoadFromHome'
          && visitedPlace._uuid !== actualVisitedPlace._uuid
          && !_isBlank(visitedPlaceCoordinates)
          && !_isBlank(previousVisitedPlaceCoordinates)
          && !isEqual(visitedPlaceCoordinates, previousVisitedPlaceCoordinates)
        )
        {
          shortcutsOrderedByPerson.push({
            personNickname: person.nickname,
            visitedPlaceId: `household.persons.${personId}.visitedPlaces.${visitedPlace._uuid}`,
            description   : visitedPlaceDescription
          });
        }
      }
    }
    return shortcutsOrderedByPerson;
  },

  getStartAt: function(trip, visitedPlaces)
  {
    const origin = visitedPlaces[trip._originVisitedPlaceUuid];
    return origin ? origin.departureTime : null;
  },

  getEndAt: function(trip, visitedPlaces)
  {
    const destination = visitedPlaces[trip._destinationVisitedPlaceUuid];
    return destination ? destination.arrivalTime : null;
  },

  getBirdSpeedMps: function(trip, visitedPlaces, person, interview) {
    const birdDistance = getBirdDistanceMeters(trip, visitedPlaces, person, interview);
    const duration     = getDurationSec(trip, visitedPlaces);
    if (duration > 0 && birdDistance >= 0)
    {
      return birdDistance / duration;
    }
    else
    {
      return null;
    }
  },
  
  validateInterview(validations, language, user, interview, responses, household, home, personsById, personsArray) {
    const errors = [];
    const warnings = [];
    const validationResults = [];
    for (const validationId in validations) {
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
    }
    return {
        errors,
        warnings,
        audits: validationResults
    };
  },

  validateHousehold(validations, language, user, interview, responses, household, home, personsById, personsArray) {
    const errors = [];
    const warnings = [];
    const validationResults = [];
    for (const validationId in validations) {
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
    }
    return {
        errors,
        warnings,
        audits: validationResults
    };
  },

  validatePerson(validations, language, user, interview, responses, household, home, personsById, personsArray, person) {
    const errors = [];
    const warnings = [];
    const validationResults = [];
    for (const validationId in validations) {
        const validation = validations[validationId];
        if (!validation.isValid(user, interview, responses, household, home, personsById, personsArray, person)) {
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
    }
    return {
        errors,
        warnings,
        audits: validationResults
    };
  },

  validateVisitedPlace(validations, language, user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
    const errors = [];
    const warnings = [];
    const validationResults = [];
    for (const validationId in validations) {
        const validation = validations[validationId];
        if (!validation.isValid(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace)) {
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
    }
    return {
        errors,
        warnings,
        audits: validationResults
    };
  },

  validateTrip(validations, language, user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
    const errors = [];
    const warnings = [];
    const validationResults = [];
    for (const validationId in validations) {
        const validation = validations[validationId];
        if (!validation.isValid(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip)) {
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
    }
    return {
        errors,
        warnings,
        audits: validationResults
    };
  },

  validateSegment(validations, language, user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
    const errors = [];
    const warnings = [];
    const validationResults = [];
    for (const validationId in validations) {
        const validation = validations[validationId];
        if (!validation.isValid(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment)) {
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
    }
    return {
        errors,
        warnings,
        audits: validationResults
    };
  }

};

