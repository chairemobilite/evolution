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
import { computeIsJourneyClosed, computeIsJourneyClosedMoreThanOnce } from './derivedFlags/journeyClosure';
import type { Journey as QuestionnaireJourney } from 'evolution-common/lib/services/questionnaire/types';
import { YesNoDontKnow } from 'evolution-common/lib/services/baseObjects/attributeTypes/GenericAttributes';

/**
 * Type with the `personDidTrips` and `personDidTripsConfirm` for the backports.
 * These fields are part of the QuestionnaireJourney in 0.6 branch
 */
type JourneyPersonDidTrips = {
    personDidTrips?: YesNoDontKnow;
    personDidTripsConfirm?: YesNoDontKnow;
};

/** Questionnaire fields that `Journey.create` must not receive. */
type QuestionnaireJourneyOnly = Pick<QuestionnaireJourney, 'visitedPlaces' | 'trips'> & JourneyPersonDidTrips;

const QUESTIONNAIRE_JOURNEY_ONLY_KEYS = [
    'visitedPlaces',
    'trips',
    'personDidTrips',
    'personDidTripsConfirm'
] as const satisfies readonly (keyof QuestionnaireJourneyOnly)[];

type QuestionnaireJourneyForFactory = ExtendedJourneyAttributes &
    QuestionnaireJourneyOnly &
    Pick<QuestionnaireJourney, '_skipTripDiary'>;

/**
 * Questionnaire stores `personDidTrips` / `personDidTripsConfirm` as
 * `yes` / `no` / `dontKnow`. Confirm wins when both are set. `Journey.create`
 * wraps the chosen value into `didTrips`. A skipped diary does not ask the
 * question, so `didTrips` is `not_applicable`.
 *
 * @param {JourneyPersonDidTrips} attributes Journey fields from the response
 * @param {boolean} skipTripDiary Whether this journey skipped the trip diary
 * @returns {unknown} The questionnaire answer, `not_applicable` when the diary is skipped, or `undefined` when both answers are blank
 */
const didTripsFromQuestionnaire = (attributes: JourneyPersonDidTrips, skipTripDiary: boolean): unknown => {
    if (skipTripDiary) {
        return { status: 'not_applicable' };
    }
    const fromQuestionnaire = !_isBlank(attributes.personDidTripsConfirm)
        ? attributes.personDidTripsConfirm
        : attributes.personDidTrips;
    return _isBlank(fromQuestionnaire) ? undefined : fromQuestionnaire;
};

/**
 * Generate all journeys for a person.
 * Journeys already in the response are kept, with the `startDate` the survey
 * stored on them. `personDidTrips`, `personDidTripsConfirm` and
 * `_skipTripDiary` are read on that journey. A skipped diary
 * (`_skipTripDiary === true`) sets `didTrips` to `not_applicable`. A person
 * with no journey in the response gets none.
 *
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Person} person - The person to generate journeys for
 * @param {ExtendedPersonAttributes} personAttributes - Parsed person attributes containing journeys data
 * @param {Optional<Home>} home - The home object for geography assignment
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

    // Sort journeys by _sequence before processing.
    const sortedJourneyEntries = Object.entries(journeysAttributes)
        .filter(([journeyUuid]) => journeyUuid !== 'undefined')
        .sort(compareSequenceThenUuid);

    for (const [journeyUuid, originalCorrectedJourneyAttributes] of sortedJourneyEntries) {
        const questionnaireJourney = originalCorrectedJourneyAttributes as QuestionnaireJourneyForFactory;
        const skipTripDiary = questionnaireJourney._skipTripDiary === true;

        const journey = Journey.create(
            _omit(
                {
                    ...questionnaireJourney,
                    _skipTripDiary: skipTripDiary,
                    didTrips: didTripsFromQuestionnaire(questionnaireJourney, skipTripDiary)
                },
                QUESTIONNAIRE_JOURNEY_ONLY_KEYS
            ) as ExtendedJourneyAttributes,
            surveyObjectsRegistry
        );

        if (isOk(journey)) {
            const visitedPlacesByUuid = questionnaireJourney.visitedPlaces ?? {};
            journey.result.isJourneyClosed = computeIsJourneyClosed(visitedPlacesByUuid, questionnaireJourney);
            journey.result.isJourneyClosedMoreThanOnce = computeIsJourneyClosedMoreThanOnce(visitedPlacesByUuid);

            person.addJourney(journey.result);

            // Create visited places for this journey
            await populateVisitedPlacesForJourney(
                surveyObjectsWithErrors,
                person,
                journey.result,
                questionnaireJourney,
                home,
                surveyObjectsRegistry
            );

            // Create trips for this journey (includes segments)
            await populateTripsForJourney(
                surveyObjectsWithErrors,
                person,
                journey.result,
                questionnaireJourney,
                surveyObjectsRegistry
            );
        } else {
            AuditLog.debug(`Journey ${journeyUuid} creation failed with errors count: ${journey.errors?.length || 0}`);
            surveyObjectsWithErrors.errorsByObject.journeysByUuid[journeyUuid] = journey.errors;
        }
    }
}
