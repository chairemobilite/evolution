/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-business-days';
import isEmpty from 'lodash/isEmpty';
import _get from 'lodash/get';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { getResponse, getValidation, addGroupedObjects } from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { getSegmentsSectionConfig } from 'evolution-common/lib/services/questionnaire/sections/segments/sectionSegments';
import helper from './helper';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';


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
  'homeDwellingType',
  'homeGeography'
];

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

const sections: { [sectionName: string]: SectionConfig } = {

  //registrationCompleted: {
  //  previousSection: 'register',
  //  nextSection: 'home',
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
    preload: function (interview, { startUpdateInterview, callback }) {
      if (!getResponse(interview, 'tripsDate')) {
        startUpdateInterview('home', {
          'responses.tripsDate': moment().prevBusinessDay().format('YYYY-MM-DD'),
          'responses._startedAt': moment().unix()
        }, null, null, callback);
        return null;
      }
      callback(interview);
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
    preload: function(interview, { startAddGroupedObjects, startRemoveGroupedObjects, callback }) {
      const groupedObjects       = getResponse(interview, 'household.persons');
      const groupedObjectIds     = groupedObjects ? Object.keys(groupedObjects) : [];
      const countGroupedObjects  = groupedObjectIds.length;
      const householdSize: any   = getResponse(interview, 'household.size');
      const householdSizeIsValid = getValidation(interview, 'household.size');
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
      callback(interview);
      return null;
    },
    enableConditional: function(interview) {
      return helper.homeSectionComplete(interview);
    },
    completionConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    }
  },

/*  partTwoIntro: {
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
    widgets: [
      'partTwoIntroText',
      'partOneConfirmed'
    ],
    preload: function (interview, {startUpdateInterview, callback}) {
      const updateValuesByPath = {};
      if (_isBlank(getResponse(interview, 'tripsDate', null)))
      {
        updateValuesByPath['responses.tripsDate'] = moment().prevBusinessDay().format('YYYY-MM-DD');
      }
      if (_isBlank(getResponse(interview, '_partTwoStartedAt', null)))
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
      callback(interview);
      return null;
    }
  },*/

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
    preload: function(interview, { startUpdateInterview, callback }) {
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
      callback(interview);
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
    widgets: profileWidgets,
    preload: function (interview, { startUpdateInterview, callback }) {
      if (config.isPartTwo === true)
      {
        callback(interview);
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
      callback(interview);
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
    preload: function (interview, { startUpdateInterview, callback }) {
      const person = helper.getPerson(interview);
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview('tripsIntro', {
          [`responses.household.persons.${person._uuid}.journeys`]: undefined,
          [`responses.household.persons.${person._uuid}.lastVisitedPlaceNotHome`]: undefined,
          [`responses.household.persons.${person._uuid}.departurePlaceType`]: undefined,
          'responses._activeSection': 'travelBehavior'
        }, null, null, callback);
        return null;
      }
      else if (person.didTripsOnTripsDate === 'yes' || person.didTripsOnTripsDate === true)
      {
        const journeys = odSurveyHelper.getJourneysArray({ person });
        if (journeys.length >= 1) {
            const currentJourney = journeys[0];
            const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
            if (visitedPlaces.length >= 1)
            {
              const firstVisitedPlace         = visitedPlaces[0];
              const firstVisitedPlaceActivity = firstVisitedPlace ? firstVisitedPlace.activity : null;
              startUpdateInterview('tripsIntro', {
                [`responses.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.departurePlaceType`]: (firstVisitedPlaceActivity === 'home' ? 'home' : 'other'),
                'responses._activeSection': 'visitedPlaces',
                'responses._activeJourneyId': currentJourney._uuid
              }, null, null, callback);
            }
        } else {
            // Make sure to set initialize a journey for this person if it does not exist
            startUpdateInterview('tripsIntro', {
                ...(addGroupedObjects(interview, 1, 1, `household.persons.${person._uuid}.journeys`, [{ startDate: getResponse(interview, 'tripsDate') }])),
            }, null, null, (updatedInterview) => {
                const _person = helper.getPerson(updatedInterview);
                const journeys = odSurveyHelper.getJourneysArray({ person: _person });
                const currentJourney = journeys[0];
                startUpdateInterview('visitedPlaces', {
                    [`responses._activeJourneyId`]: currentJourney._uuid
                }, null, null, callback);
            });
        }
      }
      callback(interview);
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
    parentSection: 'tripsIntro',
    template: 'visitedPlaces',
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
    preload: function (interview, { startUpdateInterview, callback }) {
      
      const person = helper.getPerson(interview);
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview('tripsIntro', {
          'responses._activeSection': 'travelBehavior'
        }, null, null, callback);
        return null;
      }

      let   tripsUpdatesValueByPath  = {};
      const showNewPersonPopup       = getResponse(interview, '_showNewPersonPopup', false);
      
      if (showNewPersonPopup !== false)
      {
        tripsUpdatesValueByPath['responses._showNewPersonPopup'] = false;
      }
      
      // Journeys should not be empty
      const journeys = odSurveyHelper.getJourneysArray({ person });
      const currentJourney = journeys[0];
      const visitedPlaces             = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
      const activeVisitedPlaceId      = getResponse(interview, '_activeVisitedPlaceId', null);
      let   foundSelectedVisitedPlace = false;
      let   addValuesByPath           = {};

      if (visitedPlaces.length === 0)
      {
        addValuesByPath = addGroupedObjects(interview, 1, 1, `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`, currentJourney.departurePlaceType === 'home' ? [{ activity: 'home' }] : []);
        tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, addValuesByPath);
      }
      if (!_isBlank(tripsUpdatesValueByPath))
      {
        startUpdateInterview('visitedPlaces', tripsUpdatesValueByPath, null, null, function(_interview) {
          const _person                = helper.getPerson(_interview);
          const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(helper.getVisitedPlaces(_person));
          startUpdateInterview('visitedPlaces', {
            [`responses._activeVisitedPlaceId`]: selectedVisitedPlaceId,
            [`responses._activeJourneyId`]: currentJourney._uuid
          }, null, null, callback);
        });
      }
      else
      {
        const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(visitedPlaces);
        startUpdateInterview('visitedPlaces', {
          [`responses._activeVisitedPlaceId`]: selectedVisitedPlaceId,
          [`responses._activeJourneyId`]: currentJourney._uuid
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

  segments: getSegmentsSectionConfig({}),

  travelBehavior: {
    previousSection: 'segments',
    nextSection: "end",
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
    preload: function (interview, { startUpdateInterview,callback }) {
      const person = helper.getPerson(interview);
      if ((interview as any).visibleWidgets.indexOf(`household.persons.${person._uuid}.noSchoolTripReason`) <= -1 && (interview as any).visibleWidgets.indexOf(`household.persons.${person._uuid}.noWorkTripReason`) <= -1 && (interview as any).visibleWidgets.indexOf(`household.persons.${person._uuid}.whoAnsweredForThisPerson`) <= -1)
      {
        const person = helper.getPerson(interview);
        startUpdateInterview('travelBehavior', {
          [`responses.household.persons.${person._uuid}.whoAnsweredForThisPerson`]: person._uuid,
          'responses._activeSection': 'end'
        }, null, null, callback);
        return null;
      }
      callback(interview);
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
    preload: function (interview, { startUpdateInterview, callback }) {
      
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
      if (getResponse(interview, '_showNewPersonPopup', null) !== false)
      {
        startUpdateInterview('end', {
          'responses._showNewPersonPopup': false
        }, null, null, callback);
        return null;
      }
      callback(interview);
      return null;
    },
    enableConditional: function(interview) {
      if (!helper.householdMembersSectionComplete(interview) || !helper.allPersonsTripsAndTravelBehaviorComplete(interview)) { return false; }
      return true;
    },
    completionConditional: function(interview) {
      if (!helper.householdMembersSectionComplete(interview) || !helper.allPersonsTripsAndTravelBehaviorComplete(interview)) { return false; }
      const household: any = getResponse(interview, 'household');
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
    parentSection: 'end',
    title: {
      fr: "Entrevue complétée",
      en: "Interview completed"
    },
    widgets: [
      'completedText'
    ],
    preload: function (interview, { startUpdateInterview, callback, user }) {
      if (config.isPartTwo === true)
      {
        if (!user || (user && user.is_admin !== true))
        {
          startUpdateInterview('end', {
            'responses._partTwoCompletedAt': moment().unix(),
            'responses._partTwoIsCompleted': true,
            'responses._completedAt': moment().unix(),
            'responses._isCompleted': true
          }, null, null, callback);
        }
      }
      else
      {
        if (!user || (user && user.is_admin !== true))
        {
          startUpdateInterview('end', {
            'responses._completedAt': moment().unix(),
            'responses._isCompleted': true
          }, null, null, callback);
        }
      }
      startUpdateInterview('end', {}, null, null, callback);
      return null;
    }
    
  },

};

export default sections;