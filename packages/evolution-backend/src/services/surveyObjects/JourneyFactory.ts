/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Journey, ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { populateVisitedPlacesForJourney } from './VisitedPlaceFactory';
import { populateTripsForJourney } from './TripFactory';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import projectConfig from '../../config/projectConfig';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

/**
 * Generate all journeys for a person
 * Populate journeys for a person from the person's journeys attributes
 * @param {surveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Person} person - The person to generate journeys for
 * @param {Home} home - The home object for geography assignment
 * @param {ExtendedPersonAttributes} personAttributes - Person attributes containing journeys data
 * @param {CorrectedResponse} correctedResponse - corrected response
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populateJourneysForPerson(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    person: Person,
    personAttributes: ExtendedPersonAttributes,
    home: Optional<Home>,
    correctedResponse: CorrectedResponse,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
    const journeysAttributes = personAttributes.journeys || {};

    // Sort journeys by _sequence before processing
    const sortedJourneyEntries = Object.entries(journeysAttributes).sort(([, a], [, b]) => {
        const sequenceA = (a as unknown as ExtendedJourneyAttributes)?._sequence || 0;
        const sequenceB = (b as unknown as ExtendedJourneyAttributes)?._sequence || 0;
        return sequenceA - sequenceB;
    });

    for (const [journeyUuid, journeyAttributes] of sortedJourneyEntries) {
        if (journeyUuid === 'undefined') {
            continue;
        }

        // Parse journey attributes if parser is available
        if (projectConfig.surveyObjectParsers?.journey) {
            projectConfig.surveyObjectParsers.journey(journeyAttributes, correctedResponse);
        }

        const journey = Journey.create(
            _omit(journeyAttributes as { [key: string]: unknown }, [
                'visitedPlaces',
                'trips'
            ]) as ExtendedJourneyAttributes,
            surveyObjectsRegistry
        );

        if (isOk(journey)) {
            person.addJourney(journey.result);

            // Create visited places for this journey
            await populateVisitedPlacesForJourney(
                surveyObjectsWithErrors,
                person,
                journey.result,
                journeyAttributes as ExtendedJourneyAttributes,
                home,
                correctedResponse,
                surveyObjectsRegistry
            );

            // Create trips for this journey (includes segments)
            await populateTripsForJourney(
                surveyObjectsWithErrors,
                person,
                journey.result,
                journeyAttributes as ExtendedJourneyAttributes,
                correctedResponse,
                surveyObjectsRegistry
            );
        } else {
            console.log(
                `      ==== Journey ${journeyUuid} creation failed with errors count: ${journey.errors?.length || 0} ====`
            );
            surveyObjectsWithErrors.errorsByObject.journeysByUuid[journeyUuid] = journey.errors;
        }
    }
}
