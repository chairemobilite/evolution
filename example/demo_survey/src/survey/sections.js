/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-business-days';
import isEmpty from 'lodash.isempty';
import _get from 'lodash.get';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import SegmentsSection from './templates/SegmentsSection';
import VisitedPlacesSection from './templates/VisitedPlacesSection';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';
import helper from './helper';
import config from 'chaire-lib-common/lib/config/shared/project.config';


const homeWidgets = [
  //'homeIntro',
  'householdSize',
  'householdCarNumber',
  'homeAddress',
  'homeApartmentNumber',
  'homeCity',
  'homeRegion',
  'homeCountry',
  'homePostalCode',
  //'homeDwellingType',
  'homeGeography'
];

const personsWidgets = [
  'personNickname',
  'personAge',
  'personGender',
  'personOccupation',
  'personDrivingLicenseOwner',
  'personTransitPassOwner',
  'personTransitPasses',
  'personCarsharingMember',
  'personBikesharingMember',
  'personHasDisability',
  'personCellphoneOwner'
];
if (config.isPartTwo !== true)
{
  personsWidgets.push("personDidTrips");
}

let profileWidgets = [];

if (config.isPartTwo === true)
{
  profileWidgets = [
    "activePersonTitle",
    "buttonSwitchPerson",
    "personNewPerson",
    "personDidTripsProfile",
    "personDidTripsKnowTrips",
    "personWorkOnTheRoad",
    "personUsualWorkPlaceIsHome",
    "personUsualWorkPlaceName",
    "personUsualWorkPlaceGeography",
    "personUsualSchoolPlaceName",
    "personUsualSchoolPlaceGeography",
    "buttonSaveNextSection"
  ];
}
else
{
  profileWidgets = [
    "activePersonTitle",
    "buttonSwitchPerson",
    "personNewPerson",
    "personWorkOnTheRoad",
    "personUsualWorkPlaceIsHome",
    "personUsualWorkPlaceName",
    "personUsualWorkPlaceGeography",
    "personUsualSchoolPlaceName",
    "personUsualSchoolPlaceGeography",
    'buttonSaveNextSection'
  ];
}

if (config.askForAccessCode)
{
  homeWidgets.unshift('accessCode');
}

export default {

  //registrationCompleted: {
  //  previousSection: 'register',
  //  nextSection: 'home',
  //  hiddenInNav: true,
  //  title: {
  //    fr: "Enregistrement",
  //    en: "Registration"
  //  },
  //  menuName: null,
  //  widgets: [
  //    'registrationCompletedBeforeStartButton',
  //    'registrationCompletedStartButton',
  //    'registrationCompletedAfterStartButton'
  //  ]
  //},
  
  home: {
    previousSection: null,
    nextSection: 'householdMembers',
    title: {
      fr: "Domicile",
      en: "Home"
    },
    menuName: {
      fr: "Domicile",
      en: "Home"
    },
    widgets: [
      ...homeWidgets,
      'buttonSaveNextSection'
    ],
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      if (!surveyHelperNew.getResponse(interview, 'tripsDate')) {
        startUpdateInterview('home', {
          'responses.tripsDate': moment().prevBusinessDay().format('YYYY-MM-DD'),
          'responses._startedAt': moment().unix()
        }, null, null, callback);
        return null;
      }
      callback();
      return null;
    },
    enableConditional: true,
    completionConditional: function(interview) {
      return helper.homeSectionComplete(interview);
    }
  },

  householdMembers: {
    previousSection: 'home',
    nextSection: 'selectPerson',
    title: {
      fr: "Membres du ménage",
      en: "Household members"
    },
    menuName: {
      fr: "Votre ménage",
      en: "Your household"
    },
    widgets: [
      'householdMembers',
      'buttonSaveNextSectionHouseholdMembers'
    ],
    groups: {
      'householdMembers': {
        showGroupedObjectDeleteButton: function(interview, path) { 
          const countPersons = helper.countPersons(interview);
          if (config.isPartTwo === true)
          {
            return countPersons > 1;
          }
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          return countPersons > householdSize;
        },
        showGroupedObjectAddButton: function(interview, path) {
          //const hasGroupedObjects = Object.keys(_get(interview, `groups.householdMembers`, {})).length > 0;
          //const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
          //const persons           = surveyHelperNew.getResponse(interview, path, {});
          return true;//hasGroupedObjects && Object.keys(persons).length < householdSize;
        },
        groupedObjectAddButtonLabel: {
          fr: "Ajouter une personne manquante",
          en: "Add a missing person"
        },
        addButtonSize: 'small',
        widgets: personsWidgets
      }
    },
    preload: function(interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      const groupedObjects       = surveyHelperNew.getResponse(interview, 'household.persons');
      const groupedObjectIds     = groupedObjects ? Object.keys(groupedObjects) : [];
      const countGroupedObjects  = groupedObjectIds.length;
      const householdSize        = surveyHelperNew.getResponse(interview, 'household.size');
      const householdSizeIsValid = surveyHelperNew.getValidation(interview, 'household.size');
      const emptyGroupedObjects  = groupedObjectIds.filter((groupedObjectId) => isEmpty(groupedObjects[groupedObjectId]));
      if (householdSizeIsValid && householdSize) {
        if (countGroupedObjects < householdSize) {
          // auto create objects according to household size:
          startAddGroupedObjects(householdSize - countGroupedObjects, -1, 'household.persons', null, callback);
          return null;
        }
        else if (countGroupedObjects > householdSize) {
          const pathsToDelete = [];
          // auto remove empty objects according to household size:
          for (let i = 0; i < countGroupedObjects; i++) {
            if (emptyGroupedObjects[i]) {
              pathsToDelete.push(`household.persons.${emptyGroupedObjects[i]}`);            
            }
          }
          if (pathsToDelete.length > 0)
          {
            startRemoveGroupedObjects(pathsToDelete, callback);
            return null;
          }
        }
      }
      callback();
      return null;
    },
    enableConditional: function(interview) {
      return helper.homeSectionComplete(interview);
    },
    completionConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    }
  },

  partTwoIntro: {
    isPartTwoFirstSection: true,
    previousSection: 'householdMembers',
    nextSection: "selectPerson",
    parentSection: "selectPerson",
    title: {
      fr: "Intro deuxième partie",
      en: "Intro second part"
    },
    menuName: {
      fr: "Profil",
      en: "Profile"
    },
    hiddenInNav: true,
    widgets: [
      'partTwoIntroText',
      'partOneConfirmed'
    ],
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      const updateValuesByPath = {};
      if (_isBlank(surveyHelperNew.getResponse(interview, 'tripsDate', null)))
      {
        updateValuesByPath['responses.tripsDate'] = moment().prevBusinessDay().format('YYYY-MM-DD');
      }
      if (_isBlank(surveyHelperNew.getResponse(interview, '_partTwoStartedAt', null)))
      {
        updateValuesByPath['responses._partTwoStartedAt'] = moment().unix();
      }
      if (!helper.householdMembersSectionPartOneComplete(interview))
      {
        updateValuesByPath['responses._activeSection'] = 'home';
      }
      if (Object.keys(updateValuesByPath).length > 0)
      {
        startUpdateInterview('partTwoIntro', updateValuesByPath, null, null, callback);
        return null;
      }
      callback();
      return null;
    }
  },

  selectPerson: {
    previousSection: 'householdMembers',
    nextSection: "profile",
    title: {
      fr: "Sélection du membre du ménage",
      en: "Household member selection"
    },
    menuName: {
      fr: "Profil",
      en: "Profile"
    },
    widgets: [
      'selectPerson',
      'buttonSelectPersonConfirm'
    ],
    preload: function(interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      const personsCount = helper.countPersons(interview);
      if (personsCount === 1)
      {
        const personIds = helper.getPersons(interview);
        startUpdateInterview('selectPerson', {
          'responses._activePersonId': Object.keys(personIds)[0],
          'responses._activeSection': 'profile'
        }, null, null, callback);
        return null;
      }
      callback();
      return null;
    },
    enableConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    },
    completionConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.profileInfoForPersonComplete(person, interview);
    }
  },

  profile: {
    previousSection: 'selectPerson',
    nextSection: "tripsIntro",
    parentSection: "selectPerson",
    title: {
      fr: "Profil",
      en: "Profile"
    },
    menuName: {
      fr: "Profil",
      en: "Profile"
    },
    hiddenInNav: true,
    widgets: profileWidgets,
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      if (config.isPartTwo === true)
      {
        callback();
        return null;
      }
      const person = helper.getPerson(interview);
      if (!helper.isWorker(person.occupation) && !helper.isStudent(person.occupation))
      {
        if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
        {
          startUpdateInterview('profile', {
            'responses._activeSection': 'travelBehavior'
          }, null, null, callback);
        }
        else
        {
          startUpdateInterview('profile', {
            'responses._activeSection': 'tripsIntro'
          }, null, null, callback);
        }
        return null;
      }
      callback();
      return null;
    },
    enableConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    },
    completionConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.profileInfoForPersonComplete(person, interview);
    }
  },

  tripsIntro: {
    previousSection: 'profile',
    nextSection: "visitedPlaces",
    title: {
      fr: "Introduction aux déplacements",
      en: "Trips introduction"
    },
    menuName: {
      fr: "Déplacements",
      en: "Trips"
    },
    widgets: [
      'activePersonTitle',
      'buttonSwitchPerson',
      'visitedPlacesIntro',
      'personDeparturePlaceType',
      'buttonContinueNextSection',
      'visitedPlacesOutro'
    ],
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      const person = helper.getPerson(interview);
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview('tripsIntro', {
          [`responses.household.persons.${person._uuid}.visitedPlaces`]: undefined,
          [`responses.household.persons.${person._uuid}.trips`]: undefined,
          [`responses.household.persons.${person._uuid}.lastVisitedPlaceNotHome`]: undefined,
          [`responses.household.persons.${person._uuid}.departurePlaceType`]: undefined,
          'responses._activeSection': 'travelBehavior'
        }, null, null, callback);
        return null;
      }
      else if (person.didTripsOnTripsDate === 'yes' || person.didTripsOnTripsDate === true)
      {
        const visitedPlaces = helper.getVisitedPlaces(person, true);
        if (visitedPlaces.length >= 1)
        {
          const firstVisitedPlace         = visitedPlaces[0];
          const firstVisitedPlaceActivity = firstVisitedPlace ? firstVisitedPlace.activity : null;
          startUpdateInterview('tripsIntro', {
            [`responses.household.persons.${person._uuid}.departurePlaceType`]: (firstVisitedPlaceActivity === 'home' ? 'home' : 'other'),
            'responses._activeSection': 'visitedPlaces'
          }, null, null, callback);
        }
      }
      callback();
      return null;
    },
    enableConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.profileInfoForPersonComplete(person, interview);
    },
    completionConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.travelBehaviorForPersonComplete(person, interview);
    }
  },

  visitedPlaces: {
    previousSection: 'tripsIntro',
    nextSection: "segments",
    hiddenInNav: true,
    parentSection: 'tripsIntro',
    template: VisitedPlacesSection,
    title: {
      fr: "Déplacements",
      en: "Trips"
    },
    menuName: {
      fr: "Déplacements",
      en: "Trips"
    },
    customStyle: {
      maxWidth: '120rem'
    },
    widgets: [
      'activePersonTitle',
      'buttonSwitchPerson',
      'personVisitedPlacesTitle',
      'personVisitedPlacesMap',
      'personVisitedPlaces',
      //'personLastVisitedPlaceNotHome',
      'buttonVisitedPlacesConfirmNextSection'
    ],
    groups: {
      'personVisitedPlaces': {
        showGroupedObjectDeleteButton: false,
        deleteConfirmPopup: {
          content: {
            fr: function(interview) {
              return `Confirmez-vous que vous voulez retirer ce lieu?`;
            },
            en: function(interview) {
              return `Do you confirm that you want to remove this location?`;
            }
          }
        },
        showGroupedObjectAddButton:    true,
        addButtonLocation: 'both',
        widgets: [
          "visitedPlaceActivity",
          "visitedPlaceAlreadyVisited",
          "visitedPlaceShortcut",
          "visitedPlaceName",
          "visitedPlaceGeography",
          //"visitedPlaceArrivalAndDepartureTime",
          "visitedPlaceArrivalTime",
          "visitedPlaceDepartureTime",
          "visitedPlaceNextPlaceCategory",
          //"visitedPlaceWentBackHomeDirectlyAfter",
          //"visitedPlaceIsNotLast",
          "buttonSaveVisitedPlace",
          "buttonCancelVisitedPlace",
          "buttonDeleteVisitedPlace"
        ]
      }
    },
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      
      const person = helper.getPerson(interview);
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview('tripsIntro', {
          'responses._activeSection': 'travelBehavior'
        }, null, null, callback);
        return null;
      }

      let   tripsUpdatesValueByPath  = {};
      const showNewPersonPopup       = surveyHelperNew.getResponse(interview, '_showNewPersonPopup', false);
      
      if (showNewPersonPopup !== false)
      {
        tripsUpdatesValueByPath['responses._showNewPersonPopup'] = false;
      }
      
      const visitedPlaces             = helper.getVisitedPlaces(person);
      const activeVisitedPlaceId      = surveyHelperNew.getResponse(interview, '_activeVisitedPlaceId', null);
      let   foundSelectedVisitedPlace = false;
      let   addValuesByPath           = {};

      if (visitedPlaces.length === 0 && person.departurePlaceType === 'home')
      {
        addValuesByPath = surveyHelper.addGroupedObjects(interview, 1, 1, `household.persons.${person._uuid}.visitedPlaces`, [{ activity: 'home' }]);
        tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, addValuesByPath);
      }
      else if (visitedPlaces.length === 0 && person.departurePlaceType !== 'home')
      {
        addValuesByPath = surveyHelper.addGroupedObjects(interview, 1, 1, `household.persons.${person._uuid}.visitedPlaces`, []);
        tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, addValuesByPath);
      }
      if (!_isBlank(tripsUpdatesValueByPath))
      {
        startUpdateInterview('visitedPlaces', tripsUpdatesValueByPath, null, null, function(_interview) {
          const _person                = helper.getPerson(_interview);
          const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(helper.getVisitedPlaces(_person));
          startUpdateInterview('visitedPlaces', {
            [`responses._activeVisitedPlaceId`]: selectedVisitedPlaceId
          }, null, null, callback);
        });
      }
      else
      {
        const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(visitedPlaces);
        startUpdateInterview('visitedPlaces', {
          [`responses._activeVisitedPlaceId`]: selectedVisitedPlaceId
        }, null, null, callback);
      }
      return null;
    },
    enableConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.tripsIntroForPersonComplete(person, interview);
    },
    completionConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.travelBehaviorForPersonComplete(person, interview);
    }
  },

  segments: {
    previousSection: 'visitedPlaces',
    template: SegmentsSection,
    nextSection: "travelBehavior",
    hiddenInNav: true,
    parentSection: 'tripsIntro',
    title: {
      fr: "Modes de transport",
      en: "Travel modes"
    },
    customStyle: {
      maxWidth: '120rem'
    },
    widgets: [
      'activePersonTitle',
      'buttonSwitchPerson',
      'personTripsTitle',
      'personTrips',
      'personVisitedPlacesMap',
      'buttonConfirmNextSection'
    ],
    groups: {
      'personTrips': {
        showGroupedObjectDeleteButton: false,
        showGroupedObjectAddButton: false,
        widgets: [
          'segmentIntro',
          'segments',
          'tripJunctionGeography',
          //'introButtonSaveTrip',
          'buttonSaveTrip'
        ]
      },
      'segments': {
        showTitle: false,
        showGroupedObjectDeleteButton: function(interview, path) {
          const segment = surveyHelperNew.getResponse(interview, path, {});
          return (segment && segment['_sequence'] > 1);
        },
        showGroupedObjectAddButton: function(interview, path) {
          const segments      = surveyHelperNew.getResponse(interview, path, {});
          const segmentsArray = Object.values(segments).sort((segmentA, segmentB) => {
            return segmentA['_sequence'] - segmentB['_sequence'];
          });
          const segmentsCount = segmentsArray.length;
          const lastSegment   = segmentsArray[segmentsCount - 1];
          return segmentsCount === 0 || (lastSegment  && lastSegment.isNotLast === true);
        },
        groupedObjectAddButtonLabel: {
          fr: function(interview, path) {
            const segments      = surveyHelperNew.getResponse(interview, path, {});
            const segmentsCount = Object.keys(segments).length;
            if (segmentsCount === 0)
            {
              return 'Sélectionner le premier (ou le seul) mode de transport utilisé pour ce déplacement';
            }
            else
            {
              return 'Sélectionner le mode de transport suivant';
            }
          },
          en: function(interview, path) {
            const segments = surveyHelperNew.getResponse(interview, path, {});
            const segmentsCount = Object.keys(segments).length;
            if (segmentsCount === 0)
            {
              return 'Select the first mode of transport used during this trip';
            }
            else
            {
              return 'Select the next mode of transport';
            }
          }
        },
        addButtonLocation: 'bottom',
        widgets: [
          'segmentMode',
          //'segmentParkingType',
          'segmentParkingPaymentType',
          'segmentVehicleOccupancy',
          'segmentVehicleType',
          'segmentDriver',
          'segmentBridgesAndTunnels',
          'segmentHighways',
          'segmentUsedBikesharing',
          'segmentSubwayStationStart',
          'segmentSubwayStationEnd',
          'segmentSubwayTransferStations',
          'segmentTrainStationStart',
          'segmentTrainStationEnd',
          'segmentBusLines',
          'segmentIsNotLast'
        ]
      }
    },
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      
      const person = helper.getPerson(interview);
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview('tripsIntro', {
          'responses._activeSection': 'travelBehavior'
        }, null, null, callback);
        return null;
      }
      let   tripsUpdatesValueByPath  = {};
      let   tripsUpdatesUnsetPaths   = [];
      const tripsPath                = `household.persons.${person._uuid}.trips`;
      const visitedPlaces            = helper.getVisitedPlaces(person);
      let   trips                    = helper.getTrips(person);
      //const activeTripId             = surveyHelperNew.getResponse(interview, '_activeTripId', null);
      //let   foundSelectedTrip        = false;
      
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
          // also delete existing segments:
          tripsUpdatesValueByPath[`responses.${tripsPath}.${trip._uuid}.segments`] = undefined;
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
          [updateValuePaths, unsetValuePaths] = surveyHelper.removeGroupedObjects(tripsPathsToRemove, interview);
          tripsUpdatesUnsetPaths  = tripsUpdatesUnsetPaths.concat(unsetValuePaths);
          tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, updateValuePaths);
        }
      }
      // update needed origin and destination visited places uuids:
      if (!isEmpty(tripsUpdatesValueByPath) || !isEmpty(tripsUpdatesUnsetPaths))
      {
        startUpdateInterview('segments', tripsUpdatesValueByPath, tripsUpdatesUnsetPaths, null, function(_interview) {
          const _person        = helper.getPerson(_interview);
          const selectedTripId = helper.selectNextTripId(helper.getTrips(_person));
          startUpdateInterview('segments', {
            [`responses._activeTripId`]: (!_isBlank(selectedTripId) ? selectedTripId : null)
          }, null, null, callback);
        });
      }
      else
      {
        const selectedTripId = helper.selectNextTripId(helper.getTrips(person));
        startUpdateInterview('segments', {
          [`responses._activeTripId`]: (!_isBlank(selectedTripId) ? selectedTripId : null)
        }, null, null, callback);
      }
      return null;
    },
    enableConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.visitedPlacesForPersonComplete(person, interview);
    },
    completionConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.tripsForPersonComplete(person, interview);
    }
  },

  travelBehavior: {
    previousSection: 'modes',
    nextSection: "end",
    hiddenInNav: true,
    parentSection: 'tripsIntro',
    title: {
      fr: "Mobilité",
      en: "Travel behavior"
    },
    widgets: [
      'activePersonTitle',
      'buttonSwitchPerson',
      'personNoWorkTripReason',
      'personNoSchoolTripReason',
      'personWhoAnsweredForThisPerson',
      'buttonContinueNextSection'
    ],
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      const person = helper.getPerson(interview);
      if (interview.visibleWidgets.indexOf(`household.persons.${person._uuid}.noSchoolTripReason`) <= -1 && interview.visibleWidgets.indexOf(`household.persons.${person._uuid}.noWorkTripReason`) <= -1 && interview.visibleWidgets.indexOf(`household.persons.${person._uuid}.whoAnsweredForThisPerson`) <= -1)
      {
        const person = helper.getPerson(interview);
        startUpdateInterview('travelBehavior', {
          [`responses.household.persons.${person._uuid}.whoAnsweredForThisPerson`]: person._uuid,
          'responses._activeSection': 'end'
        }, null, null, callback);
        return null;
      }
      callback();
      return null;
    },
    enableConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.tripsForPersonComplete(person, interview);
    },
    completionConditional: function(interview) {
      const person = helper.getPerson(interview);
      return helper.householdMembersSectionComplete(interview) && helper.travelBehaviorForPersonComplete(person, interview);
    }
  },

  end: {
    previousSection: 'travelBehavior',
    nextSection: "completed",
    title: {
      fr: "Fin",
      en: "End"
    },
    menuName: {
      fr: "Fin",
      en: "End"
    },
    widgets: [
      'householdResidentialPhoneType',
      'householdDidAlsoRespondByPhone',
      'householdWouldLikeToParticipateInOtherSurveys',
      'householdContactEmail',
      'householdDateNextContact',
      'householdIncome',
      'householdSurveyAppreciation',
      'householdCommentsOnSurvey',
      'buttonCompleteInterview'
    ],
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      
      const persons = helper.getPersons(interview);
      for (let personId in persons)
      {
        const person = persons[personId];
        if (person.age >= 5 && _isBlank(person.whoAnsweredForThisPerson))
        {
          startUpdateInterview('end', {
            'responses._activePersonId'    : person._uuid,
            'responses._activeSection'     : 'profile',
            'responses._showNewPersonPopup': true
          }, null, null, callback);
          return null;
        }
      }
      if (surveyHelperNew.getResponse(interview, '_showNewPersonPopup', null) !== false)
      {
        startUpdateInterview('end', {
          'responses._showNewPersonPopup': false
        }, null, null, callback);
        return null;
      }
      callback();
      return null;
    },
    enableConditional: function(interview) {
      if (!helper.householdMembersSectionComplete(interview) || !helper.allPersonsTripsAndTravelBehaviorComplete(interview)) { return false; }
      return true;
    },
    completionConditional: function(interview) {
      if (!helper.householdMembersSectionComplete(interview) || !helper.allPersonsTripsAndTravelBehaviorComplete(interview)) { return false; }
      const household = surveyHelperNew.getResponse(interview, 'household');
      if (
           _isBlank(household.residentialPhoneType)
        || _isBlank(household.didAlsoRespondByPhone)
      ) { return false; }
      return true;
    }
  },

  completed: {
    previousSection: 'end',
    nextSection: null,
    hiddenInNav: true,
    parentSection: 'end',
    title: {
      fr: "Entrevue complétée",
      en: "Interview completed"
    },
    widgets: [
      'completedText'
    ],
    preload: function (interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      if (config.isPartTwo === true)
      {
        if (!this.props.user || (this.props.user && this.props.user.is_admin !== true))
        {
          startUpdateInterview('end', {
            'responses._language'   : this.props.i18n.language,
            'responses._partTwoCompletedAt': moment().unix(),
            'responses._partTwoIsCompleted': true,
            'responses._completedAt': moment().unix(),
            'responses._isCompleted': true
          }, null, null, callback);
        }
      }
      else
      {
        if (!this.props.user || (this.props.user && this.props.user.is_admin !== true))
        {
          startUpdateInterview('end', {
            'responses._language'   : this.props.i18n.language,
            'responses._completedAt': moment().unix(),
            'responses._isCompleted': true
          }, null, null, callback);
        }
      }
      startUpdateInterview('end', {}, null, null, callback);
      return null;
    }
    
  },
  






  // admin validation section (one pager)
  validationOnePager: {
    isAdmin: true,
    previousSection: null,
    nextSection: null,
    title: {
      fr: "Validation",
      en: "Validation"
    },
    menuName: {
      fr: "Validation",
      en: "Validation"
    },
    widgets: [
      'interviewLanguage',
      ...homeWidgets,
      'householdResidentialPhoneType',
      'householdDidAlsoRespondByPhone',
      'householdWouldLikeToParticipateInOtherSurveys',
      'householdContactEmail',
      'householdDateNextContact',
      'householdIncome',
      'householdSurveyAppreciation',
      'householdCommentsOnSurvey',
      'householdMembers',
      "selectPerson"
    ],
    groups: {
      'householdMembers': {
        showGroupedObjectDeleteButton: function(interview, path) { 
          const countPersons = helper.countPersons(interview);
          if (config.isPartTwo === true)
          {
            return countPersons > 1;
          }
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          return countPersons > householdSize;
        },
        showGroupedObjectAddButton: function(interview, path) {
          //const hasGroupedObjects = Object.keys(_get(interview, `groups.householdMembers`, {})).length > 0;
          //const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
          //const persons           = surveyHelperNew.getResponse(interview, path, {});
          return true;//hasGroupedObjects && Object.keys(persons).length < householdSize;
        },
        groupedObjectAddButtonLabel: {
          fr: "Ajouter une personne manquante",
          en: "Add a missing person"
        },
        addButtonSize: 'small',
        widgets: [...personsWidgets, 
          "groupedPersonWorkOnTheRoad",
          "groupedPersonUsualWorkPlaceIsHome",
          "groupedPersonUsualWorkPlaceName",
          "groupedPersonUsualWorkPlaceGeography",
          "groupedPersonUsualSchoolPlaceName",
          "groupedPersonUsualSchoolPlaceGeography",
          "groupedPersonNoWorkTripReason",
          "groupedPersonNoSchoolTripReason",
          "groupedPersonWhoAnsweredForThisPerson"
        ]
      }
    },
    preload: function(interview, startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback) {
      if (!surveyHelperNew.getResponse(interview, 'tripsDate')) {
        startUpdateInterview('home', {
          'responses.tripsDate': moment().prevBusinessDay().format('YYYY-MM-DD'),
          'responses._startedAt': moment().unix()
        }, null, null, callback);
        return null;
      }
      const groupedObjects       = surveyHelperNew.getResponse(interview, 'household.persons');
      const groupedObjectIds     = groupedObjects ? Object.keys(groupedObjects) : [];
      const countGroupedObjects  = groupedObjectIds.length;
      const householdSize        = surveyHelperNew.getResponse(interview, 'household.size');
      const householdSizeIsValid = surveyHelperNew.getValidation(interview, 'household.size');
      const emptyGroupedObjects  = groupedObjectIds.filter((groupedObjectId) => isEmpty(groupedObjects[groupedObjectId]));
      if (householdSizeIsValid && householdSize) {
        if (countGroupedObjects < householdSize) {
          // auto create objects according to household size:
          startAddGroupedObjects(householdSize - countGroupedObjects, -1, 'household.persons', null, callback);
          return null;
        }
        else if (countGroupedObjects > householdSize) {
          const pathsToDelete = [];
          // auto remove empty objects according to household size:
          for (let i = 0; i < countGroupedObjects; i++) {
            if (emptyGroupedObjects[i]) {
              pathsToDelete.push(`household.persons.${emptyGroupedObjects[i]}`);            
            }
          }
          if (pathsToDelete.length > 0)
          {
            startRemoveGroupedObjects(pathsToDelete, callback);
            return null;
          }
        }
      }
      callback();
      return null;
    },
    enableConditional: true,
    completionConditional: true
  }

};