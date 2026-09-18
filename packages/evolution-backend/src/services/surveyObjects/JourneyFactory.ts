/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

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

const QUESTIONNAIRE_JOURNEY_FIELDS_NOT_ON_OBJECT = [
    'visitedPlaces',
    'trips',
    'personDidTrips',
    'personDidTripsConfirm'
] as const;

/**
 * Questionnaire stores `personDidTrips` / `personDidTripsConfirm`. The journey
 * object keeps a single `didTrips`. Confirm wins when both are set.
 */
const didTripsFromQuestionnaire = (attributes: {
    didTrips?: unknown;
    personDidTrips?: unknown;
    personDidTripsConfirm?: unknown;
}): unknown => {
    if (!_isBlank(attributes.didTrips)) {
        return attributes.didTrips;
    }
    const fromQuestionnaire = !_isBlank(attributes.personDidTripsConfirm)
        ? attributes.personDidTripsConfirm
        : attributes.personDidTrips;
    return _isBlank(fromQuestionnaire) ? undefined : fromQuestionnaire;
};

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
        const questionnaireJourney = journeyAttributes as ExtendedJourneyAttributes & {
            personDidTrips?: unknown;
            personDidTripsConfirm?: unknown;
            visitedPlaces?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes };
        };

        const journey = Journey.create(
            _omit(
                {
                    ...journeyAttributes,
                    didTrips: didTripsFromQuestionnaire(questionnaireJourney)
                } as { [key: string]: unknown },
                [...QUESTIONNAIRE_JOURNEY_FIELDS_NOT_ON_OBJECT]
            ) as ExtendedJourneyAttributes,
            surveyObjectsRegistry
        );

        if (isOk(journey)) {
            const visitedPlacesByUuid = questionnaireJourney.visitedPlaces ?? {};
            journey.result.isJourneyClosed = computeIsJourneyClosed(
                visitedPlacesByUuid,
                questionnaireJourney as JourneyClosureAnswers
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
