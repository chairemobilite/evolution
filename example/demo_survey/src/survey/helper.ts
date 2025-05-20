/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment       from 'moment-business-days';
import isEmpty      from 'lodash/isEmpty';
import isEqual      from 'lodash/isEqual';
import _get         from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import { distance as turfDistance } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import i18n                     from 'evolution-frontend/lib/config/i18n.config';
import * as surveyHelperNew     from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper     from 'evolution-common/lib/services/odSurvey/helpers';
import { getVisitedPlaceDescription } from 'evolution-frontend/lib/services/display/frontendHelper';
import { Person, VisitedPlace } from 'evolution-common/lib/services/questionnaire/types';

const homeSectionComplete = function(interview) {
    const household    = surveyHelperNew.getResponse(interview, 'household');
    const tripsDate    = surveyHelperNew.getResponse(interview, 'tripsDate');
    const homeGeometry = surveyHelperNew.getResponse(interview, 'home.geography.geometry.coordinates');
    return !(
         _isBlank(tripsDate)
      || _isBlank(household)
      || _isBlank((household as any).size)
      || _isBlank((household as any).carNumber)
      || _isBlank(homeGeometry) 
    );
};

const basicInfoForPersonComplete = function(person, householdSize) {
    return !(
         _isBlank(person)
      || _isBlank(person.age)
      || _isBlank(person.gender)
      || (householdSize > 1 && _isBlank(person.nickname))
    );
  };

const householdMembersSectionComplete = function(interview) {
    if (!homeSectionComplete(interview)) { return false; }
    const household = surveyHelperNew.getResponse(interview, 'household') as any;
    if (household.size !== odSurveyHelper.countPersons({ interview })) { return false; }
    const persons = odSurveyHelper.getPersons({ interview });
    for (const personId in persons)
    {
      const person = persons[personId];
      if (!basicInfoForPersonComplete(person, household.size)) { return false; }
    }
    return true;
};

const isWorker = function(occupation)
{
  return ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].indexOf(occupation) > -1;
};

const isStudent = function(occupation)
{
  return ['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].indexOf(occupation) > -1;
};

const profileInfoForPersonComplete = function(person, interview) {
    if (_isBlank(person)) { return false; }
    if (person.age < 5) { return true;  }
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
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    const visitedPlaces      = odSurveyHelper.getVisitedPlaces({ journey });
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
        || (_isBlank(odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, person, interview })))
      ) { return false; }
    }
    return true;
};

const tripsForPersonComplete = function(person, interview) {
    if (person && person.age < 5) { return true; }
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (
         !visitedPlacesForPersonComplete(person, interview)
    ) { return false; }
    if (journey === undefined) {
        // No trips
        return true;
    }
    const trips = odSurveyHelper.getTrips({ journey });
    for (const tripId in trips)
    {
      const trip     = trips[tripId];
      const segments = odSurveyHelper.getSegments({ trip });
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
    const household = surveyHelperNew.getResponse(interview, 'household') as any;
    if (household.size > 1 && _isBlank(person.whoAnsweredForThisPerson)) { return false; }
    return true;
};

const allPersonsTripsAndTravelBehaviorComplete = function(interview) {
    if (!householdMembersSectionComplete(interview)) { return false; }
    const persons = odSurveyHelper.getPersons({ interview });
    for (const personId in persons)
    {
      const person = persons[personId];
      if (!travelBehaviorForPersonComplete(person, interview)) { return false; }
    }
    return true;
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
      updateValuesByPath[`response.${visitedPlacePath}.nextPlaceCategory`] = 'wentBackHome';
    }
    if (nextVisitedPlace && nextVisitedPlace.activity !== 'home' && visitedPlace.nextPlaceCategory === 'wentBackHome')
    {
      updateValuesByPath[`response.${visitedPlacePath}.nextPlaceCategory`] = 'visitedAnotherPlace';
    }
    if (!nextVisitedPlace && !_isBlank(visitedPlace.nextPlaceCategory) && visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay') // we need to nullify path for the previous visited place:
    {
      updateValuesByPath[`response.${visitedPlacePath}.nextPlaceCategory`] = null;
    }
    if (i === 0 && !_isBlank(visitedPlace.arrivalTime))
    {
      updateValuesByPath[`response.${visitedPlacePath}.arrivalTime`] = null;
    }
    if (visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay' && i === (count - 1) && !_isBlank(visitedPlace.departureTime))
    {
      updateValuesByPath[`response.${visitedPlacePath}.departureTime`] = null;
    }
    if (includeSelectedVisitedPlaceId)
    {
      updateValuesByPath['response._activeVisitedPlaceId'] = selectNextVisitedPlaceId(visitedPlaces);
    }
    return updateValuesByPath;
  }
}

const deleteVisitedPlace = (visitedPlacePath, interview, startRemoveGroupedObjects, startUpdateInterview) => {
    const person               = odSurveyHelper.getPerson({ interview });
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    if (!journey) { return; }
    const visitedPlacePaths    = [visitedPlacePath];
    const visitedPlace         = surveyHelperNew.getResponse(interview, visitedPlacePath, null) as VisitedPlace;
    const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
    const nextVisitedPlace     = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
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
            unsetPaths: [...previous.unsetPaths, ...current.unsetPaths]
        }), { updatedValuesByPath: {}, unsetPaths: [] });
    
    startRemoveGroupedObjects(visitedPlacePaths, (updatedInterview) => {
      const person             = odSurveyHelper.getPerson({ interview: updatedInterview });
      const journey = odSurveyHelper.getJourneysArray({ person })[0];
      const visitedPlaces      = odSurveyHelper.getVisitedPlaces({ journey });
      const updateValuesByPath = updateVisitedPlaces(person, visitedPlaces, true);
      startUpdateInterview('visitedPlaces', Object.assign(updatedValues.updatedValuesByPath, updateValuesByPath), updatedValues.unsetPaths);
    });
};

const getGenderString = (person, femaleStr, maleStr, customStr, defaultStr) => {
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
};

const getDrivers = (interview: any, asArray: boolean = false): any => {
    const persons = odSurveyHelper.getPersons({ interview });
    const drivers: any = asArray ? [] : {};
    for (const personId in persons) {
        const person = persons[personId] as any;
        if (person.drivingLicenseOwner === 'yes') {
            if (asArray) {
                (drivers as any[]).push(person);
            } else {
                drivers[personId] = person;
            }
        }
    }
    return drivers;
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

const getTripTransferCategory = (trip: any): any => {
    if (trip)
    {
      const segments         = odSurveyHelper.getSegmentsArray({ trip });
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
};

const getHouseholdVisitedPlacesArrayAndByPersonId = function(interview)
{
  const persons                 = odSurveyHelper.getPersons({ interview });
  let   visitedPlaces           = [];
  const visitedPlacesByPersonId = {};
  for (let personId in persons)
  {
    const person                      = persons[personId];
    const journey = odSurveyHelper.getJourneysArray({ person })[0];
    const personVisitedPlaces         = odSurveyHelper.getVisitedPlaces({ journey });
    const personVisitedPlacesSorted   = Object.values(personVisitedPlaces).sort((visitedPlaceA, visitedPlaceB) => {
      return visitedPlaceA['_sequence'] - visitedPlaceB['_sequence'];
    });
    visitedPlaces                     = visitedPlaces.concat(personVisitedPlacesSorted);
    visitedPlacesByPersonId[personId] = personVisitedPlacesSorted;
  }
  return {visitedPlaces, visitedPlacesByPersonId};
};

const getShortcutVisitedPlaces = (interview: any): any => {
    const actualPerson = odSurveyHelper.getPerson({ interview });
    const journey = odSurveyHelper.getJourneysArray({ person: actualPerson })[0];
    const actualVisitedPlace = odSurveyHelper.getActiveVisitedPlace({ interview, journey });
    const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({ visitedPlaceId: actualVisitedPlace._uuid, journey });
    const previousVisitedPlaceGeography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace: previousVisitedPlace, person: actualPerson, interview });
    const previousVisitedPlaceCoordinates = _get(previousVisitedPlaceGeography, 'geometry.coordinates', null);
    const visitedPlacesArrayAndByPersonId = getHouseholdVisitedPlacesArrayAndByPersonId(interview);
    const shortcutsOrderedByPerson = [];
    for (const personId in visitedPlacesArrayAndByPersonId.visitedPlacesByPersonId) {
        const person = odSurveyHelper.getPerson({ interview, personId });
        const personVisitedPlaces = visitedPlacesArrayAndByPersonId.visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const visitedPlace = personVisitedPlaces[i];
            const visitedPlaceGeography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, person, interview });
            const visitedPlaceCoordinates = _get(visitedPlaceGeography, 'geometry.coordinates', null);
            const visitedPlaceDescription = getVisitedPlaceDescription(visitedPlace, true, false);
            if (
                visitedPlace.activity !== 'home' &&
                visitedPlace.activity !== 'workOnTheRoadFromHome' &&
                visitedPlace._uuid !== actualVisitedPlace._uuid &&
                !_isBlank(visitedPlaceCoordinates) &&
                !_isBlank(previousVisitedPlaceCoordinates) &&
                !isEqual(visitedPlaceCoordinates, previousVisitedPlaceCoordinates)
            ) {
                shortcutsOrderedByPerson.push({
                    personNickname: person.nickname,
                    visitedPlaceId: `household.persons.${personId}.visitedPlaces.${visitedPlace._uuid}`,
                    description: visitedPlaceDescription
                });
            }
        }
    }
    return shortcutsOrderedByPerson;
};

export default {
    homeSectionComplete,
    householdMembersSectionComplete,
    profileInfoForPersonComplete,
    isWorker,
    isStudent,
    travelBehaviorForPersonComplete,
    tripsIntroForPersonComplete,
    tripsForPersonComplete,
    allPersonsTripsAndTravelBehaviorComplete,
    selectNextVisitedPlaceId,
    deleteVisitedPlace,
    getGenderString,
    getDrivers,
    getTripTransferCategory,
    getShortcutVisitedPlaces
};