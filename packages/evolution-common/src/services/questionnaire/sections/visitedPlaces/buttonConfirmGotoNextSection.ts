/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { ButtonWidgetConfig, VisitedPlacesSectionConfiguration } from '../../types';
import * as odHelpers from '../../../odSurvey/helpers';
import type { UserInterviewAttributes } from '../../types';
import type { WidgetFactoryOptions } from '../types';
import { getButtonValidateAndGotoNextSection } from '../common/buttonValidateAndGotoNextSection';

export const getButtonConfirmGotoNextSectionWidgetConfig = (
    _sectionConfig: VisitedPlacesSectionConfiguration,
    options: WidgetFactoryOptions
): ButtonWidgetConfig => {
    const gotoNextDefaultButtonConfig = getButtonValidateAndGotoNextSection('visitedPlaces:saveAndContinue', options);
    return {
        ...gotoNextDefaultButtonConfig,
        conditional: (interview: UserInterviewAttributes) => {
            const person = odHelpers.getPerson({ interview }) as any;
            const currentJourney = odHelpers.getActiveJourney({ interview, person });
            if (!currentJourney) {
                // This button should only be shown in the context of a journey
                return false;
            }
            const visitePlacesArray = odHelpers.getVisitedPlacesArray({ journey: currentJourney });
            const lastVisitedPlace = visitePlacesArray[visitePlacesArray.length - 1];
            return (
                lastVisitedPlace !== undefined && lastVisitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay'
            );
        }
    };
};
