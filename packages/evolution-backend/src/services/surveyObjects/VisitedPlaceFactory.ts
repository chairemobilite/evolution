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
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Place } from 'evolution-common/lib/services/baseObjects/Place';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import { isOk } from 'evolution-common/lib/types/Result.type';
import projectConfig from '../../config/projectConfig';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

/**
 * Create all visited places for a journey
 * Processes all visited places in the journey, creating VisitedPlace objects and associating them with the journey
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Person} person - The person to generate visited places for
 * @param {Journey} journey - The journey to generate visited places for
 * @param {ExtendedJourneyAttributes} journeyAttributes - Journey attributes containing visited places data
 * @param {Optional<Home>} home - The home object for geography assignment
 * @param {CorrectedResponse} correctedResponse - corrected response,
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 */
export async function populateVisitedPlacesForJourney(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    person: Person,
    journey: Journey,
    journeyAttributes: ExtendedJourneyAttributes,
    home: Optional<Home>,
    correctedResponse: CorrectedResponse,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
    const visitedPlacesAttributes = journeyAttributes?.visitedPlaces || {};

    // Sort visited places by _sequence before processing
    const sortedVisitedPlaceEntries = Object.entries(visitedPlacesAttributes).sort(([, a], [, b]) => {
        const sequenceA = (a as ExtendedVisitedPlaceAttributes)?._sequence || 0;
        const sequenceB = (b as ExtendedVisitedPlaceAttributes)?._sequence || 0;
        return sequenceA - sequenceB;
    });

    for (const [visitedPlaceUuid, originalCorrectedVisitedPlaceAttributes] of sortedVisitedPlaceEntries) {
        if (visitedPlaceUuid === 'undefined') {
            continue;
        }

        const visitedPlaceAttributes = projectConfig.surveyObjectParsers?.visitedPlace
            ? projectConfig.surveyObjectParsers.visitedPlace(originalCorrectedVisitedPlaceAttributes, correctedResponse)
            : originalCorrectedVisitedPlaceAttributes;

        const visitedPlaceResult = VisitedPlace.create(
            visitedPlaceAttributes as ExtendedVisitedPlaceAttributes,
            surveyObjectsRegistry
        );

        if (isOk(visitedPlaceResult)) {
            const visitedPlace = visitedPlaceResult.result;

            if (!visitedPlace.place) {
                // Fetch place if not included in the attributes
                if (visitedPlaceAttributes.activity === 'home' && home) {
                    visitedPlace.place = home;
                } else if (
                    visitedPlaceAttributes.activity === 'workUsual' &&
                    person.workPlaces &&
                    person.workPlaces.length > 0
                ) {
                    visitedPlace.place = person.workPlaces[0];
                } else if (
                    visitedPlaceAttributes.activity === 'schoolUsual' &&
                    person.schoolPlaces &&
                    person.schoolPlaces.length > 0
                ) {
                    visitedPlace.place = person.schoolPlaces[0];
                } else {
                    // we need to fetch place from the geography attribute directly
                    const placeResult = Place.create(
                        {
                            name: visitedPlaceAttributes.name,
                            geography: visitedPlaceAttributes.geography
                        },
                        surveyObjectsRegistry
                    );
                    if (isOk(placeResult)) {
                        visitedPlace.place = placeResult.result;
                    } else {
                        console.error(
                            `!!! Could not create Place for visited place ${visitedPlaceUuid}:`,
                            placeResult.errors
                        );
                    }
                }
            }
            journey.addVisitedPlace(visitedPlace);
        } else {
            console.log(
                `        ==== VisitedPlace ${visitedPlaceUuid} creation failed with errors count: ${visitedPlaceResult.errors?.length || 0} ====`
            );
            surveyObjectsWithErrors.errorsByObject.visitedPlacesByUuid[visitedPlaceUuid] = visitedPlaceResult.errors;
        }
    }
}
