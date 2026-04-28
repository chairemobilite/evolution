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

export const getSegmentHasNextModeWidgetConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: () => string } = {}
): WidgetConfig => {
    return {
        type: 'question',
        path: 'hasNextMode',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'boolean',
        label: (t: TFunction, interview, path) => {
            const tripContext = odHelpers.getTripContextFromPath({ interview, path });
            if (!tripContext) {
                throw new Error('Trip context not found for path ' + path);
            }
            const { person, journey, trip } = tripContext;
            const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
            const origin = trip ? odHelpers.getOrigin({ trip, visitedPlaces }) : undefined;
            const destination = trip ? odHelpers.getDestination({ trip, visitedPlaces }) : undefined;
            const destinationActivity = destination ? destination.activity : '';
            const tripLoopActivity =
                origin && odHelpers.isLoopActivity({ visitedPlace: origin })
                    ? origin.activity
                    : destination && odHelpers.isLoopActivity({ visitedPlace: destination })
                        ? destination.activity
                        : undefined;
            if (tripLoopActivity) {
                return t(['customSurvey:segments:SegmentHasNextModeLoop', 'segments:SegmentHasNextModeLoop'], {
                    context: options.context?.(),
                    nickname: person.nickname,
                    thisTrip: t(['customSurvey:thisTrip', 'survey:thisTrip'], { context: tripLoopActivity }),
                    count: odHelpers.getCountOrSelfDeclared({ interview, person })
                });
            }
            const destinationName = destination
                ? odHelpers.getVisitedPlaceName({ t, visitedPlace: destination, interview })
                : t(['customSurvey:survey:destination', 'survey:destination']);
            return t(['customSurvey:segments:SegmentHasNextMode', 'segments:SegmentHasNextMode'], {
                context: options.context?.(),
                nickname: person.nickname,
                thisTrip: t(['customSurvey:thisTrip', 'survey:thisTrip'], { context: destinationActivity }),
                destinationName,
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
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
        conditional: (interview, path) => {
            const segmentContext = odHelpers.getSegmentContextFromPath({ interview, path });
            if (!segmentContext) {
                throw new Error('Segment context not found for path ' + path);
            }
            const { journey, trip, segment } = segmentContext;
            const shouldShowSameAsReverseTrip = shouldShowSameAsReverseTripQuestion({ interview, path });
            // Do not show if the question of the same mode as previous trip is shown and the answer is not 'no'
            if (shouldShowSameAsReverseTrip && segment.sameModeAsReverseTrip !== false) {
                if (segment.sameModeAsReverseTrip === true) {
                    // If the question of the same mode as previous trip is shown and the answer is yes, then there is no next mode
                    const previousTripSegment = getPreviousTripSingleSegment({
                        journey,
                        trip
                    });
                    if (previousTripSegment && previousTripSegment.modePre !== undefined) {
                        return [false, false];
                    }
                }
                // Otherwise, initialize to null
                return [false, null];
            }
            // Otherwise, get the segments of the current trip and show only for the last segment
            const segmentsArray = odHelpers.getSegmentsArray({ trip });
            const lastSegment: any = segmentsArray[segmentsArray.length - 1];
            if (!lastSegment || segmentsArray.length === 1 || segment._sequence === lastSegment._sequence) {
                return [true, null];
            }
            return [false, true];
        }
    };
};
