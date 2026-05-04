/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    ButtonWidgetConfig,
    InterviewUpdateCallbacks,
    UserInterviewAttributes,
    VisitedPlacesSectionConfiguration,
    WidgetConfig
} from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

/**
 * Widget config factory for the buttons shown at the bottom of a single visited
 * place group. It returns the save, delete and cancel buttons for a visited
 * place.
 */
export class ButtonsVisitedPlaceConfigFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    // Action called when clicking on the delete or cancel buttons of a visited place
    private deleteVisitedPlaceButtonAction = (
        callbacks: InterviewUpdateCallbacks,
        interview: UserInterviewAttributes,
        path: string
    ) => {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (visitedPlaceContext === null) {
            throw new Error(
                'widgetDeleteVisitedPlace: action function: visited place context not found for path ' + path
            );
        }
        const { journey, visitedPlace, person } = visitedPlaceContext;
        // Delete the visited place
        odHelpers.deleteVisitedPlace({
            interview,
            person,
            journey,
            visitedPlace,
            startRemoveGroupedObjects: callbacks.startRemoveGroupedObjects,
            startUpdateInterview: callbacks.startUpdateInterview
        });
    };

    private getDeleteVisitedPlaceButtonWidgetConfig = (): ButtonWidgetConfig => ({
        type: 'button',
        color: 'red',
        icon: this.options.iconMapper['delete-trash'],
        label: (t: TFunction) => t('visitedPlaces:deleteThisGroupedObject'),
        hideWhenRefreshing: true,
        path: 'deleteVisitedPlace',
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetDeleteVisitedPlace: conditional function: visited place context not found for path ' + path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            // Only show the delete button if there is more than one visited
            // place and the activity category of the visited place is set
            // (which means that the user has started filling the visited place
            // form)
            const visitePlacesArray = odHelpers.getVisitedPlacesArray({ journey });

            return [visitePlacesArray.length > 1 && !_isBlank(visitedPlace.activityCategory), undefined];
        },
        align: 'center',
        size: 'small',
        confirmPopup: {
            content: (t: TFunction) => t('visitedPlaces:ConfirmDeleteVisitedPlace')
        },
        action: this.deleteVisitedPlaceButtonAction
    });

    private getCancelVisitedPlaceButtonWidgetConfig = (): ButtonWidgetConfig => ({
        type: 'button',
        color: 'grey',
        label: (t: TFunction) => t('main:Cancel'),
        hideWhenRefreshing: true,
        path: 'cancelVisitedPlace',
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetCancelVisitedPlace: conditional function: visited place context not found for path ' + path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            // Only show the cancel button if there is more than one visited
            // place and the activity category of the visited place is not set
            // (which means that the user has not started filling the visited
            // place form yet)
            const visitePlacesArray = odHelpers.getVisitedPlacesArray({ journey });

            return [visitePlacesArray.length > 1 && _isBlank(visitedPlace.activityCategory), undefined];
        },
        align: 'center',
        size: 'small',
        action: this.deleteVisitedPlaceButtonAction
    });

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        return {
            buttonDeleteVisitedPlace: this.getDeleteVisitedPlaceButtonWidgetConfig(),
            buttonCancelVisitedPlace: this.getCancelVisitedPlaceButtonWidgetConfig()
        };
    };
}
