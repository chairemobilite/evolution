/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TextWidgetConfig } from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { loopActivities } from '../../../odSurvey/types';

export const getTripSegmentsIntro = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: (additionalContext?: string) => string } = {}
): TextWidgetConfig => ({
    type: 'text',
    text: (t: TFunction, interview, path) => {
        const person = odHelpers.getPerson({ interview });
        const journey = odHelpers.getActiveJourney({ interview, person });
        const trip = odHelpers.getActiveTrip({ interview, journey });
        if (!trip || !journey || !person) {
            console.error('trip segments intro: trip, journey or person not found');
            return '';
        }
        const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
        const origin = odHelpers.getOrigin({ trip, visitedPlaces });
        const destination = odHelpers.getDestination({ trip, visitedPlaces });
        if (!origin || !destination) {
            console.error('trip segments intro: origin or destination not found, trip is invalid');
            return '';
        }
        const originName = origin ? odHelpers.getVisitedPlaceName({ visitedPlace: origin, t, interview }) : '';
        const destinationName = destination
            ? odHelpers.getVisitedPlaceName({ visitedPlace: destination, t, interview })
            : '';
        // If origin or destination is a loopActivity, use this activity as context, otherwise, it's the destination
        const activityContext =
            origin.activity && loopActivities.includes(origin.activity) ? origin.activity : destination.activity;
        return t(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: options.context?.(activityContext) || activityContext,
            count: odHelpers.getCountOrSelfDeclared({ interview, person }),
            originName,
            destinationName
        });
    }
});
