/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TFunction } from 'i18next';
import { ChoiceType, InputRadioType, VisitedPlacesSectionConfiguration, WidgetConfig } from '../../types';
import * as odHelpers from '../../../odSurvey/helpers';
import { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { requiredValidation } from '../../../widgets/validations/validations';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { isLastVisitedPlaceConditional, isWorkOnTheRoad } from './helpers';

const visitedPlaceOnTheRoadPreviousPlaceActivityChoices: ChoiceType[] = [
    {
        value: 'home',
        label: (t: TFunction) => t('visitedPlaces:onTheRoadPreviousPlaceActivityChoices.home')
    },
    {
        value: 'workUsual',
        label: (t: TFunction) => t('visitedPlaces:onTheRoadPreviousPlaceActivityChoices.workUsual'),
        conditional: function (interview, path) {
            const person = odHelpers.getPerson({ interview, path });
            if (person === null) {
                throw new Error(
                    'visitedPlaceOnTheRoadPreviousPlaceActivityChoices workUsual label: Person not found in interview response'
                );
            }
            // Display if either the workPlaceType is explicitly set to
            // onTheRoadWithUsualPlace, or if it is not set at all for surveys that
            // do not collect this information
            return person.workPlaceType === 'onTheRoadWithUsualPlace' || person.workPlaceType === undefined;
        }
    },
    {
        value: 'other',
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (!visitedPlaceContext) {
                throw new Error(
                    'visitedPlaceOnTheRoadPreviousPlaceActivityChoices other label: Visited place context not found for path ' +
                        path
                );
            }
            const { visitedPlace, person, journey } = visitedPlaceContext;

            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            const previousVisitedPlaceDescription = previousVisitedPlace
                ? odHelpers.getVisitedPlaceDescription({
                    visitedPlace: previousVisitedPlace,
                    interview,
                    person,
                    t,
                    options: {
                        withTimes: false,
                        allowHtml: false,
                        withActivity: false,
                        withPersonIdentification: false
                    }
                })
                : undefined;
            return previousVisitedPlaceDescription
                ? previousVisitedPlaceDescription
                : t('visitedPlaces:onTheRoadPreviousPlaceActivityChoices.other');
        },
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (!visitedPlaceContext) {
                throw new Error(
                    'visitedPlaceOnTheRoadPreviousPlaceActivityChoices other conditional: Visited place context not found for path ' +
                        path
                );
            }
            const { visitedPlace, person, journey } = visitedPlaceContext;
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            // Display if the previous visited place is not one of the cases
            // covered by the other choices: home and workUsual
            return (
                previousVisitedPlace !== null &&
                'home' !== previousVisitedPlace.activityCategory &&
                previousVisitedPlace.activity !== 'workOnTheRoad' &&
                !(
                    previousVisitedPlace.activity === 'workUsual' &&
                    (person.workPlaceType === 'onTheRoadWithUsualPlace' || person.workPlaceType === undefined)
                )
            );
        }
    }
];

// Visited
const visitedPlaceOnTheRoadPreviousPlaceActivity: InputRadioType = {
    type: 'question',
    inputType: 'radio',
    path: 'onTheRoadPreviousPlaceActivity',
    datatype: 'string',
    twoColumns: false,
    sameLine: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const person = odHelpers.getPerson({ interview, path });
        if (person === null) {
            throw new Error('visitedPlaceOnTheRoadPreviousPlaceActivity label: Person not found in interview response');
        }
        return t('visitedPlaces:visitedPlaceOnTheRoadPreviousPlaceActivity', {
            context: odHelpers.getPersonGenderContext({ person }),
            nickname: odHelpers.getPersonIdentificationString({ person, t }),
            count: odHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: visitedPlaceOnTheRoadPreviousPlaceActivityChoices,
    validations: requiredValidation,
    conditional: (interview, path) => {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            console.error('Visited place context not found for path', path);
            return [false, null];
        }
        const { visitedPlace } = visitedPlaceContext;
        // Only show this question for work on the road new places that are not
        // the first visited place of the sequence (as the day starts on the
        // road)
        const condition =
            visitedPlace._isNew !== false && visitedPlace._sequence !== 1 && visitedPlace.activity === 'workOnTheRoad';
        if (condition === false) {
            // Exit early
            return [false, null];
        }

        // If there is only one valid departure location, auto-select it and hide this question.
        // TODO: Fix cleanly in evolution. See https://github.com/chairemobilite/evolution/issues/110
        const choices = visitedPlaceOnTheRoadPreviousPlaceActivityChoices.filter((choice) => {
            return choice.conditional !== undefined ? choice.conditional(interview, path) === true : true;
        });
        if (choices.length === 1) {
            return [false, choices[0].value];
        }

        // Otherwise, display the question.
        return [true, null];
    }
};

const visitedPlaceOnTheRoadNextPlaceCategoryChoices: ChoiceType[] = [
    {
        value: 'wentBackHome',
        label: (t: TFunction) => t('visitedPlaces:onTheRoadNextPlaceCategoryChoices.wentBackHome')
    },
    {
        value: 'wentToUsualWorkPlace',
        label: (t: TFunction) => t('visitedPlaces:onTheRoadNextPlaceCategoryChoices.wentToUsualWorkPlace'),
        conditional: (interview, path) => {
            const person = odHelpers.getPerson({ interview, path });
            if (person === null) {
                throw new Error(
                    'visitedPlaceOnTheRoadNextPlaceCategory workUsual label: Person not found in interview response'
                );
            }
            // Display if either the workPlaceType is explicitly set to
            // onTheRoadWithUsualPlace, or if it is not set at all for surveys that
            // do not collect this information
            return person.workPlaceType === 'onTheRoadWithUsualPlace' || person.workPlaceType === undefined;
        }
    },
    {
        value: 'visitedAnotherPlace',
        label: (t: TFunction) => t('visitedPlaces:onTheRoadNextPlaceCategoryChoices.visitedAnotherPlace')
    },
    {
        value: 'stayedThereUntilTheNextDay',
        label: (t: TFunction, interview, path) => {
            const person = odHelpers.getPerson({ interview, path });
            if (person === null) {
                throw new Error('visitedPlaceOnTheRoadNextPlaceCategory label: Person not found in interview response');
            }
            return t('visitedPlaces:onTheRoadNextPlaceCategoryChoices.stayedThereUntilTheNextDay', {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname: odHelpers.getPersonIdentificationString({ person, t }),
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        },
        conditional: isLastVisitedPlaceConditional
    }
];

const visitedPlaceOnTheRoadNextPlaceCategory: InputRadioType = {
    type: 'question',
    inputType: 'radio',
    datatype: 'string',
    sameLine: false,
    path: 'onTheRoadNextPlaceCategory',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const person = odHelpers.getPerson({ interview, path });
        if (person === null) {
            throw new Error('visitedPlaceOnTheRoadNextPlaceCategory label: Person not found in interview response');
        }
        return t('visitedPlaces:visitedPlaceOnTheRoadNextPlaceCategory', {
            context: odHelpers.getPersonGenderContext({ person }),
            nickname: odHelpers.getPersonIdentificationString({ person, t }),
            count: odHelpers.getCountOrSelfDeclared({ interview, person })
        });
    },
    choices: visitedPlaceOnTheRoadNextPlaceCategoryChoices,
    conditional: (interview, path) => {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (visitedPlaceContext === null) {
            throw new Error(
                'visitedPlaceOnTheRoadNextPlaceCategory label: Visited place context not found in interview response'
            );
        }
        const { journey, visitedPlace } = visitedPlaceContext;
        const nextVisitedPlace = odHelpers.getNextVisitedPlace({ journey, visitedPlaceId: visitedPlace._uuid });
        // Display if current activity is work on the road and no next activity
        return [!nextVisitedPlace && isWorkOnTheRoad(visitedPlace), null];
    },
    validations: requiredValidation
};

/**
 * For trip diaries, this class provides the required widgets to validate the
 * work on the road departure and arrival types of the current visited place:
 *
 * - `visitedPlaceOnTheRoadPreviousPlaceActivity`: a radio question that asks what was
 *   the departure place for the work on the road activity
 * - `visitedPlaceOnTheRoadNextPlaceCategory`: a radio question that asks what was the
 *   arrival place for the work on the road activity
 */
export class VisitedPlaceOnTheRoadWidgetFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    getWidgetConfigs = (): Record<string, WidgetConfig> => ({
        visitedPlaceOnTheRoadPreviousPlaceActivity,
        visitedPlaceOnTheRoadNextPlaceCategory
    });
}
