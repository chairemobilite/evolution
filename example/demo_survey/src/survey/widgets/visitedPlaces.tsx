/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
//import { faHome } from '@fortawesome/free-solid-svg-icons/faHome';
//import { faWork } from '@fortawesome/free-solid-svg-icons/faUserTie';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import moment from 'moment-business-days';
import _get from 'lodash/get';
import _min from 'lodash/min';
import _max from 'lodash/max';
import isEmpty from 'lodash/isEmpty';
import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
// import  { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import waterBoundaries  from '../waterBoundaries.json';
import mtlLavalLongueuil from '../mtlLavalLongueuil.json';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import i18n              from 'evolution-frontend/lib/config/i18n.config';
import helper from '../helper';
import { InterviewUpdateCallbacks, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getPersonVisitedPlacesMapConfig } from 'evolution-common/lib/services/questionnaire/sections/common/widgetPersonVisitedPlacesMap';
import { getFormattedDate, validateButtonAction } from 'evolution-frontend/lib/services/display/frontendHelper';

export const visitedPlacesIntro = {
  type: "text",
  path: "visitedPlacesIntro",
  containsHtml: true,
  text: {
    fr: function(interview, path) {
      const person             = odSurveyHelper.getPerson({ interview }) as any;
      const genderString2      = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      const nickname           = person.nickname;
      const tripsDate = surveyHelperNew.getResponse(interview, 'tripsDate') as string;
      const formattedTripsDate = getFormattedDate(tripsDate);
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone            = householdSize === 1;
      if (person.workOnTheRoad === true)
      {
        return `<p>Nous allons vous demander de spécifier les lieux où <strong>${isAlone ? 'vous' : nickname}</strong> ${isAlone ? 'êtes' : 'est'} allé${genderString2} le <strong>${formattedTripsDate}</strong>, de <strong>minuit à 4:00 le lendemain matin</strong>.</p>
        <ul>
          <li><span class="_green _strong">Inclure même les petits arrêts <span class="_pale _em">(station-service, garderie/école, dépanneur ou tout lieu où ${isAlone ? 'vous êtes allé' : nickname + ' est allé'}${genderString2} chercher ou reconduire quelqu'un)</span></span></li>
          <li><span class="_green _strong">Inclure tous les lieux peu importe les modes de transport utilisés pour s'y rendre <span class="_pale _em">(marche, vélo, voiture, transport collectif, taxi, avion, bateau, etc.)</span></span></li>
          <li><span class="_red _strong">Ne pas inclure les lieux de transfert en cours de déplacement <span class="_pale _em">(arrêts de bus, gares, terminus, lieux de stationnement, etc.)</span> sauf si ${isAlone ? 'vous êtes allé' : nickname + ' est allé'}${genderString2} reconduire ou chercher quelqu'un à cet endroit</span></li>
        </ul>
        <p class="_strong _oblique">Si ${isAlone ? 'vous' : nickname}</strong> ${isAlone ? 'avez' : 'a'} effectué des déplacements sur la route pour le travail, <span class="_orange _strong">n'indiquez que le point de départ de ces déplacements</span> (lieu habituel de travail, garage, point de rendez-vous ou domicile) et <span class="_orange _strong">choisissez l'activité "Travail sur la route"</span>.</p>
        `;
      }
      return `<p>Nous allons vous demander de spécifier les lieux où <strong>${isAlone ? 'vous' : nickname}</strong> ${isAlone ? 'êtes' : 'est'} allé${genderString2} le <strong>${formattedTripsDate}</strong>, de <strong>minuit à 4:00 le lendemain matin</strong>.</p>
      <ul>
        <li><span class="_green _strong">Inclure même les petits arrêts <span class="_pale _em">(station-service, garderie/école, dépanneur ou tout lieu où ${isAlone ? 'vous êtes allé' : nickname + ' est allé'}${genderString2} chercher ou reconduire quelqu'un)</span></span></li>
        <li><span class="_green _strong">Inclure tous les lieux peu importe les modes de transport utilisés pour s'y rendre <span class="_pale _em">(marche, vélo, voiture, transport collectif, taxi, avion, bateau, etc.)</span></span></li>
        <li><span class="_red _strong">Ne pas inclure les lieux de transfert en cours de déplacement <span class="_pale _em">(arrêts de bus, gares, terminus, lieux de stationnement, etc.)</span> sauf si ${isAlone ? 'vous êtes allé' : nickname + ' est allé'}${genderString2} reconduire ou chercher quelqu'un à cet endroit</span></li>
      </ul>
      `;
    },
    en: function(interview, path) {
      const person             = odSurveyHelper.getPerson({ interview }) as any;
      const nickname           = person.nickname;
      const tripsDate = surveyHelperNew.getResponse(interview, 'tripsDate') as string;
      const formattedTripsDate = getFormattedDate(tripsDate);
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone            = householdSize === 1;
      if (person.workOnTheRoad === true)
      {
        return `<p>We will ask you to specify locations where <strong>${isAlone ? 'you' : nickname}</strong> went on <strong>${formattedTripsDate}</strong>, <strong>between midnight and 4 AM the next morning</strong>.</p>
        <ul>
          <li><span class="_green _strong">Include small stops <span class="_pale _em">(gas station, convenience store, nursery/school or any place where ${isAlone ? 'you' : nickname} brought someone or picked someone up)</span></span></li>
          <li><span class="_green _strong">Include all places regardless of the modes of transport used to get there <span class="_pale _em">(walk, bicycle, car, transit, taxi, plane, boat, etc.)</span></span></li>
          <li><span class="_red _strong">Do not include transfer places <span class="_pale _em">(bus stops, train stations, bus terminals, parking lots, etc.)</span> except ${nickname} brought someone or picked someone up at one of these locations</span></li>
        </ul>
        <p class="_strong _oblique">If ${isAlone ? 'you' : nickname} did trips on the road for work, <span class="_orange _strong">specify only the departure location of these trips</span> (usual work place, garage, meeting location or home) and <span class="_orange _strong">choose the activity "Work on the road"</span>.</p>
        `;
      }
      return `<p>We will ask you to specify locations where <strong>${isAlone ? 'you' : nickname}</strong> went on <strong>${formattedTripsDate}</strong>, <strong>between midnight and 4 AM the next morning</strong>.</p>
      <ul>
        <li><span class="_green _strong">Include small stops <span class="_pale _em">(gas station, convenience store, nursery/school or any place where ${isAlone ? 'you' : nickname} brought someone or picked someone up)</span></span></li>
        <li><span class="_green _strong">Include all places regardless of the modes of transport used to get there <span class="_pale _em">(walk, bicycle, car, transit, taxi, plane, boat, etc.)</span></span></li>
        <li><span class="_red _strong">Do not include transfer places <span class="_pale _em">(bus stops, train stations, bus terminals, parking lots, etc.)</span> except ${nickname} brought someone or picked someone up at one of these locations</span></li>
      </ul>
      `;
    }
  }
};

export const visitedPlacesOutro = {
  type: "text",
  path: "visitedPlacesOutro",
  containsHtml: true,
  text: {
    fr: function(interview, path) {
      return `<p class="_blue _em _medium">Vos réponses serviront à évaluer l'usage et l'achalandage des réseaux routiers et de transport collectif et demeureront entièrement confidentielles.</p>`;
    },
    en: function(interview, path) {
      return `<p class="_blue _em _medium">Your answers will be used to estimate roads and transit usage, and will always stay confidential.</p>`;
    }
  }
};

export const personDeparturePlaceType = {
  type: "question",
  path: "household.persons.{_activePersonId}.journeys.{_activeJourneyId}.departurePlaceType",
  inputType: "radio",
  datatype: "string",
  twoColumns: false,
  choices: [
    {
      value: 'home',
      label: {
        fr: "Domicile",
        en: "Home"
      }
    },
    {
      value: 'other',
      label: {
        fr: "Autre lieu (travail, lieu d'études, hôtel, résidence secondaire, chalet, etc.)",
        en: "Other location (work place, place of study, hotel, cottage, secondary home, etc.)"
      }
    }
  ],
  sameLine: false,
  label: {
    fr: function(interview, path) {
      const person             = odSurveyHelper.getPerson({ interview }) as any;
      const nickname           = person.nickname;
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone            = householdSize === 1;
      if (isAlone)
      {
        return `Quel était votre point de départ de la journée?  \n*(À quel endroit étiez-vous avant d'effectuer votre premier déplacement de la journée?)*`;
      }
      return `Quel était le point de départ de la journée de ${nickname}?  \n*(À quel endroit était ${nickname} avant d'effectuer son premier déplacement de la journée?)*`;
    },
    en: function(interview, path) {
      const person             = odSurveyHelper.getPerson({ interview }) as any;
      const nickname           = person.nickname;
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone            = householdSize === 1;
      return `What was ${isAlone ? 'your' : nickname + "'s" } departure location on this day?  \n*(At what place ${isAlone ? 'were you' : 'was ' + nickname } before making ${isAlone ? 'your' : (person.gender === 'female' ? 'her' : (person.gender === 'male' ? 'his' : 'their'))} first trip of the day?)*`;
    }
  },
  conditional: function(interview, path) {
    const value         = surveyHelperNew.getResponse(interview, path, null);
    const person        = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const visitedPlaces = journey === undefined ? [] : odSurveyHelper.getVisitedPlacesArray({ journey });
    return [(visitedPlaces && visitedPlaces.length <= 1 ? true : false), value];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: "Le point de départ est requis.",
          en: "Departure location is required."
        }
      }
    ];
  }
};

export const personVisitedPlacesTitle = {
  type: "text",
  path: "household.persons.{_activePersonId}.journeys.{_activeJourneyId}.personVisitedPlacesTitle",
  align: "left",
  containsHtml: true,
  text: {
    fr: function(interview, path) {
      const person             = odSurveyHelper.getPerson({ interview }) as any;
      const genderString2      = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      const formattedTripsDate = moment(surveyHelperNew.getResponse(interview, 'tripsDate') as any).format('LL');
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      return `<p>Lieux où ${householdSize === 1 ? `vous êtes allé` : `<strong>${person.nickname}</strong> est allé`}${genderString2} le <strong>${formattedTripsDate}</strong>&nbsp;: <br /><em>L’ordre chronologique doit être respecté</em></p>`;
    },
    en: function(interview, path) {
      const person             = odSurveyHelper.getPerson({ interview }) as any;
      const formattedTripsDate = moment(surveyHelperNew.getResponse(interview, 'tripsDate') as any).format('LL');
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      return `<p>Places where ${householdSize === 1 ? 'you' : `<strong>${person.nickname}</strong>`} went on <strong>${formattedTripsDate}</strong>&nbsp;: <br /><em>Chronological order must be preserved</em></p>`;
    }
  }
};

export const personVisitedPlacesMap = getPersonVisitedPlacesMapConfig({ getFormattedDate });

export const personVisitedPlaces: GroupConfig = {
  type: "group",
  path: "household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces",
  title: {
    fr: "Lieux visités",
    en: "Visited places"
  },
  filter: function(interview, groupedObjects) {
    const activeVisitedPlaceId = surveyHelperNew.getResponse(interview, '_activeVisitedPlaceId', null);
    if (activeVisitedPlaceId)
    {
      const filteredGroupedObject = {};
      for (const groupedObjectId in groupedObjects)
      {
        if (groupedObjectId === activeVisitedPlaceId)
        {
          filteredGroupedObject[groupedObjectId] = groupedObjects[groupedObjectId];
        }
      }
      return filteredGroupedObject;
    }
    else
    {
      return {};
    }
  },
  name: {
    fr: function(groupedObject: any, sequence) {
      const locationStr = (sequence === 1 || groupedObject['_sequence'] === 1 )? 'Lieu de départ de la journée' : `Lieu ${sequence || groupedObject['_sequence']}`;
      return `${locationStr} ${groupedObject.name ? `• **${groupedObject.name}**` : groupedObject.activity ? `• **${i18n.t(`survey:visitedPlace:activities:${groupedObject.activity}`)}**` : ''}`; 
    },
    en: function(groupedObject: any, sequence) {
      const locationStr = (sequence === 1 || groupedObject['_sequence'] === 1 )? 'Departure place for this day' : `Location ${sequence || groupedObject['_sequence']}`;
      return `${locationStr} ${groupedObject.name ? `• **${groupedObject.name}**` : groupedObject.activity ? `• **${i18n.t(`survey:visitedPlace:activities:${groupedObject.activity}`)}**` : ''}`;
    }
  },
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
  addButtonLocation: 'both' as const,
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
};

export const visitedPlaceName = {
  type: "question",
  path: "name",
  inputType: "string",
  datatype: "string",
  label: {
    fr: "Nom ou description du lieu",
    en: "Location name or description"
  },
  conditional: function(interview, path) {
    const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const activity     = visitedPlace.activity;
    return [!_isBlank(activity) && ['home', 'workUsual', 'schoolUsual', 'workOnTheRoadFromHome', 'workOnTheRoadFromUsualWork'].indexOf(activity) <= -1, null];
  },
  defaultValue: function(interview, path) {
    const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (visitedPlace.shortcut)
    {
      const shortcut             = visitedPlace.shortcut;
      const shortcutVisitedPlace: any = surveyHelperNew.getResponse(interview, shortcut, null);
      if (shortcutVisitedPlace && !_isBlank(shortcutVisitedPlace.name))
      {
        return shortcutVisitedPlace.name;
      }
    }
    return undefined;
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `La description est requise.`,
          en: `Description is required.`
        }
      },
      {
        validation: !_isBlank(value) && value.length > 50,
        errorMessage: {
          fr: `Veuillez choisir un nom de moins de 50 caractères`,
          en: `Please choose a name of less than 50 characters`
        }
      }
    ];
  }
};

export const visitedPlaceActivity = {
  type: "question",
  path: "activity",
  inputType: "radio",
  datatype: "string",
  columns: 2,
  label: {
    fr: function(interview, path) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      const journey = odSurveyHelper.getJourneysArray({ person })[0];
      const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return visitedPlaces.length === 1 ? `Quelle était l'activité principale au lieu où vous étiez avant d'effectuer votre premier déplacement de la journée?`: `Quelle était l'activité principale à ce lieu?`;
      }
      //const visitedPlace                      = surveyHelperNew.getResponse(interview, path, null, "../");
      //const visitedPlaces                     = helper.getVisitedPlaces(person);
      //const previousVisitedPlace              = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlaces);
      //const previousVisitedPlaceDesc          = helper.getVisitedPlaceDescription(previousVisitedPlace);
      //const previousVisitedPlaceDepartureTime = secondsSinceMidnightToTimeStr(previousVisitedPlace.departureTime);
      return visitedPlaces.length === 1 ? `Quelle était l'activité principale au lieu où ${person.nickname} était avant d'effectuer son premier déplacement de la journée?`: `Quelle était l'activité principale à ce lieu?`;
    },
    en: function(interview, path) {
      const person = odSurveyHelper.getPerson({ interview }) as any;
      const journey = odSurveyHelper.getJourneysArray({ person })[0];
      const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return visitedPlaces.length === 1 ? `What was the main activity at the location where you were before making the first trip of the day?`: `What was the main activity at this location?`;
      }
      //const visitedPlace                      = surveyHelperNew.getResponse(interview, path, null, "../");
      //const visitedPlaces                     = helper.getVisitedPlaces(person);
      //const previousVisitedPlace              = helper.getPreviousVisitedPlace(visitedPlace._uuid, visitedPlaces);
      //const previousVisitedPlaceDesc          = helper.getVisitedPlaceDescription(previousVisitedPlace);
      //const previousVisitedPlaceDepartureTime = secondsSinceMidnightToTimeStr(previousVisitedPlace.departureTime);
      return visitedPlaces.length === 1 ? `What was the main activity at the location where ${person.nickname} was before making the first trip of the day?`: `What was the main activity at this location?`;
    }
  },
  choices: [
    {
      value: "home",
      label: {
        fr: "Domicile",
        en: "Home"
      },
      internalId: 11,
      iconPath: '/dist/images/activities_icons/home_round.svg',
      conditional: function(interview, path) {
        // hide if previous visited place is home:
        const person               = odSurveyHelper.getPerson({ interview }) as any;
        const visitedPlace: any         = surveyHelperNew.getResponse(interview, path, null, "../");
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({ journey, visitedPlaceId: visitedPlace._uuid });
        const nextVisitedPlace     = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
        return (!previousVisitedPlace || (previousVisitedPlace && previousVisitedPlace.activity !== 'home')) && (!nextVisitedPlace || (nextVisitedPlace && nextVisitedPlace.activity !== 'home'));
      }
    },
    {
      value: "workUsual",
      label: {
        fr: "Travail au lieu habituel",
        en: "Work at usual work place"
      },
      internalId: 1,
      iconPath: '/dist/images/activities_icons/workUsual_round.svg',
      conditional: function(interview, path) {
        // hide if younger than 15:
        const person         = odSurveyHelper.getPerson({ interview }) as any;
        const usualWorkPlace = person.usualWorkPlace;
        if (person.age >= 15 && person.workOnTheRoad !== true && usualWorkPlace && usualWorkPlace.geometry)
        {
          const visitedPlace: any         = surveyHelperNew.getResponse(interview, path, null, "../");
          const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
          const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
          const nextVisitedPlace     = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
          return (!previousVisitedPlace || (previousVisitedPlace && previousVisitedPlace.activity !== 'workUsual')) && (!nextVisitedPlace || (nextVisitedPlace && nextVisitedPlace.activity !== 'workUsual'));
        }
        return false;
      }
    },
    {
      value: "workOnTheRoadFromUsualWork",
      label: {
        fr: "Travail sur la route avec départ du lieu habituel de travail",
        en: "Work on the road departing from usual work place"
      },
      internalId: 3,
      iconPath: '/dist/images/activities_icons/workOnTheRoadFromUsualWork_round.svg',
      conditional: function(interview, path) {
        //return true;
        // hide if younger than 15 or not on the road worker:
        const person         = odSurveyHelper.getPerson({ interview }) as any;
        const usualWorkPlace = person.usualWorkPlace;
        return person.age >= 15 && usualWorkPlace && person.workOnTheRoad === true && person.usualWorkPlaceIsHome !== true;
      }
    },
    {
      value: "workOnTheRoadFromHome",
      label: {
        fr: "Travail sur la route avec départ du domicile",
        en: "Work on the road departing from home"
      },
      internalId: 3,
      iconPath: '/dist/images/activities_icons/workOnTheRoadFromHome_round.svg',
      conditional: function(interview, path) {
        //return true;
        // hide if younger than 15 or not on the road worker:
        const person = odSurveyHelper.getPerson({ interview }) as any;
        return person.age >= 15 && person.workOnTheRoad === true && person.usualWorkPlaceIsHome === true;
      }
    },
    {
      value: "workOnTheRoad",
      label: {
        fr: "Travail sur la route avec départ d'un autre lieu",
        en: "Work on the road departing from another location"
      },
      internalId: 3,
      iconPath: '/dist/images/activities_icons/workOnTheRoad_round.svg',
      conditional: function(interview, path) {
        //return true;
        // hide if younger than 15 or not on the road worker:
        const person = odSurveyHelper.getPerson({ interview }) as any;
        return person.age >= 15 && person.workOnTheRoad === true;
      }
    },
    {
      value: "workNotUsual",
      label: {
        fr: function(interview) {
          const person         = odSurveyHelper.getPerson({ interview }) as any;
          const usualWorkPlace = person.usualWorkPlace;
          return usualWorkPlace && usualWorkPlace.geometry ? "Travail ailleurs qu'au lieu habituel (rendez-vous d'affaires, congrès, etc.)" : "Travail, rendez-vous d'affaires, congrès, etc.";
        },
        en: function(interview) {
          const person         = odSurveyHelper.getPerson({ interview }) as any;
          const usualWorkPlace = person.usualWorkPlace;
          return usualWorkPlace && usualWorkPlace.geometry ? "Work not at the usual work place (business meeting, conference, etc.)" : "Work, business meeting, conference, etc.";
        }
      },
      internalId: 2,
      iconPath: '/dist/images/activities_icons/workNotUsual_round.svg',
      conditional: function(interview, path) {
        // hide if younger than 15:
        const person = odSurveyHelper.getPerson({ interview }) as any;
        return person.age >= 15;
      }
    },
    {
      value: "schoolUsual",
      label: {
        fr: "École, études au lieu habituel",
        en: "School, studies at usual place"
      },
      internalId: 4,
      conditional: function(interview, path) {
        const person           = odSurveyHelper.getPerson({ interview }) as any;
        const usualSchoolPlace = person.usualSchoolPlace;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        if (person.age >= 5 && usualSchoolPlace && usualSchoolPlace.geometry)
        {
          const visitedPlace: any    = surveyHelperNew.getResponse(interview, path, null, "../");
          const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
          const nextVisitedPlace     = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey });
          return (!previousVisitedPlace || (previousVisitedPlace && previousVisitedPlace.activity !== 'schoolUsual')) && (!nextVisitedPlace || (nextVisitedPlace && nextVisitedPlace.activity !== 'schoolUsual'));
        }
        return false;
      },
      iconPath: '/dist/images/activities_icons/schoolUsual_round.svg'
    },
    {
      value: "schoolNotUsual",
      label: {
        fr: function(interview) {
          const person           = odSurveyHelper.getPerson({ interview }) as any;
          const usualSchoolPlace = person.usualSchoolPlace;
          return usualSchoolPlace && usualSchoolPlace.geometry ? "École, études ailleurs qu'au lieu habituel" : "École, études";
        },
        en: function(interview) {
          const person           = odSurveyHelper.getPerson({ interview }) as any;
          const usualSchoolPlace = person.usualSchoolPlace;
          return usualSchoolPlace && usualSchoolPlace.geometry ? "School, studies not at the usual place" : "School, studies";
        }
      },
      internalId: 4,
      conditional: function(interview, path) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        return helper.isStudent(person.occupation);
      },
      iconPath: '/dist/images/activities_icons/schoolNotUsual_round.svg'
    },
    {
      value: "shopping",
      label: {
        fr: "Magasinage (achats, station-service, épicerie, etc.)",
        en: "Shopping (store, gas station, grocery, etc.)"
      },
      internalId: 5,
      iconPath: '/dist/images/activities_icons/shopping_round.svg'
    },
    {
      value: "service",
      label: {
        fr: "Service (coiffeur, réparations, avocat, banque, etc.)",
        en: "Service (hairdresser, repairs, lawyer, bank, etc.)"
      },
      internalId: 12,
      iconPath: '/dist/images/activities_icons/service_round.svg'
    },
    {
      value: "dropSomeone",
      label: {
        fr: "Reconduire ou accompagner quelqu'un",
        en: "Drop, give a ride or accompany someone"
      },
      internalId: 9,
      iconPath: '/dist/images/activities_icons/dropSomeone_round.svg'
    },
    {
      value: "fetchSomeone",
      label: {
        fr: "Aller chercher quelqu'un",
        en: "Pick someone up"
      },
      internalId: 10,
      iconPath: '/dist/images/activities_icons/fetchSomeone_round.svg'
    },
    {
      value: "leisure",
      label: {
        fr: "Loisirs (sports, arts, plein air, tourisme, etc.)",
        en: "Leisure (sports, arts, outdoors, tourism, etc.)"
      },
      internalId: 6,
      iconPath: '/dist/images/activities_icons/leisure_round.svg'
    },
    {
      value: "restaurant",
      label: {
        fr: "Restaurant, bar, café",
        en: "Restaurant, bar, coffee shop"
      },
      internalId: 6,
      iconPath: '/dist/images/activities_icons/restaurant_round.svg'
    },
    {
      value: "visiting",
      label: {
        fr: "Visite d'un ami ou famille",
        en: "Visiting friends or family"
      },
      internalId: 7,
      iconPath: '/dist/images/activities_icons/visiting_round.svg'
    },
    {
      value: "medical",
      label: {
        fr: "Santé (clinique, hôpital, physiothérapie, etc.)",
        en: "Health (clinic, hospital, physiotherapy, etc.)"
      },
      internalId: 8,
      iconPath: '/dist/images/activities_icons/medical_round.svg'
    },
    {
      value: "worship",
      label: {
        fr: "Lieu de culte (église, mosquée, synagogue, pagode, etc.)",
        en: "Place of worship (church, mosque, synagogue, pagoda, etc.)"
      },
      internalId: 12,
      iconPath: '/dist/images/activities_icons/worship_round.svg'
    },
    {
      value: "schoolNotStudent",
      label: {
        fr: "Études",
        en: "School/Studies"
      },
      internalId: 4,
      conditional: function(interview, path) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        return !helper.isStudent(person.occupation);
      },
      iconPath: '/dist/images/activities_icons/schoolNotUsual_round.svg'
    },
    {
      value: "secondaryHome",
      label: {
        fr: "Résidence secondaire ou chalet",
        en: "Secondary home or cottage"
      },
      internalId: 7,
      iconPath: '/dist/images/activities_icons/secondaryHome_round.svg'
    },
    {
      value: "other",
      label: {
        fr: "Autre",
        en: "Other"
      },
      internalId: 12,
      iconPath: '/dist/images/activities_icons/other_round.svg'
    }
  ],
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `L'activité est requise.`,
          en: `Activity is required.`
        }
      }
    ];
  },
  conditional: function(interview, path) {
    const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const activity      = visitedPlace.activity;
    const departureTime = visitedPlace.departureTime;
    if (visitedPlace && activity === 'home' && (_isBlank(visitedPlace._isNew) || visitedPlace._isNew === true))
    {
      return [false, activity];
    }
    return [true, activity];
  }
};

export const visitedPlaceAlreadyVisited = {
  type: "question",
  path: "alreadyVisitedBySelfOrAnotherHouseholdMember",
  inputType: "radio",
  datatype: "boolean",
  label: {
    fr: function(interview, path) {
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return 'Avez-vous déjà localisé ce lieu sur la carte?';
      }
      return `Avez-vous déjà localisé ce lieu dans l’entrevue de ${person.nickname} ou de celle des autres membres de votre ménage?`;
    },
    en: function(interview, path) {
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return 'Did you previously locate this place on the map?';
      }
      return `Did you previously locate this place in ${person.nickname}'s interview or in another household member's interview?`;
    }
  },
  choices: [
    {
      value: true,
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: false,
      label: {
        fr: "Non",
        en: "No"
      }
    }
  ],
  conditional: function(interview, path) {
    const activity: any        = surveyHelperNew.getResponse(interview, path, null, '../activity');
    const incompatibleActivity = ['home', 'workUsual', 'schoolUsual', 'workOnTheRoadFromHome', 'workOnTheRoadFromUsualWork'].indexOf(activity) > -1;
    if (_isBlank(activity))
    {
      return [false, null];
    }
    if (!incompatibleActivity)
    {
      const geography  = surveyHelperNew.getResponse(interview, path, null, '../geography');
      let   lastAction = null;
      if (geography)
      {
        lastAction = _get(geography, 'properties.lastAction', null);
      }
      const shortcuts = helper.getShortcutVisitedPlaces(interview);
      return [(lastAction === null || lastAction === 'shortcut') && shortcuts.length > 0, null];
    }
    return [false, null];
  }
};

export const visitedPlaceShortcut = {
  type: "question",
  path: "shortcut",
  inputType: 'select',
  datatype: "string",
  twoColumns: false,
  label: {
    fr: "Veuillez choisir ce lieu dans la liste des lieux déjà localisés:",
    en: "Please select this place in the list of already localized places:"
  },
  hasGroups: true,
  choices: function(interview, path) {
    const shortcuts = helper.getShortcutVisitedPlaces(interview);
    const choices: any[]  = [];
    for (let i = 0, count = shortcuts.length; i < count; i++)
    {
      const shortcut    = shortcuts[i];
      const shortcutStr = `${shortcut.personNickname ? shortcut.personNickname + ' • ' : ''}${shortcut.description}`;
      choices.push({
        value: shortcut.visitedPlaceId,
        label: {
          fr: shortcutStr,
          en: shortcutStr
        }
      });
    }
    return choices;
  },
  conditional: function(interview, path) {
    const activity = surveyHelperNew.getResponse(interview, path, null, '../activity');
    const visitedPlaceAlreadyVisited = surveyHelperNew.getResponse(interview, path, null, '../alreadyVisitedBySelfOrAnotherHouseholdMember');
    return [!_isBlank(activity) && visitedPlaceAlreadyVisited === true, null];
  }
};

export const visitedPlaceGeography = {
  type: "question",
  inputType: "mapFindPlace",
  path: "geography",
  datatype: "geojson",
  canBeCollapsed: true,
  containsHtml: true,
  refreshGeocodingLabel: {
    fr: "Chercher le lieu à partir du nom",
    en: "Search location using the place name"
  },
  searchPlaceButtonColor: function (interview, path) {
    const geography: any = surveyHelperNew.getResponse(interview, path, null, '../geography');
    return _isBlank(geography) ? "green" : "grey";
  },
  geocodingQueryString: function (interview, path) {
    return surveyHelperNew.formatGeocodingQueryStringFromMultipleFields([surveyHelperNew.getResponse(interview, path, null, '../name')]);
  },
  invalidGeocodingResultTypes: [
    'political', 
    'country',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
    'administrative_area_level_6',
    'administrative_area_level_7',
    'colloquial_area',
    'locality',
    'sublocality',
    'sublocality_level_1',
    'neighborhood',
    'route'
  ],
  maxGeocodingResultsBounds: function (interview, path) {
    return config.mapMaxGeocodingResultsBounds;
  },
  autoCollapseWhenValid: false, // not implemented
  label: {
    fr: function (interview, path) {
      const placeName = surveyHelperNew.getResponse(interview, path, null, '../name');
      return `${placeName ? `Veuillez positionner le lieu <strong>${placeName}</strong> sur la carte` : 'Veuillez positionner le lieu sur la carte'}<br />
      <span class="_pale _oblique">
        Naviguez, zoomez et cliquez sur la carte pour localiser le lieu. Une fois localisé, vous pourrez déplacer le point sur la carte pour davantage de précision.<br />
        Vous pouvez également chercher le lieu sur la carte en utilisant le nom ou l'adresse (bouton "Chercher le lieu à partir du nom").
      </span>`;
      },
    en: function (interview, path) {
      const placeName = surveyHelperNew.getResponse(interview, path, null, '../name');
      return `${placeName ? `Please locate <strong>${placeName}</strong> on the map` : 'Please locate this place on the map'}<br />
      <span class="_pale _oblique">
        Navigate, zoom and click on map at the correct location. You will then be able to drag the icon marker
        to get a more precise location. You can also search the place on map using the name or address (button "Search location using the place name").
      </span>`;
      }
  },
  icon: {
    url: (interview, path) => (`/dist/images/activities_icons/${surveyHelperNew.getResponse(interview, path, null, '../activity')}_marker.svg`),
    size: [80, 80]
  },
  placesIcon: {
    url: (interview, path) => (`/dist/images/activities_icons/default_marker.svg`),
    size: [80, 80]
  },
  defaultCenter: function (interview, path) {
    const person = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const activeVisitedPlace = odSurveyHelper.getActiveVisitedPlace({ interview, journey });
    const previousVisitedPlace = activeVisitedPlace ? odSurveyHelper.getPreviousVisitedPlace({ visitedPlaceId: activeVisitedPlace._uuid, journey }) : null;
    if (previousVisitedPlace) {
      const geography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace: previousVisitedPlace, person, interview });
      if (geography) {
        const coordinates = _get(geography, 'geometry.coordinates', null);
        if (coordinates) {
          return {
            lat: coordinates[1],
            lon: coordinates[0]
          };
        }
      }
    }
    const homeCoordinates = surveyHelperNew.getResponse(interview, 'home.geography.geometry.coordinates', null);
    return homeCoordinates ? {
      lat: homeCoordinates[1],
      lon: homeCoordinates[0]
    } : config.mapDefaultCenter;
  },
  defaultValue: function (interview, path) {
    const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (visitedPlace.shortcut) {
      const shortcut = visitedPlace.shortcut;
      const shortcutVisitedPlace = surveyHelperNew.getResponse(interview, shortcut, null) as any;
      const person = odSurveyHelper.getPerson({ interview }) as any;
      const geography = shortcutVisitedPlace ? odSurveyHelper.getVisitedPlaceGeography({ visitedPlace: shortcutVisitedPlace, person, interview }) : null;
      if (shortcutVisitedPlace && !_isBlank(geography)) {
        if (geography.properties === undefined) {
          geography.properties = {};
        }
        geography.properties.lastAction = 'shortcut';
        return geography;
      }
    }
    return undefined;
  },
  updateDefaultValueWhenResponded: true,
  validations: function(value, customValue, interview, path, customPath) {
    const activity: any = surveyHelperNew.getResponse(interview, path, null, '../activity');
    const geography: any = surveyHelperNew.getResponse(interview, path, null, '../geography');
    const geocodingTextInput = geography?.properties?.geocodingQueryString;

    return [{
      validation: ['home', 'workUsual', 'schoolUsual', 'workOnTheRoadFromHome', 'workOnTheRoadFromUsualWork'].indexOf(activity) <= -1 && _isBlank(value),
      errorMessage: {
        fr: `Le positionnement du lieu est requis.`,
        en: `Location is required.`
      }
    },
    {
      validation: geography && geography.properties?.lastAction && (geography.properties.lastAction === 'mapClicked' || geography.properties.lastAction === 'markerDragged') && geography.properties.zoom < 14,
      errorMessage: {
        fr: `Le positionnement du lieu n'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l'icône.`,
        en: `Location is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.`
      }
    },
    {
      validation: geography && geography.properties?.isGeocodingImprecise,
      errorMessage: {
        fr: `Le nom du lieu utilisé pour effectuer la recherche ${!_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''} n'est pas assez précis. Ajoutez de l'information ou précisez la localisation à l'aide de la carte.`,
        en: `The location name used for searching ${!_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''} is not specific enough. Please add information or specify the location more precisely using the map.`,
      }
    },
    {
      validation: geography && turfBooleanPointInPolygon(geography, (waterBoundaries as any).features[0]),
      errorMessage: {
        fr: `Le lieu est dans une étendue d'eau ou est inaccessible. Veuillez vérifier la localisation.`,
        en: `Location is in water or is inaccessible. Please verify.`
      }
    }];
  },
  conditional: function(interview, path) {
    const activity: any  = surveyHelperNew.getResponse(interview, path, null, '../activity');
    return [!_isBlank(activity) && ['home', 'workUsual', 'schoolUsual', 'workOnTheRoadFromHome', 'workOnTheRoadFromUsualWork'].indexOf(activity) <= -1, null];
  }
};

export const visitedPlaceArrivalTime = {
  type: "question",
  path: "arrivalTime",
  inputType: "time",
  twoColumns: true,
  datatype: "integer",
  addHourSeparators: true,
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `L’heure d’arrivée est manquante ou invalide (vérifiez que les toutes les heures se suivent dans l'ordre chronologique).`,
          en: `Arrival time is missing or invalid (verify that all times are chronological order).`
        }
      }
    ];
  },
  conditional: function(interview, path) {
    const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    return visitedPlace['_sequence'] > 1;
  },
  minTimeSecondsSinceMidnight: function(interview, path) {
    const visitedPlaces: any      = surveyHelperNew.getResponse(interview, path, null, '../../../visitedPlaces');
    const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    let lastTimeSecondsSinceMidnight = 0;
    if (!isEmpty(visitedPlaces))
    {
      const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
        return visitedPlace['_sequence'] < activeVisitedPlace['_sequence'];
      });

      const previousTimes = visitedPlacesArray.map((visitedPlace: any) => {
        if (!_isBlank(visitedPlace.departureTime))
        {
          return visitedPlace.departureTime;
        }
        else if (!_isBlank(visitedPlace.arrivalTime))
        {
          return visitedPlace.arrivalTime;
        }
        return lastTimeSecondsSinceMidnight;
      });

      lastTimeSecondsSinceMidnight = previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;

    }
    return lastTimeSecondsSinceMidnight;
  },
  maxTimeSecondsSinceMidnight: function(interview, path) {
    const visitedPlaces: any      = surveyHelperNew.getResponse(interview, path, null, '../../../visitedPlaces');
    const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;    
    if (!isEmpty(visitedPlaces))
    {
      const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
        return visitedPlace['_sequence'] > activeVisitedPlace['_sequence'];
      });

      const nextTimes = visitedPlacesArray.map((visitedPlace: any) => {
        if (!_isBlank(visitedPlace.arrivalTime))
        {
          return visitedPlace.arrivalTime;
        }
        else if (!_isBlank(visitedPlace.departureTime))
        {
          return visitedPlace.departureTime;
        }
        return lastTimeSecondsSinceMidnight;
      });

      // also check active departure time:
      if (!_isBlank(activeVisitedPlace.departureTime))
      {
        nextTimes.push(activeVisitedPlace.departureTime);
      }

      lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;

    }
    return lastTimeSecondsSinceMidnight;
  },
  label: {
    fr: function(interview, path) {
      const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      const nickname      = surveyHelperNew.getResponse(interview, path, null, "../../../../../nickname");
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone       = householdSize === 1;
      let   placeStr      = 'à cet endroit';
      if (visitedPlace && visitedPlace.activity === 'home')
      {
        placeStr = 'au domicile';
      }
      else if (visitedPlace && visitedPlace.activity === 'workUsual')
      {
        placeStr = 'au travail';
      }
      else if (visitedPlace && visitedPlace.activity === 'schoolUsual')
      {
        placeStr = "au lieu d'études";
      }
      else if (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome' || visitedPlace.activity === 'workOnTheRoadFromUsualWork' || visitedPlace.activity === 'workOnTheRoad')
      {
        return `${isAlone ? 'Vous avez débuté vos déplacements sur la route à' : `${nickname} a débuté ses déplacements sur la route à`}:`;
      }
      return `${isAlone ? 'Vous êtes arrivé' : `${nickname} est arrivé`}${genderString2} ${placeStr} à:`;
    },
    en: function(interview, path) {
      const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const nickname      = person.nickname;
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone       = householdSize === 1;
      let   placeStr      = 'at this place';
      if (visitedPlace && visitedPlace.activity === 'home')
      {
        placeStr = 'home';
      }
      else if (visitedPlace && visitedPlace.activity === 'workUsual')
      {
        placeStr = 'at work';
      }
      else if (visitedPlace && visitedPlace.activity === 'schoolUsual')
      {
        placeStr = "at school";
      }
      else if (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome' || visitedPlace.activity === 'workOnTheRoadFromUsualWork' || visitedPlace.activity === 'workOnTheRoad')
      {
        const genderString = helper.getGenderString(person, 'her', 'his', 'their', 'his/her');
        return `${isAlone ? 'You started your on the road trips at' : `${nickname} started ${genderString} on the road trips at`}:`;
      }
      return `${isAlone ? 'You arrived' : `${nickname} arrived`} ${placeStr} at:`;
    },
  }
};

export const visitedPlaceDepartureTime = {
  type: "question",
  path: "departureTime",
  inputType: "time",
  twoColumns: true,
  datatype: "integer",
  addHourSeparators: true,
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `L’heure de départ est manquante ou invalide (vérifiez que les toutes les heures se suivent dans l'ordre chronologique).`,
          en: `Departure time is missing or invalid (verify that all times are chronological order).`
        }
      }
    ];
  },
  conditional: function(interview, path) {
    const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    return [(visitedPlace['_sequence'] === 1 || (!_isBlank(visitedPlace.nextPlaceCategory) && visitedPlace.nextPlaceCategory !== 'stayedThereUntilTheNextDay')), null];
  },
  minTimeSecondsSinceMidnight: function(interview, path) {
    const visitedPlaces: any                = surveyHelperNew.getResponse(interview, path, null, '../../');
    const activeVisitedPlace: any           = surveyHelperNew.getResponse(interview, path, null, '../');
    let   lastTimeSecondsSinceMidnight = 0;
    if (!isEmpty(visitedPlaces))
    {
      const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
        return visitedPlace['_sequence'] < activeVisitedPlace['_sequence'];
      });

      const previousTimes = visitedPlacesArray.map((visitedPlace: any) => {
        if (!_isBlank(visitedPlace.departureTime))
        {
          return visitedPlace.departureTime;
        }
        else if (!_isBlank(visitedPlace.arrivalTime))
        {
          return visitedPlace.arrivalTime;
        }
        return lastTimeSecondsSinceMidnight;
      });
      
      // also check active arrival time:
      if (!_isBlank(activeVisitedPlace.arrivalTime))
      {
        previousTimes.push(activeVisitedPlace.arrivalTime);
      }
      lastTimeSecondsSinceMidnight = previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
    }
    return lastTimeSecondsSinceMidnight;
  },
  maxTimeSecondsSinceMidnight: function(interview, path) {
    const visitedPlaces: any      = surveyHelperNew.getResponse(interview, path, null, '../../');
    const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
    let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
    if (!isEmpty(visitedPlaces))
    {
      const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
        return visitedPlace['_sequence'] > activeVisitedPlace['_sequence'];
      });

      const nextTimes = visitedPlacesArray.map((visitedPlace: any) => {
        if (!_isBlank(visitedPlace.arrivalTime))
        {
          return visitedPlace.arrivalTime;
        }
        else if (!_isBlank(visitedPlace.departureTime))
        {
          return visitedPlace.departureTime;
        }
        return lastTimeSecondsSinceMidnight;
      });

      lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
    }
    return lastTimeSecondsSinceMidnight;
  },
  label: {
    fr: function(interview, path) {
      const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
      const nickname      = surveyHelperNew.getResponse(interview, path, null, "../../../../../nickname");
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone       = householdSize === 1;
      let   placeStr      = 'cet endroit';
      if (visitedPlace && visitedPlace.activity === 'home')
      {
        placeStr = 'le domicile';
      }
      else if (visitedPlace && visitedPlace.activity === 'workUsual')
      {
        placeStr = 'le travail';
      }
      else if (visitedPlace && visitedPlace.activity === 'schoolUsual')
      {
        placeStr = "le lieu d'études";
      }
      else if (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome' || visitedPlace.activity === 'workOnTheRoadFromUsualWork' || visitedPlace.activity === 'workOnTheRoad')
      {
        return `${isAlone ? 'Vous avez terminé vos déplacements sur la route à' : `${nickname} a terminé ses déplacements sur la route à`}:`;
      }
      return `${isAlone ? 'Vous avez quitté' : `${nickname} a quitté`} ${placeStr} à:`;
    },
    en: function(interview, path) {
      const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const nickname      = person.nickname;
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isAlone       = householdSize === 1;
      let   placeStr      = 'this place';
      if (visitedPlace && visitedPlace.activity === 'home')
      {
        placeStr = 'home';
      }
      else if (visitedPlace && visitedPlace.activity === 'workUsual')
      {
        placeStr = 'work';
      }
      else if (visitedPlace && visitedPlace.activity === 'schoolUsual')
      {
        placeStr = "school";
      }
      else if (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome' || visitedPlace.activity === 'workOnTheRoadFromUsualWork' || visitedPlace.activity === 'workOnTheRoad')
      {
        const genderString = helper.getGenderString(person, 'her', 'his', 'their', 'his/her');
        return `${isAlone ? 'You completed your on the road trips at' : `${nickname} completed ${genderString} the on the road trips at`}:`;
      }
      return `${isAlone ? 'You left' : `${nickname} left`} ${placeStr} at:`;
    }
  }
};

export const visitedPlaceNextPlaceCategory = {
  type: "question",
  inputType: "radio",
  path: "nextPlaceCategory",
  datatype: "string",
  twoColumns: false,
  sameLine: false,
  label: {
    fr: function(interview, path) {
      const visitedPlace: any     = surveyHelperNew.getResponse(interview, path, null, '../');
      const visitedPlaceName = visitedPlace ? visitedPlace.name : null;
      if (visitedPlace.activity === 'home')
      {
        return `Après avoir été au domicile:`;
      }
      else if (visitedPlace.activity === 'workUsual')
      {
        return `Après avoir été au travail:`;
      }
      else if (visitedPlace.activity === 'schoolUsual')
      {
        return `Après avoir été au lieu d'études:`;
      }
      else if (visitedPlace.activity === 'workOnTheRoad' || visitedPlace.activity === 'workOnTheRoadFromHome' || visitedPlace.activity === 'workOnTheRoadFromUsualWork')
      {
        return `Après avoir complété la tournée de déplacements sur la route:`;
      }
      return `Après avoir visité ce lieu${visitedPlaceName ? ` (${visitedPlaceName})` : ''}:`;
    },
    en: function(interview, path) {
      const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
      const visitedPlaceName = visitedPlace ? visitedPlace.name : null;
      if (visitedPlace.activity === 'home')
      {
        return `After being home:`;
      }
      else if (visitedPlace.activity === 'workUsual')
      {
        return `After being at work:`;
      }
      else if (visitedPlace.activity === 'schoolUsual')
      {
        return `After being at school:`;
      }
      else if (visitedPlace.activity === 'workOnTheRoad' || visitedPlace.activity === 'workOnTheRoadFromHome' || visitedPlace.activity === 'workOnTheRoadFromUsualWork')
      {
        return `After completing the on the road trips:`;
      }
      return `After visiting this location${visitedPlaceName ? ` (${visitedPlaceName})` : ''}:`;
    }
  },
  choices: [
    {
      value: 'wentBackHome',
      label: {
        fr: function(interview) {
          const person        = odSurveyHelper.getPerson({ interview }) as any;
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
          if (householdSize === 1)
          {
            return `Je suis retourné${genderString2} au domicile directement`;
          }
          else
          {
            return `${person.nickname} est retourné${genderString2} au domicile directement`;
          }
        },
        en: function(interview) {
          const person        = odSurveyHelper.getPerson({ interview }) as any;
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          if (householdSize === 1)
          {
            return `I went back home directly`;
          }
          else
          {
            return `${person.nickname} went back home directly`;
          }
        }
      },
      conditional: function(interview) {
        const person         = odSurveyHelper.getPerson({ interview }) as any;
        const journeys = odSurveyHelper.getJourneysArray({ person });
        const currentJourney = journeys[0];
        const visitedPlaceId = odSurveyHelper.getActiveVisitedPlace({ interview, journey: currentJourney })._uuid;
        const visitedPlace: any  = surveyHelperNew.getResponse(interview, `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlaceId}`, null);
        return visitedPlace.activity !== 'home';
      }
    },
    {
      value: "visitedAnotherPlace",
      label: {
        fr: function(interview) {
          const person        = odSurveyHelper.getPerson({ interview }) as any;
          const journeys = odSurveyHelper.getJourneysArray({ person });
          const currentJourney = journeys[0];
          const visitedPlace  = odSurveyHelper.getActiveVisitedPlace({ interview, journey: currentJourney });
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
          if (householdSize === 1)
          {
            if (visitedPlace.activity === 'home')
            {
              return `Je suis allé${genderString2} à un autre endroit`;
            }
            return `Je suis allé${genderString2} ou je me suis arrêté${genderString2} à un autre endroit`;
          }
          else
          {
            if (visitedPlace.activity === 'home')
            {
              return `${person.nickname} est allé${genderString2} à un autre endroit`;
            }
            return `${person.nickname} est allé${genderString2} ou s'est arrêté${genderString2} à un autre endroit`;
          }
        },
        en: function(interview) {
          const person        = odSurveyHelper.getPerson({ interview }) as any;
          const journeys = odSurveyHelper.getJourneysArray({ person });
          const currentJourney = journeys[0];
          const visitedPlace  = odSurveyHelper.getActiveVisitedPlace({ interview, journey: currentJourney });
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          if (householdSize === 1)
          {
            if (visitedPlace.activity === 'home')
            {
              return `I went to another location`;
            }
            return `I went to or stopped at another location`;
          }
          else
          {
            if (visitedPlace.activity === 'home')
            {
              return `${person.nickname} went to another location`;
            }
            return `${person.nickname} went to or stopped at another location`;
          }
        }
      }
    },
    {
      value: "stayedThereUntilTheNextDay",
      label: {
        fr: function(interview) {
          const person        = odSurveyHelper.getPerson({ interview }) as any;
          const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
          const visitedPlace  = odSurveyHelper.getActiveVisitedPlace({ interview, journey });
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
          if (householdSize === 1)
          {
            if (visitedPlace.activity === 'home')
            {
              return `Je suis resté${genderString2} au domicile jusqu'au lendemain`;
            }
            return `Je suis resté${genderString2} à cet endroit jusqu'au lendemain`;
          }
          else
          {
            if (visitedPlace.activity === 'home')
            {
              return `${person.nickname} est resté${genderString2} au domicile jusqu'au lendemain`;
            }
            return `${person.nickname} est resté${genderString2} à cet endroit jusqu'au lendemain`;
          }
        },
        en: function(interview) {
          const person        = odSurveyHelper.getPerson({ interview }) as any;
          const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
          const visitedPlace  = odSurveyHelper.getActiveVisitedPlace({ interview, journey });
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          if (householdSize === 1)
          {
            if (visitedPlace.activity === 'home')
            {
              return `I stayed home until the next day`;
            }
            return `I stayed at this location until the next day`;
          }
          else
          {
            if (visitedPlace.activity === 'home')
            {
              return `${person.nickname} stayed home until the next day`;
            }
            return `${person.nickname} stayed at this location until the next day`;
          }
        }
      },
      conditional: function(interview) {
        const person        = odSurveyHelper.getPerson({ interview }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const visitedPlace  = odSurveyHelper.getActiveVisitedPlace({ interview, journey });
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
        return visitedPlaces.length > 1 && visitedPlaces[visitedPlaces.length - 1]._uuid === visitedPlace._uuid;
      }
    }
  ],
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  },
  conditional: function(interview, path) {
    const person        = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey});
    if (visitedPlaces.length === 1 && visitedPlaces[0].activity === 'home')
    {
      return [false, 'visitedAnotherPlace'];
    }
    return [true, null];
  }
};

export const personLastVisitedPlaceNotHome = {
  type: "question",
  inputType: "button",
  path: "household.persons.{_activePersonId}.journeys.{_activeJourneyId}.lastVisitedPlaceNotHome",
  align: "center",
  datatype: "boolean",
  twoColumns: false,
  isModal: true,
  containsHtml: true,
  label: {
    fr: function(interview, path) {
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Êtes-vous retourné${genderString2} au domicile à la fin de la journée (avant 4:00 le lendemain matin)?`;
      }
      return `Est-ce que ${person.nickname} est retourné${genderString2} au domicile à la fin de la journée (avant 4:00 le lendemain matin)?`;
    },
    en: function(interview, path) {
      const person        = odSurveyHelper.getPerson({ interview }) as any;
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      return `Did ${householdSize === 1 ? 'you' : person.nickname} go back home at the end of the day (before 4AM the next morning)?`;
    }
  },
  choices: [
    {
      value: true,
      label: {
        fr: "Oui",
        en: "Yes"
      },
      color: "green"
    },
    {
      value: false,
      label: {
        fr: "Non",
        en: "No"
      },
      color: "red"
    }
  ],
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  },
  conditional: function(interview, path) {
    const person                        = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const personLastVisitedPlaceNotHome = surveyHelperNew.getResponse(interview, `household.persons.${person._uuid}.lastVisitedPlaceNotHome`, undefined);
    const visitedPlaces                 = odSurveyHelper.getVisitedPlacesArray({ journey });
    const lastVisitedPlace              = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
    const confirmedSection              = surveyHelperNew.getResponse(interview, `household.persons.${person._uuid}._confirmedVisitedPlaces`, null);
    return [/*confirmedSection === true && */lastVisitedPlace && lastVisitedPlace.activity !== 'home', personLastVisitedPlaceNotHome];
  }
};

export const buttonCancelVisitedPlace = {
  type: "button",
  color: "grey",
  label: {
    fr: "Annuler",
    en: "Cancel"
  },
  hideWhenRefreshing: true,
  path: 'cancelVisitedPlace',
  conditional: function(interview, path) {
    const person        = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
    const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
    return [visitedPlaces.length > 1 && _isBlank(visitedPlace.activity), undefined];
  },
  //icon: faCheckCircle,
  align: 'center',
  size: 'small',
  action: function(callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string, section, sections, saveCallback) {
    const visitedPlacePath = surveyHelperNew.getPath(path, '../');
    helper.deleteVisitedPlace(visitedPlacePath, interview, callbacks.startRemoveGroupedObjects, callbacks.startUpdateInterview);
  }
};

export const buttonDeleteVisitedPlace = {
  type: "button",
  color: "red",
  icon: faTrashAlt,
  label: {
    fr: "Supprimer ce lieu",
    en: "Delete this location"
  },
  hideWhenRefreshing: true,
  path: 'deleteVisitedPlace',
  conditional: function(interview, path) {
    const person        = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
    const visitedPlace: any  = surveyHelperNew.getResponse(interview, path, null, '../');
    return [visitedPlaces.length > 1 && !_isBlank(visitedPlace.activity), undefined];
  },
  align: 'center',
  size: 'small',
  confirmPopup: {
    content: {
      fr: function(interview) {
        return `Confirmez-vous que vous voulez retirer ce lieu?`;
      },
      en: function(interview) {
        return `Do you confirm that you want to remove this location?`;
      }
    }
  },
  action: function(callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string, section, sections, saveCallback) {
    const visitedPlacePath = surveyHelperNew.getPath(path, '../');
    helper.deleteVisitedPlace(visitedPlacePath, interview, callbacks.startRemoveGroupedObjects, callbacks.startUpdateInterview);
  }
  
};

export const buttonSaveVisitedPlace = {
  type: "button",
  color: "green",
  label: {
    fr: "Confirmer",
    en: "Confirm"
  },
  hideWhenRefreshing: true,
  path: 'saveVisitedPlace',
  icon: faCheckCircle,
  align: 'center',
  saveCallback: function(callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string, user?: CliUser) {
    const person                   = odSurveyHelper.getPerson({ interview }) as any;
    const journeys = odSurveyHelper.getJourneysArray({ person });
    const currentJourney = journeys[0];
    const visitedPlaces            = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
    const visitedPlace: any        = surveyHelperNew.getResponse(interview, path, null, '../');
    const visitedPlacePath         = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlace._uuid}`;
    const previousVisitedPlace     = odSurveyHelper.getPreviousVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey: currentJourney }) as any;
    const previousVisitedPlacePath = previousVisitedPlace ? `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${previousVisitedPlace._uuid}` : null;
    const nextVisitedPlace         = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey: currentJourney }) as any;
    const nextVisitedPlacePath     = nextVisitedPlace ? `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${nextVisitedPlace._uuid}` : null;
    const updateValuesbyPath       = {};
    if (previousVisitedPlace && previousVisitedPlace.nextPlaceCategory !== 'wentBackHome' && visitedPlace.activity === 'home')
    {
      updateValuesbyPath[`responses.${previousVisitedPlacePath}.nextPlaceCategory`] = 'wentBackHome';
    }
    if (previousVisitedPlace && previousVisitedPlace.nextPlaceCategory !== 'visitedAnotherPlace' && visitedPlace.activity !== 'home')
    {
      updateValuesbyPath[`responses.${previousVisitedPlacePath}.nextPlaceCategory`] = 'visitedAnotherPlace';
    }
    if (nextVisitedPlace && visitedPlace.nextPlaceCategory !== 'wentBackHome' && nextVisitedPlace.activity === 'home')
    {
      nextVisitedPlace.activity = null;
      updateValuesbyPath[`responses.${nextVisitedPlacePath}.activity`] = null;
    }
    if (nextVisitedPlace && visitedPlace.nextPlaceCategory !== 'visitedAnotherPlace' && nextVisitedPlace.activity !== 'home')
    {
      nextVisitedPlace.activity = null;
      updateValuesbyPath[`responses.${nextVisitedPlacePath}.activity`] = null;
    }
    updateValuesbyPath[`responses.${visitedPlacePath}._isNew`] =  false;
    if (visitedPlace.nextPlaceCategory === 'wentBackHome')
    {
      const nextVisitedPlace = odSurveyHelper.getNextVisitedPlace({ visitedPlaceId: visitedPlace._uuid, journey: currentJourney });
      if (!_isBlank(visitedPlace.activity) && visitedPlace.activity !== 'home' && (!nextVisitedPlace || nextVisitedPlace.activity !== 'home'))
      {
        callbacks.startAddGroupedObjects(1, visitedPlace['_sequence'] + 1, `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`, [{activity: 'home'}], (function(updatedInterview) {
          const person        = odSurveyHelper.getPerson({ interview: updatedInterview }) as any;
          const journeys = odSurveyHelper.getJourneysArray({ person });
          const currentJourney = journeys[0];
          const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
          updateValuesbyPath[`responses._activeVisitedPlaceId`] = helper.selectNextVisitedPlaceId(visitedPlaces);
          callbacks.startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath });
        }).bind(this));
        return null;
      }
    }
    updateValuesbyPath[`responses._activeVisitedPlaceId`] = helper.selectNextVisitedPlaceId(visitedPlaces);
    callbacks.startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath });
    return null;
  },
  action: validateButtonAction
};

export const buttonVisitedPlacesConfirmNextSection = {
  type: "button",
  color: "green",
  path: "buttonVisitedPlacesConfirmNextSection",
  label: {
    fr: "Confirmer les lieux et continuer",
    en: "Confirm locations and continue"
  },
  icon: faCheckCircle,
  align: 'left',
  action: validateButtonAction,
  conditional: function(interview, path)
  {
    const person           = odSurveyHelper.getPerson({ interview }) as any;
    const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
    const visitedPlaces    = odSurveyHelper.getVisitedPlacesArray({ journey });
    const lastVisitedPlace: any | null = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
    return !!(lastVisitedPlace && lastVisitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay');
  }
};