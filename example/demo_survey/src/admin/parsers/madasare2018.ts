/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-timezone';
import truncate from 'lodash.truncate';
import { isFeature } from 'geojson-validation';
import { distance as turfDistance } from '@turf/turf';
import _uniq from 'lodash.uniq';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import sharedHelper from 'evolution-legacy/lib/helpers/shared/shared';
import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';
import helper from '../../survey/helper';
import applicationConfiguration from 'evolution-frontend/lib/config/application.config';
import busRoutesGeojson from '../../survey/busRoutes.json';
import subwayStationsGeojson from '../../survey/subwayStations.json';
import trainStationsGeojson from '../../survey/trainStations.json';

const shortname = 'madasare2018';
const prefix    = '__madasare2018__';

const timezone = config.timezone || 'America/Montreal';

const busRoutesBySlug = {};

for (let i = 0, count = busRoutesGeojson.features.length; i < count; i++)
{
  const busRouteGeojson = busRoutesGeojson.features[i];
  busRoutesBySlug[busRouteGeojson.properties.slug] = busRouteGeojson.properties;
}

const subwayStationsByShortname = {};

for (let i = 0, count = subwayStationsGeojson.features.length; i < count; i++)
{
  const subwayStationGeojson = subwayStationsGeojson.features[i];
  subwayStationsByShortname[subwayStationGeojson.properties.shortname] = subwayStationGeojson.properties;
}

const trainStationsByShortname = {};

for (let i = 0, count = trainStationsGeojson.features.length; i < count; i++)
{
  const trainStationGeojson = trainStationsGeojson.features[i];
  trainStationsByShortname[trainStationGeojson.properties.shortname] = trainStationGeojson.properties;
}

const ageGroups = [
  [[0 ,4  ], 1 ], 
  [[5 ,9  ], 2 ], 
  [[10,14 ], 3 ], 
  [[15,19 ], 4 ], 
  [[20,24 ], 5 ], 
  [[25,29 ], 6 ], 
  [[30,34 ], 7 ], 
  [[35,39 ], 8 ], 
  [[40,44 ], 9 ], 
  [[45,49 ], 10], 
  [[50,54 ], 11], 
  [[55,59 ], 12], 
  [[60,64 ], 13], 
  [[65,69 ], 14], 
  [[70,74 ], 15], 
  [[75,999], 16]
];

const timePeriods = [
  [[0    , 21599 ], 1],
  [[21600, 32399 ], 2],
  [[32400, 43199 ], 3],
  [[43200, 55799 ], 4],
  [[55800, 66599 ], 5],
  [[66600, 86399 ], 6],
  [[86400, 100800], 7]
];

const getIdLocalSequenceAndGeography = function(home, interview, personsArray, personUuid = null /* for usual place */, visitedPlaceUuid = null, tripUuid = null /* for junction */) {
  let   localSequence = 1;
  const homeIdLocal   = 1;
  let   idLocal       = 3; // début à 3 (1 et 2 utilisés pour l'adresse du domicile)
  for (let i = 0; i < personsArray.length; i++)
  {
    let   personUsualPlaceIdLocal: number | null = null;
    const person                  = personsArray[i];
    const proxyOccupation         = getProxyOccupation(person);
    let   personUsualTypePlace: string | null    = null;
    if (helper.isWorker(proxyOccupation) && person.usualWorkPlace)
    {
      if (personUuid && personUuid === person._uuid)
      {
        return [idLocal, person.usualWorkPlace, 'usualPlace', localSequence];
      }
      personUsualTypePlace    = 'work';
      personUsualPlaceIdLocal = idLocal;
      idLocal++;
    }
    else if (helper.isStudent(proxyOccupation) && person.usualSchoolPlace)
    {
      if (personUuid && personUuid === person._uuid)
      {
        return [idLocal, person.usualSchoolPlace, 'usualPlace', localSequence];
      }
      personUsualTypePlace    = 'school';
      personUsualPlaceIdLocal = idLocal;
      idLocal++;
    }
    const visitedPlacesArray = helper.getVisitedPlaces(person, true);
    for (let i = 0, count = visitedPlacesArray.length; i < count; i++)
    {
      const visitedPlace = visitedPlacesArray[i];
      if (personUsualTypePlace === 'work' && ['workUsual', 'workOnTheRoadFromUsualWork'].includes(visitedPlace.activity))
      {
        if (visitedPlaceUuid === visitedPlace._uuid)
        {
          return [personUsualPlaceIdLocal, person.usualWorkPlace, 'usualPlace', localSequence];
        }
      }
      else if(personUsualTypePlace === 'school' && visitedPlace.activity === 'schoolUsual')
      {
        if (visitedPlaceUuid === visitedPlace._uuid)
        {
          return [personUsualPlaceIdLocal, person.usualSchoolPlace, 'usualPlace', localSequence];
        }
      }
      else if (personUsualTypePlace === 'school' && visitedPlace.activity === 'schoolNotUsual') // fix missing schoolUsusal in questionnaire for students less than 15
      {
        const geography = helper.getGeography(visitedPlace, person, interview);
        if (isFeature(geography))
        {
          const distanceBetweenUsualSchoolPlaceAndVisitedPlace = turfDistance(geography.geometry, person.usualSchoolPlace.geometry, {units: 'meters'});
          if (distanceBetweenUsualSchoolPlaceAndVisitedPlace <= 200)
          {
            if (visitedPlaceUuid === visitedPlace._uuid)
            {
              return [personUsualPlaceIdLocal, person.usualSchoolPlace, 'usualPlace', localSequence];
            }
          }
        }
      }
      else if (['home', 'workOnTheRoadFromHome'].includes(visitedPlace.activity))
      {
        if (visitedPlaceUuid === visitedPlace._uuid)
        {
          return [homeIdLocal, home.geography, 'home', localSequence];
        }
      }
      else
      {
        if (visitedPlaceUuid === visitedPlace._uuid)
        {
          const geography = helper.getGeography(visitedPlace, person, interview);
          return [idLocal, geography, 'visitedPlace', localSequence];
        }
        idLocal++;
      }
      localSequence++;
    }
    const tripsArray = helper.getTrips(person, true);
    for (let i = 0, count = tripsArray.length; i < count; i++)
    {
      const trip = tripsArray[i];
      if (trip.junctionGeography && isFeature(trip.junctionGeography))
      {
        if (tripUuid === trip._uuid)
        {
          return [idLocal, trip.junctionGeography, 'junction', localSequence];
        }
        localSequence++;
        idLocal++;
      }
    }
  }
  return [null, null, null];
};

const getProxyOccupation = function(person) {
  if (person.occupation === 'workerAndStudent')
  {
    const visitedPlaces            = helper.getVisitedPlaces(person, true);
    const workRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
      return ['workUsual', 'workNotUsual', 'workOnTheRoad', 'workOnTheRoadFromUsualWork', 'workOnTheRoadFromHome'].indexOf(visitedPlace.activity) > -1;
    });
    const schoolRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
      return ['schoolUsual','schoolNotUsual'].indexOf(visitedPlace.activity) > -1;
    });

    if (workRelatedVisitedPlaces.length > 0 && schoolRelatedVisitedPlaces.length === 0)
    {
      return 'partTimeWorker';
    }
    else if (workRelatedVisitedPlaces.length === 0 && schoolRelatedVisitedPlaces.length > 0)
    {
      return 'fullTimeStudent';
    }
    else if (workRelatedVisitedPlaces.length > 0 && schoolRelatedVisitedPlaces.length > 0)
    {
      let workDuration   = 0;
      let schoolDuration = 0;
      for (let i = 0; i < workRelatedVisitedPlaces.length; i++)
      {
        const visitedPlace  = workRelatedVisitedPlaces[i];
        const arrivalTime   = visitedPlace.arrivalTime   || 0;
        const departureTime = visitedPlace.departureTime || 3600 * 28;
        const duration      = departureTime - arrivalTime;
        workDuration += duration;
      }
      for (let i = 0; i < schoolRelatedVisitedPlaces.length; i++)
      {
        const visitedPlace  = schoolRelatedVisitedPlaces[i];
        const arrivalTime   = visitedPlace.arrivalTime   || 0;
        const departureTime = visitedPlace.departureTime || 3600 * 28;
        const duration      = departureTime - arrivalTime;
        schoolDuration += duration;
      }
      if (workDuration > schoolDuration)
      {
        return 'partTimeWorker';
      }
      else if (schoolDuration > workDuration)
      {
        return 'fullTimeStudent';
      }
    }
    return 'fullTimeStudent';
  }
  return person.occupation;
};

const getInternalId = function(widgetName, interview, value, defaultValue: number | null = null)
{
  const widget = applicationConfiguration.widgets[widgetName];
  const choice = surveyHelper.getWidgetChoiceFromValue(widget, value, interview);
  if (choice && choice.internalId)
  {
    return parseInt(choice.internalId);
  }
  return defaultValue;
};

const getFeuillet = function(interviewId) {

  if (interviewId >= 1000000)
  {
    if (interviewId >= 1000000 && interviewId < 2000000)
    {
      return interviewId - 1000000 + 800000 + 20000;
    }
    else if (interviewId >= 2000000 && interviewId < 3000000)
    {
      return interviewId - 2000000 + 800000 + 30000;
    }
    else if (interviewId >= 3000000 && interviewId < 4000000)
    {
      return interviewId - 3000000 + 800000 + 40000;
    }
    else if (interviewId >= 4000000 && interviewId < 5000000)
    {
      return interviewId - 4000000 + 800000 + 50000;
    }
    else if (interviewId >= 5000000 && interviewId < 6000000)
    {
      return interviewId - 5000000 + 800000 + 60000;
    }
    else if (interviewId >= 6000000 && interviewId < 7000000)
    {
      return interviewId - 6000000 + 800000 + 70000;
    }
    else if (interviewId >= 7000000)
    {
      return interviewId - 7000000 + 800000 + 80000;
    }
  }
  return interviewId + 800000; // web de 800000 à 899999;
};

export default {
  shortname,
  prefix,
  name: {
    fr: "MADASARE 2018",
    en: "MADASARE 2018"
  },
  parsers: {
    interview: {},
    household: {
      [`${prefix}glo_domic.feuillet`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return getFeuillet(interview.id);
      },
      [`${prefix}glo_domic.langue`]: function(user, interview, responses, household, home, personsById, personsArray) {
        if (responses._language === 'fr')
        {
          return 1;
        }
        else if (responses._language === 'en')
        {
          return 2;
        }
        return 0;
      },
      [`${prefix}glo_domic.langue_aut`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.statut`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return 1; // participation web
      },
      [`${prefix}glo_domic.revenu`]: function(user, interview, responses, household, home, personsById, personsArray) {
        if (!household)
        {
          return 0;
        }
        const internalId = getInternalId('householdIncome', interview, household.income, 0);
        if (internalId)
        {
          return internalId;
        }
        else if (responses._isCompleted || responses._completedAt)
        {
          return 9; // refus
        }
        return 0; // entrevue non complétée
      },
      [`${prefix}glo_domic.interv`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return 1; // accepte de participer
      },
      [`${prefix}glo_domic.telep`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.maj_rep`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.repondant`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.nom`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.maj_adr`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return 1; // addresse valide
      },
      [`${prefix}glo_domic.nb_pers`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return household.size;
      },
      [`${prefix}glo_domic.nb_auto`]: function(user, interview, responses, household, home, personsById, personsArray) {
        if (household.carNumber === 0)
        {
          return 15;
        }
        else if (household.carNumber >= 14)
        {
          return 14;
        }
        return household.carNumber;
      },
      [`${prefix}glo_domic.c_telep`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.c_repond`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.remarque`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.note`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.Date_sond`]: function(user, interview, responses, household, home, personsById, personsArray) {
        if (responses._partTwoStartedAt || responses._startedAt)
        {
          return moment.unix(responses._partTwoStartedAt || responses._startedAt).tz(timezone).format('YYYY-MM-DD');
        }
        return null;
      },
      [`${prefix}glo_domic.Date_dpl`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return responses.tripsDate;
      },
      [`${prefix}glo_domic.incaplogi`]: function(user, interview, responses, household, home, personsById, personsArray) {
        for (const personId in personsById)
        {
          const person = personsById[personId];
          if (person.hasDisability === 'yes')
          {
            return 1;
          }
        }
        return 2;
      },
      [`${prefix}glo_domic.contact`]: function(user, interview, responses, household, home, personsById, personsArray) {
        if (household.wouldLikeToParticipateInOtherSurveys === true)
        {
          return 1;
        }
        return 2;
      },
      [`${prefix}glo_domic.Cont_info`]: function(user, interview, responses, household, home, personsById, personsArray) {
        return null;
      },
      [`${prefix}glo_domic.courriel`]: function(user, interview, responses, household, home, personsById, personsArray) {
        if (!sharedHelper.isBlank(household.contactEmail))
        {
          return household.contactEmail;
        }
        return null;
      },
      [`${prefix}glo_domic.source`]: function(user, interview, responses, household, home, personsById, personsArray) {
        const interviewId = interview.id;
        if (interviewId >= 1000000)
        {
          if (interviewId >= 1000000 && interviewId < 2000000)
          {
            return 'communauto';
          }
          else if (interviewId >= 2000000 && interviewId < 3000000)
          {
            return 'bixi';
          }
          else if (interviewId >= 3000000 && interviewId < 4000000)
          {
            return 'mcgill';
          }
          else if (interviewId >= 4000000 && interviewId < 5000000)
          {
            return 'poly';
          }
          else if (interviewId >= 5000000 && interviewId < 6000000)
          {
            return 'udem';
          }
          else if (interviewId >= 6000000 && interviewId < 7000000)
          {
            return 'uqam';
          }
          else if (interviewId >= 7000000)
          {
            return 'autre'
          }
        }
        return 'web';
      },
      [`${prefix}home__glo_local`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        
        const civicNumberRegex = /^\d+(?!\w)/;
        let   civicNumber      = null;
        const civicNumberMatch = home.address ? home.address.match(civicNumberRegex) : null;
        if (civicNumberMatch)
        {
          civicNumber = parseInt(civicNumberMatch);
          if (civicNumber === 0)
          {
            console.log('civicNumber = 0 for accessCode ' + responses.accessCode);
          }
        }
        
        const streetNameRegex = /^\d+(?!\w)(,?)(\s*)(.+)$/;
        let   streetName      = null;
        const streetNameMatch = home.address ? home.address.match(streetNameRegex) : null;
        if (streetNameMatch && streetNameMatch[3])
        {
          streetName = streetNameMatch[3];
          if (streetName.length > 40)
          {
            streetName = truncate(streetName, {length: 40});
          }
        }

        const city            = home.city            ? truncate(home.city, {length: 35}) : null;
        const postalCode      = home.postalCode      ? truncate(home.postalCode.replace(/\s/g, '').toUpperCase(), {length: 6, omission: ""}) : null;
        const apartmentNumber = home.apartmentNumber ? truncate(home.apartmentNumber, {length: 6, omission: ""}) : null;
        const idLocal         = 1;
        const feuillet        = getFeuillet(interview.id);
        if (home.geography && isFeature(home.geography))
        {
          return {
            feuillet : feuillet,
            id_local : idLocal,
            gener    : null,
            rue_int  : null,
            no_civ   : civicNumber,
            no_app   : apartmentNumber,
            rue      : streetName,
            munic    : city,
            codep    : postalCode,
            region   : null,
            lon      : home.geography.geometry.coordinates[0],
            lat      : home.geography.geometry.coordinates[1],
            diction  : 'GMAPS',
            err_local: 0
          };
        }
      }
    },
    person: {
      [`${prefix}glo_pers.feuillet`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        return getFeuillet(interview.id);
      },
      [`${prefix}glo_pers.no_pers`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        return person._sequence;
      },
      [`${prefix}glo_pers.permis`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const internalId = getInternalId('personDrivingLicenseOwner', interview, person.drivingLicenseOwner, 0);
        if (internalId)
        {
          return internalId;
        }
        else if (person.age < 16)
        {
          return 5; // non applicable
        }
        return 0; // entrevue non complétée
      },
      [`${prefix}glo_pers.prenom`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        return null;
      },
      [`${prefix}glo_pers.age`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        return person.age <= 99 ? person.age : 99;
      },
      [`${prefix}glo_pers.grage`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        for (let i = 0, count = ageGroups.length; i < count; i++)
        {
          const ageGroup = ageGroups[i];
          if (person.age >= ageGroup[0][0] && person.age <= ageGroup[0][1])
          {
            return ageGroup[1];
          }
        }
        return 0;
      },
      [`${prefix}glo_pers.sexe`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const internalId = getInternalId('personGender', interview, person.gender, 0);
        if (internalId)
        {
          return internalId;
        }
        return 0;
      },
      [`${prefix}glo_pers.statut`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person && person.age < 5 && person.age >= 0)
        {
          return 6;
        }
        const proxyOccupation = getProxyOccupation(person);
        if (proxyOccupation)
        {
          const internalId = getInternalId('personOccupation', interview, proxyOccupation, 0);
          if (internalId)
          {
            return internalId;
          }
        }
        return 0;
      },
      [`${prefix}glo_pers.deplac`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.age < 5)
        {
          return 3;
        }
        else if (person.didTripsOnTripsDate === 'yes')
        {
          return 1;
        }
        else if (person.didTripsOnTripsDate === 'no')
        {
          return 2;
        }
        else if (person.didTripsOnTripsDateKnowTrips === 'no' || person.didTripsOnTripsDate === 'dontKnow')
        {
          return 4;
        }
        return 0;
      },
      [`${prefix}glo_pers.lieu_habit`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.age < 5)
        {
          return 2;
        }
        else if (!helper.isWorker(person.occupation) && !helper.isStudent(person.occupation))
        {
          return 3;
        }
        else if (person.usualWorkPlaceIsHome === true)
        {
          return 1;
        }
        else if (person.usualWorkPlace || person.usualSchoolPlace)
        {
          return 12; // ajouter coordonnées géographiques XY dans madasare
        }
        return 0;
      },
      [`${prefix}glo_pers.id_local`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        return getIdLocalSequenceAndGeography(home, interview, personsArray, person._uuid, null, null)[0];
      },
      [`${prefix}glo_pers.titre`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.age <= 5)
        {
          return 8;
        }
        else if (person.transitPassOwner === 'yes')
        {
          const transitPasses = person.transitPasses || [];
          const transitPass   = transitPasses[0]; // ignore if more than one transit pass
          const internalId = getInternalId('personTransitPasses', interview, transitPass, 10);
          if (internalId)
          {
            return internalId;
          }
        }
        else if (person.transitPassOwner === 'no')
        {
          return 9;
        }
        return 10;
      },
      [`${prefix}glo_pers.abon_ap`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.age < 16 || person.drivingLicenseOwner !== 'yes')
        {
          return 4;
        }
        else if (person.carsharingMember === 'yes')
        {
          return 1;
        }
        else if (person.carsharingMember === 'no')
        {
          return 2;
        }
        return 3;
      },
      [`${prefix}glo_pers.abon_vls`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.age < 14)
        {
          return 4;
        }
        else if (person.bikesharingMember === 'yes')
        {
          return 1;
        }
        else if (person.bikesharingMember === 'no')
        {
          return 2;
        }
        return 3;
      },
      [`${prefix}glo_pers.tele_trav`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (!helper.isWorker(person.occupation))
        {
          return 4;
        }
        const visitedPlaces            = helper.getVisitedPlaces(person, true);
        const workRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
          return ['workUsual', 'workNotUsual', 'workOnTheRoad', 'workOnTheRoadFromUsualWork', 'workOnTheRoadFromHome'].indexOf(visitedPlace.activity) > -1;
        });
        const numWorkTrips = workRelatedVisitedPlaces.length;
        if (person.noWorkTripReason === 'workAtHome' && numWorkTrips === 0)
        {
          return 1;
        }
        else if (person.usualWorkPlaceIsHome === true && numWorkTrips === 0)
        {
          return 1;
        }
        else if (person.usualWorkPlaceIsHome !== true && numWorkTrips > 0)
        {
          return 2;
        }
        else
        {
          return 4;
        }
      },
      [`${prefix}glo_pers.incap`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.hasDisability === 'yes')
        {
          return 1;
        }
        else if (person.hasDisability === 'no')
        {
          return 2;
        }
        return 3;
      },
      [`${prefix}usual_place__glo_local`]: function(user, interview, responses, household, home, personsById, personsArray, person) {
        let usualPlace        = null;
        let usualPlaceName    = null;
        const proxyOccupation = getProxyOccupation(person);
        if (helper.isWorker(proxyOccupation))
        {
          usualPlace     = person.usualWorkPlace;
          usualPlaceName = person.usualWorkPlaceName;
        }
        else if (helper.isStudent(proxyOccupation))
        {
          usualPlace     = person.usualSchoolPlace;
          usualPlaceName = person.usualSchoolPlaceName;
        }
        if (usualPlace)
        {
          const idLocal  = getIdLocalSequenceAndGeography(home, interview, personsArray, person._uuid, null, null)[0];
          const feuillet = getFeuillet(interview.id);
          return {
            feuillet : feuillet,
            id_local : idLocal,
            gener    : usualPlaceName ? truncate(usualPlaceName, {length: 57}).replace('"', '').replace(',', ' ').replace(';', ' ') : null,
            rue_int  : null,
            no_civ   : null,
            no_app   : null,
            rue      : null,
            munic    : null,
            codep    : null,
            region   : null,
            lon      : usualPlace.geometry.coordinates[0],
            lat      : usualPlace.geometry.coordinates[1],
            diction  : 'GMAPS',
            err_local: 0
          };
        }
      }
      
    },
    visitedPlace: {
      [`${prefix}glo_local`]: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const idLocalAndGeography  = getIdLocalSequenceAndGeography(home, interview, personsArray, null, visitedPlace._uuid, null);
        if (idLocalAndGeography[2] === 'visitedPlace' && isFeature(idLocalAndGeography[1]))
        {
          const feuillet = getFeuillet(interview.id);
          return {
            feuillet : feuillet,
            id_local : idLocalAndGeography[0],
            gener    : visitedPlace.name ? visitedPlace.name.replace('"', '').replace(',', ' ').replace(';', ' ') : "",
            rue_int  : null,
            no_civ   : null,
            no_app   : null,
            rue      : null,
            munic    : null,
            codep    : null,
            region   : null,
            lon      : idLocalAndGeography[1].geometry.coordinates[0],
            lat      : idLocalAndGeography[1].geometry.coordinates[1],
            diction  : 'GMAPS',
            err_local: 0
          };
        }
        return null;
      }
    },
    trip: {
      [`${prefix}glo_deplac_som.feuillet`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        return getFeuillet(interview.id);
      },
      [`${prefix}glo_deplac_som.no_pers`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        return person._sequence;
      },
      [`${prefix}glo_deplac_som.no_deplac`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        return trip._sequence;
      },
      [`${prefix}glo_deplac_som.motif`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const visitedPlacesById = helper.getVisitedPlaces(person, false);
        const destination       = helper.getDestination(trip, visitedPlacesById);
        const internalId        = destination ? getInternalId('visitedPlaceActivity', interview, destination.activity) : null;
        if (destination.activity === 'secondaryHome' && destination.name && (destination.name.toLowerCase().includes('chalet') || destination.name.toLowerCase().includes('cottage')))
        {
          return '12';
        }
        if (internalId)
        {
          return internalId;
        }
        else
        {
          return 13;
        }
      },
      [`${prefix}glo_deplac_som.heure`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const visitedPlacesById = helper.getVisitedPlaces(person, false);
        const startAt           = helper.getStartAt(trip, visitedPlacesById);
        if (!sharedHelper.isBlank(startAt) && startAt >= 0)
        {
          const hour   = Math.floor(startAt / 3600);
          const minute = Math.floor((startAt - hour * 3600) / 60);
          return hour * 100 + minute;
        }
        else
        {
          return null;
        }
      },
      [`${prefix}glo_deplac_som.grhre`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const visitedPlacesById = helper.getVisitedPlaces(person, false);
        const startAt           = helper.getStartAt(trip, visitedPlacesById);
        if (!sharedHelper.isBlank(startAt) && startAt >= 0 && startAt <= 100800)
        {
          for (let i = 0; i < timePeriods.length; i++)
          {
            const timePeriod = timePeriods[i];
            if (startAt >= timePeriod[0][0] && startAt <= timePeriod[0][1])
            {
              return timePeriod[1];
            }
          }
        }
        else
        {
          return 8;
        }
      },
      [`${prefix}glo_deplac_som.repond`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const whoAnsweredForThisPersonUuid = person.whoAnsweredForThisPerson;
        if (whoAnsweredForThisPersonUuid)
        {
          const respondent = personsById[whoAnsweredForThisPersonUuid];
          if (respondent)
          {
            return respondent._sequence;
          }
        }
        return null;
      },
      [`${prefix}glo_deplac_som.station_p`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const segmentsArray      = helper.getSegments(trip, true);
        let   foundCarDriverMode = false;
        for (let i = 0, count = segmentsArray.length; i < count; i++)
        {
          const segment = segmentsArray[i];
          if (segment.mode === 'carDriver')
          {
            foundCarDriverMode = true;
            if (segment.parkingPaymentType)
            {
              const internalId = getInternalId('segmentParkingPaymentType', interview, segment.parkingPaymentType, 4);
              return internalId;
            }
          }
        }
        if (foundCarDriverMode === true)
        {
          return 4;
        }
        return 5;
      },
      [`${prefix}glo_deplac_som.pont`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const segmentsArray      = helper.getSegments(trip, true);
        let   foundCarDriverMode = false;
        for (let i = 0, count = segmentsArray.length; i < count; i++)
        {
          const segment = segmentsArray[i];
          if (segment.mode === 'carDriver')
          {
            foundCarDriverMode = true;
            if (segment.bridgesAndTunnels && segment.bridgesAndTunnels.length > 0)
            {
              const internalId = getInternalId('segmentBridgesAndTunnels', interview, segment.bridgesAndTunnels[0], 720);
              return internalId;
            }
          }
        }
        if (foundCarDriverMode === true)
        {
          return 720;
        }
        return 0;
      },
      [`${prefix}glo_deplac_som.pont2`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const segmentsArray      = helper.getSegments(trip, true);
        for (let i = 0, count = segmentsArray.length; i < count; i++)
        {
          const segment = segmentsArray[i];
          if (segment.mode === 'carDriver')
          {
            if (segment.bridgesAndTunnels && segment.bridgesAndTunnels.length > 1)
            {
              const internalId = getInternalId('segmentBridgesAndTunnels', interview, segment.bridgesAndTunnels[1], 720);
              return internalId;
            }
          }
        }
        return 0;
      },
      [`${prefix}glo_deplac_som.dao`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        return null;
      },
      [`${prefix}glo_deplac_som.dad`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        return null;
      },
      [`${prefix}glo_deplac_som.joncd_f`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const tripTransferCategory = helper.getTripTransferCategory(trip);
        if (tripTransferCategory && tripTransferCategory.category === 'private_public')
        {
          return 1;
        }
        else if (tripTransferCategory && tripTransferCategory.category === 'public_private')
        {
          return 2;
        }
        return 0;
      },
      [`${prefix}glo_deplac_som.pers_auto`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const segmentsArray      = helper.getSegments(trip, true);
        for (let i = 0, count = segmentsArray.length; i < count; i++)
        {
          const segment = segmentsArray[i];
          if (segment.mode === 'carDriver')
          {
            if (segment.vehicleOccupancy > 0)
            {
              return segment.vehicleOccupancy < 19 ? segment.vehicleOccupancy : 19;
            }
          }
        }
        return null;
      },
      [`${prefix}glo_deplac_som.auto_ap`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        if (person.carsharingMember === 'yes')
        {
          const segmentsArray = helper.getSegments(trip, true);
          let   foundCarDriverMode = false;
          for (let i = 0, count = segmentsArray.length; i < count; i++)
          {
            const segment = segmentsArray[i];
            if (segment.mode === 'carDriver')
            {
              foundCarDriverMode = true;
              if (['freeFloatingAutoMobile', 'stationBasedCommunauto', 'freeFloatingCar2Go'].includes(segment.vehicleType))
              {
                return 1;
              }
              if (!sharedHelper.isBlank(segment.vehicleType))
              {
                return 2;
              }
            }
          }
          if (foundCarDriverMode === true)
          {
            return 3;
          }
        }
        return 4;
      },
      [`${prefix}glo_deplac_som.velo_ls`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        if (person.bikesharingMember === 'yes')
        {
          const segmentsArray    = helper.getSegments(trip, true);
          let   foundBicycleMode = false;
          for (let i = 0, count = segmentsArray.length; i < count; i++)
          {
            const segment = segmentsArray[i];
            if (segment.mode === 'bicycle')
            {
              foundBicycleMode = true;
              if (segment.usedBikesharing === 'yes')
              {
                return 1;
              }
              else if (segment.usedBikesharing === 'no' || segment.usedBikesharing === 'notABikesharingMember' || !sharedHelper.isBlank(segment.usedBikesharing))
              {
                return 2;
              }
              else if (segment.usedBikesharing === 'dontKnow')
              {
                return 3;
              }
            }
          }
          if (foundBicycleMode === true)
          {
            return 3;
          }
        }
        return 4;
      },
      [`${prefix}junction__glo_local`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        if (trip.junctionGeography && isFeature(trip.junctionGeography))
        {
          const idLocalAndGeography  = getIdLocalSequenceAndGeography(home, interview, personsArray, null, null, trip._uuid);
          if (idLocalAndGeography[2] === 'junction')
          {
            const feuillet = getFeuillet(interview.id);
            return {
              feuillet : feuillet,
              id_local : idLocalAndGeography[0],
              gener    : null,
              rue_int  : null,
              no_civ   : null,
              no_app   : null,
              rue      : null,
              munic    : null,
              codep    : null,
              region   : null,
              lon      : idLocalAndGeography[1].geometry.coordinates[0],
              lat      : idLocalAndGeography[1].geometry.coordinates[1],
              diction  : 'GMAPS',
              err_local: 0
            };
          }
        }
        return null;
      },
      [`${prefix}origin__glo_deplac_local`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        
        const idLocalAndGeography  = getIdLocalSequenceAndGeography(home, interview, personsArray, null, trip._originVisitedPlaceUuid, null);
        for (let i = 0, count = tripsArray.length; i < count; i++)
        {
          const _trip           = tripsArray[i];
          const originUuid      = _trip._originVisitedPlaceUuid;
          if (trip._originVisitedPlaceUuid === originUuid)
          {
            break;
          }
        }
        if (idLocalAndGeography[2] === 'visitedPlace' || idLocalAndGeography[2] === 'usualPlace' || idLocalAndGeography[2] === 'home')
        {
          const feuillet = getFeuillet(interview.id);
          return {
            feuillet  : feuillet,
            no_pers   : person._sequence,
            no_deplac : trip._sequence,
            seq       : 1,
            type_local: 'ORIG',
            id_local  : idLocalAndGeography[0]
          };
        }
        return null;
      },
      [`${prefix}destination__glo_deplac_local`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const idLocalAndGeography  = getIdLocalSequenceAndGeography(home, interview, personsArray, null, trip._destinationVisitedPlaceUuid, null);
        for (let i = 0, count = tripsArray.length; i < count; i++)
        {
          const _trip           = tripsArray[i];
          const destinationUuid = _trip._destinationVisitedPlaceUuid;
          if (trip._destinationVisitedPlaceUuid === destinationUuid)
          {
            break;
          }
        }
        if (idLocalAndGeography[2] === 'visitedPlace' || idLocalAndGeography[2] === 'usualPlace' || idLocalAndGeography[2] === 'home')
        {
          const feuillet = getFeuillet(interview.id);
          return {
            feuillet  : feuillet,
            no_pers   : person._sequence,
            no_deplac : trip._sequence,
            seq       : (trip.junctionGeography && isFeature(trip.junctionGeography) ? 3 : 2),
            type_local: 'DEST',
            id_local  : idLocalAndGeography[0]
          };
        }
        return null;
      },
      [`${prefix}junction__glo_deplac_local`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        if (trip.junctionGeography && isFeature(trip.junctionGeography))
        {
          const idLocalAndGeography      = getIdLocalSequenceAndGeography(home, interview, personsArray, null, null, trip._uuid);
          for (let i = 0, count = tripsArray.length; i < count; i++)
          {
            const _trip = tripsArray[i];
            if (_trip.junctionGeography && isFeature(_trip.junctionGeography))
            {
              if (_trip._uuid === trip._uuid)
              {
                break;
              }
            }
          }
          if (idLocalAndGeography[2] === 'junction')
          {
            const feuillet = getFeuillet(interview.id);
            return {
              feuillet  : feuillet,
              no_pers   : person._sequence,
              no_deplac : trip._sequence,
              seq       : 2,
              type_local: 'JONC',
              id_local  : idLocalAndGeography[0]
            };
          }
        }
        return null;
      },
      [`${prefix}segments__glo_deplac_mode`]: function(user, interview, responses, household, home, personsById, personsArray, person, tripsById, tripsArray, trip) {
        const feuillet           = getFeuillet(interview.id);
        const glo_deplac_mode   = [];
        const segments           = helper.getSegments(trip, true);
        let   segmentSequence    = 1;
        let   modeBeforeJunction = null;
        let   modeAfterJunction  = null;
        if (trip.junctionGeography && isFeature(trip.junctionGeography))
        {
          const tripTransferCategory = helper.getTripTransferCategory(trip);
                modeBeforeJunction   = tripTransferCategory ? tripTransferCategory.previousMode : null;
                modeAfterJunction    = tripTransferCategory ? tripTransferCategory.nextMode : null;
        }
        
        for (let i = 0, count = segments.length; i < count; i++)
        {
          const segment      = segments[i];
          const mode         = segment.mode;
          let   internalId   = getInternalId('segmentMode', interview, mode, 18);
          if (mode === 'schoolBus')
          {
            const visitedPlacesById = helper.getVisitedPlaces(person, false);
            const destination       = helper.getDestination(trip, visitedPlacesById);
            if (person.age > 17 || !['home', 'schoolUsual', 'schoolNotUsual'].includes(destination.activity) )
            {
              internalId = 10; // set to other bus
            }
          }
          if (mode === 'transitBus')
          {
            const busLines = segment.busLines;
            if (busLines && busLines.length > 0)
            {
              for (let j = 0, countJ = busLines.length; j < countJ; j++)
              {
                const busLine     = busLines[j];
                const busLineData = busRoutesBySlug[busLine];
                if (busLineData && busLineData.agencyId === 'STM')
                {
                  internalId = 3;
                }
                else if (busLineData && busLineData.agencyId === 'RTL')
                {
                  internalId = 5;
                }
                else if (busLineData && busLineData.agencyId === 'STL')
                {
                  internalId = 6;
                }
                else if (busLineData)
                {
                  internalId = 7;
                }
                else
                {
                  internalId = 3; // we force to STM if unknown
                }
                glo_deplac_mode.push({
                  feuillet : feuillet,
                  no_pers  : person._sequence,
                  no_deplac: trip._sequence,
                  seq      : segmentSequence,
                  mode     : internalId,
                  m        : busLineData ? busLineData.internalId.toString() : ""
                });
                segmentSequence++;
              }
            }
            else  // we force to STM if unknown
            {
              glo_deplac_mode.push({ 
                feuillet : feuillet,
                no_pers  : person._sequence,
                no_deplac: trip._sequence,
                seq      : segmentSequence,
                mode     : 3,
                m        : ""
              });
              segmentSequence++;
            }
            
          }
          else if (mode === "transitSubway")
          {
            const startSubwayStation           = segment.subwayStationStart;
            const startSubwayStationProperties = startSubwayStation ? subwayStationsByShortname[startSubwayStation] : null;
            const startSubwayStationInternalId = startSubwayStationProperties ? startSubwayStationProperties.internalId : 0;
            const endSubwayStation             = segment.subwayStationEnd;
            const endSubwayStationProperties   = endSubwayStation ? subwayStationsByShortname[endSubwayStation] : null;
            const endSubwayStationInternalId   = endSubwayStationProperties ? endSubwayStationProperties.internalId : 0;
            const transferSubwayStations       = segment.subwayTransferStations;
            // start:
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : internalId,
              m        : startSubwayStationInternalId.toString()
            });
            segmentSequence++;
            // if transfers:
            if (transferSubwayStations && transferSubwayStations.length > 0)
            {
              for (let j = 0, countJ = transferSubwayStations.length; j < countJ; j++)
              {
                const transferSubwayStation           = transferSubwayStations[j];
                const transferSubwayStationProperties = transferSubwayStation ? subwayStationsByShortname[transferSubwayStation] : null;
                const transferSubwayStationInternalId = transferSubwayStationProperties ? transferSubwayStationProperties.internalId : null;
                if (transferSubwayStationInternalId && transferSubwayStationInternalId > 0)
                {
                  glo_deplac_mode.push({
                    feuillet : feuillet,
                    no_pers  : person._sequence,
                    no_deplac: trip._sequence,
                    seq      : segmentSequence,
                    mode     : internalId,
                    m        : transferSubwayStationInternalId.toString()
                  });
                  segmentSequence++;
                }
              }
            }
            // end:
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : internalId,
              m        : endSubwayStationInternalId.toString()
            });
            segmentSequence++;
          }
          else if (mode === "transitRail")
          {
            const startTrainStation           = segment.trainStationStart;
            const startTrainStationProperties = startTrainStation ? trainStationsByShortname[startTrainStation] : null;
            const startTrainStationInternalId = startTrainStationProperties ? startTrainStationProperties.internalId : 0;
            const endTrainStation             = segment.trainStationEnd;
            const endTrainStationProperties   = endTrainStation ? trainStationsByShortname[endTrainStation] : null;
            const endTrainStationInternalId   = endTrainStationProperties ? endTrainStationProperties.internalId : 0;
            // start:
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : internalId,
              m        : startTrainStationInternalId.toString()
            });
            segmentSequence++;
            // end:
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : internalId,
              m        : endTrainStationInternalId.toString()
            });
            segmentSequence++;
          }
          else if (mode === "carDriver")
          {
            //// bridges and tunnels goes in pont1, pont2 in som:
            //let bridgesAndTunnels = segment.bridgesAndTunnels;
            //if (!bridgesAndTunnels || bridgesAndTunnels.length === 0)
            //{
            //  bridgesAndTunnels = ['none'];
            //}
            //bridgesAndTunnels = _uniq(bridgesAndTunnels);
            //if (bridgesAndTunnels.length > 0)
            //{
            //  for (let j = 0, countJ = bridgesAndTunnels.length; j < countJ; j++)
            //  {
            //    const bridgeTunnel           = bridgesAndTunnels[j];
            //    const bridgeTunnelInternalId = getInternalId("segmentBridgesAndTunnels", interview, bridgeTunnel, null);
            //    if (bridgeTunnelInternalId)
            //    {
            //      glo_deplac_mode.push({
            //        feuillet : feuillet,
            //        no_pers  : person._sequence,
            //        no_deplac: trip._sequence,
            //        seq      : segmentSequence,
            //        mode     : internalId,
            //        m        : bridgeTunnelInternalId.toString()
            //      });
            //      segmentSequence++;
            //    }
            //  }
            //}
            let highways = segment.highways;
            if (!highways || highways.length === 0)
            {
              highways = ['none'];
            }
            highways = _uniq(highways);
            if (highways.length > 0)
            {
              for (let j = 0, countJ = highways.length; j < countJ; j++)
              {
                const highway           = highways[j];
                const highwayInternalId = getInternalId("segmentHighways", interview, highway, null);
                if (highwayInternalId)
                {
                  glo_deplac_mode.push({
                    feuillet : feuillet,
                    no_pers  : person._sequence,
                    no_deplac: trip._sequence,
                    seq      : segmentSequence,
                    mode     : internalId,
                    m        : highwayInternalId.toString()
                  });
                  segmentSequence++;
                }
              }
            }
          }
          else if (mode === "carPassenger")
          {
            let driverInternalId = getInternalId("segmentDriver", interview, segment.driver, null);
            if (driverInternalId === null && segment.driver && personsById[segment.driver])
            {
              driverInternalId = personsById[segment.driver]._sequence;
            }
            else if (driverInternalId === null || driverInternalId.toString() === "")
            {
              console.log('missing driver for carPassenger for accessCode ' + responses.accessCode);
            }
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : internalId,
              m        : driverInternalId ? driverInternalId.toString() : ""
            });
            segmentSequence++;
          }
          else
          {
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : internalId,
              m        : ""
            });
            segmentSequence++;
          }
          if (modeBeforeJunction && modeAfterJunction && modeBeforeJunction === mode && segments[i+1] && segments[i+1].mode === modeAfterJunction)
          {
            // add junction:
            glo_deplac_mode.push({
              feuillet : feuillet,
              no_pers  : person._sequence,
              no_deplac: trip._sequence,
              seq      : segmentSequence,
              mode     : 17,
              m        : ""
            });
            segmentSequence++;
          }
        }
        return glo_deplac_mode;
      }
    },
    segment: {}
  }
};