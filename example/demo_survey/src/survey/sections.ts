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
import { getAndValidateSurveySections, SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { personNoWorkTripReason, personNoSchoolTripReason, personWhoAnsweredForThisPerson } from './widgets/travelBehavior';
import { checkConditional } from 'evolution-frontend/lib/actions/utils/Conditional';



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
  
  home: {
    previousSection: null,
    nextSection: 'householdMembers',
    title: {
      fr: "Domicile",
      en: "Home"
    },
    widgets: [
      ...homeWidgets,
      'buttonSaveNextSection'
    ],
    preload: function (interview, { startUpdateInterview, callback }) {
      if (!getResponse(interview, 'tripsDate')) {
        startUpdateInterview({
          sectionShortname: 'home',
          valuesByPath: {
            'response.tripsDate': moment().prevBusinessDay().format('YYYY-MM-DD'),
            'response._startedAt': moment().unix()
          }
        }, callback);
        return null;
      }
      callback(interview);
      return null;
    },
    enableConditional: true,
    completionConditional: function(interview) {
      return helper.homeSectionComplete(interview);
    },
    isSectionCompleted: (interview) => helper.homeSectionComplete(interview)
  },

  householdMembers: {
    previousSection: 'home',
    nextSection: 'personsTrips',
    title: {
      fr: "Membres du ménage",
      en: "Household members"
    },
    navMenu: {
      type: 'inNav',
      menuName: {
        fr: "Votre ménage",
        en: "Your household"
      }
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
    },
    isSectionCompleted: (interview) => helper.householdMembersSectionComplete(interview)
  },

  personsTrips: {
    previousSection: 'householdMembers',
    nextSection: "end",
    title: {
      fr: "Sélection du membre du ménage",
      en: "Household member selection"
    },
    navMenu: {
      type: 'inNav',
      menuName: {
        fr: "Déplacements",
        en: "Trips"
      }
    },
    widgets: [
      'selectPerson',
      'buttonSelectPersonConfirm'
    ],
    enableConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    },
    completionConditional: function(interview) {
      const persons = odSurveyHelper.getInterviewablePersonsArray({ interview });
      return helper.householdMembersSectionComplete(interview) && !persons.some(person => !helper.profileInfoForPersonComplete(person, interview));
    },
    repeatedBlock: {
      iterationRule: {
        type: 'builtin',
        path: 'interviewablePersons'
      },
      order: 'sequential',
      selectionSectionId: 'selectPerson',
      skipSelectionInNaturalFlow: true,
      activeSurveyObjectPath: '_activePersonId',
      pathPrefix: 'person',
      sections: ['selectPerson', 'profile', 'tripsIntro', 'visitedPlaces', 'segments', 'travelBehavior']
    }
  },

  selectPerson: {
    previousSection: 'personsTrips',
    nextSection: "profile",
    title: {
      fr: "Sélection du membre du ménage",
      en: "Household member selection"
    },
    widgets: [
      'selectPerson',
      'buttonSelectPersonConfirm'
    ],
    enableConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    },
    isSectionCompleted: (interview, iterationContext) => {
        // Completed if there is an active person ID set
        const activePersonId = _get(interview, 'response._activePersonId', null);
        return !_isBlank(activePersonId);
    }
  },

  profile: {
    previousSection: 'selectPerson',
    nextSection: "tripsIntro",
    title: {
      fr: "Profil",
      en: "Profile"
    },
    widgets: profileWidgets,
    enableConditional: function(interview) {
      return helper.householdMembersSectionComplete(interview);
    },
    completionConditional: function(interview) {
      const person = odSurveyHelper.getPerson({ interview });
      return helper.householdMembersSectionComplete(interview) && helper.profileInfoForPersonComplete(person, interview);
    },
    isSectionCompleted: (interview, iterationContext) => {
      const person = odSurveyHelper.getPerson({ interview, personId: iterationContext[iterationContext.length - 1] });
      return helper.profileInfoForPersonComplete(person, interview);
    },
    isSectionVisible: (interview, iterationContext) => {
      // Show this section for workers and students
      const person = odSurveyHelper.getPerson({ interview, personId: iterationContext[iterationContext.length - 1] });
      return helper.isWorker(person.occupation) || helper.isStudent(person.occupation);
    }
  },

  tripsIntro: {
    previousSection: 'profile',
    nextSection: "visitedPlaces",
    title: {
      fr: "Introduction aux déplacements",
      en: "Trips introduction"
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
      const person = odSurveyHelper.getPerson({ interview }) as any;
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview({
          sectionShortname: 'tripsIntro', 
          valuesByPath: {
            [`response.household.persons.${person._uuid}.journeys`]: undefined,
            [`response.household.persons.${person._uuid}.lastVisitedPlaceNotHome`]: undefined,
            [`response.household.persons.${person._uuid}.departurePlaceType`]: undefined
          }
        }, callback);
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
              startUpdateInterview({
                sectionShortname: 'tripsIntro', 
                valuesByPath: {
                  [`response.household.persons.${person._uuid}.journeys.${currentJourney._uuid}.departurePlaceType`]: (firstVisitedPlaceActivity === 'home' ? 'home' : 'other'),
                  'response._activeJourneyId': currentJourney._uuid
                }
              }, callback);
            }
        } else {
            // Make sure to set initialize a journey for this person if it does not exist
            startUpdateInterview({
                sectionShortname: 'tripsIntro', 
                valuesByPath: {
                  ...(addGroupedObjects(interview, 1, 1, `household.persons.${person._uuid}.journeys`, [{ startDate: getResponse(interview, 'tripsDate') }])),
                }
            }, (updatedInterview) => {
                const _person = odSurveyHelper.getPerson({ interview: updatedInterview});
                const journeys = odSurveyHelper.getJourneysArray({ person: _person });
                const currentJourney = journeys[0];
                startUpdateInterview({
                    sectionShortname: 'visitedPlaces', 
                    valuesByPath: { [`response._activeJourneyId`]: currentJourney._uuid }
                }, callback);
            });
        }
      }
      callback(interview);
      return null;
    },
    enableConditional: function(interview) {
      const person = odSurveyHelper.getPerson({ interview });
      return helper.householdMembersSectionComplete(interview) && helper.profileInfoForPersonComplete(person, interview);
    },
    isSectionCompleted: function(interview) {
      const person = odSurveyHelper.getPerson({ interview });
      return helper.householdMembersSectionComplete(interview) && helper.tripsIntroForPersonComplete(person, interview);
    },
    isSectionVisible: function(interview) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      return person && person.didTripsOnTripsDate === 'yes';
    }
  },

  visitedPlaces: {
    previousSection: 'tripsIntro',
    nextSection: "segments",
    template: 'visitedPlaces',
    title: {
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
      
      const person = odSurveyHelper.getPerson({ interview }) as any;
      if ((person.didTripsOnTripsDate !== 'yes' && person.didTripsOnTripsDate !== true) || person.didTripsOnTripsDateKnowTrips === 'no') // if no trip, go to next no trip section
      {
        startUpdateInterview({
          sectionShortname: 'tripsIntro', 
          valuesByPath: { 'response._activeSection': 'travelBehavior' }
        }, callback);
        return null;
      }

      let   tripsUpdatesValueByPath  = {};
      const showNewPersonPopup       = getResponse(interview, '_showNewPersonPopup', false);
      
      if (showNewPersonPopup !== false)
      {
        tripsUpdatesValueByPath['response._showNewPersonPopup'] = false;
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
        startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath: tripsUpdatesValueByPath}, function(_interview) {
          const _person = odSurveyHelper.getPerson({ interview: _interview });
          const journey = odSurveyHelper.getJourneysArray({ person: _person })[0];
          const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(odSurveyHelper.getVisitedPlacesArray({ journey }));
          startUpdateInterview({
            sectionShortname: 'visitedPlaces', 
            valuesByPath: {
              [`response._activeVisitedPlaceId`]: selectedVisitedPlaceId,
              [`response._activeJourneyId`]: currentJourney._uuid
            }
          }, callback);
        });
      }
      else
      {
        const selectedVisitedPlaceId = helper.selectNextVisitedPlaceId(odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney }));
        startUpdateInterview({
          sectionShortname: 'visitedPlaces', 
          valuesByPath: {
            [`response._activeVisitedPlaceId`]: selectedVisitedPlaceId,
            [`response._activeJourneyId`]: currentJourney._uuid
          }
        }, callback);
      }
      return null;
    },
    enableConditional: function(interview) {
      const person = odSurveyHelper.getPerson({ interview });
      return helper.householdMembersSectionComplete(interview) && helper.tripsIntroForPersonComplete(person, interview);
    },
    isSectionCompleted: (interview) => {
        const person = odSurveyHelper.getPerson({ interview });
        return helper.visitedPlacesForPersonComplete(person, interview);
    },
    isSectionVisible: function(interview) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      return person && person.didTripsOnTripsDate === 'yes';
    }
  },

  segments: {
    ...getSegmentsSectionConfig({}),
    isSectionVisible: function(interview) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      return person && person.didTripsOnTripsDate === 'yes';
    },
    isSectionCompleted: (interview) => {
        const person = odSurveyHelper.getPerson({ interview });
        return helper.tripsForPersonComplete(person, interview);
    }
  },

  travelBehavior: {
    previousSection: 'segments',
    nextSection: "personsTrips",
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
    preload: function (interview, { startUpdateInterview, startNavigate, callback }) {
      const person = odSurveyHelper.getPerson({ interview });
      if ((interview as any).visibleWidgets.indexOf(`household.persons.${person._uuid}.noSchoolTripReason`) <= -1 && (interview as any).visibleWidgets.indexOf(`household.persons.${person._uuid}.noWorkTripReason`) <= -1 && (interview as any).visibleWidgets.indexOf(`household.persons.${person._uuid}.whoAnsweredForThisPerson`) <= -1)
      {
        startNavigate({
          valuesByPath: {
            [`response.household.persons.${person._uuid}.whoAnsweredForThisPerson`]: person._uuid
          }
        }, callback);
        return null;
      }
      callback(interview);
      return null;
    },
    enableConditional: function(interview) {
      const person = odSurveyHelper.getPerson({ interview });
      return helper.householdMembersSectionComplete(interview) && helper.tripsForPersonComplete(person, interview);
    },
    isSectionCompleted: function(interview) {
      const person = odSurveyHelper.getPerson({ interview });
      return helper.householdMembersSectionComplete(interview) && helper.travelBehaviorForPersonComplete(person, interview);
    },
    isSectionVisible: function(interview) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      // Check the conditional of the personNoWorkTripReason, personNoSchoolTripReason and personWhoAnsweredForThisPerson widgets
      const [personNoWorkTripConditional] = checkConditional(personNoWorkTripReason.conditional as any, interview, `household.persons.${person._uuid}.noWorkTripReason`);
      const [personNoSchoolTripConditional] = checkConditional(personNoSchoolTripReason.conditional as any, interview, `household.persons.${person._uuid}.noSchoolTripReason`);
      const [personWhoAnsweredConditional] = checkConditional(personWhoAnsweredForThisPerson.conditional as any, interview, `household.persons.${person._uuid}.whoAnsweredForThisPerson`);
      return person && (personNoWorkTripConditional === true || personNoSchoolTripConditional === true || personWhoAnsweredConditional === true);
    }
  },

  end: {
    previousSection: 'personsTrips',
    nextSection: "completed",
    title: {
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
    },
    isSectionCompleted: function(interview) {
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
    navMenu: {
      type: 'hidden',
      parentSection: 'end'
    },
    title: {
      fr: "Entrevue complétée",
      en: "Interview completed"
    },
    widgets: [
      'completedText'
    ],
    preload: function (interview, { startUpdateInterview, callback, user }) {
      if (!user || (user && user.is_admin !== true)) {
        startUpdateInterview({
          valuesByPath: {
            'response._completedAt': moment().unix(),
            'response._isCompleted': true
          }
        }, callback);
      }
      return null;
    },
    enableConditional: function(interview) {
      if (!helper.householdMembersSectionComplete(interview) || !helper.allPersonsTripsAndTravelBehaviorComplete(interview)) { return false; }
      return true;
    }
    
  },

};

export default getAndValidateSurveySections(sections);