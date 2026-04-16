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
import waterBoundaries from '../waterBoundaries.json';
import mtlLavalLongueuil from '../mtlLavalLongueuil.json';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import i18n from 'evolution-frontend/lib/config/i18n.config';
import helper, { visitedPlacesSectionConfig, widgetFactoryOptions } from '../helper';
import {
    ButtonWidgetConfig,
    InterviewUpdateCallbacks,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getPersonVisitedPlacesMapConfig } from 'evolution-common/lib/services/questionnaire/sections/common/widgetPersonVisitedPlacesMap';
import { VisitedPlaceGeographyWidgetFactory } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/widgetsGeography';
import { getFormattedDate, validateButtonAction } from 'evolution-frontend/lib/services/display/frontendHelper';
import { ActivityWidgetFactory } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces';
import { activityToDisplayCategory } from 'evolution-common/lib/services/odSurvey/types';

const activityWidgetFactory = new ActivityWidgetFactory(visitedPlacesSectionConfig, widgetFactoryOptions);
const activityWidgets = activityWidgetFactory.getWidgetConfigs();

const geographyWidgetFactory = new VisitedPlaceGeographyWidgetFactory(visitedPlacesSectionConfig, widgetFactoryOptions);
const geographyWidgets = geographyWidgetFactory.getWidgetConfigs();

export const visitedPlacesIntro = {
    type: 'text',
    path: 'visitedPlacesIntro',
    containsHtml: true,
    text: {
        fr: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
            const nickname = person.nickname;
            const tripsDate = surveyHelperNew.getResponse(interview, 'tripsDate') as string;
            const formattedTripsDate = getFormattedDate(tripsDate);
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            if (person.workOnTheRoad === true) {
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
        en: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const nickname = person.nickname;
            const tripsDate = surveyHelperNew.getResponse(interview, 'tripsDate') as string;
            const formattedTripsDate = getFormattedDate(tripsDate);
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            if (person.workOnTheRoad === true) {
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
    type: 'text',
    path: 'visitedPlacesOutro',
    containsHtml: true,
    text: {
        fr: function (interview, path) {
            return '<p class="_blue _em _medium">Vos réponses serviront à évaluer l\'usage et l\'achalandage des réseaux routiers et de transport collectif et demeureront entièrement confidentielles.</p>';
        },
        en: function (interview, path) {
            return '<p class="_blue _em _medium">Your answers will be used to estimate roads and transit usage, and will always stay confidential.</p>';
        }
    }
};

export const personDeparturePlaceType = {
    type: 'question',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.departurePlaceType',
    inputType: 'radio',
    datatype: 'string',
    twoColumns: false,
    choices: [
        {
            value: 'home',
            label: {
                fr: 'Domicile',
                en: 'Home'
            }
        },
        {
            value: 'other',
            label: {
                fr: 'Autre lieu (travail, lieu d\'études, hôtel, résidence secondaire, chalet, etc.)',
                en: 'Other location (work place, place of study, hotel, cottage, secondary home, etc.)'
            }
        }
    ],
    sameLine: false,
    label: {
        fr: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const nickname = person.nickname;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            if (isAlone) {
                return 'Quel était votre point de départ de la journée?  \n*(À quel endroit étiez-vous avant d\'effectuer votre premier déplacement de la journée?)*';
            }
            return `Quel était le point de départ de la journée de ${nickname}?  \n*(À quel endroit était ${nickname} avant d'effectuer son premier déplacement de la journée?)*`;
        },
        en: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const nickname = person.nickname;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            return `What was ${isAlone ? 'your' : nickname + '\'s'} departure location on this day?  \n*(At what place ${isAlone ? 'were you' : 'was ' + nickname} before making ${isAlone ? 'your' : person.gender === 'female' ? 'her' : person.gender === 'male' ? 'his' : 'their'} first trip of the day?)*`;
        }
    },
    conditional: function (interview, path) {
        const value = surveyHelperNew.getResponse(interview, path, null);
        const person = odSurveyHelper.getPerson({ interview }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const visitedPlaces = journey === undefined ? [] : odSurveyHelper.getVisitedPlacesArray({ journey });
        return [visitedPlaces && visitedPlaces.length <= 1 ? true : false, value];
    },
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'Le point de départ est requis.',
                    en: 'Departure location is required.'
                }
            }
        ];
    }
};

export const personVisitedPlacesTitle = {
    type: 'text',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.personVisitedPlacesTitle',
    align: 'left',
    containsHtml: true,
    text: {
        fr: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
            const formattedTripsDate = moment(surveyHelperNew.getResponse(interview, 'tripsDate') as any).format('LL');
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            return `<p>Lieux où ${householdSize === 1 ? 'vous êtes allé' : `<strong>${person.nickname}</strong> est allé`}${genderString2} le <strong>${formattedTripsDate}</strong>&nbsp;: <br /><em>L’ordre chronologique doit être respecté</em></p>`;
        },
        en: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const formattedTripsDate = moment(surveyHelperNew.getResponse(interview, 'tripsDate') as any).format('LL');
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            return `<p>Places where ${householdSize === 1 ? 'you' : `<strong>${person.nickname}</strong>`} went on <strong>${formattedTripsDate}</strong>&nbsp;: <br /><em>Chronological order must be preserved</em></p>`;
        }
    }
};

export const personVisitedPlacesMap = getPersonVisitedPlacesMapConfig({ getFormattedDate });

export const personVisitedPlaces: GroupConfig = {
    type: 'group',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces',
    title: {
        fr: 'Lieux visités',
        en: 'Visited places'
    },
    filter: function (interview, groupedObjects) {
        const activeVisitedPlaceId = surveyHelperNew.getResponse(interview, '_activeVisitedPlaceId', null);
        if (activeVisitedPlaceId) {
            const filteredGroupedObject = {};
            for (const groupedObjectId in groupedObjects) {
                if (groupedObjectId === activeVisitedPlaceId) {
                    filteredGroupedObject[groupedObjectId] = groupedObjects[groupedObjectId];
                }
            }
            return filteredGroupedObject;
        } else {
            return {};
        }
    },
    name: {
        fr: function (groupedObject: any, sequence) {
            const locationStr =
                sequence === 1 || groupedObject['_sequence'] === 1
                    ? 'Lieu de départ de la journée'
                    : `Lieu ${sequence || groupedObject['_sequence']}`;
            return `${locationStr} ${groupedObject.name ? `• **${groupedObject.name}**` : groupedObject.activity ? `• **${i18n.t(`survey:visitedPlace:activities:${groupedObject.activity}`)}**` : ''}`;
        },
        en: function (groupedObject: any, sequence) {
            const locationStr =
                sequence === 1 || groupedObject['_sequence'] === 1
                    ? 'Departure place for this day'
                    : `Location ${sequence || groupedObject['_sequence']}`;
            return `${locationStr} ${groupedObject.name ? `• **${groupedObject.name}**` : groupedObject.activity ? `• **${i18n.t(`survey:visitedPlace:activities:${groupedObject.activity}`)}**` : ''}`;
        }
    },
    showGroupedObjectDeleteButton: false,
    deleteConfirmPopup: {
        content: {
            fr: function (interview) {
                return 'Confirmez-vous que vous voulez retirer ce lieu?';
            },
            en: function (interview) {
                return 'Do you confirm that you want to remove this location?';
            }
        }
    },
    showGroupedObjectAddButton: true,
    addButtonLocation: 'both' as const,
    widgets: [
        'visitedPlaceActivityCategory',
        'visitedPlaceActivity',
        'visitedPlaceAlreadyVisited',
        'visitedPlaceShortcut',
        'visitedPlaceName',
        'visitedPlaceGeography',
        //"visitedPlaceArrivalAndDepartureTime",
        'visitedPlaceArrivalTime',
        'visitedPlaceDepartureTime',
        'visitedPlaceNextPlaceCategory',
        //"visitedPlaceWentBackHomeDirectlyAfter",
        //"visitedPlaceIsNotLast",
        'buttonSaveVisitedPlace',
        'buttonCancelVisitedPlace',
        'buttonDeleteVisitedPlace'
    ]
};

export const visitedPlaceName = {
    ...geographyWidgets.visitedPlaceName,
    defaultValue: function (interview, path) {
        // FIXME This handles shortcut, when shortcut is in Evolution, remove
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        if (visitedPlace.shortcut) {
            const shortcut = visitedPlace.shortcut;
            const shortcutVisitedPlace: any = surveyHelperNew.getResponse(interview, shortcut, null);
            if (shortcutVisitedPlace && !_isBlank(shortcutVisitedPlace.name)) {
                return shortcutVisitedPlace.name;
            }
        }
        return undefined;
    }
};

export const visitedPlaceActivityCategory = {
    ...activityWidgets.activityCategory,
    defaultValue: (interview, path) => {
        // For backward compatibility, since this widget was added later, if it is blank and the activity has a value, take the first category that applies
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        const activity = visitedPlace.activity;
        if (_isBlank(visitedPlace.activityCategory) && !_isBlank(activity) && activityToDisplayCategory[activity]) {
            return activityToDisplayCategory[activity][0];
        }
        return null;
    }
};

export const visitedPlaceAlreadyVisited = {
    type: 'question',
    path: 'alreadyVisitedBySelfOrAnotherHouseholdMember',
    inputType: 'radio',
    datatype: 'boolean',
    label: {
        fr: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            if (householdSize === 1) {
                return 'Avez-vous déjà localisé ce lieu sur la carte?';
            }
            return `Avez-vous déjà localisé ce lieu dans l’entrevue de ${person.nickname} ou de celle des autres membres de votre ménage?`;
        },
        en: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            if (householdSize === 1) {
                return 'Did you previously locate this place on the map?';
            }
            return `Did you previously locate this place in ${person.nickname}'s interview or in another household member's interview?`;
        }
    },
    choices: [
        {
            value: true,
            label: {
                fr: 'Oui',
                en: 'Yes'
            }
        },
        {
            value: false,
            label: {
                fr: 'Non',
                en: 'No'
            }
        }
    ],
    conditional: function (interview, path) {
        const activity: any = surveyHelperNew.getResponse(interview, path, null, '../activity');
        const incompatibleActivity =
            ['home', 'workUsual', 'schoolUsual', 'workOnTheRoadFromHome', 'workOnTheRoadFromUsualWork'].indexOf(
                activity
            ) > -1;
        if (_isBlank(activity)) {
            return [false, null];
        }
        if (!incompatibleActivity) {
            const geography = surveyHelperNew.getResponse(interview, path, null, '../geography');
            let lastAction = null;
            if (geography) {
                lastAction = _get(geography, 'properties.lastAction', null);
            }
            const shortcuts = helper.getShortcutVisitedPlaces(interview);
            return [(lastAction === null || lastAction === 'shortcut') && shortcuts.length > 0, null];
        }
        return [false, null];
    }
};

export const visitedPlaceShortcut = {
    type: 'question',
    path: 'shortcut',
    inputType: 'select',
    datatype: 'string',
    twoColumns: false,
    label: {
        fr: 'Veuillez choisir ce lieu dans la liste des lieux déjà localisés:',
        en: 'Please select this place in the list of already localized places:'
    },
    hasGroups: true,
    choices: function (interview, path) {
        const shortcuts = helper.getShortcutVisitedPlaces(interview);
        const choices: any[] = [];
        for (let i = 0, count = shortcuts.length; i < count; i++) {
            const shortcut = shortcuts[i];
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
    conditional: function (interview, path) {
        const activity = surveyHelperNew.getResponse(interview, path, null, '../activity');
        const visitedPlaceAlreadyVisited = surveyHelperNew.getResponse(
            interview,
            path,
            null,
            '../alreadyVisitedBySelfOrAnotherHouseholdMember'
        );
        return [!_isBlank(activity) && visitedPlaceAlreadyVisited === true, null];
    }
};

export const visitedPlaceGeography = {
    ...geographyWidgets.visitedPlaceGeography,
    defaultValue: function (interview, path) {
        // FIXME This handles shortcut, when shortcut is in Evolution, remove
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        if (visitedPlace.shortcut) {
            const shortcut = visitedPlace.shortcut;
            const shortcutVisitedPlace = surveyHelperNew.getResponse(interview, shortcut, null) as any;
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const geography = shortcutVisitedPlace
                ? odSurveyHelper.getVisitedPlaceGeography({ visitedPlace: shortcutVisitedPlace, person, interview })
                : null;
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
    validations: function (value, customValue, interview, path, customPath) {
        // FIXME This has a boundary check, remove when supported directly in Evolution
        const validationResults = geographyWidgets.visitedPlaceGeography.validations(
            value,
            customValue,
            interview,
            path,
            customPath
        );
        const geography: any = value;

        return [
            ...validationResults,
            {
                validation: geography && turfBooleanPointInPolygon(geography, (waterBoundaries as any).features[0]),
                errorMessage: {
                    fr: 'Le lieu est dans une étendue d\'eau ou est inaccessible. Veuillez vérifier la localisation.',
                    en: 'Location is in water or is inaccessible. Please verify.'
                }
            }
        ];
    }
};

export const visitedPlaceArrivalTime = {
    type: 'question',
    path: 'arrivalTime',
    inputType: 'time',
    twoColumns: true,
    datatype: 'integer',
    addHourSeparators: true,
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'L’heure d’arrivée est manquante ou invalide (vérifiez que les toutes les heures se suivent dans l\'ordre chronologique).',
                    en: 'Arrival time is missing or invalid (verify that all times are chronological order).'
                }
            }
        ];
    },
    conditional: function (interview, path) {
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        return visitedPlace['_sequence'] > 1;
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const visitedPlaces: any = surveyHelperNew.getResponse(interview, path, null, '../../../visitedPlaces');
        const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        let lastTimeSecondsSinceMidnight = 0;
        if (!isEmpty(visitedPlaces)) {
            const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
                return visitedPlace['_sequence'] < activeVisitedPlace['_sequence'];
            });

            const previousTimes = visitedPlacesArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const visitedPlaces: any = surveyHelperNew.getResponse(interview, path, null, '../../../visitedPlaces');
        const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
        if (!isEmpty(visitedPlaces)) {
            const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
                return visitedPlace['_sequence'] > activeVisitedPlace['_sequence'];
            });

            const nextTimes = visitedPlacesArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            // also check active departure time:
            if (!_isBlank(activeVisitedPlace.departureTime)) {
                nextTimes.push(activeVisitedPlace.departureTime);
            }

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: {
        fr: function (interview, path) {
            const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
            const nickname = surveyHelperNew.getResponse(interview, path, null, '../../../../../nickname');
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            let placeStr = 'à cet endroit';
            if (visitedPlace && visitedPlace.activity === 'home') {
                placeStr = 'au domicile';
            } else if (visitedPlace && visitedPlace.activity === 'workUsual') {
                placeStr = 'au travail';
            } else if (visitedPlace && visitedPlace.activity === 'schoolUsual') {
                placeStr = 'au lieu d\'études';
            } else if (
                (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome') ||
                visitedPlace.activity === 'workOnTheRoadFromUsualWork' ||
                visitedPlace.activity === 'workOnTheRoad'
            ) {
                return `${isAlone ? 'Vous avez débuté vos déplacements sur la route à' : `${nickname} a débuté ses déplacements sur la route à`}:`;
            }
            return `${isAlone ? 'Vous êtes arrivé' : `${nickname} est arrivé`}${genderString2} ${placeStr} à:`;
        },
        en: function (interview, path) {
            const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const nickname = person.nickname;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            let placeStr = 'at this place';
            if (visitedPlace && visitedPlace.activity === 'home') {
                placeStr = 'home';
            } else if (visitedPlace && visitedPlace.activity === 'workUsual') {
                placeStr = 'at work';
            } else if (visitedPlace && visitedPlace.activity === 'schoolUsual') {
                placeStr = 'at school';
            } else if (
                (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome') ||
                visitedPlace.activity === 'workOnTheRoadFromUsualWork' ||
                visitedPlace.activity === 'workOnTheRoad'
            ) {
                const genderString = helper.getGenderString(person, 'her', 'his', 'their', 'his/her');
                return `${isAlone ? 'You started your on the road trips at' : `${nickname} started ${genderString} on the road trips at`}:`;
            }
            return `${isAlone ? 'You arrived' : `${nickname} arrived`} ${placeStr} at:`;
        }
    }
};

export const visitedPlaceDepartureTime = {
    type: 'question',
    path: 'departureTime',
    inputType: 'time',
    twoColumns: true,
    datatype: 'integer',
    addHourSeparators: true,
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'L’heure de départ est manquante ou invalide (vérifiez que les toutes les heures se suivent dans l\'ordre chronologique).',
                    en: 'Departure time is missing or invalid (verify that all times are chronological order).'
                }
            }
        ];
    },
    conditional: function (interview, path) {
        const journey = odSurveyHelper.getActiveJourney({ interview });
        const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        const visitedPlacesArray = odSurveyHelper.getVisitedPlacesArray({ journey });
        if (
            _isBlank((activeVisitedPlace as any).nextPlaceCategory) &&
            visitedPlacesArray.length > 1 &&
            visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === activeVisitedPlace._uuid
        ) {
            return [false, null];
        }
        return [
            activeVisitedPlace.activityCategory &&
                (activeVisitedPlace._sequence === 1 ||
                    (activeVisitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay'),
            null
        ];
    },
    minTimeSecondsSinceMidnight: function (interview, path) {
        const visitedPlaces: any = surveyHelperNew.getResponse(interview, path, null, '../../');
        const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        let lastTimeSecondsSinceMidnight = 0;
        if (!isEmpty(visitedPlaces)) {
            const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
                return visitedPlace['_sequence'] < activeVisitedPlace['_sequence'];
            });

            const previousTimes = visitedPlacesArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                } else if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            // also check active arrival time:
            if (!_isBlank(activeVisitedPlace.arrivalTime)) {
                previousTimes.push(activeVisitedPlace.arrivalTime);
            }
            lastTimeSecondsSinceMidnight =
                previousTimes.length > 0 ? _max(previousTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    maxTimeSecondsSinceMidnight: function (interview, path) {
        const visitedPlaces: any = surveyHelperNew.getResponse(interview, path, null, '../../');
        const activeVisitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        let lastTimeSecondsSinceMidnight = 27 * 3600 + 59 * 60 + 59;
        if (!isEmpty(visitedPlaces)) {
            const visitedPlacesArray = Object.values(visitedPlaces).filter((visitedPlace: any) => {
                return visitedPlace['_sequence'] > activeVisitedPlace['_sequence'];
            });

            const nextTimes = visitedPlacesArray.map((visitedPlace: any) => {
                if (!_isBlank(visitedPlace.arrivalTime)) {
                    return visitedPlace.arrivalTime;
                } else if (!_isBlank(visitedPlace.departureTime)) {
                    return visitedPlace.departureTime;
                }
                return lastTimeSecondsSinceMidnight;
            });

            lastTimeSecondsSinceMidnight = nextTimes.length > 0 ? _min(nextTimes) : lastTimeSecondsSinceMidnight;
        }
        return lastTimeSecondsSinceMidnight;
    },
    label: {
        fr: function (interview, path) {
            const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
            const nickname = surveyHelperNew.getResponse(interview, path, null, '../../../../../nickname');
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            let placeStr = 'cet endroit';
            if (visitedPlace && visitedPlace.activity === 'home') {
                placeStr = 'le domicile';
            } else if (visitedPlace && visitedPlace.activity === 'workUsual') {
                placeStr = 'le travail';
            } else if (visitedPlace && visitedPlace.activity === 'schoolUsual') {
                placeStr = 'le lieu d\'études';
            } else if (
                (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome') ||
                visitedPlace.activity === 'workOnTheRoadFromUsualWork' ||
                visitedPlace.activity === 'workOnTheRoad'
            ) {
                return `${isAlone ? 'Vous avez terminé vos déplacements sur la route à' : `${nickname} a terminé ses déplacements sur la route à`}:`;
            }
            return `${isAlone ? 'Vous avez quitté' : `${nickname} a quitté`} ${placeStr} à:`;
        },
        en: function (interview, path) {
            const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const nickname = person.nickname;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            const isAlone = householdSize === 1;
            let placeStr = 'this place';
            if (visitedPlace && visitedPlace.activity === 'home') {
                placeStr = 'home';
            } else if (visitedPlace && visitedPlace.activity === 'workUsual') {
                placeStr = 'work';
            } else if (visitedPlace && visitedPlace.activity === 'schoolUsual') {
                placeStr = 'school';
            } else if (
                (visitedPlace && visitedPlace.activity === 'workOnTheRoadFromHome') ||
                visitedPlace.activity === 'workOnTheRoadFromUsualWork' ||
                visitedPlace.activity === 'workOnTheRoad'
            ) {
                const genderString = helper.getGenderString(person, 'her', 'his', 'their', 'his/her');
                return `${isAlone ? 'You completed your on the road trips at' : `${nickname} completed ${genderString} the on the road trips at`}:`;
            }
            return `${isAlone ? 'You left' : `${nickname} left`} ${placeStr} at:`;
        }
    }
};

export const personLastVisitedPlaceNotHome = {
    type: 'question',
    inputType: 'button',
    path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.lastVisitedPlaceNotHome',
    align: 'center',
    datatype: 'boolean',
    twoColumns: false,
    isModal: true,
    containsHtml: true,
    label: {
        fr: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            if (householdSize === 1) {
                return `Êtes-vous retourné${genderString2} au domicile à la fin de la journée (avant 4:00 le lendemain matin)?`;
            }
            return `Est-ce que ${person.nickname} est retourné${genderString2} au domicile à la fin de la journée (avant 4:00 le lendemain matin)?`;
        },
        en: function (interview, path) {
            const person = odSurveyHelper.getPerson({ interview }) as any;
            const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
            return `Did ${householdSize === 1 ? 'you' : person.nickname} go back home at the end of the day (before 4AM the next morning)?`;
        }
    },
    choices: [
        {
            value: true,
            label: {
                fr: 'Oui',
                en: 'Yes'
            },
            color: 'green'
        },
        {
            value: false,
            label: {
                fr: 'Non',
                en: 'No'
            },
            color: 'red'
        }
    ],
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'Cette réponse est requise.',
                    en: 'This field is required.'
                }
            }
        ];
    },
    conditional: function (interview, path) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const personLastVisitedPlaceNotHome = surveyHelperNew.getResponse(
            interview,
            `household.persons.${person._uuid}.lastVisitedPlaceNotHome`,
            undefined
        );
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
        const lastVisitedPlace = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
        const confirmedSection = surveyHelperNew.getResponse(
            interview,
            `household.persons.${person._uuid}._confirmedVisitedPlaces`,
            null
        );
        return [
            /*confirmedSection === true && */ lastVisitedPlace && lastVisitedPlace.activity !== 'home',
            personLastVisitedPlaceNotHome
        ];
    }
};

export const buttonCancelVisitedPlace = {
    type: 'button',
    color: 'grey',
    label: {
        fr: 'Annuler',
        en: 'Cancel'
    },
    hideWhenRefreshing: true,
    path: 'cancelVisitedPlace',
    conditional: function (interview, path) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        return [visitedPlaces.length > 1 && _isBlank(visitedPlace.activity), undefined];
    },
    //icon: faCheckCircle,
    align: 'center',
    size: 'small',
    action: function (
        callbacks: InterviewUpdateCallbacks,
        interview: UserInterviewAttributes,
        path: string,
        section,
        sections,
        saveCallback
    ) {
        const visitedPlacePath = surveyHelperNew.getPath(path, '../');
        helper.deleteVisitedPlace(
            visitedPlacePath,
            interview,
            callbacks.startRemoveGroupedObjects,
            callbacks.startUpdateInterview
        );
    }
};

export const buttonDeleteVisitedPlace: ButtonWidgetConfig = {
    type: 'button',
    color: 'red',
    icon: faTrashAlt,
    label: {
        fr: 'Supprimer ce lieu',
        en: 'Delete this location'
    },
    hideWhenRefreshing: true,
    path: 'deleteVisitedPlace',
    conditional: function (interview, path) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        return [visitedPlaces.length > 1 && !_isBlank(visitedPlace.activity), undefined];
    },
    align: 'center',
    size: 'small',
    confirmPopup: {
        content: {
            fr: function (interview) {
                return 'Confirmez-vous que vous voulez retirer ce lieu?';
            },
            en: function (interview) {
                return 'Do you confirm that you want to remove this location?';
            }
        }
    },
    action: function (
        callbacks: InterviewUpdateCallbacks,
        interview: UserInterviewAttributes,
        path: string,
        section,
        sections,
        saveCallback
    ) {
        const visitedPlacePath = surveyHelperNew.getPath(path, '../');
        helper.deleteVisitedPlace(
            visitedPlacePath,
            interview,
            callbacks.startRemoveGroupedObjects,
            callbacks.startUpdateInterview
        );
    }
};

export const buttonSaveVisitedPlace: ButtonWidgetConfig = {
    type: 'button',
    color: 'green',
    label: {
        fr: 'Confirmer',
        en: 'Confirm'
    },
    hideWhenRefreshing: true,
    path: 'saveVisitedPlace',
    icon: faCheckCircle,
    align: 'center',
    saveCallback: function (
        callbacks: InterviewUpdateCallbacks,
        interview: UserInterviewAttributes,
        path: string,
        user?: CliUser
    ) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        const journeys = odSurveyHelper.getJourneysArray({ person });
        const currentJourney = journeys[0];
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
        const visitedPlace: any = surveyHelperNew.getResponse(interview, path, null, '../');
        const visitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlace._uuid}`;
        const previousVisitedPlace = odSurveyHelper.getPreviousVisitedPlace({
            visitedPlaceId: visitedPlace._uuid,
            journey: currentJourney
        }) as any;
        const previousVisitedPlacePath = previousVisitedPlace
            ? `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${previousVisitedPlace._uuid}`
            : null;
        const nextVisitedPlace = odSurveyHelper.getNextVisitedPlace({
            visitedPlaceId: visitedPlace._uuid,
            journey: currentJourney
        }) as any;
        const nextVisitedPlacePath = nextVisitedPlace
            ? `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`
            : null;
        const updateValuesbyPath = {};
        if (
            previousVisitedPlace &&
            previousVisitedPlace.nextPlaceCategory !== 'wentBackHome' &&
            visitedPlace.activity === 'home'
        ) {
            updateValuesbyPath[`response.${previousVisitedPlacePath}.nextPlaceCategory`] = 'wentBackHome';
        }
        if (
            previousVisitedPlace &&
            previousVisitedPlace.nextPlaceCategory !== 'visitedAnotherPlace' &&
            visitedPlace.activity !== 'home'
        ) {
            updateValuesbyPath[`response.${previousVisitedPlacePath}.nextPlaceCategory`] = 'visitedAnotherPlace';
        }
        if (
            nextVisitedPlace &&
            visitedPlace.nextPlaceCategory !== 'wentBackHome' &&
            nextVisitedPlace.activity === 'home'
        ) {
            nextVisitedPlace.activity = null;
            updateValuesbyPath[`response.${nextVisitedPlacePath}.activity`] = null;
        }
        if (
            nextVisitedPlace &&
            visitedPlace.nextPlaceCategory !== 'visitedAnotherPlace' &&
            nextVisitedPlace.activity !== 'home'
        ) {
            nextVisitedPlace.activity = null;
            updateValuesbyPath[`response.${nextVisitedPlacePath}.activity`] = null;
        }
        updateValuesbyPath[`response.${visitedPlacePath}._isNew`] = false;
        if (visitedPlace.nextPlaceCategory === 'wentBackHome') {
            const nextVisitedPlace = odSurveyHelper.getNextVisitedPlace({
                visitedPlaceId: visitedPlace._uuid,
                journey: currentJourney
            });
            if (
                !_isBlank(visitedPlace.activity) &&
                visitedPlace.activity !== 'home' &&
                (!nextVisitedPlace || nextVisitedPlace.activity !== 'home')
            ) {
                callbacks.startAddGroupedObjects(
                    1,
                    visitedPlace['_sequence'] + 1,
                    `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                    [{ activity: 'home' }],
                    (updatedInterview) => {
                        const person = odSurveyHelper.getPerson({ interview: updatedInterview }) as any;
                        const journeys = odSurveyHelper.getJourneysArray({ person });
                        const currentJourney = journeys[0];
                        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey: currentJourney });
                        updateValuesbyPath['response._activeVisitedPlaceId'] =
                            helper.selectNextVisitedPlaceId(visitedPlaces);
                        callbacks.startUpdateInterview({
                            sectionShortname: 'visitedPlaces',
                            valuesByPath: updateValuesbyPath
                        });
                    }
                );
                return null;
            }
        }
        updateValuesbyPath['response._activeVisitedPlaceId'] = helper.selectNextVisitedPlaceId(visitedPlaces);
        callbacks.startUpdateInterview({ sectionShortname: 'visitedPlaces', valuesByPath: updateValuesbyPath });
        return null;
    },
    action: validateButtonAction
};

export const buttonVisitedPlacesConfirmNextSection: ButtonWidgetConfig = {
    type: 'button',
    color: 'green',
    path: 'buttonVisitedPlacesConfirmNextSection',
    label: {
        fr: 'Confirmer les lieux et continuer',
        en: 'Confirm locations and continue'
    },
    icon: faCheckCircle,
    align: 'left',
    action: validateButtonAction,
    conditional: function (interview, path) {
        const person = odSurveyHelper.getPerson({ interview }) as any;
        const journey = odSurveyHelper.getJourneysArray({ person })[0] as any;
        const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
        const lastVisitedPlace: any | null = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
        return !!(lastVisitedPlace && lastVisitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay');
    }
};
