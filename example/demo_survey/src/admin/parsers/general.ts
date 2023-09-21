/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { isFeature } from 'geojson-validation';
import { distance as turfDistance } from '@turf/turf';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';

import helper from '../../survey/helper';

const shortname = 'general';
const prefix    = '';

const colorsPalette = [
  '#FFAE70',
  '#FFBCF2',
  '#F2ED6A',
  '#90E04A',
  '#61CAD8',
  '#9F70FF',
  '#FF6868',
  '#63A021',
  '#21A09E',
  '#4146B5',
  '#9F41B5',
  '#B5417B',
  '#B5B5B5',
  '#B59900',
  '#9E5135',
  '#FFAE70',
  '#FFBCF2',
  '#F2ED6A',
  '#90E04A',
  '#61CAD8',
  '#9F70FF',
  '#FF6868',
  '#63A021',
  '#21A09E',
  '#4146B5',
  '#9F41B5',
  '#B5417B'
]

const generateRandomHexColor = function() {
  return '#'+'0123456789abcdef'.split('').map(function(v,i,a){
    return i>5 ? null : a[Math.floor(Math.random()*16)] 
  }).join('');
}

export default {
  shortname,
  prefix,
  name: {
    fr: "Général",
    en: "General"
  },
  parsers: {
    interview: {
      ["responses.accessCode"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (responses.accessCode && responses.accessCode.startsWith('p'))
        {
          return responses.accessCode.toUpperCase();
        }
        return responses.accessCode;
      }
    },
    household: {
      
    },
    person: {
      ["visitedPlaces"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.didTripsOnTripsDate !== 'yes' && person.visitedPlaces && Object.values(person.visitedPlaces).length > 0)
        {
          return {};
        }
        return person.visitedPlaces;
      },
      ["trips"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.didTripsOnTripsDate !== 'yes' && person.trips && Object.values(person.trips).length > 0)
        {
          return {};
        }
        return person.trips;
      },
      ["_color"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (!person._color)
        {
          return colorsPalette[person._sequence] || colorsPalette[0];
        } 
        return person._color;
      },
      ["occupation"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.age >= 0 && person.age < 5 && person.occupation !== "nonApplicable")
        {
          return "nonApplicable";
        }
        return person.occupation;
      },
      ["noWorkTripReason"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        let newValue = person.noWorkTripReason;
        if (person["__general__correctedNoTripReasonAndWhoAnswered"] !== true && interview._responses)
        {
          const oldValue = _get(interview._responses, 'household.persons.' + person._uuid + '.noWorkTripReason', null);
          if (oldValue)
          {
            console.log('noWorkTripReason_responses:' + newValue + ' to ' + oldValue);
            newValue = oldValue;
          }
        }
        if (!helper.isWorker(person.occupation) && newValue !== 'nonApplicable' && person.didTripsOnTripsDateKnowTrips !== 'no' && person.didTripsOnTripsDate !== 'dontKnow')
        {
          console.log('noWorkTripReason->nonApplicable', 'before', newValue, 'occupation', person.occupation);
          return 'nonApplicable';
        }
        if (helper.isWorker(person.occupation))
        {
          if (person.usualWorkPlaceIsHome === true)
          {
            if (newValue !== 'usualWorkPlaceIsHome')
            {
              console.log('noWorkTripReason->usualWorkPlaceIsHome');
            }
            return newValue !== 'usualWorkPlaceIsHome' ? 'usualWorkPlaceIsHome' : newValue;
          }
          const visitedPlaces            = helper.getVisitedPlaces(person, true);
          const workRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
            return ['workUsual', 'workNotUsual', 'workOnTheRoad', 'workOnTheRoadFromUsualWork', 'workOnTheRoadFromHome'].indexOf(visitedPlace.activity) > -1;
          });
          if (workRelatedVisitedPlaces.length > 0 && newValue !== 'didMakeWorkTrips')
          {
            console.log('noWorkTripReason->didMakeWorkTrips', workRelatedVisitedPlaces.length);
            return 'didMakeWorkTrips';
          }
        }
        return newValue;
      },
      ["noSchoolTripReason"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        let newValue = person.noSchoolTripReason;
        if (person["__general__correctedNoTripReasonAndWhoAnswered"] !== true && interview._responses)
        {
          const oldValue = _get(interview._responses, 'household.persons.' + person._uuid + '.noSchoolTripReason', null);
          if (oldValue)
          {
            console.log('noSchoolTripReason_responses:' + newValue + ' to ' + oldValue);
            newValue = oldValue;
          }
        }
        if (!helper.isStudent(person.occupation) && newValue !== 'nonApplicable')
        {
          return 'nonApplicable';
        }
        return newValue;
      },
      ["whoAnsweredForThisPerson"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person['__general__correctedNoTripReasonAndWhoAnswered'] !== true && interview._responses)
        {
          const oldValue = _get(interview._responses, 'household.persons.' + person._uuid + '.whoAnsweredForThisPerson', null);
          if (oldValue)
          {
            person.whoAnsweredForThisPerson = oldValue;
          }
        }
        return person.whoAnsweredForThisPerson;
      },
      ["__general__correctedNoTripReasonAndWhoAnswered"]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        return true;
      }
    },
    visitedPlace: {
      //['geography']: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
      //  const allVisitedPlaces = helper.getHouseholdVisitedPlacesArrayAndByPersonId();
      //  const geography        = helper.getGeography(visitedPlace, person, interview);
      //  for(const personId in allVisitedPlaces.visitedPlacesByPersonId)
      //  {
      //    const _person        = personsById[personId];
      //    const _visitedPlaces = helper.getVisitedPlaces(_person, true);
      //    for (let i = 0, count = _visitedPlaces.length; i < count; i++)
      //    {
      //      const _visitedPlace = _visitedPlaces[i];
      //      const _geography    = helper.getGeography(_visitedPlace, _person, interview);
      //      if(_geography && geography)
      //      {
      //        const distance = turfDistance(geography.geometry, _geography.geometry, {units: 'meters'});
      //        if (distance < 10)
      //        {
      //          
      //        }
      //      }
      //    }
      //  }
      //},
      ['arrivalTime']: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const previousVisitedPlace = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
        if (visitedPlace && previousVisitedPlace && previousVisitedPlace.departureTime >= 0 && visitedPlace.arrivalTime >= 0 && visitedPlace.activity !== 'workOnTheRoadFromHome' && previousVisitedPlace.departureTime === visitedPlace.arrivalTime)
        {
          if (!visitedPlace.departureTime || visitedPlace.departureTime > visitedPlace.arrivalTime + 300)
          {
            return visitedPlace.arrivalTime + 300;
          }
          if (!visitedPlace.departureTime || visitedPlace.departureTime > visitedPlace.arrivalTime + 60)
          {
            return visitedPlace.arrivalTime + 60;
          }
        }
        return visitedPlace.arrivalTime;
      },
      ['departureTime']: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const nextVisitedPlace = helper.getNextVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
        if (visitedPlace && visitedPlace.departureTime >= 0 && visitedPlace.arrivalTime >= 0 && visitedPlace.activity !== 'workOnTheRoadFromHome' && visitedPlace.departureTime === visitedPlace.arrivalTime)
        {
          if (nextVisitedPlace && nextVisitedPlace.arrivalTime >= 0 && nextVisitedPlace.arrivalTime > visitedPlace.departureTime + 300)
          {
            return visitedPlace.departureTime + 300;
          }
          if (nextVisitedPlace && nextVisitedPlace.arrivalTime >= 0 && nextVisitedPlace.arrivalTime > visitedPlace.departureTime + 60)
          {
            return visitedPlace.departureTime + 60;
          }
        }
        return visitedPlace.departureTime;
      },
      ['activity']: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        if (visitedPlace.activity === 'schoolNotUsual' && person.usualSchoolPlace && isFeature(person.usualSchoolPlace))
        {
          const geography = helper.getGeography(visitedPlace, person, interview);
          if (isFeature(geography))
          {
            const distance = turfDistance(geography.geometry, person.usualSchoolPlace.geometry, {units: 'meters'});
            if (distance <= 200)
            {
              return 'schoolUsual';
            }
          }
        }
        return visitedPlace.activity;
      }
    },
    trip: {
 
      // remove walk from multimode and resequence:
      ['segments']: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const segmentsById  = helper.getSegments(trip, false);
        const segmentsArray = helper.getSegments(trip, true);
        if (segmentsArray.length > 1)
        {
          const newSegmentsById = {};
          let sequence          = 1;
          for (let i = 0, count = segmentsArray.length; i < count; i++)
          {
            const segment = segmentsArray[i];
            if (segment.mode !== 'walk')
            {
                              segment._sequence = sequence;
              newSegmentsById[segment._uuid]    = segment;
              sequence++;
            }
          }
          return newSegmentsById;
        }
        else
        {
          const segment = segmentsArray[0];
          if (segment)
          {
            segment._sequence = 1;
            return {[segment._uuid]: segment};
          }
        }
        return segmentsById;
      }
    },
    segment: {
      
    }
  }
};