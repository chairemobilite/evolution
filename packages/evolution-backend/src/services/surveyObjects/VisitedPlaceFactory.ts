/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Journey, ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace, ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import { isOk } from 'evolution-common/lib/types/Result.type';
import projectConfig from '../../config/projectConfig';

/**
 * Create all visited places for a journey
 * Processes all visited places in the journey, creating VisitedPlace objects and associating them with the journey
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Journey} journey - The journey to generate visited places for
 * @param {ExtendedJourneyAttributes} journeyAttributes - Journey attributes containing visited places data
 * @param {Optional<Home>} home - The home object for geography assignment
 */
export async function createVisitedPlacesForJourney(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    journey: Journey,
    journeyAttributes: ExtendedJourneyAttributes,
    home: Optional<Home>
): Promise<void> {
    const visitedPlacesAttributes = journeyAttributes?.visitedPlaces || {};

    // Sort visited places by _sequence before processing
    const sortedVisitedPlaceEntries = Object.entries(visitedPlacesAttributes).sort(([, a], [, b]) => {
        const sequenceA = (a as ExtendedVisitedPlaceAttributes)?._sequence || 0;
        const sequenceB = (b as ExtendedVisitedPlaceAttributes)?._sequence || 0;
        return sequenceA - sequenceB;
    });

    for (const [visitedPlaceUuid, visitedPlaceAttributes] of sortedVisitedPlaceEntries) {
        if (visitedPlaceUuid === 'undefined') {
            continue;
        }

        console.log(`========== VisitedPlace ${visitedPlaceUuid} creation ==========`);

        // Parse visited place attributes if parser is available
        if (projectConfig.surveyObjectParsers?.visitedPlace) {
            projectConfig.surveyObjectParsers.visitedPlace(visitedPlaceAttributes);
        }

        const visitedPlace = VisitedPlace.create(visitedPlaceAttributes as ExtendedVisitedPlaceAttributes);

        if (isOk(visitedPlace)) {
            console.log(`========== VisitedPlace ${visitedPlaceUuid} created successfully ==========`);

            // Add home geography if needed
            if (visitedPlace.result.activity === 'home' && home && visitedPlace.result.place) {
                visitedPlace.result.place.geography = home.geography;
            }

            journey.addVisitedPlace(visitedPlace.result);
        } else {
            console.log(
                `========== VisitedPlace ${visitedPlaceUuid} creation failed with errors count: ${visitedPlace.errors?.length || 0} ==========`
            );
            surveyObjectsWithErrors.errorsByObject.visitedPlacesByUuid[visitedPlaceUuid] = visitedPlace.errors;
        }
    }
}
