/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from '../../../questionnaire/types';
import { TFunction } from 'i18next';
import * as odHelpers from '../../../odSurvey/helpers';
import { getPreviousTripSingleSegment, shouldShowSameAsReverseTripQuestion } from './helpers';
import { yesNoChoices } from '../common/choices';

export const getSameAsReverseTripWidgetConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: () => string } = {}
): WidgetConfig => {
    return {
        type: 'question',
        path: 'sameModeAsReverseTrip',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'boolean',
        label: (t: TFunction, interview, path) => {
            const tripContext = odHelpers.getTripContextFromPath({ interview, path });
            if (!tripContext) {
                throw new Error('Trip context not found for path ' + path);
            }
            const { person, journey, trip } = tripContext;
            const previousSegment = getPreviousTripSingleSegment({ journey, trip });
            const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
            const destination = trip ? odHelpers.getDestination({ trip, visitedPlaces }) : undefined;
            const labelWithDestination = `segments:SegmentSameModeReturn${destination && destination.activity === 'home' ? 'Home' : ''}`;
            return t([`customSurvey:${labelWithDestination}`, labelWithDestination], {
                context: options.context?.(),
                count: odHelpers.getCountOrSelfDeclared({ interview, person }),
                previousMode:
                    previousSegment && previousSegment.mode
                        ? t([
                            `customSurvey:segments:mode:short:${previousSegment.mode}`,
                            `segments:mode:short:${previousSegment.mode}`
                        ])
                        : ''
            });
        },
        choices: yesNoChoices,
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t(['customSurvey:ResponseIsRequired', 'survey:ResponseIsRequired'])
                }
            ];
        },
        conditional: (interview, path) => [shouldShowSameAsReverseTripQuestion({ interview, path }), null]
    };
};
