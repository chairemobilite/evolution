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
import { AuditLog } from '../audits/auditLog';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import { compareSequenceThenUuid } from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import {
    computeIsJourneyClosed,
    computeIsJourneyClosedMoreThanOnce,
    type JourneyClosureAnswers,
    type VisitedPlaceJourneyClosureAttributes
} from './derivedFlags/journeyClosure';

/**
 * Generate all journeys for a person
 * Populate journeys for a person from the person's already-parsed journeys attributes
 * @param {surveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Person} person - The person to generate journeys for
 * @param {Home} home - The home object for geography assignment
 * @param {ExtendedPersonAttributes} personAttributes - Parsed person attributes containing journeys data
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populateJourneysForPerson(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    person: Person,
    personAttributes: ExtendedPersonAttributes,
    home: Optional<Home>,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
    const journeysAttributes = personAttributes.journeys || {};

    // Sort journeys by _sequence before processing
    const sortedJourneyEntries = Object.entries(journeysAttributes).sort(compareSequenceThenUuid);

    for (const [journeyUuid, originalCorrectedJourneyAttributes] of sortedJourneyEntries) {
        if (journeyUuid === 'undefined') {
            continue;
        }

        const journeyAttributes = originalCorrectedJourneyAttributes as ExtendedJourneyAttributes;

        const journey = Journey.create(
            _omit(journeyAttributes as { [key: string]: unknown }, [
                'visitedPlaces',
                'trips'
            ]) as ExtendedJourneyAttributes,
            surveyObjectsRegistry
        );

        if (isOk(journey)) {
            const visitedPlacesByUuid = (journeyAttributes.visitedPlaces ?? {}) as {
                [uuid: string]: VisitedPlaceJourneyClosureAttributes;
            };
            journey.result.isJourneyClosed = computeIsJourneyClosed(
                visitedPlacesByUuid,
                journeyAttributes as JourneyClosureAnswers
            );
            journey.result.isJourneyClosedMoreThanOnce = computeIsJourneyClosedMoreThanOnce(visitedPlacesByUuid);

            person.addJourney(journey.result);

            // Create visited places for this journey
            await populateVisitedPlacesForJourney(
                surveyObjectsWithErrors,
                person,
                journey.result,
                journeyAttributes,
                home,
                surveyObjectsRegistry
            );

            // Create trips for this journey (includes segments)
            await populateTripsForJourney(
                surveyObjectsWithErrors,
                person,
                journey.result,
                journeyAttributes,
                surveyObjectsRegistry
            );
        } else {
            AuditLog.debug(`Journey ${journeyUuid} creation failed with errors count: ${journey.errors?.length || 0}`);
            surveyObjectsWithErrors.errorsByObject.journeysByUuid[journeyUuid] = journey.errors;
        }
    }
}
