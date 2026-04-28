/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _escape from 'lodash/escape';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type {
    RadioChoiceType,
    VisitedPlace,
    VisitedPlacesSectionConfiguration,
    WidgetConfig
} from '../../../questionnaire/types';
import type { TFunction } from 'i18next';
import { requiredValidation } from '../../../widgets/validations/validations';
import * as odHelpers from '../../../odSurvey/helpers';
import type { WidgetFactoryOptions } from '../types';
import { getResponse } from '../../../../utils/helpers';

const nextPlaceCategoryChoices: RadioChoiceType[] = [
    {
        value: 'wentBackHome',
        label: (t: TFunction, interview) => {
            const person = odHelpers.getActivePerson({ interview });
            const homeAddress = odHelpers.getHomeAddressOneLine({ interview });
            return t('visitedPlaces:nextPlaceRadioChoices.wentBackHome', {
                address: homeAddress,
                context: odHelpers.getPersonGenderContext({ person: person! })
            });
        },
        conditional: function (interview, path) {
            const activeVisitedPlace = getResponse(interview, path, undefined, '../') as VisitedPlace;
            // Do not show if the current place is already home or work on the road (for work on the road trips)
            // FIXME Work on the road has different questions that we do not yet manage in the builtin questionnaire. Revisit when we support that
            return activeVisitedPlace.activity !== 'home' && activeVisitedPlace.activity !== 'workOnTheRoad';
        }
    },
    {
        value: 'visitedAnotherPlace',
        label: (t: TFunction, interview) => {
            const person = odHelpers.getActivePerson({ interview });
            return t('visitedPlaces:nextPlaceRadioChoices.visitedAnotherPlace', {
                context: odHelpers.getPersonGenderContext({ person: person! })
            });
        }
    },
    {
        value: 'stayedThereUntilTheNextDay',
        label: (t: TFunction, interview, path) => {
            const person = odHelpers.getActivePerson({ interview });
            const activeVisitedPlace = getResponse(interview, path, undefined, '../') as VisitedPlace;
            if (activeVisitedPlace.activityCategory === 'home') {
                return t('visitedPlaces:nextPlaceRadioChoices.stayedHomeUntilTheNextDay', {
                    context: odHelpers.getPersonGenderContext({ person: person! })
                });
            } else {
                return t('visitedPlaces:nextPlaceRadioChoices.stayedThereUntilTheNextDay', {
                    context: odHelpers.getPersonGenderContext({ person: person! })
                });
            }
        },
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (!visitedPlaceContext) {
                throw new Error('Active journey not found in interview response');
            }
            const { journey, visitedPlace: activeVisitedPlace } = visitedPlaceContext;
            const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
            // Display only if the current visited place is the last one in the
            // list and there is more than one visited place (otherwise, the
            // person did not make any trips, as the first place is where they
            // were at the beginning of the day)
            return (
                visitedPlacesArray.length > 1 &&
                visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === activeVisitedPlace._uuid
            );
        }
    },
    {
        label: '',
        value: 'wentToUsualWorkPlace',
        hidden: true // used for workOnTheRoad trips only, imputed
    }
];

/**
 * Get the next place category widget configuration for the visited place
 * section.
 *
 * @param {VisitedPlacesSectionConfiguration} sectionConfig
 * @param {WidgetFactoryOptions} _options
 * @returns {WidgetConfig} The configuration for the next place activity widget
 */
export const getNextPlaceCategoryWidgetConfig = (
    sectionConfig: VisitedPlacesSectionConfiguration,
    _options: WidgetFactoryOptions
): WidgetConfig => ({
    type: 'question',
    inputType: 'radio',
    path: 'nextPlaceCategory',
    datatype: 'string',
    twoColumns: false,
    sameLine: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const person = odHelpers.getActivePerson({ interview });
        const activeVisitedPlace = getResponse(interview, path, undefined, '../') as VisitedPlace;
        if (!person || !activeVisitedPlace) {
            throw new Error('Active person or visited place not found in interview response');
        }
        // Escape the visited place name. Do not use the `getVisitedPlaceName`
        // helper as it will return a translated name if not set and we want to
        // use our own custom name for the place here.
        const visitedPlaceName = activeVisitedPlace?.name;
        const atPlace = !_isBlank(visitedPlaceName)
            ? t('survey:atPlace', { placeName: _escape(visitedPlaceName) })
            : t('survey:atThisPlace', { context: activeVisitedPlace.activity });
        return t('visitedPlaces:nextPlaceCategory', {
            context: odHelpers.getPersonGenderContext({ person }),
            nickname: odHelpers.getPersonIdentificationString({ person, t }),
            atPlace,
            count: odHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: nextPlaceCategoryChoices,
    validations: requiredValidation,
    conditional: function (interview, path) {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            console.warn('widgetNextPlaceCategory: Visited place context not found for path ' + path);
            return false;
        }
        const { journey, visitedPlace: activeVisitedPlace } = visitedPlaceContext;
        const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
        // If the arrival time of the visited place is exactly at the max time
        // of day for the trip diary, we can assume that the person stayed there
        // until the next day, even if they did not explicitly say it (we ask
        // this question in that case to confirm and get the right category, but
        // we can already hide the other options)
        if (
            typeof activeVisitedPlace.arrivalTime === 'number' &&
            activeVisitedPlace.arrivalTime === sectionConfig.tripDiaryMaxTimeOfDay
        ) {
            return [false, 'stayedThereUntilTheNextDay'];
        }
        // If the arrival type of the work on the road is
        // stayedThereUntilTheNextDay, we can also assume that the person stayed
        // there until the next day, even if they did not explicitly say it
        if (
            odHelpers.isLoopActivity({ visitedPlace: activeVisitedPlace }) &&
            (activeVisitedPlace as any).onTheRoadArrivalType === 'stayedThereUntilTheNextDay'
        ) {
            return [false, 'stayedThereUntilTheNextDay'];
        }
        // Show the question if there is an activity that is not workOnTheRoad
        // and it is the last visited place
        if (
            !_isBlank(activeVisitedPlace.activity) &&
            visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === activeVisitedPlace._uuid &&
            activeVisitedPlace.activity !== 'workOnTheRoad'
        ) {
            // last visited place and not work on the road
            return [true, null];
        }
        // Do not show otherwise
        return [false, null];
    }
});
