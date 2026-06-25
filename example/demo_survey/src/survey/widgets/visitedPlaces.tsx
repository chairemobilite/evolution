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

export const personVisitedPlacesMap = getPersonVisitedPlacesMapConfig(widgetFactoryOptions);

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
    resetToDefaultUnlessUserInteracted: true,
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
