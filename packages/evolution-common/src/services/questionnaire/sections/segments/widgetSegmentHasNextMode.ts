/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _upperFirst from 'lodash/upperFirst';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from '../../../questionnaire/types';
import { getResponse } from '../../../../utils/helpers';
import { TFunction } from 'i18next';
import * as odHelpers from '../../../odSurvey/helpers';
import { loopActivities } from '../../../odSurvey/types';
import { getPreviousTripSingleSegment, shouldShowSameAsReverseTripQuestion } from './helpers';
import { Journey, Person } from '../../types';

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
        label: (t: TFunction, interview) => {
            const person = odHelpers.getPerson({ interview }) as Person;
            const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;
            const trip = odHelpers.getActiveTrip({ interview, journey });
            const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
            const origin = trip ? odHelpers.getOrigin({ trip, visitedPlaces }) : undefined;
            const destination = trip ? odHelpers.getDestination({ trip, visitedPlaces }) : undefined;
            const destinationActivity = destination ? destination.activity : '';
            const tripLoopActivity =
                origin?.activity && loopActivities.includes(origin.activity)
                    ? origin.activity
                    : destinationActivity && loopActivities.includes(destinationActivity)
                        ? destinationActivity
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
        choices: [
            {
                value: true,
                label: (t: TFunction) => t('survey:Yes')
            },
            {
                value: false,
                label: (t: TFunction) => t('survey:No')
            }
        ],
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t(['customSurvey:ResponseIsRequired', 'survey:ResponseIsRequired'])
                }
            ];
        },
        conditional: (interview, path) => {
            const segment: any = getResponse(interview, path, null, '../');
            const shouldShowSameAsReverseTrip = shouldShowSameAsReverseTripQuestion({ interview, segment });
            // Do not show if the question of the same mode as previous trip is shown and the answer is not 'no'
            if (shouldShowSameAsReverseTrip && segment.sameModeAsReverseTrip !== false) {
                if (segment.sameModeAsReverseTrip === true) {
                    // If the question of the same mode as previous trip is shown and the answer is yes, then there is no next mode
                    const previousTripSegment = getPreviousTripSingleSegment({
                        interview,
                        person: odHelpers.getActivePerson({ interview }) as Person
                    });
                    if (previousTripSegment && previousTripSegment.modePre !== undefined) {
                        return [false, false];
                    }
                }
                // Otherwise, initialize to null
                return [false, null];
            }
            // Otherwise, get the segments of the current trip and show only for the last segment
            const trip = odHelpers.getActiveTrip({ interview });
            const segments = trip?.segments ? trip.segments : {};
            const segmentsArray = Object.values(segments).sort((segmentA, segmentB) => {
                return segmentA['_sequence'] - segmentB['_sequence'];
            });
            const lastSegment: any = segmentsArray[segmentsArray.length - 1];
            if (!lastSegment || segmentsArray.length === 1 || segment._sequence === lastSegment._sequence) {
                return [true, null];
            }
            return [false, true];
        }
    };
};
