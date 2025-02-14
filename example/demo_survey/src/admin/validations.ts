/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { isFeature } from 'geojson-validation';
import _get from 'lodash/get';
import {validate as uuidValidate} from 'uuid';
import { distance as turfDistance } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import helper from '../survey/helper';

const birdSpeedKmhValidRangeByModeAndDistance = {
  carDriver       : [[[0.0,1.0],[1.0,90.0]], [[1.0,5.0], [2.0,90.0]], [[5.0,20.0],[6.0,90.0 ]], [[20.0,50.0],[10.0,100.0]], [[50.0,80.0],[40.0,120.0]], [[80.0,2000.0],[60.0,120.0]]],
  carPassenger    : [[[0.0,1.0],[1.0,90.0]], [[1.0,5.0], [2.0,90.0]], [[5.0,20.0],[6.0,90.0 ]], [[20.0,50.0],[10.0,100.0]], [[50.0,80.0],[40.0,120.0]], [[80.0,2000.0],[60.0,120.0]]],
  motorcycle      : [[[0.0,1.0],[1.0,90.0]], [[1.0,5.0 ],[2.0,90.0]], [[5.0,20.0],[6.0,90.0 ]], [[20.0,50.0],[10.0,100.0]], [[50.0,80.0],[40.0,120.0]], [[80.0,2000.0],[60.0,120.0]]],
  taxi            : [[[0.0,1.0],[1.0,90.0]], [[1.0,5.0 ],[2.0,90.0]], [[5.0,20.0],[5.0,90.0]], [[10.0,50.0],[15.0,100.0]], [[50.0,100.0],[50.0,120.0]]],
  uber            : [[[0.0,1.0],[1.0,90.0]], [[1.0,5.0 ],[2.0,90.0]], [[5.0,20.0],[5.0,90.0]], [[10.0,50.0],[15.0,100.0]], [[50.0,100.0],[50.0,120.0]]],
  transitBus      : [[[0.0,5.0],[1.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  transit         : [[[0.0,5.0],[1.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  transitSubway   : [[[1.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,50.0 ]]],
  transitRail     : [[[1.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  transitTaxi     : [[[0.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  parkAndRide     : [[[2.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  kissAndRide     : [[[2.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  bikeAndRide     : [[[2.0,5.0],[2.0,25.0]], [[5.0,20.0],[2.0,50.0]], [[20.0,100.0],[10.0,80.0 ]]],
  schoolBus       : [[[0.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  busOther        : [[[0.0,5.0],[2.0,50.0]], [[5.0,20.0],[2.0,60.0]], [[20.0,100.0],[10.0,100.0]]],
  walk            : [[[0.0,1.0],[0.5,11.0]], [[1.0,7.0 ],[0.5,10.0]]],
  bicycle         : [[[0.0,1.0],[1.0,25.0]], [[1.0,60.0],[2.0,25.0]]],
  paratransit     : [[[0.0,100.0 ], [1.0,60.0 ]]],
  intercityBus    : [[[20.0,500.0], [15.0,90.0]]],
  intercityRail   : [[[20.0,500.0], [20.0,90.0]]],
  ferry           : [[[0.0,10.0  ], [2.0,30.0 ]]],
  other           : [[[0.0,100.0 ], [1.0,90.0 ]]],
  bimodalOther    : [[[0.0,100.0 ], [1.0,90.0 ]]],
  multimodalOther : [[[0.0,100.0 ], [1.0,90.0 ]]],
  dontKnow        : [[[0.0,100.0 ], [1.0,120.0]]],
  plane           : [[[200.0,20000.0],[100.0,1000.0]]]
};

const birdSpeedKmhInRangeForSegmentsAndDistance = function(segmentsArray, distanceKm, birdSpeedKmh)
{
  const multimodeCategory = helper.getTripMultimodeCategory(segmentsArray);
  //console.log('multimodeCategory', multimodeCategory);
  if (!multimodeCategory)
  {
    return {wasFound: false, inRange: false};
  }
  const configRange       = birdSpeedKmhValidRangeByModeAndDistance[multimodeCategory];
  let   wasFound          = false;
  for (let i = 0, count = configRange.length; i < count; i++)
  {
    const distanceRange = configRange[i][0];
    if (distanceKm >= distanceRange[0] && distanceKm < distanceRange[1])
    {
            wasFound        = true;
      //console.log('distanceRange', distanceRange, distanceKm);
      const minBirdSpeedKmh = configRange[i][1][0];
      const maxBirdSpeedKmh = configRange[i][1][1];
      //console.log('speedRange', configRange[i][1], birdSpeedKmh);
      if (birdSpeedKmh >= minBirdSpeedKmh && birdSpeedKmh <= maxBirdSpeedKmh)
      {
        return {wasFound: wasFound, inRange: true};
      }
    }
  }
  return {wasFound: wasFound, inRange: false};
}

const validations =  {
  interview: {
    languageIsMissing: {
      errorMessage: {
        fr: "La langue d'entrevue est manquante",
        en: "Interview language is missing"
      },
      errorCode: "I_M_LANGUAGE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {

        const isValid = !_isBlank(responses._language);
        if (interview.is_completed && !isValid)
        {
          console.log("I_M_LANGUAGE", responses.accessCode);
        }
        return isValid;
      }
    },
    accessCodeIsMissing: {
      errorMessage: {
        fr: "Le code d'accès est manquant",
        en: "Access code is missing"
      },
      errorCode: "I_M_ACCESSCODE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = !_isBlank(responses.accessCode);
        if (interview.is_completed && !isValid)
        {
          console.log("I_M_ACCESSCODE", responses.accessCode);
        }
        return isValid;
      }
    },
    accessCodeIsInvalid: {
      errorMessage: {
        fr: "Le code d'accès est invalide",
        en: "Access code is invalid"
      },
      errorCode: "I_I_ACCESSCODE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        let isValid = (!_isBlank(responses.accessCode) && 
          (  
             responses.accessCode.startsWith('P')
          || responses.accessCode.startsWith('T')
          || responses.accessCode.startsWith('ARTM')
          )
        );
        if (isValid && responses.accessCode.startsWith('P'))
        {
          isValid = false; // temporary
          const number = responses.accessCode.split('P');
          if (number.length === 2)
          {
            const intNumber = parseInt(number[1]);
            if (intNumber >= 100000 && intNumber < 201000)
            {
              isValid = true;
            }
          }
        }
        if (interview.is_completed && !isValid)
        {
          console.log("I_I_ACCESSCODE", responses.accessCode);
        }
        return isValid;
      }
    },
    languageIsInvalid: {
      errorMessage: {
        fr: "La langue d'entrevue est invalide",
        en: "Interview language is invalid"
      },
      errorCode: "I_I_LANGUAGE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = config.languages.includes(responses._language);
        if (interview.is_completed && !isValid)
        {
          console.log("I_I_LANGUAGE", responses.accessCode);
        }
        return isValid;
      }
    }
  },
  household: {
    missingCarNumber: {
      errorMessage: {
        fr: "Le nombre de véhicules dans le ménage est manquant",
        en: "The number of vehicles in household is missing"
      },
      errorCode: "H_M_CARNUMBER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = !_isBlank(household.carNumber);
        if (interview.is_completed && !isValid)
        {
          console.log("H_M_CARNUMBER", responses.accessCode);
        }
        return isValid;
      }
    },
    invalidCarNumber: {
      errorMessage: {
        fr: "Le nombre de véhicules dans le ménage est invalide ou trop élevé",
        en: "The number of vehicles in household is invalid or too high"
      },
      errorCode: "H_I_CARNUMBER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = !_isBlank(household.carNumber) && typeof(household.carNumber) === 'number' && household.carNumber >= 0 && household.carNumber <= 13;
        if (interview.is_completed && !isValid)
        {
          console.log("H_I_CARNUMBER", responses.accessCode);
        }
        return isValid;
      }
    },
    missingCivicNumber: {
      errorMessage: {
        fr: "Le numéro civique du domicile est manquant",
        en: "Home civic number is missing"
      },
      errorCode: "H_M_HOMECIVICNUM",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = !_isBlank(_get(household,'__madasare2018__home__glo_local.no_civ')) && _get(household,'__madasare2018__home__glo_local.no_civ') !== 0;
        if (interview.is_completed && !isValid)
        {
          console.log("H_M_HOMECIVICNUM", responses.accessCode);
        }
        return isValid;
      },
      neededParser: 'madasare2018'
    },
    missingStreetName: {
      errorMessage: {
        fr: "Le nom de la rue du domicile est manquant",
        en: "Home street name is missing"
      },
      errorCode: "H_M_HOMESTREET",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = !_isBlank(_get(household, '__madasare2018__home__glo_local.rue'));
        if (interview.is_completed && !isValid)
        {
          console.log("H_M_HOMESTREET", responses.accessCode);
        }
        return isValid;
      },
      neededParser: 'madasare2018'
    },
    missingHomeGeography: {
      errorMessage: {
        fr: "Le positionnement du domicile est manquant",
        en: "Home location is missing"
      },
      errorCode: "H_M_HOMEGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = !_isBlank(home.geography);
        if (interview.is_completed && !isValid)
        {
          console.log("H_M_HOMEGEOG", responses.accessCode);
        }
        return isValid;
      }
    },
    invalidHomeGeography: {
      errorMessage: {
        fr: "Le positionnement du domicile est invalide",
        en: "Home location is invalid"
      },
      errorCode: "H_I_HOMEGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray) {
        const isValid = isFeature(home.geography) && home.geography.geometry.coordinates[0] !== 0 && home.geography.geometry.coordinates[1] !== 0;
        if (interview.is_completed && !isValid)
        {
          console.log("H_I_HOMEGEOG", responses.accessCode);
        }
        return isValid;
      }
    },
    mismatchHouseholdSizeNumberOfPersons: {
      errorMessage: {
        fr: "La taille du ménage n'est pas égale au nombre de personnes déclarées",
        en: "Household size do not match the number of persons declared"
      },
      errorCode: "H_I_MISMATCHSIZENUMPERSONS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = household.size === personsArray.length;
        if (interview.is_completed && !isValid)
        {
          console.log("H_I_MISMATCHSIZENUMPERSONS", responses.accessCode);
        }
        return isValid;
      }
    },
    emptyHousehold: {
      errorMessage: {
        fr: "Le ménage est vide (aucune personne)",
        en: "Household is empty (no person)"
      },
      errorCode: "H_I_EMPTY",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(household.size === 0 || personsArray.length === 0);
        if (interview.is_completed && !isValid)
        {
          console.log("H_I_EMPTY", responses.accessCode);
        }
        return isValid;
      }
    },
    householdWithNoAdult: {
      errorMessage: {
        fr: "Le ménage ne compte aucun adulte",
        en: "Household has no adult"
      },
      errorCode: "H_I_NOADULT",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        let isValid = false;
        for (let i = 0, count = personsArray.length; i < count; i++)
        {
          const person = personsArray[i];
          if (person && person.age >= 18)
          {
            isValid = true;
          }
        }
        if (interview.is_completed && !isValid)
        {
          console.log("H_I_NOADULT", responses.accessCode);
        }
        return isValid;
      }
    },
    householdTooLarge: {
      errorMessage: {
        fr: "Le ménage est trop grand (+ de 20 personnes)",
        en: "Household is too large (more than 20 persons)"
      },
      errorCode: "H_I_TOOLARGE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(household.size > 20 || personsArray.length > 20);
        if (interview.is_completed && !isValid)
        {
          console.log("H_I_TOOLARGE", responses.accessCode);
        }
        return isValid;
      }
    }
  },
  person: {
    missingDidTripsOnTripsDate: {
      errorMessage: {
        fr: "A effectué un ou des déplacements manquant",
        en: "Person did trips on trips date missing"
      },
      errorCode: "P_M_DIDTRIPSONTRIPSDATE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age >= 5 && _isBlank(person.didTripsOnTripsDate));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_DIDTRIPSONTRIPSDATE', responses.accessCode);
        }
        return isValid;
      }
    },
    didNoTripsButTrips: {
      errorMessage: {
        fr: "Personne déclarée sans déplacement, mais lieux visités présents",
        en: "Person declared without trip, but visited places are present"
      },
      errorCode: "P_I_DIDNOTRIPBUTTRIPS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.didTripsOnTripsDate !== 'yes' && Object.keys(person.visitedPlaces || {}).length > 0);
        if (interview.is_completed && !isValid)
        {
          console.log('S_I_PASSDRIVERWITHOUTLICENSE', responses.accessCode);
        }
        return isValid;
      }
    },
    didTripsButNoVisitedPlaces: {
      errorMessage: {
        fr: "Personne déclarée avec déplacement(s), mais lieux visités vides",
        en: "Person declared with trip(s), but visited places are empty"
      },
      errorCode: "P_I_DIDTRIPSBUTNOVPS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.didTripsOnTripsDate === 'yes' && Object.keys(person.visitedPlaces || {}).length === 0);
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_DIDTRIPSBUTNOVPS', responses.accessCode);
        }
        return isValid;
      }
    },
    didTripsButNoTrips: {
      errorMessage: {
        fr: "Personne déclarée avec déplacement(s), mais déplacements vides",
        en: "Person declared with trip(s), but trips are empty"
      },
      errorCode: "P_I_DIDTRIPSBUTNOTRIPS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.didTripsOnTripsDate === 'yes' && Object.keys(person.trips || {}).length === 0);
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_DIDTRIPSBUTNOTRIPS', responses.accessCode);
        }
        return isValid;
      }
    },
    didTripsButTooYoung: {
      errorMessage: {
        fr: "Personne déclarée avec déplacement(s), mais moins de 5 ans",
        en: "Person declared with trip(s), but less than 5 years old"
      },
      errorCode: "P_I_DIDTRIPSBUTTOOYOUNG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(!_isBlank(person.didTripsOnTripsDate) && person.age < 5);
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_DIDTRIPSBUTTOOYOUNG', responses.accessCode);
        }
        return isValid;
      }
    },
    visitedPlacesTripsCountMismatch: {
      errorMessage: {
        fr: "Le nombre de lieux visités ne concorde pas avec le nombre de déplacements",
        en: "The number of visited palces and the number of trips do not match"
      },
      errorCode: "P_I_MISMATCHVPSTRIPSCOUNT",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (person.didTripsOnTripsDate === 'yes' )
        {
          const visitedPlacesArray = helper.getVisitedPlaces(person, true);
          const tripsArray         = helper.getTrips(person, true);
          const isValid = visitedPlacesArray.length - 1 === tripsArray.length;
          if (interview.is_completed && !isValid)
          {
            console.log('P_I_MISMATCHVPSTRIPSCOUNT', responses.accessCode);
          }
          return isValid;
        }
        return true;
      }
    },
    missingAge: {
      errorMessage: {
        fr: "Âge manquant",
        en: "Missing age"
      },
      errorCode: "P_M_AGE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(_isBlank(person.age));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_AGE', responses.accessCode);
        }
        return isValid;
      }
    },
    missingGender: {
      errorMessage: {
        fr: "Sexe manquant",
        en: "Missing gender"
      },
      errorCode: "P_M_GENDER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(_isBlank(person.gender));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_GENDER', responses.accessCode);
        }
        return isValid;
      }
    },
    customGender: {
      errorMessage: {
        fr: "Sexe autre",
        en: "Custom gender"
      },
      errorCode: "P_I_GENDER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = person.gender !== 'custom';
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_GENDER', responses.accessCode);
        }
        return isValid;
      }
    },
    missingOccupation: {
      errorMessage: {
        fr: "Occupation manquante",
        en: "Missing occupation"
      },
      errorCode: "P_M_OCCUPATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age >= 5 && _isBlank(person.occupation));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_OCCUPATION', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidOccupationForYoung: {
      errorMessage: {
        fr: "Occupation invalide pour enfant < 5 ans",
        en: "Invalid occupation for child < 5 years old"
      },
      errorCode: "P_I_OCCUPATIONYOUNG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age < 5 && person.occupation !== 'nonApplicable');
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_OCCUPATIONYOUNG', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidOccupationForOld: {
      errorMessage: {
        fr: "Occupation invalide pour personne >= 5 ans",
        en: "Invalid occupation for person >= 5 years old"
      },
      errorCode: "P_I_OCCUPATIONOLD",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age >= 5 && person.occupation === 'nonApplicable');
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_OCCUPATIONOLD', responses.accessCode);
        }
        return isValid;
      }
    },
    missingDrivingLicenseOwner: {
      errorMessage: {
        fr: "Posession de permis de conduire manquante",
        en: "Missing driver's license ownership"
      },
      errorCode: "P_M_DRIVINGLICENSEOWNER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age >= 5 && _isBlank(person.drivingLicenseOwnership));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_DRIVINGLICENSEOWNER', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidDrivingLicenseOwnerTooYoung: {
      errorMessage: {
        fr: "Posession de permis de conduire, mais < 16 ans",
        en: "Driver's license owner, but < 16 years old"
      },
      errorCode: "P_I_DRIVINGLICENSEOWNERTOOYOUNG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age < 16 && person.drivingLicenseOwnership === 'yes');
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_DRIVINGLICENSEOWNERTOOYOUNG', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidDrivingLicenseOwnerEmpty: {
      errorMessage: {
        fr: "Posession de permis de conduire non applicable, mais >= 16 ans",
        en: "Driver's license owner not applicable, but >= 16 years old"
      },
      errorCode: "P_I_DRIVINGLICENSEOWNEREMPTY",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age >= 16 && _isBlank(person.drivingLicenseOwnership));
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_DRIVINGLICENSEOWNEREMPTY', responses.accessCode);
        }
        return isValid;
      }
    },
    missingTransitPassOwner: {
      errorMessage: {
        fr: "Posession d'abonnement de transport collectif manquante",
        en: "Missing transit pass ownership"
      },
      errorCode: "P_M_TRANSITPASSOWNER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age >= 5 && _isBlank(person.transitPassOwner));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_TRANSITPASSOWNER', responses.accessCode);
        }
        return isValid;
      }
    },
    missingTransitPassesForOwner: {
      errorMessage: {
        fr: "Posession d'abonnement de transport collectif, mais aucun sépcifié",
        en: "Transit pass owner"
      },
      errorCode: "P_M_TRANSITPASSOWNERWITHOUTPASS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.transitPassOwner === 'yes' && _isBlank(person.transitPasses));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_TRANSITPASSOWNERWITHOUTPASS', responses.accessCode);
        }
        return isValid;
      }
    },
    missingUsualWorkPlace: {
      errorMessage: {
        fr: "Travailleur mais aucun lieu habituel de travail déclaré",
        en: "Worker with no usual work place declared"
      },
      errorCode: "P_M_USUALWORKPLACE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.usualWorkPlaceIsHome !== true && helper.isWorker(person.occupation) && _isBlank(person.usualWorkPlace));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_USUALWORKPLACE', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidRetiredTooYoung: {
      errorMessage: {
        fr: "Personne < 45 ans retraitée",
        en: "Retired person < 45 years old"
      },
      errorCode: "P_I_RETIREDTOOYOUNG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age < 45 && person.occupation === 'retired');
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_RETIREDTOOYOUNG', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidWorkerTooYoung: {
      errorMessage: {
        fr: "Personne < 14 ans travailleur",
        en: "Worker person < 14 years old"
      },
      errorCode: "P_I_WORKERTOOYOUNG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(person.age < 14 && helper.isWorker(person.occupation));
        if (interview.is_completed && !isValid)
        {
          console.log('P_I_WORKERTOOYOUNG', responses.accessCode);
        }
        return isValid;
      }
    },
    missingUsualWorkPlaceGeography: {
      errorMessage: {
        fr: "Positionnement du lieu habituel de travail manquant",
        en: "Usual work place location missing"
      },
      errorCode: "P_M_USUALWORKPLACEGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (_isBlank(person.usualWorkPlace))
        {
          return true;
        }
        const isValid = isFeature(person.usualWorkPlace) && person.usualWorkPlace.geometry.coordinates[0] !== 0 && person.usualWorkPlace.geometry.coordinates[1] !== 0;
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_USUALWORKPLACEGEOG', responses.accessCode);
        }
        return isValid;
      }
    },
    missingUsualSchoolPlace: {
      errorMessage: {
        fr: "Étudiant mais aucun lieu habituel d'études déclaré",
        en: "Student with no usual school place declared"
      },
      errorCode: "P_M_USUALSCHOOLPLACE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        const isValid = !(helper.isStudent(person.occupation) && _isBlank(person.usualSchoolPlace));
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_USUALSCHOOLPLACE', responses.accessCode);
        }
        return isValid;
      }
    },
    missingUsualSchoolPlaceGeography: {
      errorMessage: {
        fr: "Positionnement du lieu habituel d'études manquant",
        en: "Usual school place location missing"
      },
      errorCode: "P_M_USUALSCHOOLPLACEGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (_isBlank(person.usualSchoolPlace))
        {
          return true;
        }
        const isValid = isFeature(person.usualSchoolPlace) && person.usualSchoolPlace.geometry.coordinates[0] !== 0 && person.usualSchoolPlace.geometry.coordinates[1] !== 0;
        if (interview.is_completed && !isValid)
        {
          console.log('P_M_USUALSCHOOLPLACEGEOG', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidNoWorkTripReason: {
      errorMessage: {
        fr: "Raison de non déplacement travail invalide",
        en: "Invalid no work trip reason"
      },
      errorCode: "P_I_NOWORKTRIPREASON",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (_isBlank(person) || person.didTripsOnTripsDateKnowTrips === 'no' || person.didTripsOnTripsDate === 'dontKnow')
        {
          return true;
        }
        if (helper.isWorker(person.occupation) && person.usualWorkPlaceIsHome === true)
        {
          if (person.noWorkTripReason === 'usualWorkPlaceIsHome')
          {
            return true;
          }
          if (interview.is_completed)
          {
            console.log('invalidNoWorkTripReason workerAtHome !usualWorkPlaceIsHome', person.noWorkTripReason, responses.accessCode);
          }
          return false;
        }
        if (helper.isWorker(person.occupation) && person.usualWorkPlaceIsHome !== true && person.noWorkTripReason === 'usualWorkPlaceIsHome')
        {
          if (interview.is_completed)
          {
            console.log('invalidNoWorkTripReason nonAtHomeWorker usualWorkPlaceIsHome', person.noWorkTripReason, responses.accessCode);
          }
          return false;
        }
        if (!helper.isWorker(person.occupation) && person.noWorkTripReason !== 'nonApplicable')
        {
          if (interview.is_completed)
          {
            console.log('invalidNoWorkTripReason nonWorker !nonApplicable', person.noWorkTripReason, responses.accessCode);
          }
          return false;
        }
        if (helper.isWorker(person.occupation))
        {
          const visitedPlaces            = helper.getVisitedPlaces(person, true);
          const workRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
            return ['workUsual', 'workNotUsual', 'workOnTheRoad', 'workOnTheRoadFromUsualWork', 'workOnTheRoadFromHome'].indexOf(visitedPlace.activity) > -1;
          });
          if (workRelatedVisitedPlaces.length > 0 && person.noWorkTripReason === 'didMakeWorkTrips')
          {
            return true;
          }
          else if (workRelatedVisitedPlaces.length === 0 && ['didMakeWorkTrips', 'nonApplicable', 'usualWorkPlaceIsHome'].includes(person.noWorkTripReason))
          {
            if (interview.is_completed)
            {
              console.log('invalidNoWorkTripReason didNotMakeWorkTrips!didMakeWorkTrips!nonApplicable!usualWorkPlaceIsHome', person.noWorkTripReason, responses.accessCode);
            }
            return false;
          }
          else if (workRelatedVisitedPlaces.length > 0 && person.noWorkTripReason !== 'didMakeWorkTrips'  && person.noWorkTripReason !== 'usualWorkPlaceIsHome')
          {
            if (interview.is_completed)
            {
              console.log('invalidNoWorkTripReason madeWorkTrips !didMakeWorkTrips!usualWorkPlaceIsHome', person.noWorkTripReason, responses.accessCode);
            }
            return false;
          }
        }
        return true;
      }
    },
    missingNoWorkTripReason: {
      errorMessage: {
        fr: "Raison de non déplacement travail manquante",
        en: "Missing no work trip reason"
      },
      errorCode: "P_M_NOWORKTRIPREASON",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (_isBlank(person) || person.didTripsOnTripsDateKnowTrips === 'no' || person.didTripsOnTripsDate === 'dontKnow' || !_isBlank(person.noWorkTripReason))
        {
          return true;
        }
        if (interview.is_completed)
        {
          console.log('P_M_NOWORKTRIPREASON', responses.accessCode);
        }
        return false;
      }
    },
    missingNoSchoolTripReason: {
      errorMessage: {
        fr: "Raison de non déplacement études manquante",
        en: "Missing no school trip reason"
      },
      errorCode: "P_M_NOSCHOOLTRIPREASON",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person) {
        if (_isBlank(person) || person.didTripsOnTripsDateKnowTrips === 'no' || person.didTripsOnTripsDate === 'dontKnow' || !_isBlank(person.noSchoolTripReason))
        {
          return true;
        }
        if (interview.is_completed)
        {
          console.log('P_M_NOSCHOOLTRIPREASON', responses.accessCode);
        }
        return false;
      }
    }
  },
  visitedPlace: {
    departureOfDayNotHome: {
      errorMessage: {
        fr: "Le lieu de départ de la journée n'est pas le domicile (vérifier si plausible)",
        en: "Departure place of day is not homne (verify if plausible)"
      },
      errorCode: "VP_I_FIRSTPLACENOTHOME",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        return !(visitedPlace._sequence === 1 && visitedPlace.activity !== 'home' && visitedPlace.activity !== 'visiting' && visitedPlace.activity !== 'secondaryHome');
      }
    },
    arrivalOfDayNotHome: {
      errorMessage: {
        fr: "Le lieu d'arrivée de la journée n'est pas le domicile (vérifier si plausible)",
        en: "Arrival place of day is not homne (verify if plausible)"
      },
      errorCode: "VP_I_LASTPLACENOTHOME",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        return !(visitedPlace._sequence === visitedPlacesArray[visitedPlacesArray.length - 1]._sequence && visitedPlace.activity !== 'home' && visitedPlace.activity !== 'visiting' && visitedPlace.activity !== 'secondaryHome');
      }
    },
    repeatedHome: {
      errorMessage: {
        fr: "Deux lieux visités consécutifs ont Domicile comme activité",
        en: "Two consecutive visited places have Home as activity"
      },
      errorCode: "VP_I_HOMEREPEAT",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        if (visitedPlace.activity === 'home')
        {
          const previousVisitedPlace = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
          if (previousVisitedPlace && previousVisitedPlace.activity === 'home')
          {
            if (interview.is_completed)
            {
              console.log('VP_I_HOMEREPEAT', responses.accessCode);
            }
            return false;
          }
        }
        return true;
      }
    },
    missingDepartureTime: {
      errorMessage: {
        fr: "L'heure de départ du lieu visité est manquante et ce n'est pas le dernier lieu visité",
        en: "Visited place departure time is missing and this is not the last visited place"
      },
      errorCode: "VP_M_DEPTIME",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const lastVisitedPlace = helper.getLastVisitedPlace(visitedPlacesArray);
        const isValid = visitedPlace._uuid !== lastVisitedPlace._uuid && _isBlank(visitedPlace.departureTime) ? false : true;
        if (interview.is_completed && !isValid)
        {
          console.log('VP_M_DEPTIME', responses.accessCode);
        }
        return isValid;
      }
    },
    missingArrivalTime: {
      errorMessage: {
        fr: "L'heure d'arrivée au lieu visité est manquante et ce n'est pas le premier lieu visité",
        en: "Visited place arrival time is missing and this is not the first visited place"
      },
      errorCode: "VP_M_ARRTIME",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const firstVisitedPlace = helper.getFirstVisitedPlace(visitedPlacesArray);
        const isValid = visitedPlace._uuid !== firstVisitedPlace._uuid && _isBlank(visitedPlace.arrivalTime) ? false : true;
        if (interview.is_completed && !isValid)
        {
          console.log('VP_M_ARRTIME', responses.accessCode);
        }
        return isValid;
      }
    },
    departureTimeTooHigh: {
      errorMessage: {
        fr: "L'heure de départ est trop élevée (> 28:00)",
        en: "Dpearture time is too high (> 28:00)"
      },
      errorCode: "VP_I_DEPTTIMETOOHIGH",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const isValid = !(!_isBlank(visitedPlace.departureTime) && visitedPlace.departureTime > (28*3600))
        if (interview.is_completed && !isValid)
        {
          console.log('VP_I_DEPTTIMETOOHIGH', responses.accessCode);
        }
        return isValid;
      }
    },
    inversedDepartureTimes: {
      errorMessage: {
        fr: "L'heure de départ du lieu visité précédent est >= heure de départ du lieu visité",
        en: "Previous visited place departure time is >= visited place departure time"
      },
      errorCode: "VP_I_TIMEINVDEP",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const previousVisitedPlace = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
        if (previousVisitedPlace && !_isBlank(previousVisitedPlace.departureTime) && !_isBlank(visitedPlace.departureTime))
        {
          const isValid = previousVisitedPlace && previousVisitedPlace.departureTime >= visitedPlace.departureTime ? false : true;
          if (interview.is_completed && !isValid)
          {
            console.log('VP_I_TIMEINVDEP', responses.accessCode);
          }
          return isValid;
        }
        return true;
      }
    },
    inversedArrivalTimes: {
      errorMessage: {
        fr: "L'heure d'arrivée au lieu visité précédent est >= heure d'arrivée au lieu visité",
        en: "Previous visited place arrival time is >= visited place arrival time"
      },
      errorCode: "VP_I_TIMEINVARR",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const previousVisitedPlace = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
        if (previousVisitedPlace && !_isBlank(previousVisitedPlace.arrivalTime) && !_isBlank(visitedPlace.arrivalTime))
        {
          const isValid = previousVisitedPlace && previousVisitedPlace.arrivalTime >= visitedPlace.arrivalTime ? false : true;
          if (interview.is_completed && !isValid)
          {
            console.log('VP_I_TIMEINVARR', responses.accessCode);
          }
          return isValid;
        }
        return true;
      }
    },
    inversedArrivalDepartureTimes: {
      errorMessage: {
        fr: "L'heure d'arrivée est >= heure de départ",
        en: "Arrival time is >= departure time"
      },
      errorCode: "VP_I_TIMEINVDEPARR",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        if (!_isBlank(visitedPlace.departureTime) && !_isBlank(visitedPlace.arrivalTime))
        {
          const isValid = visitedPlace.arrivalTime >= visitedPlace.departureTime ? false : true;
          if (interview.is_completed && !isValid)
          {
            console.log('VP_I_TIMEINVDEPARR', responses.accessCode);
          }
          return isValid;
        }
        return true;
      }
    },
    inversedPrevDepartureArrivalTimes: {
      errorMessage: {
        fr: "L'heure de départ du lieu visité précédent est >= heure d'arrivée au lieu visité",
        en: "Previous visited place departure time is >= visited place departure time"
      },
      errorCode: "VP_I_TIMEINVPREVDEPARR",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const previousVisitedPlace = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
        if (previousVisitedPlace && !_isBlank(previousVisitedPlace.departureTime) && !_isBlank(visitedPlace.arrivalTime))
        {
          const isValid = previousVisitedPlace && previousVisitedPlace.departureTime >= visitedPlace.arrivalTime ? false : true;
          if (interview.is_completed && !isValid)
          {
            console.log('VP_I_TIMEINVPREVDEPARR', responses.accessCode);
          }
          return isValid;
        }
        return true;
      }
    },
    missingActivity: {
      errorMessage: {
        fr: "L'activité est manquante",
        en: "Activity is missing"
      },
      errorCode: "VP_M_ACTIVITY",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const isValid = !_isBlank(visitedPlace.activity);
        if (interview.is_completed && !isValid)
        {
          console.log('VP_M_ACTIVITY', responses.accessCode);
        }
        return isValid;
      }
    },
    missingGeography: {
      errorMessage: {
        fr: "La position est manquante",
        en: "Location is missing"
      },
      errorCode: "VP_M_GEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const geography = helper.getGeography(visitedPlace, person, interview);
        const isValid = !(_isBlank(geography) || _isBlank(geography.geometry) || _isBlank(geography.geometry.coordinates));
        if (interview.is_completed && !isValid)
        {
          console.log('VP_M_GEOG', responses.accessCode);
        }
        return isValid;
      }
    },
    activityIncompatibleWithAge: {
      errorMessage: {
        fr: "L'activité est incompatible avec l'âge",
        en: "Activity is incompatible with age"
      },
      errorCode: "VP_I_ACTIVITYINCOMPATIBLEWITHAGE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const activity = visitedPlace.activity;
        const isValid = !(!_isBlank(activity) && [
          'workUsual',
          'workOnTheRoadFromUsualWork',
          'workOnTheRoadFromHome',
          'workOnTheRoad',
          'workNotUsual'
        ].includes(activity) && person.age < 15);
        if (interview.is_completed && !isValid)
        {
          console.log('VP_I_ACTIVITYINCOMPATIBLEWITHAGE', responses.accessCode);
        }
        return isValid;
      }
    },
    departureTimeForSchoolTooEarly: {
      errorMessage: {
        fr: "L'heure de départ pour l'école est trop tôt (avant 4h du matin)",
        en: "Departure time to school too early (before 4 AM)"
      },
      errorCode: "T_I_DEPTIMETOOEARLYFORSCHOOL",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, visitedPlace) {
        const activity = visitedPlace.activity;
        if (['schoolUsual', 'schoolNotUsual'].includes(activity))
        {
          const previousVisitedPlace = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlacesArray);
          if (previousVisitedPlace && previousVisitedPlace.departureTime < 4 * 3600)
          {
            if (interview.is_completed)
            {
              console.log('T_I_DEPTIMETOOEARLYFORSCHOOL', responses.accessCode);
            }
            return false;
          }
        }
        return true;
      }
    }
  },
  trip: {
    speedTooFast: {
      errorMessage: {
        fr: "La vitesse à vol d'oiseau est trop élevée (> 120 km/h)",
        en: "Bird speed is too high (> 120 km/h)"
      },
      errorCode: "T_I_BIRDSPEEDTOOHIGH",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const birdDistanceMeters = helper.getBirdDistanceMeters(trip, visitedPlacesById, person, interview);
        const birdSpeedMps       = helper.getBirdSpeedMps(trip, visitedPlacesById, person, interview);
        if (birdDistanceMeters > 100)
        {
          if (birdSpeedMps * 3.6 > 120)
          {
            return false;
          }
        }
        return true;
      }
    },
    speedTooLow: {
      errorMessage: {
        fr: "La vitesse à vol d'oiseau est trop faible (< 1 km/h)",
        en: "Bird speed is too low (< 1 km/h)"
      },
      errorCode: "T_I_BIRDSPEEDTOOLOW",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const birdDistanceMeters = helper.getBirdDistanceMeters(trip, visitedPlacesById, person, interview);
        const duration           = helper.getDurationSec(trip, visitedPlacesById);
        const birdSpeedMps       = helper.getBirdSpeedMps(trip, visitedPlacesById, person, interview);
        if (birdDistanceMeters > 100)
        {
          if (birdSpeedMps * 3.6 < 1 && (birdDistanceMeters > 500 || duration > 600))
          {
            return false;
          }
        }
        return true;
      }
    },
    missingTransferLocation: {
      errorMessage: {
        fr: "Le lieu de transfert public/privé (jonction) est manquant",
        en: "Public/private transfer location (junction) is missing"
      },
      errorCode: "T_M_TRANSFERGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const tripTransferCategory = helper.getTripTransferCategory(trip);
        const isValid = !(!_isBlank(tripTransferCategory) && _isBlank(trip.junctionGeography));
        if (interview.is_completed && !isValid)
        {
          console.log('T_M_TRANSFERGEOG', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidTransferLocation: {
      errorMessage: {
        fr: "Le lieu de transfert public/privé (jonction) est invalide",
        en: "Public/private transfer location (junction) is invalid"
      },
      errorCode: "T_I_TRANSFERGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const tripTransferCategory = helper.getTripTransferCategory(trip);
        const isValid = !(!_isBlank(tripTransferCategory) && !_isBlank(trip.junctionGeography) && !isFeature(trip.junctionGeography));
        if (interview.is_completed && !isValid)
        {
          console.log('T_I_TRANSFERGEOG', responses.accessCode);
        }
        return isValid;
      }
    },
    originTooCloseToDestination: {
      errorMessage: {
        fr: "L'origine est à moins de 50m de la destination (activité différente de sur la route)",
        en: "Origin is less than 50m away from destination (activity not on the road) "
      },
      errorCode: "T_I_ORIGTOOCLOSETODEST",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const destination = helper.getDestination(trip, visitedPlacesById);
        if (!(['workOnTheRoadFromUsualWork','workOnTheRoadFromHome','workOnTheRoad'].includes(destination.activity)))
        {
          const originGeography      = helper.getOriginGeography(trip, visitedPlacesById, person, interview, false);
          const destinationGeography = helper.getDestinationGeography(trip, visitedPlacesById, person, interview, false);
          if (isFeature(originGeography) && isFeature(trip.junctionGeography))
          {
            const birdDistanceMeters = turfDistance(originGeography.geometry, destinationGeography.geometry, {units: 'meters'});
            if (birdDistanceMeters < 50)
            {
              return false;
            }
          }
        }
        return true;
      }
    },
    originTooCloseToTransferLocation: {
      errorMessage: {
        fr: "L'origine est à moins de 100m du lieu de transfert",
        en: "Origin is less than 100m away from transfer location"
      },
      errorCode: "T_I_ORIGTOOCLOSETOTRANSFER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        if (trip.junctionGeography)
        {
          const originGeography = helper.getOriginGeography(trip, visitedPlacesById, person, interview, false);
          if (isFeature(originGeography) && isFeature(trip.junctionGeography))
          {
            const birdDistanceMeters = turfDistance(originGeography.geometry, trip.junctionGeography.geometry, {units: 'meters'});
            if (birdDistanceMeters < 100)
            {
              return false;
            }
          }
        }
        return true;
      }
    },
    destinationTooCloseToTransferLocation: {
      errorMessage: {
        fr: "La destination est à moins de 100m du lieu de transfert",
        en: "Destination is less than 100m away from transfer location"
      },
      errorCode: "T_I_DESTTOOCLOSETOTRANSFER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        if (trip.junctionGeography)
        {
          const destinationGeography = helper.getDestinationGeography(trip, visitedPlacesById, person, interview, false);
          if (isFeature(destinationGeography) && isFeature(trip.junctionGeography))
          {
            const birdDistanceMeters = turfDistance(destinationGeography.geometry, trip.junctionGeography.geometry, {units: 'meters'});
            if (birdDistanceMeters < 100)
            {
              return false;
            }
          }
        }
        return true;
      }
    },
    transferLocationExistsWithoutPublicPrivateTransfer: {
      errorMessage: {
        fr: "Un lieu de transfert existe mais aucun transfert public/privé",
        en: "Transfer location exists but no public/private transfer"
      },
      errorCode: "T_I_TRANSFERLOCATIOSHOULDNOTEXIST",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const tripTransferCategory = helper.getTripTransferCategory(trip);
        const isValid = !(trip.junctionGeography && _isBlank(tripTransferCategory));
        if (interview.is_completed && !isValid)
        {
          console.log('T_I_TRANSFERLOCATIOSHOULDNOTEXIST', responses.accessCode);
        }
        return isValid;
      }
    },
    walkingBirdDistanceGreaterThan3km: { // in madasare, it is 2 km, but should be higher since a lot of walking trips are longer than 2km.
      errorMessage: {
        fr: "La distance de marche à vol d'oiseau est de plus de 3 km",
        en: "Walking bird distance is greater than 3km"
      },
      errorCode: "T_I_WALKINGBIRDDISTANCEMORETHAN3KM",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const segments = helper.getSegments(trip, true);
        if (segments.length === 1 && segments[0] && segments[0].mode === 'walk')
        {
          const birdDistanceMeters = helper.getBirdDistanceMeters(trip, visitedPlacesById, person, interview);
          if (birdDistanceMeters > 3000)
          {
            return false;
          }
        }
        return true;
      }
    },
    walkModeNotAlone: {
      errorMessage: {
        fr: "Mode marche déclaré avec d'autres modes",
        en: "Walk mode declared with other modes"
      },
      errorCode: "T_I_WALKMODENOTALONE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const segments = helper.getSegments(trip, true);
        if (segments.length > 1)
        {
          for (let i = 0, count = segments.length; i < count; i++)
          {
            if (segments[i].mode === 'walk')
            {
              if (interview.is_completed)
              {
                console.log('T_I_WALKMODENOTALONE', responses.accessCode);
              }
              return false;
            }
          }
        }
        return true;
      }
    },
    missingOriginOrDestination: {
      errorMessage: {
        fr: "L'origine ou la destination est manquante",
        en: "Origin or destination is missing"
      },
      errorCode: "T_M_ORIGORDEST",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const origin      = helper.getDestination(trip, visitedPlacesById);
        const destination = helper.getDestination(trip, visitedPlacesById);
        const isValid = !(_isBlank(origin) || _isBlank(destination));
        if (interview.is_completed && !isValid)
        {
          console.log('T_M_ORIGORDEST', responses.accessCode);
        }
        return isValid;
      }
    },
    invalidOriginOrDestinationGeography: {
      errorMessage: {
        fr: "Le positionnement de l'origine ou de la destination est invalide",
        en: "Origin or destination location is invalid"
      },
      errorCode: "T_I_ORIGORDESTGEOG",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const originGeography      = helper.getOriginGeography(trip, visitedPlacesById, person, interview, false);
        const destinationGeography = helper.getDestinationGeography(trip, visitedPlacesById, person, interview, false);
        const isValid = !(!(isFeature(originGeography)) || !(isFeature(destinationGeography)));
        if (interview.is_completed && !isValid)
        {
          console.log('T_I_ORIGORDESTGEOG', responses.accessCode);
        }
        return isValid;
      }
    },
    repeatedParatransitMode: {
      errorMessage: {
        fr: "Mode paratransit répété",
        en: "Paratransit mode repeated"
      },
      errorCode: "T_I_PARATRANSITREPEATED",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const segments = helper.getSegments(trip, true);
        let countParatransit = 0;
        if (segments.length > 1)
        {
          for (let i = 0, count = segments.length; i < count; i++)
          {
            if (segments[i].mode === 'paratransit')
            {
              countParatransit++;
            }
          }
        }
        const isValid = countParatransit <= 1;
        if (interview.is_completed && !isValid)
        {
          console.log('T_I_PARATRANSITREPEATED', responses.accessCode);
        }
        return isValid;
      }
    },
    birdSpeedNotInValidRange: {
      errorMessage: {
        fr: "La vitesse à vol d'oiseau n'est pas dans la plage appropriée pour le ou les modes déclarés",
        en: "Bird speed is not in valid range for the mode or modes used"
      },
      errorCode: "T_I_BIRDSPEEDNOTINRANGE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const segmentsArray      = helper.getSegments(trip, true);
        const birdDistanceMeters = helper.getBirdDistanceMeters(trip, visitedPlacesById, person, interview);
        const birdSpeedMps       = helper.getBirdSpeedMps(trip, visitedPlacesById, person, interview);
        const wasFoundAndInRange = birdSpeedKmhInRangeForSegmentsAndDistance(segmentsArray, birdDistanceMeters / 1000, birdSpeedMps * 3.6);
        return wasFoundAndInRange.wasFound === true && wasFoundAndInRange.inRange === true;
      }
    },
    missingMode: {
      errorMessage: {
        fr: "Aucun mode déclaré",
        en: "No mode declared"
      },
      errorCode: "T_M_MODE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip) {
        const segmentsArray = helper.getSegments(trip, true);
        const isValid = !(_isBlank(segmentsArray) || segmentsArray.length === 0);
        if (interview.is_completed && !isValid)
        {
          console.log('T_M_MODE', responses.accessCode);
        }
        return isValid;
      }
    }
  },
  segment: {
    missingMode: {
      errorMessage: {
        fr: "Le mode est manquant",
        en: "Mode is missing"
      },
      errorCode: "S_M_MODE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(_isBlank(segment.mode));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_MODE', responses.accessCode);
        }
        return isValid;
      }
    },
    schoolBusModeForOlderThan17: {
      errorMessage: {
        fr: "Mode bus scolaire pour personne de plus de 17 ans",
        en: "School bus for person older than 17"
      },
      errorCode: "S_I_SCHOOLBUSOLDERTHAN17",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'schoolBus' && person.age > 17);
        if (interview.is_completed && !isValid)
        {
          console.log('S_I_SCHOOLBUSOLDERTHAN17', responses.accessCode);
        }
        return isValid;
      }
    },
    schoolBusModeIncompatibleDestination: {
      errorMessage: {
        fr: "Mode bus scolaire avec destination autre que études ou domicile",
        en: "School bus with destination other than studies or home"
      },
      errorCode: "S_I_SCHOOLBUSINCOMPATIBLEACTIVITY",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const destination = helper.getDestination(trip, visitedPlacesById);
        const isValid = !(segment.mode === 'schoolBus' && !(['schoolUsual','schoolNotUsual','home'].includes(destination.activity)));
        if (interview.is_completed && !isValid)
        {
          console.log('S_I_SCHOOLBUSINCOMPATIBLEACTIVITY', responses.accessCode);
        }
        return isValid;
      }
    },
    modeCarDriverYoungerThan16: {
      errorMessage: {
        fr: "Mode auto conducteur pour personne de moins de 16 ans",
        en: "Car driver mode for person younger than 16"
      },
      errorCode: "S_I_MODECARDRIVERYOUNGERTHAN16",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'carDriver' && person.age < 16);
        if (interview.is_completed && !isValid)
        {
          console.log('S_I_MODECARDRIVERYOUNGERTHAN16', responses.accessCode);
        }
        return isValid;
      }
    },
    missingHighway: {
      errorMessage: {
        fr: "Mode auto conducteur, autoroutes/routes nationales manquantes",
        en: "Car driver mode, highways missing"
      },
      errorCode: "S_M_HIGHWAYS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !((segment.mode === 'carDriver' || segment.mode === 'motorcycle') && (_isBlank(segment.highways) || segment.highways.length === 0));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_HIGHWAYS', responses.accessCode);
        }
        return isValid;
      }
    },
    modeCarDriverYoungerWithoutLicense: {
      errorMessage: {
        fr: "Mode auto conducteur pour personne sans permis de conduire",
        en: "Car driver mode for person without driver's license"
      },
      errorCode: "S_I_MODECARDRIVERWITHOUTLICENSE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'carDriver' && person.drivingLicenseOwnership !== 'yes');
        if (interview.is_completed && !isValid)
        {
          console.log('S_I_MODECARDRIVERWITHOUTLICENSE', responses.accessCode);
        }
        return isValid;
      }
    },
    missingPassengerDriver: {
      errorMessage: {
        fr: "Mode auto passager, conducteur manquant",
        en: "Car passenger mode, driver missing"
      },
      errorCode: "S_M_PASSDRIVER",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'carPassenger' && _isBlank(segment.driver));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_PASSDRIVER', responses.accessCode);
        }
        return isValid;
      }
    },
    passengerDriverIdNotInHousehold: {
      errorMessage: {
        fr: "Mode auto passager, identifiant du conducteur déclaré absent du ménage",
        en: "Car passenger mode, declared driver id not in household"
      },
      errorCode: "S_I_PASSDRIVERNOTINHOUSEHOLD",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'carPassenger' && uuidValidate(segment.driver) && _isBlank(personsById[segment.driver]));
        if (interview.is_completed && !isValid)
        {
          console.log('S_I_PASSDRIVERNOTINHOUSEHOLD', responses.accessCode);
        }
        return isValid;
      }
    },
    passengerDriverIdWithoutDrivingLicense: {
      errorMessage: {
        fr: "Mode auto passager, conducteur sans permis de conduire",
        en: "Car passenger mode, driver without driver's license"
      },
      errorCode: "S_I_PASSDRIVERWITHOUTLICENSE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        if (segment.mode === 'carPassenger' && uuidValidate(segment.driver) && !_isBlank(personsById[segment.driver]))
        {
          const driver = personsById[segment.driver];
          if (driver.drivingLicenseOwnership !== 'yes')
          {
            if (interview.is_completed)
            {
              console.log('S_I_PASSDRIVERWITHOUTLICENSE', responses.accessCode);
            }
            return false;
          }
        }
        return true;
      }
    },
    missingStartSubwayStation: {
      errorMessage: {
        fr: "La station de métro d'embarquement est manquante",
        en: "Boarding subway station is missing"
      },
      errorCode: "S_M_STARTSUBWAYSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'transitSubway' && _isBlank(segment.subwayStationStart));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_STARTSUBWAYSTATION', responses.accessCode);
        }
        return isValid;
      }
    },
    missingEndSubwayStation: {
      errorMessage: {
        fr: "La station de métro de débarquement est manquante",
        en: "Alighting subway station is missing"
      },
      errorCode: "S_M_ENDSUBWAYSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'transitSubway' && _isBlank(segment.subwayStationEnd));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_ENDSUBWAYSTATION', responses.accessCode);
        }
        return isValid;
      }
    },
    unknownStartSubwayStation: {
      errorMessage: {
        fr: "La station de métro d'embarquement est inconnue",
        en: "Boarding subway station is unknown"
      },
      errorCode: "S_I_UNKNOWNSTARTSUBWAYSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode === 'transitSubway' && ['other','dontKnow'].includes(segment.subwayStationStart));
      }
    },
    unknownEndSubwayStation: {
      errorMessage: {
        fr: "La station de métro de débarquement est inconnue",
        en: "Alighting subway station is unknown"
      },
      errorCode: "S_M_UNKNOWNENDSUBWAYSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode === 'transitSubway' && ['other','dontKnow'].includes(segment.subwayStationEnd));
      }
    },
    missingStartTrainStation: {
      errorMessage: {
        fr: "La gare de train d'embarquement est manquante",
        en: "Boarding train station is missing"
      },
      errorCode: "S_M_STARTTRAINSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'transitRail' && _isBlank(segment.trainStationStart));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_STARTTRAINSTATION', responses.accessCode);
        }
        return isValid;
      }
    },
    missingEndTrainStation: {
      errorMessage: {
        fr: "La gare de train de débarquement est manquante",
        en: "Alighting train station is missing"
      },
      errorCode: "S_M_ENDTRAINSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'transitRail' && _isBlank(segment.trainStationEnd));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_ENDTRAINSTATION', responses.accessCode);
        }
        return isValid;
      }
    },
    unknownStartTrainStation: {
      errorMessage: {
        fr: "La gare de train d'embarquement est inconnue",
        en: "Boarding train station is unknown"
      },
      errorCode: "S_I_UNKNOWNSTARTTRAINSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode === 'transitRail' && ['other','dontKnow'].includes(segment.trainStationStart));
      }
    },
    unknownEndTrainStation: {
      errorMessage: {
        fr: "La gare de train de débarquement est inconnue",
        en: "Alighting train station is unknown"
      },
      errorCode: "S_M_UNKNOWNENDTRAINSTATION",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode === 'transitRail' && ['other','dontKnow'].includes(segment.trainStationEnd));
      }
    },
    missingVehicleOccupancy: {
      errorMessage: {
        fr: "Le nombre d'occupants dans le véhicule est manquant",
        en: "The number of persons in vehicle is missing"
      },
      errorCode: "S_M_VEHICLEOCCUPANCY",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'carDriver' && _isBlank(segment.vehicleOccupancy));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_VEHICLEOCCUPANCY', responses.accessCode);
        }
        return isValid;
      }
    },
    incorrectVehicleOccupancy: {
      errorMessage: {
        fr: "Le nombre d'occupants dans le véhicule est présent, mais le mode n'est pas auto conducteur",
        en: "The number of persons in vehicle is present, but the mode is not car driver"
      },
      errorCode: "S_I_VEHICLEOCCUPANCY",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode !== 'carDriver' && !_isBlank(segment.vehicleOccupancy));
      }
    },
    incorrectParkingPaymentTypeNotCarDriver: {
      errorMessage: {
        fr: "Le type de paiement du stationnement est présent, mais le mode n'est pas auto conducteur",
        en: "Parking payment type is present, but mode is not car driver"
      },
      errorCode: "S_I_NOTCARDRIVERWITHPAYMENTTYPE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode !== 'carDriver' && !_isBlank(segment.parkingPaymentType));
      }
    },
    incorrectBridgesNotCarDriver: {
      errorMessage: {
        fr: "Un ou des ponts sont déclarés, mais le mode n'est pas auto conducteur",
        en: "Bridge(s) are declared, but mode is not car driver"
      },
      errorCode: "S_I_NOTCARDRIVERWITHBRIDGES",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode !== 'carDriver' && segment.mode !== 'motorcycle' && !_isBlank(segment.bridgesAndTunnels));
      }
    },
    incorrectHighwaysNotCarDriver: {
      errorMessage: {
        fr: "Un ou des routes sont déclarées, mais le mode n'est pas auto conducteur",
        en: "Highway(s) are declared, but mode is not car driver"
      },
      errorCode: "S_I_NOTCARDRIVERWITHHIGHWAYS",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        return !(segment.mode !== 'carDriver' && segment.mode !== 'motorcycle' && !_isBlank(segment.highways));
      }
    },
    missingParkingPaymentType: {
      errorMessage: {
        fr: "Le type de paiement du stationnement est manquant (mode = auto conducteur)",
        en: "Parking payment type is missing (mode = car driver)"
      },
      errorCode: "S_M_PARKINGPAYMENTTYPE",
      isValid: function(user, interview, responses, household, home, personsById, personsArray, person, visitedPlacesById, visitedPlacesArray, tripsById, tripsArray, trip, segmentsById, segmentsArray, segment) {
        const isValid = !(segment.mode === 'carDriver' && _isBlank(segment.parkingPaymentType));
        if (interview.is_completed && !isValid)
        {
          console.log('S_M_PARKINGPAYMENTTYPE', responses.accessCode);
        }
        return isValid;
      }
    }
  }
};

export default validations