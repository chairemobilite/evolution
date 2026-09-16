/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import {
    compareSequenceThenUuid,
    type SequencedAttributes
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import type { Journey as QuestionnaireJourney } from 'evolution-common/lib/services/questionnaire/types';

const JOURNEY_CLOSED_CATEGORY = 'stayedThereUntilTheNextDay';

export type VisitedPlaceJourneyClosureAttributes = SequencedAttributes & {
    nextPlaceCategory?: string;
};

/** Questionnaire journey fields that decide whether a trip diary exists. */
export type JourneyClosureAnswers = Pick<
    QuestionnaireJourney,
    'personDidTrips' | 'personDidTripsConfirm' | '_skipTripDiary'
>;

const getSortedVisitedPlaces = (
    visitedPlacesByUuid?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes } | null
): VisitedPlaceJourneyClosureAttributes[] => {
    return Object.entries(visitedPlacesByUuid ?? {})
        .filter(([, visitedPlace]) => !_isBlank(visitedPlace))
        .sort(compareSequenceThenUuid)
        .map(([, visitedPlace]) => visitedPlace);
};

/**
 * Whether the last questionnaire visited place closed the journey.
 *
 * Closed means the last place (by `_sequence`) answers
 * `nextPlaceCategory === 'stayedThereUntilTheNextDay'`. A missing answer, or
 * any other category, is not closed.
 *
 * The flag is left unset when there is no trip diary to close: no visited
 * place, `_skipTripDiary`, or `personDidTrips === 'no'` (unless
 * `personDidTripsConfirm === 'yes'`). `J_L_JourneyNotClosed` only fires on
 * explicit `false`.
 *
 * The questionnaire asks `nextPlaceCategory` only on the last place.
 *
 * TODO: once questionnaireConfig is easy to read on the server, skip this
 * when the trip diary is not enabled for the survey.
 *
 * @param visitedPlacesByUuid - Questionnaire visited places keyed by uuid
 * @param journeyAnswers - Questionnaire journey answers about whether trips happened
 * @returns `true` when the last place closes the journey, `false` when it
 * does not, `undefined` when there is no diary to close
 */
export const computeIsJourneyClosed = (
    visitedPlacesByUuid?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes } | null,
    journeyAnswers?: JourneyClosureAnswers | null
): boolean | undefined => {
    if (journeyAnswers?._skipTripDiary === true) {
        return undefined;
    }
    if (journeyAnswers?.personDidTrips === 'no' && journeyAnswers?.personDidTripsConfirm !== 'yes') {
        return undefined;
    }
    const visitedPlaces = getSortedVisitedPlaces(visitedPlacesByUuid);
    if (visitedPlaces.length === 0) {
        return undefined;
    }
    return visitedPlaces[visitedPlaces.length - 1].nextPlaceCategory === JOURNEY_CLOSED_CATEGORY;
};

/**
 * Whether more than one questionnaire visited place closed the journey.
 *
 * A close is `nextPlaceCategory === 'stayedThereUntilTheNextDay'`.
 *
 * @param visitedPlacesByUuid - Questionnaire visited places keyed by uuid
 * @returns `true` when more than one place closes the journey
 */
export const computeIsJourneyClosedMoreThanOnce = (
    visitedPlacesByUuid?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes } | null
): boolean => {
    const visitedPlaces = getSortedVisitedPlaces(visitedPlacesByUuid);
    return (
        visitedPlaces.filter((visitedPlace) => visitedPlace.nextPlaceCategory === JOURNEY_CLOSED_CATEGORY).length > 1
    );
};
